import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { generatePassage, type Difficulty } from "@/lib/sentenceGenerator";
import {
  clearHistory,
  computeStats,
  loadHistory,
  newRunId,
  saveRun,
  toDeltas,
  type HistoryEntry,
  type RunStats,
} from "@/lib/typingStats";

import { Keyboard } from "@/components/Keyboard";
import { TypingText } from "@/components/TypingText";
import { StatCard } from "@/components/StatCard";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProblemKeys } from "@/components/ProblemKeys";
import { WpmChart } from "@/components/WpmChart";
import { CommandPalette } from "@/components/CommandPalette";

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
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [duration, setDuration] = useState<number>(30);
  // Generated after mount: random text during SSR would hydration-mismatch.
  const [text, setText] = useState<string>("");
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [finished, setFinished] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [pressedChar, setPressedChar] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [samples, setSamples] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [focused, setFocused] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);

  useEffect(() => {
    const loaded = loadHistory();
    historyRef.current = loaded;
    setHistory(loaded);
    setText((t) => (t ? t : generatePassage("medium", 320)));
  }, []);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const reset = useCallback((d: Difficulty) => {
    setText(generatePassage(d, 320));
    setTyped("");
    setRunning(false);
    setElapsedMs(0);
    startTimeRef.current = null;
    setFinished(false);
    setIsRecord(false);
    setCorrect(0);
    setIncorrect(0);
    correctRef.current = 0;
    incorrectRef.current = 0;
    setMistakes({});
    setSamples([]);
    samplesRef.current = [];
    setPressedChar(null);
    savedRef.current = false;
    inputRef.current?.focus();
  }, []);

  const restart = useCallback(() => reset(difficulty), [reset, difficulty]);

  useEffect(() => {
    reset(difficulty);
  }, [difficulty, duration, reset]);

  const elapsed = running ? Math.max(0, elapsedMs) : 0;
  const remaining = Math.max(0, duration - elapsed / 1000);

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
        if (ms >= duration * 1000) {
          setElapsedMs(duration * 1000);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, finished, duration]);

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

  const previousBest = useMemo(
    () => history.reduce((m, h) => Math.max(m, h.wpm), 0),
    [history],
  );

  const finish = useCallback(() => {
    setFinished(true);
    if (savedRef.current) return;
    savedRef.current = true;
    const finalStats = computeStats(
      correctRef.current,
      incorrectRef.current,
      duration * 1000,
      toDeltas(samplesRef.current),
    );
    const prevBest = historyRef.current.reduce((m, h) => Math.max(m, h.wpm), 0);
    setIsRecord(finalStats.wpm > prevBest && finalStats.wpm > 0);
    if (finalStats.typed > 0) {
      const { list, ok } = saveRun({
        ...finalStats,
        id: newRunId(),
        date: Date.now(),
        difficulty,
        mode: `${duration}s`,
      });
      historyRef.current = list;
      setHistory(list);
      if (!ok) {
        toast.error("Couldn't save this run — storage is full. Export and clear old runs.");
      }
    }
  }, [difficulty, duration]);

  useEffect(() => {
    if (running && !finished && remaining <= 0) finish();
  }, [remaining, running, finished, finish]);

  // Esc restarts. Tab is deliberately left alone so keyboard navigation works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "Escape") {
        e.preventDefault();
        restart();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart]);

  const handleChange = (value: string) => {
    if (finished) return;
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
    setMistakes(next.mistakes);

    if (grew) {
      const last = value[value.length - 1] ?? null;
      setPressedChar(last);
      if (last !== text[value.length - 1]) {
        setErrorFlash(true);
        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setErrorFlash(false), 140);
      }
    }

    setTyped(value);
    if (value.length >= text.length - 60 && text.length < 6000) {
      setText((t) => `${t} ${generatePassage(difficulty, 200)}`);
    }
  };

  const nextChar = finished ? null : (text[typed.length] ?? null);
  const progress = Math.min(100, running ? (elapsed / 1000 / duration) * 100 : 0);
  const settled = elapsed > 1000;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
            Typing<span className="text-primary">Trainer</span>Pro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Timed drills with live WPM, accuracy and a keyboard that shows your next key.
          </p>
        </div>
        <button
          onClick={restart}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Restart <span className="ml-1 font-mono text-xs text-muted-foreground">Esc</span>
        </button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                difficulty === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {DURATIONS.map((s) => (
            <button
              key={s}
              onClick={() => setDuration(s)}
              aria-pressed={duration === s}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                duration === s
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="WPM"
          value={settled ? stats.wpm.toFixed(0) : "—"}
          emphasis
          hint={settled ? `raw ${stats.rawWpm.toFixed(0)}` : "start typing"}
        />
        <StatCard
          label="Accuracy"
          value={`${stats.accuracy.toFixed(0)}%`}
          hint={`${stats.incorrect} errors`}
        />
        <StatCard label="Time left" value={`${Math.ceil(remaining)}s`} hint={`${duration}s run`} />
        <StatCard
          label="Consistency"
          value={`${stats.consistency.toFixed(0)}%`}
          hint={previousBest ? `best ${previousBest.toFixed(0)} wpm` : "no record yet"}
        />
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section
        className={`panel relative mt-3 cursor-text p-6 transition-shadow sm:p-8 ${
          errorFlash ? "shake" : ""
        } ${isRecord ? "record-glow" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        <div
          className={
            !focused && !finished ? "blur-[3px] transition-[filter]" : "transition-[filter]"
          }
        >
          <TypingText text={text} typed={typed} />
        </div>
        <input
          ref={inputRef}
          value={typed}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          data-lpignore="true"
          spellCheck={false}
          aria-label="Typing input"
          onChange={(e) => {
            // Anti-cheat: reject multi-character input (paste / autofill).
            if (e.target.value.length - typed.length > 1) {
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
        <p aria-live="polite" className="sr-only">
          {finished
            ? `Run complete. ${stats.wpm.toFixed(0)} words per minute, ${stats.accuracy.toFixed(0)} percent accuracy.`
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/95 px-6 text-center backdrop-blur-sm">
            {isRecord ? (
              <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-foreground">
                New personal best
              </span>
            ) : null}
            <div className="font-mono text-5xl font-bold text-primary">
              {stats.wpm.toFixed(0)}
              <span className="ml-2 text-base font-normal text-muted-foreground">wpm</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {stats.accuracy.toFixed(1)}% accuracy · {stats.correct} correct · {stats.incorrect}{" "}
              errors · raw {stats.rawWpm.toFixed(0)} · net {stats.adjustedWpm.toFixed(0)} ·
              consistency {stats.consistency.toFixed(0)}%
            </div>
            <WpmChart samples={samples} />
            <ProblemKeys mistakes={mistakes} />
            <button
              onClick={restart}
              className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Go again
            </button>
          </div>
        ) : null}
      </section>

      <div className="mt-4">
        <MemoKeyboard nextChar={nextChar} errorFlash={errorFlash} pressedChar={pressedChar} />
      </div>

      <div className="mt-4">
        <MemoHistory
          history={history}
          onClear={() => setHistory(clearHistory())}
          onImport={(entries) => setHistory(entries)}
        />
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Web edition of Typing Trainer Pro. Runs stay in your browser. Press{" "}
        <kbd className="rounded border border-border bg-secondary px-1 font-mono">Ctrl/⌘ K</kbd> for
        the command palette.
      </footer>

      <CommandPalette
        difficulty={difficulty}
        duration={duration}
        difficulties={DIFFICULTIES}
        durations={DURATIONS}
        onDifficulty={setDifficulty}
        onDuration={setDuration}
        onRestart={restart}
      />
    </main>
  );
}
