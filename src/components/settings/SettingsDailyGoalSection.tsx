import { useState } from "react";
import { Clock, Hash, Snowflake } from "lucide-react";
import {
  DEFAULT_GOAL_MINUTES,
  DEFAULT_GOAL_RUNS,
  getEffectiveDaily,
  getLocalDateString,
  sanitizeGoalTarget,
  type DailyGoalConfig,
  type DailyState,
  type GoalType,
} from "@/lib/daily";

const MINUTE_PRESETS = [3, 5, 10, 15, 30];
const RUN_PRESETS = [1, 3, 5, 10];

interface SettingsDailyGoalSectionProps {
  daily: DailyState | null;
  onUpdateDailyGoal: (config: DailyGoalConfig) => void;
}

export function SettingsDailyGoalSection({
  daily,
  onUpdateDailyGoal,
}: SettingsDailyGoalSectionProps) {
  const eff = getEffectiveDaily(daily, getLocalDateString());
  const [goalTargetInput, setGoalTargetInput] = useState(eff.goalTarget);

  const applyGoal = (nextType: GoalType, nextTarget: number, nextFreeze: boolean) => {
    const cleanTarget = sanitizeGoalTarget(nextType, nextTarget);
    setGoalTargetInput(cleanTarget);
    onUpdateDailyGoal({ goalType: nextType, goalTarget: cleanTarget, freezeEnabled: nextFreeze });
  };

  return (
    <div className="space-y-3 border-t border-border/60 pt-5">
      <h3 className="text-sm font-medium text-muted-foreground">
        Daily practice goal &amp; streak
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={eff.goalType === "minutes"}
          onClick={() => applyGoal("minutes", DEFAULT_GOAL_MINUTES, eff.freezeEnabled)}
          className={`flex min-h-11 cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
            eff.goalType === "minutes"
              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
              : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Clock className="size-3.5 text-primary" />
            Active minutes
          </span>
          <span className="mt-1 text-[13px] text-muted-foreground">Real typing time only</span>
        </button>

        <button
          type="button"
          aria-pressed={eff.goalType === "runs"}
          onClick={() => applyGoal("runs", DEFAULT_GOAL_RUNS, eff.freezeEnabled)}
          className={`flex min-h-11 cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
            eff.goalType === "runs"
              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
              : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Hash className="size-3.5 text-primary" />
            Completed runs
          </span>
          <span className="mt-1 text-[13px] text-muted-foreground">
            Drills or Word Shooter games
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(eff.goalType === "minutes" ? MINUTE_PRESETS : RUN_PRESETS).map((val) => (
          <button
            key={val}
            type="button"
            aria-pressed={eff.goalTarget === val}
            onClick={() => applyGoal(eff.goalType, val, eff.freezeEnabled)}
            className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors ${
              eff.goalTarget === val
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {val}
            {eff.goalType === "minutes" ? "m" : eff.goalTarget === 1 ? " run" : " runs"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted-foreground">
          <span>Custom:</span>
          <input
            type="number"
            aria-label="Custom daily goal target"
            min={1}
            max={eff.goalType === "minutes" ? 120 : 50}
            value={goalTargetInput}
            onChange={(e) => applyGoal(eff.goalType, Number(e.target.value), eff.freezeEnabled)}
            className="h-10 w-18 rounded-lg border border-border bg-secondary px-2 text-center font-mono text-[13px] font-semibold tabular-nums text-foreground"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Snowflake className="size-3.5 text-accent" />
            Weekly streak freeze
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            Automatically forgive 1 missed calendar day every 7 days without resetting your streak
          </div>
        </div>
        <button
          type="button"
          aria-pressed={eff.freezeEnabled}
          onClick={() => applyGoal(eff.goalType, eff.goalTarget, !eff.freezeEnabled)}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            eff.freezeEnabled
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {eff.freezeEnabled ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
