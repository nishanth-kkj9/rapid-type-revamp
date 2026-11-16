import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ChevronDown, Crosshair, Timer } from "lucide-react";
import type { BackupImportResult } from "@/lib/backup";
import { downloadFullBackupJson, downloadHistoryJson } from "@/lib/historyExport";
import { appStorage } from "@/lib/storage";
import { restoreHistoryToStorage, type HistoryEntry } from "@/lib/typingStats";
import { DeleteAllDataDialog } from "@/components/DeleteAllDataDialog";
import { HistoryActionsBar } from "@/components/HistoryActionsBar";
import { HistoryDrillView } from "@/components/HistoryDrillView";
import { HistoryImportDialog } from "@/components/HistoryImportDialog";
import { HistoryRunDetailDialog } from "@/components/HistoryRunDetailDialog";
import { HistoryShooterView } from "@/components/HistoryShooterView";

interface Props {
  history: HistoryEntry[];
  mode: "drill" | "shooter";
  onClear: (mode?: "all" | "drill" | "shooter") => void;
  onImportHistory: (entries: HistoryEntry[]) => void;
  onImportBackup: (rawJson: string) => Promise<BackupImportResult>;
  onDeleteRun: (id: string) => Promise<HistoryEntry | null>;
  onRestoreRun: (entry: HistoryEntry) => Promise<void>;
  onDeleteAllData: () => Promise<void>;
  onStartRun?: () => void;
}

export function HistoryPanel({
  history,
  mode,
  onClear,
  onImportHistory,
  onImportBackup,
  onDeleteRun,
  onRestoreRun,
  onDeleteAllData,
  onStartRun,
}: Props) {
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [selectedRun, setSelectedRun] = useState<HistoryEntry | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [expandedByMode, setExpandedByMode] = useState({ drill: false, shooter: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const contentId = useId();

  const drillAll = useMemo(() => history.filter((h) => h.mode !== "shooter"), [history]);
  const shooterAll = useMemo(() => history.filter((h) => h.mode === "shooter"), [history]);

  const applyImportJson = async (rawText: string) => {
    const res = await onImportBackup(rawText);
    if (!res.ok) {
      setImportError(
        res.reason === "quota"
          ? "Browser storage is full. Please clear space or export existing data."
          : "Invalid or corrupted backup JSON.",
      );
      return false;
    }
    setImportError(null);
    toast.success(
      res.scope === "full"
        ? `Restored full backup (${res.state.history.length} runs, key stats & settings).`
        : `Imported ${res.state.history.length} history records.`,
    );
    return true;
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => void applyImportJson(String(event.target?.result ?? ""));
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    void applyImportJson(pasteText).then((ok) => {
      if (ok) {
        setPasteText("");
        setPasteOpen(false);
      }
    });
  };

  const handleClearCurrentMode = () => {
    const previous = [...history];
    onClear(mode);
    setConfirmClear(false);
    toast(mode === "drill" ? "Drill history cleared" : "Shooter history cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          void restoreHistoryToStorage(appStorage, previous)
            .then((restored) => {
              onImportHistory(restored);
              toast.success("History restored.");
            })
            .catch(() => setImportError("Could not restore history."));
        },
      },
      duration: 6000,
    });
  };

  const handleDeleteSingleRun = (entry: HistoryEntry) => {
    void onDeleteRun(entry.id).then((deleted) => {
      if (!deleted) return;
      toast("Run deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            void onRestoreRun(deleted).then(() => toast.success("Run restored."));
          },
        },
        duration: 6000,
      });
    });
  };

  const currentModeRunsCount = mode === "drill" ? drillAll.length : shooterAll.length;
  const isExpanded = expandedByMode[mode];
  const sectionTitle = mode === "drill" ? "Drill History" : "Shooter History";

  return (
    <section
      className={`panel p-5 transition-colors ${
        mode === "shooter" ? "hover:border-accent/40" : "hover:border-primary/40"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpandedByMode((prev) => ({ ...prev, [mode]: !prev[mode] }))}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-labelledby={headingId}
        className="group flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <div id={headingId} className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
              mode === "drill"
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-accent/25 bg-accent/10 text-accent"
            }`}
          >
            {mode === "drill" ? <Timer className="size-4" /> : <Crosshair className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {sectionTitle}
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                · {currentModeRunsCount}{" "}
                {mode === "drill"
                  ? currentModeRunsCount === 1
                    ? "run"
                    : "runs"
                  : currentModeRunsCount === 1
                    ? "game"
                    : "games"}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {mode === "drill"
                ? "Progress chart, personal bests, filters, and full run history"
                : "High scores, levels reached, and accuracy from arcade battles"}
            </p>
          </div>
        </div>

        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-colors group-hover:bg-secondary group-hover:text-foreground ${
            isExpanded
              ? mode === "shooter"
                ? "border-accent/40 text-accent"
                : "border-primary/40 text-primary"
              : ""
          }`}
        >
          <span className="sr-only">
            {isExpanded ? `Collapse ${sectionTitle}` : `Expand ${sectionTitle}`}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`chart-expand-transition size-4 transition-transform duration-300 ease-out ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        data-lpignore="true"
        data-protonpass-ignore="true"
        data-1p-ignore="true"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = "";
        }}
      />

      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!isExpanded}
        inert={!isExpanded ? true : undefined}
        className={`chart-expand-transition grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-4 border-t border-border/50 pt-4">
            <HistoryActionsBar
              mode={mode}
              currentModeRunsCount={currentModeRunsCount}
              confirmClear={confirmClear}
              onExportAll={() => void downloadFullBackupJson(appStorage)}
              onExportMode={() =>
                downloadHistoryJson(mode, mode === "drill" ? drillAll : shooterAll)
              }
              onTriggerImportFile={() => fileRef.current?.click()}
              onOpenPasteImport={() => setPasteOpen(true)}
              onRequestClear={() => setConfirmClear(true)}
              onConfirmClear={handleClearCurrentMode}
              onCancelClear={() => setConfirmClear(false)}
              onOpenDeleteAll={() => setDeleteAllOpen(true)}
            />

            {importError ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/15 p-2.5 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{importError}</span>
              </div>
            ) : null}

            {mode === "drill" ? (
              <HistoryDrillView
                drillAll={drillAll}
                onSelectRun={setSelectedRun}
                onDeleteRun={handleDeleteSingleRun}
                onStartRun={onStartRun}
              />
            ) : (
              <HistoryShooterView
                shooterAll={shooterAll}
                onSelectRun={setSelectedRun}
                onDeleteRun={handleDeleteSingleRun}
              />
            )}
          </div>
        </div>
      </div>

      <HistoryImportDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        value={pasteText}
        onChange={setPasteText}
        onSubmit={handlePasteImport}
      />

      <HistoryRunDetailDialog
        entry={selectedRun}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null);
        }}
        onDeleteRun={handleDeleteSingleRun}
      />

      <DeleteAllDataDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        onConfirmDeleteAll={() => {
          void onDeleteAllData().then(() => toast.success("All local data permanently deleted."));
        }}
      />
    </section>
  );
}
