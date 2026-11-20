import { Download, Trash2 } from "lucide-react";

interface HistoryActionsBarProps {
  mode: "drill" | "shooter";
  currentModeRunsCount: number;
  totalRunsCount: number;
  confirmClear: boolean;
  onDownloadCsv: () => void;
  onRequestClear: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
}

export function HistoryActionsBar({
  mode,
  currentModeRunsCount,
  totalRunsCount,
  confirmClear,
  onDownloadCsv,
  onRequestClear,
  onConfirmClear,
  onCancelClear,
}: HistoryActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDownloadCsv}
          disabled={totalRunsCount === 0}
          className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap shrink-0 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="size-3.5 text-primary" aria-hidden="true" />
          Download history as CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {currentModeRunsCount > 0 ? (
          confirmClear ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onConfirmClear}
                className="flex min-h-9 cursor-pointer items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Clear {mode === "drill" ? "Practice Runs" : "Arcade Games"}
              </button>
              <button
                type="button"
                onClick={onCancelClear}
                className="min-h-9 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap shrink-0 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestClear}
              className="min-h-9 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground whitespace-nowrap shrink-0 transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              Clear this view
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
