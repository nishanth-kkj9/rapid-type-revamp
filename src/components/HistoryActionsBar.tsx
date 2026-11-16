import { ClipboardPaste, Download, PackageOpen, ShieldAlert, Trash2, Upload } from "lucide-react";

interface HistoryActionsBarProps {
  mode: "drill" | "shooter";
  currentModeRunsCount: number;
  confirmClear: boolean;
  onExportAll: () => void;
  onExportMode: () => void;
  onTriggerImportFile: () => void;
  onOpenPasteImport: () => void;
  onRequestClear: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
  onOpenDeleteAll: () => void;
}

export function HistoryActionsBar({
  mode,
  currentModeRunsCount,
  confirmClear,
  onExportAll,
  onExportMode,
  onTriggerImportFile,
  onOpenPasteImport,
  onRequestClear,
  onConfirmClear,
  onCancelClear,
  onOpenDeleteAll,
}: HistoryActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportAll}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <PackageOpen className="size-3.5" />
          Export everything
        </button>
        <button
          type="button"
          onClick={onExportMode}
          disabled={currentModeRunsCount === 0}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Download className="size-3" />
          Export {mode === "drill" ? "Drill" : "Shooter"}
        </button>
        <button
          type="button"
          onClick={onTriggerImportFile}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Upload className="size-3" />
          Import
        </button>
        <button
          type="button"
          onClick={onOpenPasteImport}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ClipboardPaste className="size-3" />
          Paste
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {currentModeRunsCount > 0 ? (
          confirmClear ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onConfirmClear}
                className="flex cursor-pointer items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              >
                <Trash2 className="size-3" />
                Clear {mode === "drill" ? "Drill Runs" : "Shooter Games"}
              </button>
              <button
                type="button"
                onClick={onCancelClear}
                className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestClear}
              className="cursor-pointer rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              Clear {mode === "drill" ? "Drill" : "Shooter"}
            </button>
          )
        ) : null}
        <button
          type="button"
          onClick={onOpenDeleteAll}
          className="flex cursor-pointer items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15"
        >
          <ShieldAlert className="size-3" />
          Delete all my data
        </button>
      </div>
    </div>
  );
}
