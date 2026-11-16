import { BookOpen, FileText, Target } from "lucide-react";
import type { CustomTextEntry } from "@/lib/customTexts";
import { resolveTextOptions, type DrillSettings } from "@/lib/drillSettings";
import type { Difficulty } from "@/lib/sentenceGenerator";

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  {
    id: "easy",
    label: "Easy",
    desc: "200 high-frequency everyday words paired with clear subject-verb-object sentences.",
  },
  {
    id: "medium",
    label: "Medium",
    desc: "1,005 common + intermediate words with optional compound clauses.",
  },
  {
    id: "hard",
    label: "Hard",
    desc: "4,162 words covering technical, academic & literary vocabulary with multi-clause syntax.",
  },
];

interface SettingsContentTabProps {
  drillSettings: DrillSettings;
  customTexts: CustomTextEntry[];
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
  onOpenCustomText: () => void;
}

export function SettingsContentTab({
  drillSettings,
  customTexts,
  onUpdateDrill,
  onOpenCustomText,
}: SettingsContentTabProps) {
  const textOpts = resolveTextOptions(drillSettings);
  const activeCustom = customTexts.find((c) => c.id === drillSettings.customTextId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vocabulary Difficulty
          </h3>
          <span className="font-mono text-xs font-semibold capitalize text-primary">
            {drillSettings.difficulty}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => {
            const active = drillSettings.difficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdateDrill({ difficulty: d.id })}
                className={`flex min-h-14 cursor-pointer flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="font-mono text-sm font-bold capitalize">{d.label}</span>
                <span className="mt-1 text-xs leading-snug text-muted-foreground">{d.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BookOpen className="size-3.5 text-primary" />
            Passage Format &amp; Character Mix
          </h3>
          <span className="font-mono text-xs capitalize text-primary">{textOpts.style}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["sentences", "words"] as const).map((style) => (
            <button
              key={style}
              type="button"
              aria-pressed={textOpts.style === style}
              onClick={() =>
                onUpdateDrill({
                  textStyle: style,
                  includePunctuation: style === "sentences",
                  includeCapitals: style === "sentences",
                })
              }
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                textOpts.style === style
                  ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {style === "sentences" ? "Grammatical Sentences" : "Frequency-Ranked Word List"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            aria-pressed={textOpts.punctuation}
            onClick={() => onUpdateDrill({ includePunctuation: !textOpts.punctuation })}
            className={`flex min-h-11 cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
              textOpts.punctuation
                ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs font-semibold">
              Punctuation: {textOpts.punctuation ? "On" : "Off"}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              Commas, periods, semicolons &amp; question marks
            </span>
          </button>

          <button
            type="button"
            aria-pressed={textOpts.numbers}
            onClick={() => onUpdateDrill({ includeNumbers: !textOpts.numbers })}
            className={`flex min-h-11 cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
              textOpts.numbers
                ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs font-semibold">
              Numbers: {textOpts.numbers ? "On" : "Off"}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              Adds quantities, years, routes &amp; decimal values
            </span>
          </button>

          <button
            type="button"
            aria-pressed={textOpts.capitals}
            onClick={() => onUpdateDrill({ includeCapitals: !textOpts.capitals })}
            className={`flex min-h-11 cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
              textOpts.capitals
                ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs font-semibold">
              Capitals: {textOpts.capitals ? "On" : "Off"}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              Capitalized sentence openings &amp; mixed casing
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Target className="size-3.5 text-primary" />
              Weak-Key Practice Bias
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Balanced generates fresh standard passages; Focused biases passages toward your
              all-time highest-error keys and bigrams
            </div>
          </div>
          <button
            type="button"
            aria-pressed={drillSettings.focusWeakKeys}
            onClick={() => onUpdateDrill({ focusWeakKeys: !drillSettings.focusWeakKeys })}
            className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              drillSettings.focusWeakKeys
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {drillSettings.focusWeakKeys ? "Focused" : "Balanced"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileText className="size-3.5 text-primary" />
              Custom Practice Passages
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {activeCustom
                ? `Active custom list: "${activeCustom.name}" (${customTexts.length} saved)`
                : `Paste articles, code, or book excerpts locally (${customTexts.length} saved)`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCustom ? (
              <button
                type="button"
                onClick={() => onUpdateDrill({ customTextId: null })}
                className="min-h-10 cursor-pointer rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear Active
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenCustomText}
              className="min-h-10 shrink-0 cursor-pointer rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Manage Lists
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
