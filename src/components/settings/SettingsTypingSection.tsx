import { useState } from "react";
import {
  getEffectiveDaily,
  getLocalDateString,
  MAX_GOAL_MINUTES,
  sanitizeGoalTarget,
  type DailyGoalConfig,
  type DailyState,
} from "@/lib/daily";
import {
  QUICK_RESTART_OPTIONS,
  getQuickRestart,
  type CaretStyle,
  type DrillSettings,
  type DrillSound,
} from "@/lib/drillSettings";

const TARGET_WPM_PRESETS = [40, 60, 80, 100, 120];
const MINUTE_PRESETS = [3, 5, 10, 15, 30];

const CARET_STYLES: { id: CaretStyle; label: string }[] = [
  { id: "smooth", label: "Smooth Pulse" },
  { id: "block", label: "Block" },
  { id: "bar", label: "Thin Bar" },
  { id: "underline", label: "Underline" },
];

const KEY_SOUND_OPTIONS: { id: DrillSound; label: string }[] = [
  { id: "click", label: "Mechanical Click" },
  { id: "beep", label: "Soft Beep" },
  { id: "off", label: "Off" },
];

interface SettingsTypingSectionProps {
  drillSettings: DrillSettings;
  daily: DailyState | null;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
  onUpdateDailyGoal: (config: DailyGoalConfig) => void;
}

export function SettingsTypingSection({
  drillSettings,
  daily,
  onUpdateDrill,
  onUpdateDailyGoal,
}: SettingsTypingSectionProps) {
  const quickRestart = getQuickRestart(drillSettings);
  const effDaily = getEffectiveDaily(daily, getLocalDateString());
  const [goalTargetInput, setGoalTargetInput] = useState(effDaily.goalTarget);

  const applyDailyGoal = (nextTarget: number) => {
    const cleanTarget = sanitizeGoalTarget(nextTarget);
    setGoalTargetInput(cleanTarget);
    onUpdateDailyGoal({ goalTarget: cleanTarget });
  };

  return (
    <section aria-labelledby="settings-typing-heading" className="space-y-5">
      <h3 id="settings-typing-heading" className="text-base font-semibold text-foreground">
        Typing
      </h3>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="settings-target-wpm" className="text-sm font-medium text-foreground">
            Target WPM
          </label>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-primary">
            {drillSettings.targetWpm} WPM
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TARGET_WPM_PRESETS.map((wpm) => (
            <button
              key={wpm}
              type="button"
              aria-pressed={drillSettings.targetWpm === wpm}
              onClick={() => onUpdateDrill({ targetWpm: wpm })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors ${
                drillSettings.targetWpm === wpm
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {wpm}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">20</span>
          <input
            id="settings-target-wpm"
            type="range"
            min="20"
            max="160"
            step="5"
            value={drillSettings.targetWpm}
            onChange={(e) => onUpdateDrill({ targetWpm: parseInt(e.target.value, 10) })}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
          />
          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">160</span>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border/60 pt-4">
        <div className="text-sm font-medium text-foreground">Daily goal (minutes)</div>
        <div className="flex flex-wrap items-center gap-2">
          {MINUTE_PRESETS.map((val) => (
            <button
              key={val}
              type="button"
              aria-pressed={effDaily.goalTarget === val}
              onClick={() => applyDailyGoal(val)}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors ${
                effDaily.goalTarget === val
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {val}m
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[13px] text-muted-foreground">
            <span>Custom:</span>
            <input
              type="number"
              aria-label="Custom daily goal target"
              min={1}
              max={MAX_GOAL_MINUTES}
              value={goalTargetInput}
              onChange={(e) => applyDailyGoal(Number(e.target.value))}
              className="h-10 w-18 rounded-lg border border-border bg-secondary px-2 text-center font-mono text-[13px] font-semibold tabular-nums text-foreground"
            />
          </label>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border/60 pt-4">
        <div className="text-sm font-medium text-foreground">Caret style</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CARET_STYLES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={drillSettings.caretStyle === c.id}
              onClick={() => onUpdateDrill({ caretStyle: c.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                drillSettings.caretStyle === c.id
                  ? "border-primary bg-primary/15 font-semibold text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <div className="text-sm font-medium text-foreground">Live metrics during run</div>
          <div className="text-[13px] text-muted-foreground">
            Show live WPM and accuracy above the passage while typing
          </div>
        </div>
        <button
          type="button"
          aria-pressed={drillSettings.showLiveWpm}
          aria-label={`Live metrics during run: ${drillSettings.showLiveWpm ? "Visible" : "Hidden"}`}
          onClick={() => onUpdateDrill({ showLiveWpm: !drillSettings.showLiveWpm })}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            drillSettings.showLiveWpm
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {drillSettings.showLiveWpm ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <div className="text-sm font-medium text-foreground">Quick restart key</div>
          <div className="text-[13px] text-muted-foreground">
            Esc and Enter ask for a second tap within 1s after 10 chars
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick restart key">
          {QUICK_RESTART_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={quickRestart === opt.id}
              onClick={() => onUpdateDrill({ quickRestart: opt.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                quickRestart === opt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <div className="text-sm font-medium text-foreground">Key sound</div>
          <div className="text-[13px] text-muted-foreground">
            Plays key click or beep sounds during Practice and Learn
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Key sound">
          {KEY_SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={drillSettings.sound === opt.id}
              onClick={() => onUpdateDrill({ sound: opt.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                drillSettings.sound === opt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
