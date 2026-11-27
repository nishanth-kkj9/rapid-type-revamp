import { useRef, useState } from "react";
import { toast } from "sonner";
import { DeleteAllDataDialog } from "@/components/DeleteAllDataDialog";
import type { BackupImportResult } from "@/lib/backup";
import type { CustomTextEntry } from "@/lib/customTexts";
import { downloadFullBackupJson } from "@/lib/historyExport";
import { appStorage } from "@/lib/storage";
import { MAX_IMPORT_RUNS, type HistoryEntry } from "@/lib/typingStats";

interface SettingsDataSectionProps {
  history: HistoryEntry[];
  customTexts: CustomTextEntry[];
  storedMissedWordsCount: number;
  onImportBackup: (rawJson: string) => Promise<BackupImportResult>;
  onDeleteAllData: () => Promise<void>;
}

export function SettingsDataSection({
  history,
  customTexts,
  storedMissedWordsCount,
  onImportBackup,
  onDeleteAllData,
}: SettingsDataSectionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File) => {
    const raw = await file.text();
    const res = await onImportBackup(raw);
    if (!res.ok) {
      toast.error(
        res.reason === "quota"
          ? "Browser storage is full. Export and free space first."
          : res.reason === "too-many-runs"
            ? `Import rejected: backup exceeds the ${MAX_IMPORT_RUNS.toLocaleString()}-run limit.`
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
    <section
      aria-labelledby="settings-data-heading"
      className="space-y-4 border-t border-border pt-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="settings-data-heading" className="text-base font-semibold text-foreground">
          Data
        </h3>
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {history.length} runs · {customTexts.length} custom lists · {storedMissedWordsCount}{" "}
          missed words
        </span>
      </div>

      <p className="text-[13px] text-muted-foreground">
        All typing runs, key stats, daily goal state, and preferences stay locally in your browser
        (IndexedDB under <code className="font-mono text-foreground">ttp:history:index:v1</code> and{" "}
        <code className="font-mono text-foreground">ttp:*</code>).
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadFullBackupJson(appStorage)}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Export full backup (JSON)
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-secondary px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            aria-label="Import backup JSON file"
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
          className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-2 text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          Delete all data
        </button>
      </div>

      <DeleteAllDataDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirmDeleteAll={() => {
          void onDeleteAllData().then(() => toast.success("All local data permanently deleted."));
        }}
      />
    </section>
  );
}
