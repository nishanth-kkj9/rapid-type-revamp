import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { didImproveWeakKey, type AchievementState } from "@/lib/achievements";
import { playDrillKeySound } from "@/lib/arcadeAudio";
import { buildCustomPassage, type CustomTextEntry } from "@/lib/customTexts";
import {
  drillModeKey,
  getDrillMode,
  type DrillMode,
  getKeyboardLayout,
  getKeyboardStandard,
  getPaceCaret,
  getQuickRestart,
  getQuoteLength,
  getStrictMode,
  getWordCount,
  resolveTextOptions,
  type DrillSettings,
} from "@/lib/drillSettings";
import { buildInsight } from "@/lib/insights";
import { topSlowKeys, type KeySpeedMap } from "@/lib/keySpeed";
import { pickWeakKeyPassage, topWeakBigrams, topWeakKeys } from "@/lib/keyStats";
import { mergeMissedWords } from "@/lib/missedWords";
import { getRandomQuote } from "@/lib/quotes";
import {
  generateAdaptiveWeakDrill,
  generateMissedWordsDrill,
  generatePassage,
  generateWordQuota,
} from "@/lib/sentenceGenerator";
import { appStorage } from "@/lib/storage";
import {
  computeRunWordSummary,
  extractCompletedCleanWords,
  interpolatePaceCaretIndex,
} from "@/lib/typingSession";
import {
  getPersonalBestWpm,
  loadBestSamplesFromStorage,
  newRunId,
  saveBestSamplesToStorage,
  type HistoryEntry,
} from "@/lib/typingStats";
import type { DrillResultData } from "@/components/ResultsPanel";
import { useDrillHotkeys } from "./useDrillHotkeys";
import { useTypingSession } from "./useTypingSession";

export interface DrillRunCommitPayload {
  entry: HistoryEntry;
  mistakes: Record<string, number>;
  bigramMistakes: Record<string, number>;
  keySpeed: KeySpeedMap;
  missedWords: string[];
  cleanWordsInRun: string[];
  focused: boolean;
  drillMode: DrillMode;
  durationSec: number;
  activeSeconds: number;
  improvedWeakKey: boolean;
  repeated: boolean;
}

interface UseDrillControllerOptions {
  drillSettings: DrillSettings;
  history: HistoryEntry[];
  allTimeKeys: Record<string, number>;
  allTimeBigrams: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  storedMissedWords: string[];
  customTexts: CustomTextEntry[];
  achievements: AchievementState;
  onCommitRun: (payload: DrillRunCommitPayload) => void;
  onFocusDimmedChange: (dimmed: boolean) => void;
}

function buildDrillText(
  settings: DrillSettings,
  allTimeKeys: Record<string, number>,
  allTimeBigrams: Record<string, number>,
  customTexts: readonly CustomTextEntry[],
) {
  const drillMode = getDrillMode(settings);
  const wordCount = getWordCount(settings);

  if (settings.customTextId) {
    const entry = customTexts.find((c) => c.id === settings.customTextId);
    if (entry) {
      return {
        text: buildCustomPassage(entry.text, drillMode, wordCount),
        author: drillMode === "quote" ? entry.name : null,
      };
    }
  }

  if (drillMode === "quote") {
    const q = getRandomQuote(getQuoteLength(settings));
    return { text: q.text, author: `${q.author}${q.source ? ` (${q.source})` : ""}` };
  }

  const textOpts = resolveTextOptions(settings);
  if (drillMode === "words") {
    return {
      text: generateWordQuota(wordCount, settings.difficulty, textOpts),
      author: null,
    };
  }

  if (!settings.focusWeakKeys) {
    return { text: generatePassage(settings.difficulty, 320, textOpts), author: null };
  }

  const weak = topWeakKeys(allTimeKeys, 12);
  const weakBg = topWeakBigrams(allTimeBigrams, 8);
  if (weak.length === 0 && weakBg.length === 0) {
    return { text: generatePassage(settings.difficulty, 320, textOpts), author: null };
  }
  if (textOpts.style === "words") {
    return { text: generateAdaptiveWeakDrill(weak, weakBg, 45), author: null };
  }
  const candidates = Array.from({ length: 6 }, () =>
    generatePassage(settings.difficulty, 320, textOpts),
  );
  return { text: pickWeakKeyPassage(candidates, weak, weakBg), author: null };
}

export function useDrillController({
  drillSettings,
  history,
  allTimeKeys,
  allTimeBigrams,
  allTimeSpeed,
  storedMissedWords,
  customTexts,
  achievements,
  onCommitRun,
  onFocusDimmedChange,
}: UseDrillControllerOptions) {
  const drillMode = getDrillMode(drillSettings);
  const wordCount = getWordCount(drillSettings);
  const quoteLength = getQuoteLength(drillSettings);
  const modeKey = drillModeKey(drillSettings);
  const quickRestart = getQuickRestart(drillSettings);
  const strictMode = getStrictMode(drillSettings);
  const paceCaret = getPaceCaret(drillSettings);
  const textOpts = resolveTextOptions(drillSettings);
  const activeCustomText = useMemo(
    () =>
      drillSettings.customTextId
        ? (customTexts.find((c) => c.id === drillSettings.customTextId) ?? null)
        : null,
    [drillSettings.customTextId, customTexts],
  );

  const [initialPassage] = useState(() =>
    buildDrillText(drillSettings, allTimeKeys, allTimeBigrams, customTexts),
  );
  const [focused, setFocused] = useState(true);
  const [errorFlash, setErrorFlash] = useState(false);
  const [pressedChar, setPressedChar] = useState<string | null>(null);
  const [ghostSamples, setGhostSamples] = useState<number[] | undefined>(undefined);
  const [lastRecord, setLastRecord] = useState<{ isRecord: boolean; delta: number | null }>({
    isRecord: false,
    delta: null,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const historyRef = useRef(history);
  historyRef.current = history;
  const settingsRef = useRef(drillSettings);
  settingsRef.current = drillSettings;
  const allTimeKeysRef = useRef(allTimeKeys);
  allTimeKeysRef.current = allTimeKeys;
  const allTimeBigramsRef = useRef(allTimeBigrams);
  allTimeBigramsRef.current = allTimeBigrams;
  const allTimeSpeedRef = useRef(allTimeSpeed);
  allTimeSpeedRef.current = allTimeSpeed;
  const customTextsRef = useRef(customTexts);
  customTextsRef.current = customTexts;

  const {
    state,
    stats,
    applyInputDelta,
    restart: restartSession,
  } = useTypingSession({
    initialText: initialPassage.text,
    initialQuoteAuthor: initialPassage.author,
    drillMode,
    durationSec: drillSettings.duration,
    strictMode,
    getAppendText: () => {
      const s = settingsRef.current;
      if (s.customTextId) {
        const entry = customTextsRef.current.find((c) => c.id === s.customTextId);
        if (entry) return buildCustomPassage(entry.text, "time");
      }
      return generatePassage(s.difficulty, 320, resolveTextOptions(s));
    },
    onRunFinished: (finishedState, finalStats) => {
      const s = settingsRef.current;
      const finishedModeKey = drillModeKey(s);
      const isRepeated = finishedState.isRepeated;
      const prevBest = getPersonalBestWpm(historyRef.current, finishedModeKey, s.difficulty);
      const newRecord = !isRepeated && finalStats.wpm > prevBest && finalStats.wpm > 0;
      setLastRecord({
        isRecord: newRecord,
        delta: newRecord && prevBest > 0 ? Math.round(finalStats.wpm - prevBest) : null,
      });
      if (finalStats.typed > 0) {
        if (!isRepeated && finalStats.wpm >= prevBest && finishedState.samples.length > 0) {
          void saveBestSamplesToStorage(
            appStorage,
            finishedModeKey,
            finishedState.samples,
            s.difficulty,
          );
        }
        const wordSummary = computeRunWordSummary(
          finishedState.wordTimings,
          finishedState.wordMistakeCounts,
        );
        const activeSeconds = Math.min(
          finalStats.elapsed,
          Math.max(0, Math.round((finishedState.activeTypingMs / 1000) * 10) / 10),
        );
        const topWeak = topWeakKeys(allTimeKeysRef.current, 5);
        const improvedWeakKey = didImproveWeakKey(
          topWeak,
          finishedState.text.slice(0, finishedState.typed.length),
          finishedState.mistakes,
          finalStats.accuracy,
        );
        onCommitRun({
          entry: {
            ...finalStats,
            id: newRunId(),
            date: Date.now(),
            difficulty: s.difficulty,
            mode: finishedModeKey,
            samples: finishedState.samples,
            ...(finishedState.strictMode !== "off" ? { strict: finishedState.strictMode } : {}),
            ...(isRepeated ? { repeated: true } : {}),
            ...(finishedState.errorSeconds.length > 0
              ? { errorSeconds: finishedState.errorSeconds }
              : {}),
            ...(Object.keys(finishedState.mistakes).length > 0
              ? { mistakes: finishedState.mistakes }
              : {}),
            ...(finishedState.missedWords.length > 0
              ? { missedWords: finishedState.missedWords }
              : {}),
            ...(wordSummary.slowestWords.length > 0 ? { slowWords: wordSummary.slowestWords } : {}),
            ...(Object.keys(finishedState.wordMistakeCounts).length > 0
              ? { wordMistakes: finishedState.wordMistakeCounts }
              : {}),
          },
          mistakes: finishedState.mistakes,
          bigramMistakes: finishedState.bigramMistakes,
          keySpeed: finishedState.keySpeed,
          missedWords: finishedState.missedWords,
          cleanWordsInRun: extractCompletedCleanWords(
            finishedState.text,
            finishedState.typed,
            finishedState.missedWords,
          ),
          focused: s.focusWeakKeys,
          drillMode: getDrillMode(s),
          durationSec: s.duration,
          activeSeconds,
          improvedWeakKey,
          repeated: isRepeated,
        });
      }
    },
  });

  const running = state.status === "running";
  const finished = state.status === "finished";

  useEffect(() => {
    onFocusDimmedChange(running && !finished);
  }, [running, finished, onFocusDimmedChange]);

  useEffect(
    () => () => {
      onFocusDimmedChange(false);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    },
    [onFocusDimmedChange],
  );

  const clearTransientFeedback = useCallback(() => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    setErrorFlash(false);
    setPressedChar(null);
    setLastRecord({ isRecord: false, delta: null });
  }, []);

  const restartWithSettings = useCallback(
    (targetSettings: DrillSettings = settingsRef.current) => {
      clearTransientFeedback();
      const built = buildDrillText(
        targetSettings,
        allTimeKeysRef.current,
        allTimeBigramsRef.current,
        customTextsRef.current,
      );
      restartSession({
        text: built.text,
        quoteAuthor: built.author,
        drillMode: getDrillMode(targetSettings),
        durationSec: targetSettings.duration,
        strictMode: getStrictMode(targetSettings),
        isRepeated: false,
        keepMissedWords: false,
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [clearTransientFeedback, restartSession],
  );

  const startDrillPassage = useCallback(
    (
      text: string,
      opts: { quoteAuthor?: string | null; isRepeated?: boolean; keepMissedWords?: boolean } = {},
    ) => {
      const s = settingsRef.current;
      clearTransientFeedback();
      restartSession({
        text,
        quoteAuthor: opts.quoteAuthor ?? null,
        drillMode: getDrillMode(s),
        durationSec: s.duration,
        strictMode: getStrictMode(s),
        isRepeated: opts.isRepeated ?? false,
        keepMissedWords: opts.keepMissedWords ?? false,
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [clearTransientFeedback, restartSession],
  );

  const repeatSameText = useCallback(() => {
    startDrillPassage(state.text, {
      quoteAuthor: state.quoteAuthor,
      isRepeated: true,
      keepMissedWords: state.keepMissedWords,
    });
  }, [state.text, state.quoteAuthor, state.keepMissedWords, startDrillPassage]);

  const practiceMissedWords = useCallback(() => {
    const words = mergeMissedWords(storedMissedWords, state.missedWords);
    if (words.length === 0) {
      toast("No missed words recorded yet.");
      return;
    }
    startDrillPassage(generateMissedWordsDrill(words, 20), { keepMissedWords: true });
  }, [storedMissedWords, state.missedWords, startDrillPassage]);

  const practiceWeakKeys = useCallback(() => {
    const weak = topWeakKeys(allTimeKeysRef.current, 10);
    const weakBg = topWeakBigrams(allTimeBigramsRef.current, 8);
    if (weak.length === 0 && weakBg.length === 0) {
      toast("No weak keys recorded yet.");
      return;
    }
    startDrillPassage(generateAdaptiveWeakDrill(weak, weakBg, 45));
  }, [startDrillPassage]);

  const practiceSlowKeys = useCallback(() => {
    const slow = topSlowKeys(allTimeSpeedRef.current, 8);
    if (slow.length === 0) {
      toast("No per-key speed data recorded yet.");
      return;
    }
    startDrillPassage(generateAdaptiveWeakDrill(slow, [], 45));
  }, [startDrillPassage]);

  const relevantKey = [
    drillMode,
    drillSettings.difficulty,
    strictMode,
    textOpts.style,
    textOpts.punctuation,
    textOpts.numbers,
    textOpts.capitals,
    activeCustomText ? `${activeCustomText.id}:${activeCustomText.updatedAt}` : "",
    drillMode === "time" ? drillSettings.duration : drillMode === "words" ? wordCount : quoteLength,
  ].join("|");
  const prevRelevantKeyRef = useRef(relevantKey);
  useEffect(() => {
    if (prevRelevantKeyRef.current === relevantKey) return;
    prevRelevantKeyRef.current = relevantKey;
    restartWithSettings(settingsRef.current);
  }, [relevantKey, restartWithSettings]);

  useEffect(() => {
    let cancelled = false;
    void loadBestSamplesFromStorage(appStorage, modeKey, drillSettings.difficulty).then(
      (loaded) => {
        if (!cancelled) setGhostSamples(loaded);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [modeKey, drillSettings.difficulty, finished]);

  useEffect(() => {
    const evt = state.lastKeyEvent;
    if (!evt) return;
    playDrillKeySound(drillSettings.sound, evt.isError);
    setPressedChar(evt.char);
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressedChar(null), 160);
    if (evt.isError) {
      setErrorFlash(true);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setErrorFlash(false), 140);
    }
  }, [state.lastKeyEvent, drillSettings.sound]);

  useEffect(() => {
    if (finished) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      againRef.current?.focus({ preventScroll: true });
    }
  }, [finished]);

  const elapsed = running ? Math.max(0, state.elapsedMs) : 0;
  const remaining = drillMode === "time" ? Math.max(0, drillSettings.duration - elapsed / 1000) : 0;
  const progress =
    drillMode === "words" || drillMode === "quote"
      ? Math.min(100, (state.typed.length / (state.text.length || 1)) * 100)
      : Math.min(100, running ? (elapsed / 1000 / drillSettings.duration) * 100 : 0);

  const restartArmed = useDrillHotkeys({
    inputRef,
    againRef,
    finished,
    quickRestart,
    typedLength: state.typed.length,
    onRestart: restartWithSettings,
    onRepeatSameText: repeatSameText,
  });

  const paceCaretIndex =
    paceCaret === "pb" && (drillMode === "time" || drillMode === "words") && running && !finished
      ? interpolatePaceCaretIndex(ghostSamples, state.elapsedMs, state.text.length)
      : null;

  const previousBest = useMemo(
    () => getPersonalBestWpm(history, modeKey, drillSettings.difficulty),
    [history, modeKey, drillSettings.difficulty],
  );
  const weakKeys3 = useMemo(() => topWeakKeys(allTimeKeys, 3), [allTimeKeys]);
  const slowKeys3 = useMemo(() => topSlowKeys(allTimeSpeed, 3), [allTimeSpeed]);
  const effectiveMissedWordsCount =
    state.missedWords.length > 0 ? state.missedWords.length : storedMissedWords.length;

  const wordSummary = useMemo(
    () =>
      finished
        ? computeRunWordSummary(state.wordTimings, state.wordMistakeCounts)
        : { slowestWords: [], mostMissedWords: [] },
    [finished, state.wordTimings, state.wordMistakeCounts],
  );

  const insight = useMemo(
    () =>
      finished
        ? buildInsight(stats, history, allTimeSpeed, state.mistakes, {
            isRecord: lastRecord.isRecord,
            modeKey,
            difficulty: drillSettings.difficulty,
            targetWpm: drillSettings.targetWpm,
          })
        : null,
    [
      finished,
      stats,
      history,
      allTimeSpeed,
      state.mistakes,
      lastRecord.isRecord,
      modeKey,
      drillSettings.difficulty,
      drillSettings.targetWpm,
    ],
  );

  const resultData: DrillResultData | null = finished
    ? {
        stats,
        isRecord: lastRecord.isRecord,
        recordDelta: lastRecord.delta,
        targetWpm: drillSettings.targetWpm,
        insight,
        effectiveMissedWordsCount,
        weakKeys3,
        slowKeys3,
        quickRestart,
        repeated: state.isRepeated,
        samples: state.samples,
        errorSeconds: state.errorSeconds,
        elapsedSec: state.elapsedMs / 1000,
        ghostSamples,
        mistakes: state.mistakes,
        slowestWords: wordSummary.slowestWords,
        mostMissedWords: wordSummary.mostMissedWords,
        allTimeKeys,
        allTimeSpeed,
        unlockedAchievements: achievements.unlocked,
        achievementCounters: achievements.counters,
        drillMode,
        modeKey,
        difficulty: drillSettings.difficulty,
        quoteAuthor: state.quoteAuthor,
        keyboardLayout: getKeyboardLayout(drillSettings),
        keyboardStandard: getKeyboardStandard(drillSettings),
      }
    : null;

  return {
    state,
    stats,
    drillMode,
    wordCount,
    activeCustomText,
    running,
    finished,
    focused,
    setFocused,
    errorFlash,
    pressedChar,
    isRecord: lastRecord.isRecord,
    elapsed,
    remaining,
    progress,
    previousBest,
    paceCaretIndex,
    quickRestart,
    restartArmed,
    resultData,
    inputRef,
    againRef,
    resultsRef,
    applyInputDelta,
    restartWithSettings,
    repeatSameText,
    practiceMissedWords,
    practiceWeakKeys,
    practiceSlowKeys,
    focusInput: () => inputRef.current?.focus(),
  };
}
