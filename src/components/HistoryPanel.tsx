import type { HistoryEntry } from "@/lib/typingStats";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
}

export function HistoryPanel({ history, onClear }: Props) {
  const best = history.reduce((m, h) => Math.max(m, h.wpm), 0);
  const avg = history.length
    ? history.reduce((a, h) => a + h.wpm, 0) / history.length
    : 0;
  const max = Math.max(best, 40);
  const chart = history.slice(0, 20).reverse();

  return (
    <section className="panel p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Progress
        </h2>
        {history.length > 0 ? (
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Finish a run to start tracking your speed over time.
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Best
              </div>
              <div className="font-mono text-2xl font-semibold text-primary tabular-nums">
                {best.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Average
              </div>
              <div className="font-mono text-2xl font-semibold tabular-nums">
                {avg.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Runs
              </div>
              <div className="font-mono text-2xl font-semibold tabular-nums">
                {history.length}
              </div>
            </div>
          </div>

          <div className="mt-5 flex h-28 items-end gap-1.5">
            {chart.map((h) => (
              <div
                key={h.id}
                title={`${h.wpm} WPM · ${h.accuracy}% · ${h.difficulty}`}
                className="flex-1 rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
                style={{ height: `${Math.max(6, (h.wpm / max) * 100)}%` }}
              />
            ))}
          </div>

          <ul className="mt-5 divide-y divide-border/70 text-sm">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  {new Date(h.date).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                    {h.difficulty}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  <span className="text-primary">{h.wpm.toFixed(0)}</span> wpm ·{" "}
                  {h.accuracy.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
