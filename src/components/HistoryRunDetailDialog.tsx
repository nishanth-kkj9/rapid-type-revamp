import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatModeLabel, formatWordListLabel, type HistoryEntry } from "@/lib/typingStats";
import { ProblemKeys } from "@/components/ProblemKeys";
import { WpmChart } from "@/components/WpmChart";

interface HistoryRunDetailDialogProps {
  entry: HistoryEntry | null;
  onOpenChange: (open: boolean) => void;
  onDeleteRun: (entry: HistoryEntry) => void;
}

export function HistoryRunDetailDialog({
  entry,
  onOpenChange,
  onDeleteRun,
}: HistoryRunDetailDialogProps) {
  if (!entry) return null;

  const dateLabel = new Date(entry.date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {formatModeLabel(entry.mode)} Run Details
          </DialogTitle>
          <DialogDescription className="text-[13px] tabular-nums text-muted-foreground">
            {dateLabel} · {formatWordListLabel(entry.difficulty)} · {entry.elapsed.toFixed(1)}s
            elapsed
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 divide-y divide-border/60 rounded-xl border border-border/70 bg-secondary/20 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-3 text-center">
            <div className="text-[13px] text-muted-foreground">WPM</div>
            <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-primary">
              {entry.wpm.toFixed(0)}
            </div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[13px] text-muted-foreground">Accuracy</div>
            <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums">
              {entry.accuracy.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[13px] text-muted-foreground">Raw WPM</div>
            <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums">
              {entry.rawWpm.toFixed(0)}
            </div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[13px] text-muted-foreground">Consistency</div>
            <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums">
              {entry.consistency.toFixed(0)}%
            </div>
          </div>
        </div>

        <p className="text-[13px] tabular-nums text-muted-foreground">
          {entry.correct} correct · {entry.incorrect} errors
          {entry.uncorrectedErrors !== undefined ? ` · ${entry.uncorrectedErrors} uncorrected` : ""}
          {` · ${entry.adjustedWpm.toFixed(0)} net wpm`}
          {entry.strict ? ` · strict: ${entry.strict}` : ""}
          {entry.repeated ? " · Repeated text (excluded from PBs)" : ""}
        </p>

        {entry.samples && entry.samples.length >= 2 ? (
          <WpmChart
            samples={entry.samples}
            errorSeconds={entry.errorSeconds}
            elapsedSec={entry.elapsed}
            defaultOpen
          />
        ) : (
          <p className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-[13px] text-muted-foreground">
            Per-second timeline samples were not recorded for this older run.
          </p>
        )}

        {entry.mistakes && Object.keys(entry.mistakes).length > 0 ? (
          <ProblemKeys mistakes={entry.mistakes} label="Run problem keys" />
        ) : null}

        {entry.slowWords && entry.slowWords.length > 0 ? (
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="text-[13px] font-semibold text-muted-foreground">Slowest words</div>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[13px] tabular-nums">
              {entry.slowWords.map((sw) => (
                <span key={sw.word} className="text-foreground">
                  {sw.word}{" "}
                  <span className="font-sans text-muted-foreground">
                    ({sw.wpm} wpm · {sw.avgMs}ms)
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {entry.missedWords && entry.missedWords.length > 0 ? (
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="text-[13px] font-semibold text-muted-foreground">
              Missed words in this run
            </div>
            <p className="mt-1 font-mono text-[13px] text-destructive">
              {entry.missedWords.join(", ")}
            </p>
          </div>
        ) : null}

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            onClick={() => {
              onDeleteRun(entry);
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="size-3.5" />
            Delete run
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
