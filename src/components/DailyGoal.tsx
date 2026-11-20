import { memo } from "react";
import { Flame, Settings2, Snowflake, Target, Trophy } from "lucide-react";
import { getEffectiveDaily, getLocalDateString, type DailyState } from "@/lib/daily";

interface Props {
  daily: DailyState | null;
  onOpenGoalSettings?: (() => void) | undefined;
}

function formatActiveMinutes(activeSeconds: number): string {
  const mins = activeSeconds / 60;
  if (mins >= 10 || Math.abs(mins - Math.round(mins)) < 0.05) {
    return `${Math.round(mins)}`;
  }
  return mins.toFixed(1);
}

export const DailyGoal = memo(function DailyGoal({ daily, onOpenGoalSettings }: Props) {
  const today = getLocalDateString();
  const eff = getEffectiveDaily(daily, today);

  const progressText =
    eff.goalType === "minutes"
      ? `${formatActiveMinutes(eff.activeSecondsToday)}/${eff.goalTarget} min active today`
      : `${eff.runsToday}/${eff.goalTarget} runs today`;

  return (
    <div
      aria-label="Daily goal progress"
      className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3.5 py-2 text-xs shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
          <Target className="size-3.5 shrink-0 text-primary" />
          <span>Daily Goal</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="font-mono tabular-nums text-muted-foreground">{progressText}</span>

          {eff.streak > 0 ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span
                className="flex items-center gap-1 font-mono font-semibold tabular-nums text-primary"
                title={`${eff.streak} day streak`}
              >
                <Flame className="size-3 fill-primary/20 text-primary" />
                <span>{eff.streak}d streak</span>
              </span>
            </>
          ) : null}

          {eff.longestStreak > 0 ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span
                className="flex items-center gap-1 font-mono tabular-nums text-muted-foreground"
                title={`Longest streak: ${eff.longestStreak} days`}
              >
                <Trophy className="size-3 text-primary/80" />
                <span>Best {eff.longestStreak}d</span>
              </span>
            </>
          ) : null}

          {eff.freezeEnabled ? (
            <>
              <span aria-hidden="true" className="hidden text-muted-foreground sm:inline">
                ·
              </span>
              <span
                className={`hidden items-center gap-1 font-mono text-[11px] sm:inline-flex ${
                  eff.freezeActive
                    ? "text-accent"
                    : eff.freezeAvailable
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                }`}
                title={
                  eff.freezeActive
                    ? "Weekly freeze is protecting your streak after 1 missed day"
                    : eff.freezeAvailable
                      ? "Weekly streak freeze ready (1 missed day forgiven per 7 days)"
                      : "Weekly streak freeze on cooldown"
                }
              >
                <Snowflake className="size-3" />
                <span>
                  {eff.freezeActive
                    ? "Freeze active"
                    : eff.freezeAvailable
                      ? "Freeze ready"
                      : "Freeze used"}
                </span>
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {eff.goalMetToday ? (
            <span className="font-mono text-[11px] font-semibold text-accent">Goal met</span>
          ) : null}
          {onOpenGoalSettings ? (
            <button
              type="button"
              onClick={onOpenGoalSettings}
              aria-label="Configure daily goal"
              title="Configure daily goal"
              className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Settings2 className="size-3.5" />
              <span className="hidden sm:inline">Goal</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all duration-300 ${
            eff.goalMetToday ? "bg-accent" : "bg-primary"
          }`}
          style={{ width: `${eff.progressPercent}%` }}
        />
      </div>
    </div>
  );
});
