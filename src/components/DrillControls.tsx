import { BookOpen, FileText, Quote, Timer, X } from "lucide-react";
import type { CustomTextEntry } from "@/lib/customTexts";
import {
  DRILL_DIFFICULTIES,
  DRILL_DURATIONS,
  DRILL_QUOTE_LENGTHS,
  DRILL_WORD_COUNTS,
  getDrillMode,
  getQuoteLength,
  getWordCount,
  resolveTextOptions,
  type DrillMode,
  type DrillSettings,
} from "@/lib/drillSettings";

interface DrillControlsProps {
  settings: DrillSettings;
  focusDimmed: boolean;
  activeCustomText?: CustomTextEntry | null | undefined;
  onUpdateSettings: (patch: Partial<DrillSettings>) => void;
  onOpenCustomText?: (() => void) | undefined;
  onClearCustomText?: (() => void) | undefined;
}

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
  const textOpts = resolveTextOptions(settings);

  const setDrillMode = (m: DrillMode) =>
    onUpdateSettings({
      drillMode: m,
      textStyle: undefined,
      includePunctuation: undefined,
      includeNumbers: undefined,
      includeCapitals: undefined,
    });

  return (
    <div
      className={`mt-6 space-y-2.5 transition-opacity duration-300 ${
        focusDimmed ? "focus-dimmed" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Test mode"
            className="flex gap-1 rounded-xl border border-border bg-card p-1"
          >
            <button
              type="button"
              onClick={() => setDrillMode("time")}
              aria-pressed={drillMode === "time"}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                drillMode === "time"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Timer className="size-3" />
              Time
            </button>
            <button
              type="button"
              onClick={() => setDrillMode("words")}
              aria-pressed={drillMode === "words"}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                drillMode === "words"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3" />
              Words
            </button>
            <button
              type="button"
              onClick={() => setDrillMode("quote")}
              aria-pressed={drillMode === "quote"}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                drillMode === "quote"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Quote className="size-3" />
              Quote
            </button>
          </div>

          {drillMode === "time" ? (
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
              {DRILL_DURATIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => onUpdateSettings({ duration: s })}
                  aria-pressed={settings.duration === s}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                    settings.duration === s
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          ) : null}

          {drillMode === "words" ? (
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
              {DRILL_WORD_COUNTS.map((cnt) => (
                <button
                  type="button"
                  key={cnt}
                  onClick={() => onUpdateSettings({ wordCount: cnt })}
                  aria-pressed={wordCount === cnt}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                    wordCount === cnt
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cnt}w
                </button>
              ))}
            </div>
          ) : null}

          {drillMode === "quote" && !activeCustomText ? (
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
              {DRILL_QUOTE_LENGTHS.map((ql) => (
                <button
                  type="button"
                  key={ql}
                  onClick={() => onUpdateSettings({ quoteLength: ql })}
                  aria-pressed={quoteLength === ql}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
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

          {drillMode !== "quote" && !activeCustomText ? (
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
              {DRILL_DIFFICULTIES.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => onUpdateSettings({ difficulty: d })}
                  aria-pressed={settings.difficulty === d}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                    settings.difficulty === d
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="hidden items-center gap-1 font-mono text-[11px] text-muted-foreground sm:flex">
          <kbd className="rounded border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px]">
            Esc
          </kbd>
          <span>restart</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {drillMode !== "quote" && !activeCustomText ? (
          <>
            <div
              role="group"
              aria-label="Text style"
              className="flex gap-1 rounded-lg border border-border bg-card/80 p-0.5"
            >
              {(["sentences", "words"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={textOpts.style === st}
                  onClick={() =>
                    onUpdateSettings({
                      textStyle: st,
                      includePunctuation: st === "sentences",
                      includeCapitals: st === "sentences",
                    })
                  }
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                    textOpts.style === st
                      ? "bg-secondary font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card/80 p-0.5">
              <button
                type="button"
                aria-pressed={textOpts.punctuation}
                onClick={() => onUpdateSettings({ includePunctuation: !textOpts.punctuation })}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  textOpts.punctuation
                    ? "bg-accent/20 font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Punctuation
              </button>
              <button
                type="button"
                aria-pressed={textOpts.numbers}
                onClick={() => onUpdateSettings({ includeNumbers: !textOpts.numbers })}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  textOpts.numbers
                    ? "bg-accent/20 font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Numbers
              </button>
              <button
                type="button"
                aria-pressed={textOpts.capitals}
                onClick={() => onUpdateSettings({ includeCapitals: !textOpts.capitals })}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  textOpts.capitals
                    ? "bg-accent/20 font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Capitals
              </button>
            </div>
          </>
        ) : null}

        {onOpenCustomText ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenCustomText}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeCustomText
                  ? "border-primary/50 bg-primary/15 font-semibold text-foreground"
                  : "border-border bg-card/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3 text-primary" />
              {activeCustomText ? `Custom: ${activeCustomText.name}` : "Custom Text"}
            </button>
            {activeCustomText && onClearCustomText ? (
              <button
                type="button"
                aria-label="Clear custom text"
                onClick={onClearCustomText}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card/80 p-1 text-muted-foreground hover:text-foreground"
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
