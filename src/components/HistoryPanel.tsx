import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Crosshair, Timer } from "lucide-react";
import { downloadHistoryCsv } from "@/lib/historyExport";
import { appStorage } from "@/lib/storage";
import { restoreHistoryToStorage, type HistoryEntry } from "@/lib/typingStats";
import { HistoryActionsBar } from "@/components/HistoryActionsBar";
import { HistoryDrillView } from "@/components/HistoryDrillView";
import { HistoryRunDetailDialog } from "@/components/HistoryRunDetailDialog";
import { HistoryShooterView } from "@/components/HistoryShooterView";

interface Props {
  history: HistoryEntry[];
  onClear: (mode?: "all" | "drill" | "shooter") => void;
  onImportHistory: (entries: HistoryEntry[]) => void;
  onDeleteRun: (id: string) => Promise<HistoryEntry | null>;
  onRestoreRun: (entry: HistoryEntry) => Promise<void>;
  onStartRun?: () => void;
}

export function HistoryPanel({
  history,
  onClear,
  onImportHistory,
  onDeleteRun,
  onRestoreRun,
  onStartRun,
}: Props) {
  const [viewMode, setViewMode] = useState<"drill" | "shooter">("drill");
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedRun, setSelectedRun] = useState<HistoryEntry | null>(null);

  const drillAll = useMemo(() => history.filter((h) => h.mode !== "shooter"), [history]);
  const shooterAll = useMemo(() => history.filter((h) => h.mode === "shooter"), [history]);

  const handleClearCurrentMode = () => {
    const previous = [...history];
    onClear(viewMode);
    setConfirmClear(false);
    toast(viewMode === "drill" ? "Practice history cleared" : "Arcade history cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          void restoreHistoryToStorage(appStorage, previous)
            .then((restored) => {
              onImportHistory(restored);
              toast.success("History restored.");
            })
            .catch(() => toast.error("Could not restore history."));
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

  const currentModeRunsCount = viewMode === "drill" ? drillAll.length : shooterAll.length;

  return (
    <section aria-label="Run history and progress" className="panel p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">History</h3>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div
          role="group"
          aria-label="History mode"
          className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1"
        >
          <button
            type="button"
            aria-pressed={viewMode === "drill"}
            onClick={() => {
              setViewMode("drill");
              setConfirmClear(false);
            }}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              viewMode === "drill"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Timer className="size-3.5" aria-hidden="true" />
            Practice ({drillAll.length})
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "shooter"}
            onClick={() => {
              setViewMode("shooter");
              setConfirmClear(false);
            }}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              viewMode === "shooter"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crosshair className="size-3.5" aria-hidden="true" />
            Arcade ({shooterAll.length})
          </button>
        </div>

        <HistoryActionsBar
          mode={viewMode}
          currentModeRunsCount={currentModeRunsCount}
          totalRunsCount={history.length}
          confirmClear={confirmClear}
          onDownloadCsv={() => downloadHistoryCsv(history)}
          onRequestClear={() => setConfirmClear(true)}
          onConfirmClear={handleClearCurrentMode}
          onCancelClear={() => setConfirmClear(false)}
        />
      </div>

      {viewMode === "drill" ? (
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

      <HistoryRunDetailDialog
        entry={selectedRun}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null);
        }}
        onDeleteRun={handleDeleteSingleRun}
      />
    </section>
  );
}
