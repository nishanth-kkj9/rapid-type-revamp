import { useRef, useState } from "react";
import { Database, Download, Lock, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { DeleteAllDataDialog } from "@/components/DeleteAllDataDialog";
import type { AchievementState } from "@/lib/achievements";
import type { BackupImportResult } from "@/lib/backup";
import type { CustomTextEntry } from "@/lib/customTexts";
import { downloadFullBackupJson } from "@/lib/historyExport";
import { appStorage } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/typingStats";

const STORAGE_INVENTORY = [
  {
    key: "ttp:history:v1 / ttp:best:samples:v1:*",
    desc: "Drill & Word Shooter run history, per-second speed samples, and ghost curves",
  },
  {
    key: "ttp:keystats:v1 / ttp:keybigrams:v1 / ttp:keyspeed:v1",
    desc: "All-time per-key errors, transition bigrams, and inter-key latency (ms)",
  },
  { key: "ttp:missed-words:v1", desc: "Active remediation word list & consecutive clean streaks" },
  { key: "ttp:custom-texts:v1", desc: "Your pasted custom practice passages" },
  { key: "ttp:achievements:v1", desc: "Unlocked milestones & progress counters" },
  { key: "ttp:daily:v1", desc: "Daily practice target, active minutes, and streak freeze status" },
  {
    key: "ttp:drill:settings:v1 / ttp:shooter:settings:v1 / ttp:uiprefs:v1 / ttp:theme:v1",
    desc: "Typing, layout, audio, game, theme, and accessibility settings",
  },
];

interface SettingsDataPrivacyTabProps {
  history: HistoryEntry[];
  customTexts: CustomTextEntry[];
  achState: AchievementState;
  storedMissedWordsCount: number;
  onImportBackup: (rawJson: string) => Promise<BackupImportResult>;
  onDeleteAllData: () => Promise<void>;
}

export function SettingsDataPrivacyTab({
  history,
  customTexts,
  achState,
  storedMissedWordsCount,
  onImportBackup,
  onDeleteAllData,
}: SettingsDataPrivacyTabProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File) => {
    const raw = await file.text();
    const res = await onImportBackup(raw);
    if (!res.ok) {
      toast.error(
        res.reason === "quota"
          ? "Browser storage is full. Export and free space first."
          : "Invalid or corrupted backup JSON.",
      );
      return;
    }
    toast.success(
      res.scope === "full"
        ? `Restored full backup (${res.state.history.length} runs & all settings).`
        : `Imported ${res.state.history.length} history runs.`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/35 bg-primary/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="size-4 text-primary" />
          100% Local-First Privacy Guarantee
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          No account, no analytics telemetry, no tracking pixels, and zero third-party font or asset
          CDN requests on load. Every keystroke, chart, custom text, and backup stays inside this
          browser on your device.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Database className="size-3.5 text-primary" />
            Browser Storage Footprint
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            {history.length} runs · {customTexts.length} custom lists ·{" "}
            {Object.keys(achState.unlocked).length} badges · {storedMissedWordsCount} missed words
          </span>
        </div>

        <ul className="divide-y divide-border/60 rounded-xl border border-border bg-secondary/35 text-xs">
          {STORAGE_INVENTORY.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-0.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <code className="font-mono text-xs font-semibold text-primary">{item.key}</code>
              <span className="text-muted-foreground">{item.desc}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadFullBackupJson(appStorage)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download className="size-3.5" />
            Export Full Backup (JSON)
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Upload className="size-3.5" />
            Import Backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          <ShieldAlert className="size-3.5" />
          Delete All Data
        </button>
      </div>

      <DeleteAllDataDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirmDeleteAll={() => {
          void onDeleteAllData().then(() => toast.success("All local data permanently deleted."));
        }}
      />
    </div>
  );
}
