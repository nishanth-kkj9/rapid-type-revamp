import { Gauge, ShieldAlert, Sparkles, Target, Timer } from "lucide-react";
import type { DailyGoalConfig, DailyState } from "@/lib/daily";
import {
  CUSTOM_DURATION_MAX,
  CUSTOM_DURATION_MIN,
  CUSTOM_DURATION_STEP,
  CUSTOM_WORD_MAX,
  CUSTOM_WORD_MIN,
  DRILL_DURATIONS,
  DRILL_QUOTE_LENGTHS,
  DRILL_WORD_COUNTS,
  PACE_CARET_OPTIONS,
  QUICK_RESTART_OPTIONS,
  STRICT_MODES,
  clampCustomDuration,
  clampCustomWordCount,
  getDrillMode,
  getPaceCaret,
  getQuickRestart,
  getQuoteLength,
  getStrictMode,
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
  const quickRestart = getQuickRestart(drillSettings);
  const strictMode = getStrictMode(drillSettings);
  const paceCaret = getPaceCaret(drillSettings);

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
              {m === "time" ? "Practice" : m === "words" ? "Word Count" : "Literary Quote"}
            </button>
          ))}
        </div>

        {drillMode === "time" ? (
          <div className="space-y-2">
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
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
              <label htmlFor="settings-custom-duration" className="text-xs text-muted-foreground">
                Custom duration ({CUSTOM_DURATION_MIN}–{CUSTOM_DURATION_MAX}s, step{" "}
                {CUSTOM_DURATION_STEP}s)
              </label>
              <input
                id="settings-custom-duration"
                type="number"
                min={CUSTOM_DURATION_MIN}
                max={CUSTOM_DURATION_MAX}
                step={CUSTOM_DURATION_STEP}
                value={drillSettings.duration}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (!Number.isNaN(parsed)) {
                    onUpdateDrill({ duration: clampCustomDuration(parsed) });
                  }
                }}
                className="w-24 rounded-md border border-border bg-background px-2.5 py-1 text-right font-mono text-xs tabular-nums text-foreground"
              />
            </div>
          </div>
        ) : drillMode === "words" ? (
          <div className="space-y-2">
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
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
              <label htmlFor="settings-custom-words" className="text-xs text-muted-foreground">
                Custom word count ({CUSTOM_WORD_MIN}–{CUSTOM_WORD_MAX})
              </label>
              <input
                id="settings-custom-words"
                type="number"
                min={CUSTOM_WORD_MIN}
                max={CUSTOM_WORD_MAX}
                step={1}
                value={wordCount}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (!Number.isNaN(parsed)) {
                    onUpdateDrill({ wordCount: clampCustomWordCount(parsed) });
                  }
                }}
                className="w-24 rounded-md border border-border bg-background px-2.5 py-1 text-right font-mono text-xs tabular-nums text-foreground"
              />
            </div>
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
            <ShieldAlert className="size-3.5 text-primary" />
            Strict Error Discipline
          </h3>
          <span className="font-mono text-xs font-semibold capitalize text-primary">
            {strictMode}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STRICT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={strictMode === m.id}
              onClick={() => onUpdateDrill({ strictMode: m.id })}
              className={`flex min-h-10 cursor-pointer flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                strictMode === m.id
                  ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs font-semibold">{m.label}</span>
              <span className="mt-0.5 text-[11px] opacity-80">{m.description}</span>
            </button>
          ))}
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Gauge className="size-3.5 text-primary" />
              Live Pace Caret
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Show a secondary pace marker tracking your personal best run in Time and Words drills
            </div>
          </div>
          <div className="flex gap-1.5">
            {PACE_CARET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={paceCaret === opt.id}
                onClick={() => onUpdateDrill({ paceCaret: opt.id })}
                className={`min-h-9 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  paceCaret === opt.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SettingsDailyGoalSection daily={daily} onUpdateDailyGoal={onUpdateDailyGoal} />

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="text-xs font-semibold text-foreground">Live Metrics During Run</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Show live WPM and accuracy in the compact strip above the passage while typing (full
              results are always shown when the run finishes)
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="text-xs font-semibold text-foreground">Quick Restart Key</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
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
                className={`min-h-9 cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
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
      </div>
    </div>
  );
}
