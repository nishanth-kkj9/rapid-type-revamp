import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DRILL_QUOTE_LENGTHS,
  DRILL_WORD_COUNTS,
  WORD_LIST_OPTIONS,
  type DrillMode,
  type QuoteLengthOption,
  type WordCountOption,
} from "@/lib/drillSettings";
import type { KeyboardLayoutId } from "@/lib/keyboardLayout";
import type { WordListId } from "@/lib/sentenceGenerator";
import type { AppMode } from "@/lib/urlState";
import type { Theme } from "@/lib/useTheme";
import { CommandPaletteLookAndSettings } from "./CommandPaletteAppearanceGroup";

interface Props {
  wordList: WordListId;
  duration: number;
  drillMode: DrillMode;
  wordCount: WordCountOption;
  quoteLength: QuoteLengthOption;
  keyboardLayout: KeyboardLayoutId;
  theme: Theme;
  dyslexiaFont: boolean;
  durations: readonly number[];
  mode?: AppMode | undefined;
  onWordList: (w: WordListId) => void;
  onDuration: (s: number) => void;
  onWordCount: (count: WordCountOption) => void;
  onQuoteLength: (len: QuoteLengthOption) => void;
  onKeyboardLayout: (layout: KeyboardLayoutId) => void;
  onSelectTheme: (theme: Theme) => void;
  onToggleDyslexiaFont: () => void;
  onRestart: () => void;
  onRepeatSameText?: (() => void) | undefined;
  onModeChange: (m: AppMode) => void;
  onOpenSettings: () => void;
  onPracticeMissedWords?: (() => void) | undefined;
  onPracticeWeakKeys?: (() => void) | undefined;
  onPracticeSlowKeys?: (() => void) | undefined;
  onOpenCustomText?: (() => void) | undefined;
}

export function CommandPalette({
  wordList,
  duration,
  drillMode,
  wordCount,
  quoteLength,
  keyboardLayout,
  theme,
  dyslexiaFont,
  durations,
  mode = "drill",
  onWordList,
  onDuration,
  onWordCount,
  onQuoteLength,
  onKeyboardLayout,
  onSelectTheme,
  onToggleDyslexiaFont,
  onRestart,
  onRepeatSameText,
  onModeChange,
  onOpenSettings,
  onPracticeMissedWords,
  onPracticeWeakKeys,
  onPracticeSlowKeys,
  onOpenCustomText,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search modes, test types, layouts, themes, settings…" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        <CommandGroup heading="Workspace">
          <CommandItem
            value="mode practice timed drill typing test"
            onSelect={() => run(() => onModeChange("drill"))}
          >
            <span>Practice Mode</span>
            {mode === "drill" ? (
              <span className="ml-auto text-[13px] text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
          <CommandItem
            value="mode learn touch typing lessons letters alphabet"
            onSelect={() => run(() => onModeChange("learn"))}
          >
            <span>Learn Mode (Touch Typing)</span>
            {mode === "learn" ? (
              <span className="ml-auto text-[13px] text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
          <CommandItem
            value="mode stats progress analytics history heatmap calendar"
            onSelect={() => run(() => onModeChange("stats"))}
          >
            <span>Stats &amp; Progress</span>
            {mode === "stats" ? (
              <span className="ml-auto text-[13px] text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Test Types">
          {durations.map((s) => (
            <CommandItem
              key={`time-${s}`}
              value={`test type time ${s} seconds`}
              onSelect={() => run(() => onDuration(s))}
            >
              <span>Time Drill · {s}s</span>
              {drillMode === "time" && duration === s ? (
                <span className="ml-auto text-[13px] text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
          {DRILL_WORD_COUNTS.map((wc) => (
            <CommandItem
              key={`words-${wc}`}
              value={`test type words quota ${wc}`}
              onSelect={() => run(() => onWordCount(wc))}
            >
              <span>Word Quota · {wc} words</span>
              {drillMode === "words" && wordCount === wc ? (
                <span className="ml-auto text-[13px] text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
          {DRILL_QUOTE_LENGTHS.map((ql) => (
            <CommandItem
              key={`quote-${ql}`}
              value={`test type quote ${ql}`}
              onSelect={() => run(() => onQuoteLength(ql))}
            >
              <span className="capitalize">Quote · {ql}</span>
              {drillMode === "quote" && quoteLength === ql ? (
                <span className="ml-auto text-[13px] text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Word list">
          {WORD_LIST_OPTIONS.map((opt) => (
            <CommandItem
              key={opt.id}
              value={`word list ${opt.label} ${opt.id}`}
              onSelect={() => run(() => onWordList(opt.id))}
            >
              <span>Word list: {opt.label}</span>
              {wordList === opt.id ? (
                <span className="ml-auto text-[13px] text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandPaletteLookAndSettings
          keyboardLayout={keyboardLayout}
          theme={theme}
          dyslexiaFont={dyslexiaFont}
          onRun={run}
          onKeyboardLayout={onKeyboardLayout}
          onSelectTheme={onSelectTheme}
          onToggleDyslexiaFont={onToggleDyslexiaFont}
          onOpenSettings={onOpenSettings}
        />

        <CommandGroup heading="Actions & Data">
          <CommandItem value="restart test drill" onSelect={() => run(onRestart)}>
            Restart current drill
          </CommandItem>
          {onRepeatSameText ? (
            <CommandItem
              value="repeat same text passage again"
              onSelect={() => run(onRepeatSameText)}
            >
              <span>Repeat this text</span>
              <span className="ml-auto font-mono text-[13px] text-muted-foreground">
                Shift+Enter
              </span>
            </CommandItem>
          ) : null}
          {onPracticeMissedWords ? (
            <CommandItem
              value="practice missed problem words"
              onSelect={() => run(onPracticeMissedWords)}
            >
              Practice missed words
            </CommandItem>
          ) : null}
          {onPracticeWeakKeys ? (
            <CommandItem
              value="practice weak keys bigrams"
              onSelect={() => run(onPracticeWeakKeys)}
            >
              Practice weak keys &amp; bigrams
            </CommandItem>
          ) : null}
          {onPracticeSlowKeys ? (
            <CommandItem
              value="practice slow keys speed drill"
              onSelect={() => run(onPracticeSlowKeys)}
            >
              Practice slow keys
            </CommandItem>
          ) : null}
          {onOpenCustomText ? (
            <CommandItem
              value="custom text lists paste passage"
              onSelect={() => run(onOpenCustomText)}
            >
              Manage custom practice lists
            </CommandItem>
          ) : null}
          <CommandItem
            value="export full backup import json delete all my data privacy settings"
            onSelect={() => run(onOpenSettings)}
          >
            Manage backups and local data…
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
