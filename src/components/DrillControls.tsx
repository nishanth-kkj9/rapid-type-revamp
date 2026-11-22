import { useEffect, useRef, useState } from "react";
import { BookOpen, FileText, Quote, Timer, X } from "lucide-react";
import type { CustomTextEntry } from "@/lib/customTexts";
import {
  CUSTOM_DURATION_MAX,
  CUSTOM_DURATION_MIN,
  CUSTOM_DURATION_STEP,
  CUSTOM_WORD_MAX,
  CUSTOM_WORD_MIN,
  DRILL_DURATIONS,
  DRILL_QUOTE_LENGTHS,
  DRILL_WORD_COUNTS,
  clampCustomDuration,
  clampCustomWordCount,
  getDrillMode,
  getQuoteLength,
  getWordCount,
  type DrillMode,
  type DrillSettings,
} from "@/lib/drillSettings";
import { TextOptionsPopover } from "./TextOptionsPopover";

interface DrillControlsProps {
  settings: DrillSettings;
  focusDimmed: boolean;
  activeCustomText?: CustomTextEntry | null | undefined;
  onUpdateSettings: (patch: Partial<DrillSettings>) => void;
  onOpenCustomText?: (() => void) | undefined;
  onClearCustomText?: (() => void) | undefined;
}

const PRESET_DURATION_SET = new Set<number>(DRILL_DURATIONS);
const PRESET_WORD_SET = new Set<number>(DRILL_WORD_COUNTS);

export function DrillControls({
  settings,
  focusDimmed,
  activeCustomText,
  onUpdateSettings,
  onOpenCustomText,
  onClearCustomText,
}: DrillControlsProps) {
  const drillMode = getDrillMode(settings);
  const wordCount = getWordCount(settings);
  const quoteLength = getQuoteLength(settings);

  const isCustomDuration = drillMode === "time" && !PRESET_DURATION_SET.has(settings.duration);
  const isCustomWords = drillMode === "words" && !PRESET_WORD_SET.has(wordCount);

  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const customRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomOpen(false);
  }, [drillMode]);

  useEffect(() => {
    if (!customOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (customRootRef.current && !customRootRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setCustomOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [customOpen]);

  const setDrillMode = (m: DrillMode) =>
    onUpdateSettings({
      drillMode: m,
      textStyle: undefined,
      includePunctuation: undefined,
      includeNumbers: undefined,
      includeCapitals: undefined,
    });

  const openCustomPopover = () => {
    setCustomDraft(String(drillMode === "time" ? settings.duration : wordCount));
    setCustomOpen((prev) => !prev);
  };

  const applyCustomLength = () => {
    const parsed = Number(customDraft);
    if (drillMode === "time") {
      onUpdateSettings({ duration: clampCustomDuration(parsed) });
    } else if (drillMode === "words") {
      onUpdateSettings({ wordCount: clampCustomWordCount(parsed) });
    }
    setCustomOpen(false);
  };

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/90 px-2.5 py-2 transition-opacity duration-300 ${
        focusDimmed ? "focus-dimmed" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Test mode" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDrillMode("time")}
            aria-pressed={drillMode === "time"}
            className={`flex min-h-11 sm:min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              drillMode === "time"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Timer className="size-3.5" />
            Time
          </button>
          <button
            type="button"
            onClick={() => setDrillMode("words")}
            aria-pressed={drillMode === "words"}
            className={`flex min-h-11 sm:min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              drillMode === "words"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="size-3.5" />
            Words
          </button>
          <button
            type="button"
            onClick={() => setDrillMode("quote")}
            aria-pressed={drillMode === "quote"}
            className={`flex min-h-11 sm:min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              drillMode === "quote"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Quote className="size-3.5" />
            Quote
          </button>
        </div>

        <span aria-hidden="true" className="hidden text-border sm:inline">
          |
        </span>

        {drillMode === "time" ? (
          <div
            ref={customRootRef}
            role="group"
            aria-label="Duration"
            className="relative flex flex-wrap items-center gap-1"
          >
            {DRILL_DURATIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => onUpdateSettings({ duration: s })}
                aria-pressed={settings.duration === s}
                className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg px-2.5 py-1 text-[13px] tabular-nums whitespace-nowrap shrink-0 transition-colors ${
                  settings.duration === s
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}s
              </button>
            ))}
            <button
              type="button"
              onClick={openCustomPopover}
              aria-pressed={isCustomDuration}
              aria-expanded={customOpen}
              aria-haspopup="dialog"
              className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg px-2.5 py-1 text-[13px] tabular-nums whitespace-nowrap shrink-0 transition-colors ${
                isCustomDuration
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isCustomDuration ? `${settings.duration}s` : "Custom"}
            </button>

            {customOpen ? (
              <div
                role="dialog"
                aria-label="Set custom duration"
                className="absolute left-0 top-full z-30 mt-2 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-border bg-popover p-2.5"
              >
                <input
                  type="number"
                  min={CUSTOM_DURATION_MIN}
                  max={CUSTOM_DURATION_MAX}
                  step={CUSTOM_DURATION_STEP}
                  aria-label="Custom duration in seconds"
                  value={customDraft}
                  autoFocus
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCustomLength();
                    }
                  }}
                  className="h-11 w-20 rounded-md border border-input bg-background px-2 font-mono text-[13px] tabular-nums text-foreground sm:h-8"
                />
                <span className="text-[13px] text-muted-foreground">sec</span>
                <button
                  type="button"
                  onClick={applyCustomLength}
                  className="h-11 cursor-pointer rounded-md bg-primary px-2.5 text-[13px] font-semibold text-primary-foreground sm:h-8"
                >
                  Apply
                </button>
              </div>
            ) : null}
          </div>
        ) : drillMode === "words" ? (
          <div
            ref={customRootRef}
            role="group"
            aria-label="Word count"
            className="relative flex flex-wrap items-center gap-1"
          >
            {DRILL_WORD_COUNTS.map((cnt) => (
              <button
                type="button"
                key={cnt}
                onClick={() => onUpdateSettings({ wordCount: cnt })}
                aria-pressed={wordCount === cnt}
                className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg px-2.5 py-1 text-[13px] tabular-nums whitespace-nowrap shrink-0 transition-colors ${
                  wordCount === cnt
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cnt}w
              </button>
            ))}
            <button
              type="button"
              onClick={openCustomPopover}
              aria-pressed={isCustomWords}
              aria-expanded={customOpen}
              aria-haspopup="dialog"
              className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg px-2.5 py-1 text-[13px] tabular-nums whitespace-nowrap shrink-0 transition-colors ${
                isCustomWords
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isCustomWords ? `${wordCount}w` : "Custom"}
            </button>

            {customOpen ? (
              <div
                role="dialog"
                aria-label="Set custom word count"
                className="absolute left-0 top-full z-30 mt-2 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-border bg-popover p-2.5"
              >
                <input
                  type="number"
                  min={CUSTOM_WORD_MIN}
                  max={CUSTOM_WORD_MAX}
                  step={1}
                  aria-label="Custom word count"
                  value={customDraft}
                  autoFocus
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCustomLength();
                    }
                  }}
                  className="h-11 w-20 rounded-md border border-input bg-background px-2 font-mono text-[13px] tabular-nums text-foreground sm:h-8"
                />
                <span className="text-[13px] text-muted-foreground">words</span>
                <button
                  type="button"
                  onClick={applyCustomLength}
                  className="h-11 cursor-pointer rounded-md bg-primary px-2.5 text-[13px] font-semibold text-primary-foreground sm:h-8"
                >
                  Apply
                </button>
              </div>
            ) : null}
          </div>
        ) : !activeCustomText ? (
          <div role="group" aria-label="Quote length" className="flex flex-wrap items-center gap-1">
            {DRILL_QUOTE_LENGTHS.map((ql) => (
              <button
                type="button"
                key={ql}
                onClick={() => onUpdateSettings({ quoteLength: ql })}
                aria-pressed={quoteLength === ql}
                className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg px-2.5 py-1 text-[13px] font-medium capitalize whitespace-nowrap shrink-0 transition-colors ${
                  quoteLength === ql
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ql}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TextOptionsPopover
          settings={settings}
          drillMode={drillMode}
          hasCustomText={Boolean(activeCustomText)}
          onUpdateSettings={onUpdateSettings}
        />

        {onOpenCustomText ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenCustomText}
              className={`inline-flex min-h-11 sm:min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeCustomText
                  ? "border-primary/50 bg-primary/15 font-semibold text-foreground"
                  : "border-border bg-secondary/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5 text-primary" />
              {activeCustomText ? `Custom: ${activeCustomText.name}` : "Custom Text"}
            </button>
            {activeCustomText && onClearCustomText ? (
              <button
                type="button"
                aria-label="Clear custom text"
                onClick={onClearCustomText}
                className="inline-flex min-h-11 sm:min-h-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary/70 px-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
