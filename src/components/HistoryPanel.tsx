import { useMemo, useState } from "react";
import { toast } from "sonner";
import { downloadHistoryCsv } from "@/lib/historyExport";
import { appStorage } from "@/lib/storage";
import {
  filterVisibleHistory,
  restoreHistoryToStorage,
  type HistoryEntry,
} from "@/lib/typingStats";
import { HistoryActionsBar } from "@/components/HistoryActionsBar";
import { HistoryDrillView } from "@/components/HistoryDrillView";
import { HistoryRunDetailDialog } from "@/components/HistoryRunDetailDialog";

interface Props {
  history: HistoryEntry[];
  onClear: (mode?: "all" | "drill") => void;
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
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedRun, setSelectedRun] = useState<HistoryEntry | null>(null);

  const drillAll = useMemo(() => filterVisibleHistory(history), [history]);

  const handleClearPracticeHistory = () => {
    const previous = [...history];
    onClear("drill");
    setConfirmClear(false);
    toast("Practice history cleared", {
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

  return (
    <section aria-label="Run history and progress" className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <h3 className="text-sm font-medium text-muted-foreground">History ({drillAll.length})</h3>

        <HistoryActionsBar
          currentModeRunsCount={drillAll.length}
          totalRunsCount={drillAll.length}
          confirmClear={confirmClear}
          onDownloadCsv={() => downloadHistoryCsv(drillAll)}
          onRequestClear={() => setConfirmClear(true)}
          onConfirmClear={handleClearPracticeHistory}
          onCancelClear={() => setConfirmClear(false)}
        />
      </div>

      <HistoryDrillView
        drillAll={drillAll}
        onSelectRun={setSelectedRun}
        onDeleteRun={handleDeleteSingleRun}
        onStartRun={onStartRun}
      />

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
