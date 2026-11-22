import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Target, Trash2, Trophy, Zap } from "lucide-react";
import type { HistoryEntry } from "@/lib/typingStats";

interface HistoryShooterViewProps {
  shooterAll: HistoryEntry[];
  onSelectRun: (entry: HistoryEntry) => void;
  onDeleteRun: (entry: HistoryEntry) => void;
}

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;
const DATE_RANGES = [
  { id: "all", label: "All time", days: null },
  { id: "7d", label: "7d", days: 7 },
  { id: "30d", label: "30d", days: 30 },
  { id: "90d", label: "90d", days: 90 },
] as const;

type DifficultyFilter = (typeof DIFFICULTIES)[number];
type DateRangeFilter = (typeof DATE_RANGES)[number]["id"];

const PAGE_SIZE = 12;

export function HistoryShooterView({
  shooterAll,
  onSelectRun,
  onDeleteRun,
}: HistoryShooterViewProps) {
  const [shooterDifficulty, setShooterDifficulty] = useState<DifficultyFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const rangeDef = DATE_RANGES.find((r) => r.id === dateRange);
    const cutoffMs =
      rangeDef && rangeDef.days !== null ? Date.now() - rangeDef.days * 86_400_000 : null;

    return shooterAll.filter((h) => {
      if (shooterDifficulty !== "all" && h.difficulty.toLowerCase() !== shooterDifficulty) {
        return false;
      }
      if (cutoffMs !== null && h.date < cutoffMs) return false;
      return true;
    });
  }, [shooterAll, shooterDifficulty, dateRange]);

  const highScore = useMemo(
    () =>
      filtered.reduce((m, h) => {
        if (h.practiceMode) return m;
        return Math.max(m, h.score ?? Math.round(h.wpm * 10));
      }, 0),
    [filtered],
  );
  const bestLevel = useMemo(
    () => filtered.reduce((m, h) => Math.max(m, h.level ?? 1), filtered.length > 0 ? 1 : 0),
    [filtered],
  );
  const avgScore = useMemo(
    () =>
      filtered.length
        ? filtered.reduce((a, h) => a + (h.score ?? Math.round(h.wpm * 10)), 0) / filtered.length
        : 0,
    [filtered],
  );
  const avgAccuracy = useMemo(
    () => (filtered.length ? filtered.reduce((a, h) => a + h.accuracy, 0) / filtered.length : 0),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="mt-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Difficulty:
          </span>
          {DIFFICULTIES.map((diff) => {
            const active = shooterDifficulty === diff;
            return (
              <button
                key={diff}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setShooterDifficulty(diff);
                  setPage(1);
                }}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {diff}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Range:
          </span>
          {DATE_RANGES.map((r) => {
            const active = dateRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setDateRange(r.id);
                  setPage(1);
                }}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {shooterAll.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No Word Shooter games recorded yet. Launch Word Shooter to battle falling words!
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No games found matching the selected filters.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <Trophy className="size-3 text-primary" />
                High Score
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-primary">
                {highScore.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <Zap className="size-3 text-accent" />
                Best Level
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
                Lvl {bestLevel}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Average Score
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums">
                {Math.round(avgScore).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <Target className="size-3 text-primary" />
                Accuracy
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-primary">
                {avgAccuracy.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Games Played
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums">{filtered.length}</div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">
                Shooter Battles ({startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length})
              </span>
              <span>Click any battle to inspect</span>
            </div>
            <ul className="divide-y divide-border/70 rounded-xl border border-border/70 bg-card/60 text-sm">
              {pageItems.map((h) => {
                const score = h.score ?? Math.round(h.wpm * 10);
                const lvl = h.level ?? 1;
                const words = h.wordsDestroyed ?? h.correct ?? 0;
                return (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-secondary/30"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectRun(h)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left"
                    >
                      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                        {new Date(h.date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · <span className="capitalize text-foreground">{h.difficulty}</span> ·{" "}
                        <span className="font-semibold text-destructive">Lvl {lvl}</span>
                        {h.practiceMode ? (
                          <span className="ml-1 rounded bg-accent/15 px-1 py-0.5 text-[10px] text-accent">
                            Practice
                          </span>
                        ) : null}
                        {h.dailyChallengeDate ? (
                          <span className="ml-1 rounded bg-primary/15 px-1 py-0.5 text-[10px] text-primary">
                            Daily
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums sm:text-sm">
                        <strong className="font-semibold text-primary">
                          {score.toLocaleString()}
                        </strong>{" "}
                        pts · <span className="text-foreground">{words} words</span> ·{" "}
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {h.accuracy.toFixed(0)}% acc
                          {h.hitRate !== undefined ? ` · ${h.hitRate.toFixed(0)}% hit` : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRun(h)}
                      aria-label="Delete battle"
                      title="Delete battle"
                      className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </button>
                <span className="font-mono">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
