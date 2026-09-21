import { memo } from "react";
import type { DailyState } from "../lib/daily";
import { getEffectiveDaily, getLocalDateString } from "../lib/daily";

interface Props {
  daily: DailyState | null;
}

export const DailyGoal = memo(function DailyGoal({ daily }: Props) {
  const today = getLocalDateString();
  const { streak, runsToday } = getEffectiveDaily(daily, today);
  const goal = 3;
  const progress = Math.min(100, Math.round((runsToday / goal) * 100));

  return (
    <div
      aria-label="Daily goal progress"
      className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3.5 py-2 text-xs shadow-xs"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span aria-hidden="true">🔥</span>
          <span>{streak}-day streak</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {runsToday}/{goal} runs today
          </span>
        </span>
        {runsToday >= goal && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
            Goal met
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all duration-300 ${
            runsToday >= goal ? "bg-accent" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});
