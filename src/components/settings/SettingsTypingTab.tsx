import { Sparkles, Target, Timer } from "lucide-react";
import type { DailyGoalConfig, DailyState } from "@/lib/daily";
import {
  DRILL_DURATIONS,
  DRILL_QUOTE_LENGTHS,
  DRILL_WORD_COUNTS,
  getDrillMode,
  getQuoteLength,
  getTabToRestart,
  getWordCount,
  type CaretStyle,
  type DrillMode,
  type DrillSettings,
} from "@/lib/drillSettings";
import { SettingsDailyGoalSection } from "./SettingsDailyGoalSection";

const CARET_STYLES: { id: CaretStyle; label: string; preview: string }[] = [
  { id: "smooth", label: "Smooth Pulse", preview: "▌" },
  { id: "block", label: "Block", preview: "█" },
  { id: "bar", label: "Thin Bar", preview: "|" },
  { id: "underline", label: "Underline", preview: "_" },
];

const TARGET_WPM_PRESETS = [40, 60, 80, 100, 120];

interface SettingsTypingTabProps {
  drillSettings: DrillSettings;
  daily: DailyState | null;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
  onUpdateDailyGoal: (config: DailyGoalConfig) => void;
}

export function SettingsTypingTab({
  drillSettings,
  daily,
  onUpdateDrill,
  onUpdateDailyGoal,
}: SettingsTypingTabProps) {
  const drillMode = getDrillMode(drillSettings);
  const wordCount = getWordCount(drillSettings);
  const quoteLength = getQuoteLength(drillSettings);
  const tabToRestart = getTabToRestart(drillSettings);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Timer className="size-3.5 text-primary" />
            Default Test Type &amp; Length
          </h3>
          <span className="font-mono text-xs font-semibold capitalize text-primary">
            {drillMode}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["time", "words", "quote"] as DrillMode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={drillMode === m}
              onClick={() => onUpdateDrill({ drillMode: m })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                drillMode === m
                  ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "time" ? "Timed Drill" : m === "words" ? "Word Count" : "Literary Quote"}
            </button>
          ))}
        </div>

        {drillMode === "time" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DRILL_DURATIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                aria-pressed={drillSettings.duration === sec}
                onClick={() => onUpdateDrill({ duration: sec })}
                className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 font-mono text-xs font-medium transition-colors ${
                  drillSettings.duration === sec
                    ? "border-accent bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        ) : drillMode === "words" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DRILL_WORD_COUNTS.map((cnt) => (
              <button
                key={cnt}
                type="button"
                aria-pressed={wordCount === cnt}
                onClick={() => onUpdateDrill({ wordCount: cnt })}
                className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 font-mono text-xs font-medium transition-colors ${
                  wordCount === cnt
                    ? "border-accent bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cnt} words
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {DRILL_QUOTE_LENGTHS.map((ql) => (
              <button
                key={ql}
                type="button"
                aria-pressed={quoteLength === ql}
                onClick={() => onUpdateDrill({ quoteLength: ql })}
                className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  quoteLength === ql
                    ? "border-accent bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {ql} quotes
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="settings-target-wpm"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <Target className="size-3.5 text-primary" />
            Target WPM Goal
          </label>
          <span className="font-mono text-xs font-bold text-primary">
            {drillSettings.targetWpm} WPM
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {TARGET_WPM_PRESETS.map((wpm) => (
            <button
              key={wpm}
              type="button"
              aria-pressed={drillSettings.targetWpm === wpm}
              onClick={() => onUpdateDrill({ targetWpm: wpm })}
              className={`min-h-10 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
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
          <span className="font-mono text-xs text-muted-foreground">20</span>
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
          <span className="font-mono text-xs text-muted-foreground">160</span>
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Caret Style
          </h3>
          <span className="font-mono text-xs font-semibold capitalize text-primary">
            {drillSettings.caretStyle}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CARET_STYLES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={drillSettings.caretStyle === c.id}
              onClick={() => onUpdateDrill({ caretStyle: c.id })}
              className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                drillSettings.caretStyle === c.id
                  ? "border-primary bg-primary/15 font-semibold text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-mono font-bold text-primary">{c.preview}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SettingsDailyGoalSection daily={daily} onUpdateDailyGoal={onUpdateDailyGoal} />

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="text-xs font-semibold text-foreground">Live Metrics During Run</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Hide the live WPM, Accuracy, and Consistency stat cards while typing (full results are
              still shown when the run finishes)
            </div>
          </div>
          <button
            type="button"
            aria-pressed={drillSettings.showLiveWpm}
            onClick={() => onUpdateDrill({ showLiveWpm: !drillSettings.showLiveWpm })}
            className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              drillSettings.showLiveWpm
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {drillSettings.showLiveWpm ? "Visible" : "Hidden"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="text-xs font-semibold text-foreground">Tab Key Quick Restart</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Restart immediately with Tab instead of moving focus (Esc always restarts; keep off
              for standard keyboard navigation)
            </div>
          </div>
          <button
            type="button"
            aria-pressed={tabToRestart}
            onClick={() => onUpdateDrill({ tabToRestart: !tabToRestart })}
            className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tabToRestart
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabToRestart ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>
    </div>
  );
}
