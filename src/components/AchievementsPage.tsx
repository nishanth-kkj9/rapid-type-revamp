import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Lock, Trophy } from "lucide-react";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS,
  getAllAchievementsProgress,
  getNextUpAchievements,
  type AchievementCategory,
  type AchievementState,
} from "@/lib/achievements";
import type { HistoryEntry } from "@/lib/typingStats";

interface AchievementsPageProps {
  achState: AchievementState;
  history: HistoryEntry[];
  longestStreak: number;
  onBack: () => void;
}

type StatusFilter = "all" | "unlocked" | "locked";

function formatUnlockDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {
    // fallback
  }
  return iso.slice(0, 10);
}

const CATEGORY_LABEL: Record<AchievementCategory, string> = Object.fromEntries(
  ACHIEVEMENT_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<AchievementCategory, string>;

export function AchievementsPage({
  achState,
  history,
  longestStreak,
  onBack,
}: AchievementsPageProps) {
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const fallbackCtx = useMemo(() => ({ history, longestStreak }), [history, longestStreak]);

  const allProgress = useMemo(
    () => getAllAchievementsProgress(achState, fallbackCtx),
    [achState, fallbackCtx],
  );

  const nextUp = useMemo(
    () => getNextUpAchievements(achState, fallbackCtx, 3),
    [achState, fallbackCtx],
  );

  const unlockedCount = allProgress.filter((p) => p.unlockedAt !== null).length;
  const totalCount = ACHIEVEMENTS.length;
  const overallPercent = Math.round((unlockedCount / Math.max(1, totalCount)) * 100);

  const filtered = useMemo(() => {
    return allProgress.filter((item) => {
      if (category !== "all" && item.def.category !== category) return false;
      if (status === "unlocked" && !item.unlockedAt) return false;
      if (status === "locked" && item.unlockedAt) return false;
      return true;
    });
  }, [allProgress, category, status]);

  return (
    <section aria-label="Achievements" className="mt-4 space-y-6">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <h2 className="font-mono text-xl font-bold tracking-tight sm:text-2xl">
                Achievements
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track speed, accuracy, pacing, volume, daily streaks, key mastery, and arcade
              milestones.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right font-mono tabular-nums">
              <div className="text-lg font-bold text-primary">
                {unlockedCount} / {totalCount}
              </div>
              <div className="text-xs text-muted-foreground">{overallPercent}% complete</div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="size-3.5" />
              Back to Drill
            </button>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        {nextUp.length > 0 ? (
          <div className="mt-5 border-t border-border/70 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Closest to Unlocking
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {nextUp.map((item) => (
                <div
                  key={item.def.id}
                  className="rounded-xl border border-border/80 bg-secondary/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{CATEGORY_LABEL[item.def.category]}</span>
                    <span className="font-mono tabular-nums font-semibold text-primary">
                      {item.percent}%
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{item.def.title}</div>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.def.description}
                  </p>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {item.current.toLocaleString()} / {item.target.toLocaleString()} {item.def.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              category === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({totalCount})
          </button>
          {ACHIEVEMENT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                category === c.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "unlocked", "locked"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                status === st
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "locked" ? "In Progress" : st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          No achievements match the selected filter yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const unlocked = item.unlockedAt !== null;
            return (
              <article
                key={item.def.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  unlocked ? "border-primary/45 bg-primary/8" : "border-border bg-card"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{CATEGORY_LABEL[item.def.category]}</span>
                    {unlocked ? (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-primary">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        <span>{formatUnlockDate(item.unlockedAt!)}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Lock className="size-3" aria-hidden="true" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1.5 text-sm font-semibold text-foreground">{item.def.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.def.description}
                  </p>
                </div>

                <div className="mt-3 pt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full transition-all duration-300 ${
                        unlocked ? "bg-accent" : "bg-primary"
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                    <span>
                      {item.current.toLocaleString()} / {item.target.toLocaleString()}{" "}
                      {item.def.unit}
                    </span>
                    <span>{item.percent}%</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
