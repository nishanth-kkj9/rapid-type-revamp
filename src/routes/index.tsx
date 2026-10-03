import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun, Crosshair, Timer, Sliders, Target, BookOpen, Quote } from "lucide-react";
import { toast } from "sonner";
import {
  generatePassage,
  generateWordQuota,
  generateMissedWordsDrill,
  type Difficulty,
} from "@/lib/sentenceGenerator";
import { getRandomQuote } from "@/lib/quotes";
import { useTheme } from "@/lib/useTheme";
import {
  clearHistory,
  computeStats,
  loadHistory,
  newRunId,
  saveRun,
  toDeltas,
  bestSamplesKey,
  type HistoryEntry,
  type RunStats,
  type ShooterRunSummary,
} from "@/lib/typingStats";
import {
  loadShooterSettings,
  saveShooterSettings,
  DEFAULT_SHOOTER_SETTINGS,
  type ShooterSettings,
} from "@/lib/shooterSettings";
import {
  loadDrillSettings,
  saveDrillSettings,
  DEFAULT_DRILL_SETTINGS,
  getDrillMode,
  getWordCount,
  getQuoteLength,
  type DrillSettings,
  type DrillMode,
  type WordCountOption,
  type QuoteLengthOption,
} from "@/lib/drillSettings";
import { playDrillKeySound } from "@/lib/arcadeAudio";

import { Keyboard } from "@/components/Keyboard";
import { TypingText } from "@/components/TypingText";
import { StatCard } from "@/components/StatCard";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProblemKeys } from "@/components/ProblemKeys";
import {
  evaluateAchievements,
  loadAchievements,
  saveAchievements,
  type AchievementState,
} from "@/lib/achievements";
import { KeyHeatmap } from "@/components/KeyHeatmap";
import { AchievementsStrip } from "@/components/AchievementsStrip";
import { DailyGoal } from "@/components/DailyGoal";
import { loadKeyStats, pickWeakKeyPassage, recordKeyMistakes, topWeakKeys } from "@/lib/keyStats";
import { loadKeySpeed, recordKeySpeed, PAUSE_CAP_MS, type KeySpeedMap } from "@/lib/keySpeed";
import { WpmChart } from "@/components/WpmChart";
import { WordShooterProgress } from "@/components/WordShooterProgress";
import { CommandPalette } from "@/components/CommandPalette";
import { WordShooter } from "@/components/WordShooter";
import { ShooterSettingsDialog } from "@/components/ShooterSettingsDialog";
import { DrillSettingsDialog } from "@/components/DrillSettingsDialog";
import { ThemeAccentPicker } from "@/components/ThemeAccentPicker";
import { applyThemeAccent, loadUiPrefs } from "@/lib/uiPrefs";
import {
  loadDaily,
  saveDaily,
  recordRunToday,
  getLocalDateString,
  DAILY_GOAL,
  type DailyState,
} from "@/lib/daily";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Typing Trainer Pro — Practice Typing Speed & Accuracy" },
      {
        name: "description",
        content:
          "Free typing trainer with timed tests, live WPM and accuracy, a highlighted virtual keyboard, problem-key analysis and progress tracking.",
      },
      { property: "og:title", content: "Typing Trainer Pro — Typing Speed & Accuracy Practice" },
      {
        property: "og:description",
        content:
          "Timed typing drills with live WPM, accuracy, consistency, problem-key analysis and a keyboard guide that shows your next key.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DURATIONS = [15, 30, 60, 120] as const;
const WORD_COUNTS: WordCountOption[] = [10, 25, 50, 100];
const QUOTE_LENGTHS: QuoteLengthOption[] = ["short", "medium", "long"];

const MemoKeyboard = memo(Keyboard);
const MemoHistory = memo(HistoryPanel);

/** Recompute counters from the whole typed string so backspaces reconcile. */
function reconcile(text: string, value: string) {
  let correct = 0;
  let incorrect = 0;
  const mistakes: Record<string, number> = {};
  for (let i = 0; i < value.length; i++) {
    const expected = text[i];
    if (expected === undefined) {
      incorrect++;
      continue;
    }
    if (value[i] === expected) correct++;
    else {
      incorrect++;
      mistakes[expected] = (mistakes[expected] ?? 0) + 1;
    }
  }
  return { correct, incorrect, mistakes };
}

function Index() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [mode, setMode] = useState<"drill" | "shooter">("drill");
  const [drillSettingsOpen, setDrillSettingsOpen] = useState(false);
  const [shooterSettingsOpen, setShooterSettingsOpen] = useState(false);
  const [drillSettings, setDrillSettings] = useState<DrillSettings>(DEFAULT_DRILL_SETTINGS);
  const [shooterSettings, setShooterSettings] = useState<ShooterSettings>(DEFAULT_SHOOTER_SETTINGS);
  const [activeShooterChar, setActiveShooterChar] = useState<string | null>(null);

  const [drillMode, setDrillMode] = useState<DrillMode>("time");
  const [wordCount, setWordCount] = useState<WordCountOption>(25);
  const [quoteLength, setQuoteLength] = useState<QuoteLengthOption>("medium");
  const [quoteAuthor, setQuoteAuthor] = useState<string | null>(null);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const missedWordsRef = useRef<Set<string>>(new Set());

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [duration, setDuration] = useState<number>(30);
  // Generated after mount: random text during SSR would hydration-mismatch.
  const [text, setText] = useState<string>("");
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [finished, setFinished] = useState(false);
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const [recordDelta, setRecordDelta] = useState<number | null>(null);
  const [errorFlash, setErrorFlash] = useState(false);
  const [pressedChar, setPressedChar] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [shooterMistakes, setShooterMistakes] = useState<Record<string, number>>({});
  const [lastShooterSummary, setLastShooterSummary] = useState<ShooterRunSummary | null>(null);
  const [allTimeKeys, setAllTimeKeys] = useState<Record<string, number>>({});
  const [samples, setSamples] = useState<number[]>([]);
  const [ghostSamples, setGhostSamples] = useState<number[] | undefined>(undefined);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [focused, setFocused] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const savedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const mistakesRef = useRef<Record<string, number>>({});
  const shooterMistakesRef = useRef<Record<string, number>>({});
  const allTimeKeysRef = useRef<Record<string, number>>({});
  const [allTimeSpeed, setAllTimeSpeed] = useState<KeySpeedMap>({});
  const allTimeSpeedRef = useRef<KeySpeedMap>({});
  const keySpeedRef = useRef<KeySpeedMap>({});
  const lastCorrectAtRef = useRef<number | null>(null);
  const [achState, setAchState] = useState<AchievementState>({ unlocked: {}, counters: {} });
  const achStateRef = useRef<AchievementState>({ unlocked: {}, counters: {} });
  const samplesRef = useRef<number[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const dailyRef = useRef<DailyState | null>(null);
  const [daily, setDaily] = useState<DailyState | null>(null);

  useEffect(() => {
    const loaded = loadHistory();
    historyRef.current = loaded;
    setHistory(loaded);

    const loadedDaily = loadDaily();
    dailyRef.current = loadedDaily;
    setDaily(loadedDaily);

    const loadedSettings = loadShooterSettings();
    setShooterSettings(loadedSettings);

    const loadedDrill = loadDrillSettings();
    setDrillSettings(loadedDrill);
    setDifficulty(loadedDrill.difficulty);
    setDuration(loadedDrill.duration);
    setDrillMode(getDrillMode(loadedDrill));
    setWordCount(getWordCount(loadedDrill));
    setQuoteLength(getQuoteLength(loadedDrill));

    applyThemeAccent(loadUiPrefs().themeAccent);

    const ks = loadKeyStats();
    allTimeKeysRef.current = ks;
    setAllTimeKeys(ks);

    const ach = loadAchievements();
    achStateRef.current = ach;
    setAchState(ach);

    const speed = loadKeySpeed();
    allTimeSpeedRef.current = speed;
    setAllTimeSpeed(speed);
  }, []);

  const handleSaveDrillSettings = useCallback((newSettings: DrillSettings) => {
    setDrillSettings(newSettings);
    saveDrillSettings(newSettings);
    setDifficulty(newSettings.difficulty);
    setDuration(newSettings.duration);
    if (newSettings.drillMode) setDrillMode(newSettings.drillMode);
    if (newSettings.wordCount) setWordCount(newSettings.wordCount);
    if (newSettings.quoteLength) setQuoteLength(newSettings.quoteLength);
  }, []);

  const handleSaveShooterSettings = useCallback((newSettings: ShooterSettings) => {
    setShooterSettings(newSettings);
    saveShooterSettings(newSettings);
  }, []);

  const handleClearHistory = useCallback((modeToClear?: "all" | "drill" | "shooter") => {
    setHistory(clearHistory(modeToClear));
  }, []);
  const handleImportHistory = useCallback((entries: HistoryEntry[]) => setHistory(entries), []);

  const commitAchievements = useCallback((ctx: Parameters<typeof evaluateAchievements>[0]) => {
    const { state, newlyUnlocked } = evaluateAchievements(ctx, achStateRef.current);
    if (newlyUnlocked.length === 0) return;
    saveAchievements(state);
    achStateRef.current = state;
    setAchState(state);
    for (const a of newlyUnlocked) {
      toast.success(`Achievement unlocked — ${a.title}`, { description: a.description });
    }
  }, []);

  const handleShooterRunComplete = useCallback(
    (s: ShooterRunSummary) => {
      setLastShooterSummary(s);
      const incorrect = (s.wrongKeys ?? 0) + (s.misses ?? 0);
      const realChars = s.charsDestroyed ?? s.wordsDestroyed * 5;
      const samplesDeltas = s.samples && s.samples.length > 0 ? toDeltas(s.samples) : [];
      const fs = computeStats(realChars, incorrect, s.durationSec * 1000, samplesDeltas);
      const { list, ok } = saveRun({
        ...fs,
        accuracy: s.accuracy,
        id: newRunId(),
        date: Date.now(),
        difficulty: s.difficulty,
        mode: "shooter",
        score: s.score,
        wordsDestroyed: s.wordsDestroyed,
        level: s.level ?? 1,
        samples: s.samples,
      });
      historyRef.current = list;
      setHistory(list);
      if (!ok) {
        toast.error("Couldn't save this run — storage is full. Export and clear old runs.");
      }
      const updatedKeys = recordKeyMistakes(shooterMistakesRef.current);
      allTimeKeysRef.current = updatedKeys;
      setAllTimeKeys(updatedKeys);

      const today = getLocalDateString();
      const prevDaily = dailyRef.current;
      const nextDaily = recordRunToday(prevDaily, today);
      dailyRef.current = nextDaily;
      setDaily(nextDaily);
      saveDaily(nextDaily);
      if ((prevDaily?.runsToday ?? 0) < DAILY_GOAL && nextDaily.runsToday >= DAILY_GOAL) {
        toast.success("Daily goal complete!");
      }

      commitAchievements({
        mode: "shooter",
        wpm: fs.wpm,
        accuracy: s.accuracy,
        wordsDestroyed: s.wordsDestroyed,
        level: s.level,
        streak: nextDaily.streak,
      });
    },
    [commitAchievements],
  );

  const handleShooterWrongKey = useCallback((expectedChar: string) => {
    setShooterMistakes((prev) => {
      const next = {
        ...prev,
        [expectedChar]: (prev[expectedChar] ?? 0) + 1,
      };
      shooterMistakesRef.current = next;
      return next;
    });
  }, []);

  const handleShooterStart = useCallback(() => {
    shooterMistakesRef.current = {};
    setShooterMistakes({});
  }, []);

  const effectiveShooterSummary = useMemo(() => {
    if (lastShooterSummary) return lastShooterSummary;
    const latestShooter = history.find((h) => h.mode === "shooter");
    if (!latestShooter) return null;
    return {
      score: latestShooter.score ?? 0,
      wordsDestroyed: latestShooter.wordsDestroyed ?? latestShooter.correct,
      accuracy: latestShooter.accuracy,
      durationSec: Math.max(1, Math.round(latestShooter.elapsed)),
      difficulty: latestShooter.difficulty,
      level: latestShooter.level ?? 1,
      samples: latestShooter.samples,
    } satisfies ShooterRunSummary;
  }, [lastShooterSummary, history]);

  const handleDifficultyChange = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setDrillSettings((prev) => {
      const next = { ...prev, difficulty: d };
      saveDrillSettings(next);
      return next;
    });
  }, []);

  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
    setDrillSettings((prev) => {
      const next = { ...prev, duration: dur };
      saveDrillSettings(next);
      return next;
    });
  }, []);

  const handleDrillModeChange = useCallback((m: DrillMode) => {
    setDrillMode(m);
    setDrillSettings((prev) => {
      const next = { ...prev, drillMode: m };
      saveDrillSettings(next);
      return next;
    });
  }, []);

  const handleWordCountChange = useCallback((count: WordCountOption) => {
    setWordCount(count);
    setDrillSettings((prev) => {
      const next = { ...prev, wordCount: count };
      saveDrillSettings(next);
      return next;
    });
  }, []);

  const handleQuoteLengthChange = useCallback((qLen: QuoteLengthOption) => {
    setQuoteLength(qLen);
    setDrillSettings((prev) => {
      const next = { ...prev, quoteLength: qLen };
      saveDrillSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    },
    [],
  );

  const buildDrillText = useCallback(
    (
      d: Difficulty = difficulty,
      m: DrillMode = drillMode,
      count: WordCountOption = wordCount,
      qLen: QuoteLengthOption = quoteLength,
    ): { text: string; author: string | null } => {
      if (m === "quote") {
        const q = getRandomQuote(qLen);
        return { text: q.text, author: `${q.author}${q.source ? ` (${q.source})` : ""}` };
      }
      if (m === "words") {
        return { text: generateWordQuota(count, d), author: null };
      }
      if (!drillSettings.focusWeakKeys) return { text: generatePassage(d, 320), author: null };
      const weak = topWeakKeys(allTimeKeysRef.current, 12);
      if (weak.length === 0) return { text: generatePassage(d, 320), author: null };
      const candidates = Array.from({ length: 5 }, () => generatePassage(d, 320));
      return { text: pickWeakKeyPassage(candidates, weak), author: null };
    },
    [difficulty, drillMode, wordCount, quoteLength, drillSettings.focusWeakKeys],
  );

  const reset = useCallback(
    (
      d: Difficulty = difficulty,
      m: DrillMode = drillMode,
      count: WordCountOption = wordCount,
      qLen: QuoteLengthOption = quoteLength,
    ) => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      setErrorFlash(false);
      const built = buildDrillText(d, m, count, qLen);
      setText(built.text);
      setQuoteAuthor(built.author);
      setMissedWords([]);
      missedWordsRef.current.clear();
      setTyped("");
      setRunning(false);
      setElapsedMs(0);
      startTimeRef.current = null;
      setFinished(false);
      setFinalStats(null);
      setIsRecord(false);
      setRecordDelta(null);
      setCorrect(0);
      setIncorrect(0);
      correctRef.current = 0;
      incorrectRef.current = 0;
      mistakesRef.current = {};
      setMistakes({});
      setSamples([]);
      samplesRef.current = [];
      keySpeedRef.current = {};
      lastCorrectAtRef.current = null;
      setPressedChar(null);
      savedRef.current = false;
      inputRef.current?.focus();
    },
    [difficulty, drillMode, wordCount, quoteLength, buildDrillText],
  );

  const restart = useCallback(
    () => reset(difficulty, drillMode, wordCount, quoteLength),
    [reset, difficulty, drillMode, wordCount, quoteLength],
  );

  const handlePracticeMissedWords = useCallback(() => {
    if (missedWords.length === 0) return;
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    setErrorFlash(false);
    const drillText = generateMissedWordsDrill(missedWords, 20);
    setText(drillText);
    setQuoteAuthor(null);
    setTyped("");
    setRunning(false);
    setElapsedMs(0);
    startTimeRef.current = null;
    setFinished(false);
    setFinalStats(null);
    setIsRecord(false);
    setRecordDelta(null);
    setCorrect(0);
    setIncorrect(0);
    correctRef.current = 0;
    incorrectRef.current = 0;
    mistakesRef.current = {};
    setMistakes({});
    setSamples([]);
    samplesRef.current = [];
    keySpeedRef.current = {};
    lastCorrectAtRef.current = null;
    setPressedChar(null);
    savedRef.current = false;
    inputRef.current?.focus();
  }, [missedWords]);

  useEffect(() => {
    reset(difficulty, drillMode, wordCount, quoteLength);
  }, [difficulty, duration, drillMode, wordCount, quoteLength, reset]);

  const modeKey =
    drillMode === "words" ? `${wordCount}w` : drillMode === "quote" ? "quote" : `${duration}s`;

  useEffect(() => {
    try {
      const canonicalKey = bestSamplesKey(modeKey);
      let raw = localStorage.getItem(canonicalKey);
      if (!raw && drillMode === "time") {
        const legacyKey = `ttp:best:samples:v1:${duration}`;
        const legacyVal = localStorage.getItem(legacyKey);
        if (legacyVal) {
          raw = legacyVal;
          try {
            localStorage.setItem(canonicalKey, legacyVal);
          } catch {
            // safe storage fallback
          }
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "number")) {
          setGhostSamples(parsed);
          return;
        }
      }
    } catch {
      // safe storage fallback
    }
    setGhostSamples(undefined);
  }, [modeKey, duration, drillMode]);

  const elapsed = running ? Math.max(0, elapsedMs) : 0;
  const remaining = drillMode === "time" ? Math.max(0, duration - elapsed / 1000) : 0;

  // High-precision clock: rAF + performance.now, state throttled to ~10 Hz.
  useEffect(() => {
    if (!running || finished) return;
    if (startTimeRef.current === null) startTimeRef.current = performance.now();
    let raf = 0;
    let last = -1;
    const tick = () => {
      const start = startTimeRef.current;
      if (start !== null) {
        const ms = performance.now() - start;
        const bucket = Math.floor(ms / 100);
        if (bucket !== last) {
          last = bucket;
          setElapsedMs(ms);
        }
        if (drillMode === "time" && ms >= duration * 1000) {
          setElapsedMs(duration * 1000);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, finished, duration, drillMode]);

  // Sample cumulative correct chars once per second (consistency + WPM graph).
  useEffect(() => {
    if (!running || finished) return;
    const id = window.setInterval(() => {
      samplesRef.current = [...samplesRef.current, correctRef.current];
      setSamples(samplesRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, finished]);

  const stats = useMemo(
    () => computeStats(correct, incorrect, elapsed || 1, toDeltas(samples)),
    [correct, incorrect, elapsed, samples],
  );

  const activeModeKey =
    drillMode === "words" ? `${wordCount}w` : drillMode === "quote" ? "quote" : `${duration}s`;

  const previousBest = useMemo(
    () =>
      history
        .filter(
          (h) =>
            h.mode === activeModeKey ||
            (drillMode === "time" && (h.mode === `${duration}s` || h.mode === String(duration))),
        )
        .reduce((m, h) => Math.max(m, h.wpm), 0),
    [history, activeModeKey, drillMode, duration],
  );

  const finish = useCallback(() => {
    setRunning(false);
    setFinished(true);
    if (savedRef.current) return;
    savedRef.current = true;
    const effectiveDurationMs =
      drillMode === "words" || drillMode === "quote" ? Math.max(1000, elapsedMs) : duration * 1000;
    const fs = computeStats(
      correctRef.current,
      incorrectRef.current,
      effectiveDurationMs,
      toDeltas(samplesRef.current),
    );
    setFinalStats(fs);
    const modeKey =
      drillMode === "words" ? `${wordCount}w` : drillMode === "quote" ? "quote" : `${duration}s`;
    const prevBest = historyRef.current
      .filter(
        (h) =>
          h.mode === modeKey ||
          (drillMode === "time" && (h.mode === `${duration}s` || h.mode === String(duration))),
      )
      .reduce((m, h) => Math.max(m, h.wpm), 0);
    const newRecord = fs.wpm > prevBest && fs.wpm > 0;
    setIsRecord(newRecord);
    setRecordDelta(newRecord && prevBest > 0 ? Math.round(fs.wpm - prevBest) : null);
    if (fs.typed > 0) {
      if (fs.wpm >= prevBest && samplesRef.current.length > 0) {
        try {
          const toSave = samplesRef.current.slice(0, 240);
          localStorage.setItem(bestSamplesKey(modeKey), JSON.stringify(toSave));
        } catch {
          // safe storage fallback
        }
      }
      const { list, ok } = saveRun({
        ...fs,
        id: newRunId(),
        date: Date.now(),
        difficulty,
        mode: modeKey,
      });
      historyRef.current = list;
      setHistory(list);
      if (!ok) {
        toast.error("Couldn't save this run — storage is full. Export and clear old runs.");
      }
      const updatedKeys = recordKeyMistakes(mistakesRef.current);
      allTimeKeysRef.current = updatedKeys;
      setAllTimeKeys(updatedKeys);

      const updatedSpeed = recordKeySpeed(keySpeedRef.current);
      allTimeSpeedRef.current = updatedSpeed;
      setAllTimeSpeed(updatedSpeed);

      const today = getLocalDateString();
      const prevDaily = dailyRef.current;
      const nextDaily = recordRunToday(prevDaily, today);
      dailyRef.current = nextDaily;
      setDaily(nextDaily);
      saveDaily(nextDaily);
      if ((prevDaily?.runsToday ?? 0) < DAILY_GOAL && nextDaily.runsToday >= DAILY_GOAL) {
        toast.success("Daily goal complete!");
      }

      commitAchievements({
        mode: "drill",
        wpm: fs.wpm,
        accuracy: fs.accuracy,
        typed: fs.typed,
        streak: nextDaily.streak,
        focused: drillSettings.focusWeakKeys,
      });
    }
  }, [
    difficulty,
    duration,
    drillMode,
    wordCount,
    elapsedMs,
    drillSettings.focusWeakKeys,
    commitAchievements,
  ]);

  // Move focus to the results action so keyboard users land on something useful.
  useEffect(() => {
    if (finished) againRef.current?.focus();
  }, [finished]);

  useEffect(() => {
    if (drillMode === "time" && running && !finished && remaining <= 0) finish();
  }, [drillMode, remaining, running, finished, finish]);

  // Tab or Esc restarts quickly.
  useEffect(() => {
    if (mode !== "drill") return;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "Tab" && !e.shiftKey) {
        const active = document.activeElement;
        if (active === inputRef.current || active === againRef.current) {
          e.preventDefault();
          restart();
          inputRef.current?.focus();
          return;
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        restart();
        inputRef.current?.focus();
        return;
      }
      // "Press any key to focus": a printable key resumes typing from anywhere.
      if (finished || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      const active = document.activeElement;
      if (active === inputRef.current) return;
      if (
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) ||
          active.tagName === "BUTTON")
      ) {
        return;
      }
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart, finished, mode]);

  const handleChange = (raw: string) => {
    if (finished || !text) return;
    // Never let the caret run past the passage — extra chars only inflate errors.
    const value = raw.length > text.length ? raw.slice(0, text.length) : raw;
    if (!running) {
      startTimeRef.current = performance.now();
      setRunning(true);
    }

    const grew = value.length > typed.length;
    const next = reconcile(text, value);
    setCorrect(next.correct);
    setIncorrect(next.incorrect);
    correctRef.current = next.correct;
    incorrectRef.current = next.incorrect;
    mistakesRef.current = next.mistakes;
    setMistakes(next.mistakes);

    if (grew) {
      const last = value[value.length - 1] ?? null;
      const isError = last !== text[value.length - 1];
      playDrillKeySound(drillSettings.sound, isError);
      setPressedChar(last);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = window.setTimeout(() => setPressedChar(null), 160);
      if (isError) {
        setErrorFlash(true);
        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setErrorFlash(false), 140);
        // Track missed words for targeted drill remediation
        const wordMatch = text.slice(0, value.length).split(/\s+/).pop();
        if (wordMatch) {
          const cleanWord = wordMatch.replace(/[^\w]/g, "");
          if (cleanWord.length > 1) {
            missedWordsRef.current.add(cleanWord);
            setMissedWords(Array.from(missedWordsRef.current));
          }
        }
      }

      // Per-key speed telemetry: attribute the interval between two
      // consecutive correct keystrokes to the expected key. The chain
      // (a) starts on the first correct key after a reset/error/backspace
      // and (b) requires the previous position to be correct — recovery
      // typing is never sampled. Pauses > 2000ms (window blur, thinking)
      // are excluded per the inter-key research conventions.
      const nowMs = performance.now();
      if (isError) {
        lastCorrectAtRef.current = null;
      } else {
        const prevExpected = text[value.length - 2];
        const prevTyped = value[value.length - 2];
        const chainClean =
          value.length >= 2 &&
          prevExpected != null &&
          prevTyped != null &&
          prevExpected === prevTyped;
        if (last != null && lastCorrectAtRef.current != null && chainClean) {
          const interval = nowMs - lastCorrectAtRef.current;
          if (interval > 0 && interval <= PAUSE_CAP_MS) {
            const entry = keySpeedRef.current[last] ?? [0, 0];
            keySpeedRef.current[last] = [entry[0] + interval, entry[1] + 1];
          }
        }
        lastCorrectAtRef.current = nowMs;
      }
    }

    if (!grew) {
      lastCorrectAtRef.current = null;
    }

    setTyped(value);
    if ((drillMode === "words" || drillMode === "quote") && value.length >= text.length) {
      finish();
      return;
    }
    if (drillMode === "time" && value.length >= text.length - 60 && text.length < 6000) {
      setText((t) => `${t} ${buildDrillText(difficulty, "time", wordCount, quoteLength).text}`);
    }
  };

  const nextChar = finished ? null : (text[typed.length] ?? null);
  const progress =
    drillMode === "words" || drillMode === "quote"
      ? Math.min(100, (typed.length / (text.length || 1)) * 100)
      : Math.min(100, running ? (elapsed / 1000 / duration) * 100 : 0);
  const settled = elapsed > 1000;
  // Results must show the frozen end-of-run snapshot, not the live counters.
  const shown = finished && finalStats ? finalStats : stats;

  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-14"
      suppressHydrationWarning
      data-protonpass-ignore="true"
      data-lpignore="true"
      data-1p-ignore="true"
    >
      <header
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 transition-opacity duration-300 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 ${
          running && !finished ? "focus-dimmed" : ""
        }`}
      >
        <div className="min-w-0">
          <h1 className="truncate font-mono text-xl font-bold tracking-tight sm:text-3xl">
            Typing<span className="text-primary">Trainer</span>Pro
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {mode === "drill"
              ? "Timed drills with live WPM, accuracy and a keyboard that shows your next key."
              : "Word Shooter arcade mode: defend your ship by typing falling words."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeAccentPicker />
          <button
            type="button"
            onClick={() => {
              if (mode === "drill") setDrillSettingsOpen(true);
              else setShooterSettingsOpen(true);
            }}
            aria-label={`${mode === "drill" ? "Timed Drill" : "Word Shooter"} Settings`}
            title={`${mode === "drill" ? "Timed Drill" : "Word Shooter"} Settings`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-muted cursor-pointer"
          >
            <Sliders className="size-4 text-primary" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              !mounted || theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
            }
            title={!mounted || theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="rounded-lg border border-border bg-secondary p-2 transition-colors hover:bg-muted cursor-pointer"
          >
            {!mounted || theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
          {mode === "drill" ? (
            <button
              type="button"
              onClick={restart}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:px-4"
            >
              Restart{" "}
              <span className="ml-1 hidden font-mono text-xs text-muted-foreground sm:inline">
                Esc
              </span>
            </button>
          ) : null}
        </div>
      </header>

      {/* Mode Switcher Tabs */}
      <div
        className={`mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 transition-opacity duration-300 ${
          running && !finished ? "focus-dimmed" : ""
        }`}
      >
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setMode("drill")}
            aria-pressed={mode === "drill"}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              mode === "drill"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Timer className="size-3.5" />
            Timed Drill
          </button>
          <button
            type="button"
            onClick={() => setMode("shooter")}
            aria-pressed={mode === "shooter"}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              mode === "shooter"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crosshair className="size-3.5" />
            Word Shooter
          </button>
        </div>

        {mode === "drill" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono text-muted-foreground">
              <span>
                Mode:{" "}
                <strong className="capitalize text-foreground">
                  {drillMode === "words"
                    ? `${wordCount} words`
                    : drillMode === "quote"
                      ? "quote"
                      : `${duration}s`}
                </strong>
              </span>
              {drillMode !== "quote" ? (
                <>
                  <span>·</span>
                  <span>
                    Diff:{" "}
                    <strong className="capitalize text-foreground">
                      {drillSettings.difficulty}
                    </strong>
                  </span>
                </>
              ) : null}
              <span>·</span>
              <span>
                Target:{" "}
                <strong className="text-accent-foreground">{drillSettings.targetWpm} WPM</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono text-muted-foreground">
              <span>
                Diff:{" "}
                <strong className="capitalize text-foreground">{shooterSettings.difficulty}</strong>
              </span>
              <span>·</span>
              <span>
                Speed:{" "}
                <strong className="text-primary">
                  {shooterSettings.speedMultiplier.toFixed(2)}x
                </strong>
              </span>
              <span>·</span>
              <span>
                Lives:{" "}
                <strong className="text-destructive">{shooterSettings.startingLives} ❤</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <DailyGoal daily={daily} />
      </div>

      {mode === "drill" ? (
        <>
          <div
            className={`mt-6 flex flex-wrap items-center justify-between gap-3 transition-opacity duration-300 ${
              running && !finished ? "focus-dimmed" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Test Type: Time | Words | Quote */}
              <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => handleDrillModeChange("time")}
                  aria-pressed={drillMode === "time"}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
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
                  onClick={() => handleDrillModeChange("words")}
                  aria-pressed={drillMode === "words"}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
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
                  onClick={() => handleDrillModeChange("quote")}
                  aria-pressed={drillMode === "quote"}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    drillMode === "quote"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Quote className="size-3" />
                  Quote
                </button>
              </div>

              {/* Mode-specific duration / word count / quote length */}
              {drillMode === "time" ? (
                <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
                  {DURATIONS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => handleDurationChange(s)}
                      aria-pressed={duration === s}
                      className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                        duration === s
                          ? "bg-accent text-accent-foreground font-semibold"
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
                  {WORD_COUNTS.map((cnt) => (
                    <button
                      type="button"
                      key={cnt}
                      onClick={() => handleWordCountChange(cnt)}
                      aria-pressed={wordCount === cnt}
                      className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                        wordCount === cnt
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cnt}w
                    </button>
                  ))}
                </div>
              ) : null}

              {drillMode === "quote" ? (
                <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
                  {QUOTE_LENGTHS.map((ql) => (
                    <button
                      type="button"
                      key={ql}
                      onClick={() => handleQuoteLengthChange(ql)}
                      aria-pressed={quoteLength === ql}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                        quoteLength === ql
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {ql}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Difficulty (shown for time and words) */}
              {drillMode !== "quote" ? (
                <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
                  {DIFFICULTIES.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => handleDifficultyChange(d)}
                      aria-pressed={difficulty === d}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                        difficulty === d
                          ? "bg-primary text-primary-foreground font-semibold"
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

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="WPM"
              value={
                !drillSettings.showLiveWpm && running && !finished
                  ? "•••"
                  : settled
                    ? stats.wpm.toFixed(0)
                    : "—"
              }
              emphasis
              hint={
                !drillSettings.showLiveWpm && running && !finished
                  ? "hidden during test"
                  : settled
                    ? `raw ${stats.rawWpm.toFixed(0)}`
                    : "start typing"
              }
            />
            <StatCard
              label="Accuracy"
              value={
                !drillSettings.showLiveWpm && running && !finished
                  ? "•••"
                  : `${stats.accuracy.toFixed(0)}%`
              }
              hint={
                !drillSettings.showLiveWpm && running && !finished
                  ? "hidden during test"
                  : `${stats.incorrect} errors`
              }
            />
            <StatCard
              label={
                drillMode === "words" ? "Words" : drillMode === "quote" ? "Quote" : "Time left"
              }
              value={
                drillMode === "words"
                  ? `${Math.min(wordCount, typed.split(/\s+/).filter(Boolean).length)} / ${wordCount}`
                  : drillMode === "quote"
                    ? `${Math.min(100, Math.round((typed.length / (text.length || 1)) * 100))}%`
                    : `${Math.ceil(remaining)}s`
              }
              hint={
                drillMode === "words"
                  ? `${wordCount} words quota`
                  : drillMode === "quote"
                    ? quoteAuthor
                      ? `by ${quoteAuthor.split(" (")[0]}`
                      : "quote drill"
                    : `${duration}s run`
              }
              warn={drillMode === "time" && running && !finished && remaining <= 5}
            />
            <StatCard
              label="Consistency"
              value={
                !drillSettings.showLiveWpm && running && !finished
                  ? "•••"
                  : samples.length >= 3
                    ? `${stats.consistency.toFixed(0)}%`
                    : "—"
              }
              hint={
                !drillSettings.showLiveWpm && running && !finished
                  ? "hidden during test"
                  : previousBest
                    ? `best ${previousBest.toFixed(0)} wpm`
                    : "no record yet"
              }
            />
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <section
            className={`panel relative mt-3 cursor-text p-4 transition-shadow sm:p-8 ${
              errorFlash ? "shake" : ""
            } ${isRecord ? "record-glow" : ""}`}
            onClick={() => inputRef.current?.focus()}
          >
            <div
              className={
                !focused && !finished ? "blur-[3px] transition-[filter]" : "transition-[filter]"
              }
            >
              <TypingText text={text} typed={typed} caretStyle={drillSettings.caretStyle} />
              {drillMode === "quote" && quoteAuthor ? (
                <p className="mt-3 text-right font-sans text-xs italic text-muted-foreground">
                  — {quoteAuthor}
                </p>
              ) : null}
            </div>
            {mounted ? (
              <input
                ref={inputRef}
                type="text"
                name="typing_practice_input"
                id="typing_practice_input"
                data-form-type="other"
                data-lpignore="true"
                data-protonpass-ignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                value={typed}
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-label="Typing input"
                onChange={(e) => {
                  // Anti-cheat: reject multi-character input (paste / autofill),
                  // but allow IME composition commits through.
                  const composing = (e.nativeEvent as unknown as { isComposing?: boolean })
                    .isComposing;
                  if (!composing && e.target.value.length - typed.length > 1) {
                    e.target.value = typed;
                    return;
                  }
                  handleChange(e.target.value);
                }}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && ["v", "x"].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                  }
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
              />
            ) : null}
            <p aria-live="polite" className="sr-only">
              {finished
                ? `Run complete. ${shown.wpm.toFixed(0)} words per minute, ${shown.accuracy.toFixed(0)} percent accuracy.`
                : ""}
            </p>
            {!focused && !finished ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-lg bg-secondary/90 px-4 py-2 text-sm text-muted-foreground">
                  Click here or press any key to focus
                </span>
              </div>
            ) : null}
            {finished ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-xl bg-card/95 px-4 text-center backdrop-blur-sm sm:gap-3 sm:px-6">
                {isRecord ? (
                  <span className="animate-in fade-in zoom-in-95 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-foreground shadow-sm duration-300">
                    New personal best
                    {recordDelta != null && recordDelta > 0 ? ` (+${recordDelta} wpm)` : ""}
                  </span>
                ) : null}
                {shown.wpm >= drillSettings.targetWpm ? (
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Target met
                  </span>
                ) : null}
                <div
                  className={`font-mono text-4xl font-bold transition-all sm:text-5xl ${
                    isRecord ? "text-primary record-glow" : "text-primary"
                  }`}
                >
                  {shown.wpm.toFixed(0)}
                  <span className="ml-2 text-base font-normal text-muted-foreground">wpm</span>
                </div>

                <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                  <div className="panel flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Accuracy
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {shown.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="panel flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Correct
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-success sm:text-lg">
                      {shown.correct}
                    </span>
                  </div>
                  <div className="panel flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Errors
                    </span>
                    <span
                      className={`font-mono text-base font-semibold tabular-nums sm:text-lg ${
                        shown.incorrect > 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {shown.incorrect}
                    </span>
                  </div>
                  <div className="panel flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Raw WPM
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {shown.rawWpm.toFixed(0)}
                    </span>
                  </div>
                  <div className="panel flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Net WPM
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-primary sm:text-lg">
                      {shown.adjustedWpm.toFixed(0)}
                    </span>
                  </div>
                  <div className="panel flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Consistency
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {shown.consistency.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <WpmChart
                  samples={samples}
                  ghost={ghostSamples}
                  targetWpm={drillSettings.targetWpm}
                  className="mt-3"
                />
                <ProblemKeys mistakes={mistakes} />
                {Object.keys(allTimeKeys).length > 0 ? (
                  <ProblemKeys mistakes={allTimeKeys} limit={8} label="All-time problem keys" />
                ) : null}
                {Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0 ? (
                  <KeyHeatmap mistakes={allTimeKeys} speed={allTimeSpeed} className="mt-3" />
                ) : null}
                <AchievementsStrip unlocked={achState.unlocked} className="mt-3" />
                {drillMode === "quote" && quoteAuthor ? (
                  <p className="text-xs italic text-muted-foreground sm:text-sm">— {quoteAuthor}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    ref={againRef}
                    onClick={restart}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    Go again <span className="ml-1 text-xs opacity-75 font-mono">(Tab)</span>
                  </button>
                  {missedWords.length > 0 ? (
                    <button
                      type="button"
                      onClick={handlePracticeMissedWords}
                      className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/25 cursor-pointer"
                    >
                      <Target className="size-4 text-accent" />
                      Practice Missed Words ({missedWords.length})
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {drillSettings.showKeyboard ? (
            <div className="mt-4">
              <MemoKeyboard nextChar={nextChar} errorFlash={errorFlash} pressedChar={pressedChar} />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <WordShooter
            settings={shooterSettings}
            onOpenSettings={() => setShooterSettingsOpen(true)}
            onActiveTargetCharChange={setActiveShooterChar}
            onCharPressed={(char) => {
              setPressedChar(char);
              if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
              pressTimerRef.current = window.setTimeout(() => setPressedChar(null), 160);
            }}
            onRunComplete={handleShooterRunComplete}
            onWrongKey={handleShooterWrongKey}
            onStart={handleShooterStart}
          />

          <div className="mt-4 flex flex-col gap-2">
            {effectiveShooterSummary ? (
              <WordShooterProgress
                summary={effectiveShooterSummary}
                samples={effectiveShooterSummary.samples}
                className="mb-1"
              />
            ) : null}
            <ProblemKeys mistakes={shooterMistakes} />
            {Object.keys(allTimeKeys).length > 0 ? (
              <ProblemKeys mistakes={allTimeKeys} limit={8} label="All-time problem keys" />
            ) : null}
            {Object.keys(allTimeKeys).length > 0 ? <KeyHeatmap mistakes={allTimeKeys} /> : null}
            <AchievementsStrip unlocked={achState.unlocked} />
          </div>

          {shooterSettings.showKeyboard ? (
            <div className="mt-4">
              <MemoKeyboard
                nextChar={activeShooterChar}
                errorFlash={false}
                pressedChar={pressedChar}
              />
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4">
        <MemoHistory
          history={history}
          mode={mode}
          onClear={handleClearHistory}
          onImport={handleImportHistory}
        />
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Web edition of Typing Trainer Pro. Runs stay in your browser. Press{" "}
        <kbd className="rounded border border-border bg-secondary px-1 font-mono">Ctrl/⌘ K</kbd> for
        the command palette.
      </footer>

      <DrillSettingsDialog
        open={drillSettingsOpen}
        onOpenChange={setDrillSettingsOpen}
        settings={drillSettings}
        onSaveSettings={handleSaveDrillSettings}
      />

      <ShooterSettingsDialog
        open={shooterSettingsOpen}
        onOpenChange={setShooterSettingsOpen}
        settings={shooterSettings}
        onSaveSettings={handleSaveShooterSettings}
      />

      <CommandPalette
        difficulty={difficulty}
        duration={duration}
        difficulties={DIFFICULTIES}
        durations={DURATIONS}
        mode={mode}
        onDifficulty={handleDifficultyChange}
        onDuration={handleDurationChange}
        onRestart={restart}
        onModeChange={setMode}
        onOpenDrillSettings={() => setDrillSettingsOpen(true)}
        onOpenShooterSettings={() => setShooterSettingsOpen(true)}
      />
    </main>
  );
}
