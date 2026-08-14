import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generatePassage, type Difficulty } from "@/lib/sentenceGenerator";
import {
  clearHistory,
  computeStats,
  loadHistory,
  saveRun,
  type HistoryEntry,
} from "@/lib/typingStats";
import { Keyboard } from "@/components/Keyboard";
import { TypingText } from "@/components/TypingText";
import { StatCard } from "@/components/StatCard";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProblemKeys } from "@/components/ProblemKeys";

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

function Index() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [duration, setDuration] = useState<number>(30);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [finished, setFinished] = useState(false);
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


  useEffect(() => setHistory(loadHistory()), []);

  const reset = useCallback(
    (d: Difficulty = difficulty) => {
      setText(generatePassage(d, 320));
      setTyped("");
      setStartedAt(null);
      setElapsedMs(0);
      startTimeRef.current = null;

      setFinished(false);
      setCorrect(0);
      setIncorrect(0);
      setMistakes({});
      setSamples([]);
      setPressedChar(null);
      savedRef.current = false;
      inputRef.current?.focus();
    },
    [difficulty],
  );

  useEffect(() => {
    reset(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, duration]);

  const elapsed = startedAt ? Math.max(0, elapsedMs) : 0;
  const remaining = Math.max(0, duration - elapsed / 1000);

  // High-precision timer: requestAnimationFrame + performance.now (no drift).
  useEffect(() => {
    if (!startedAt || finished) return;
    if (startTimeRef.current === null) startTimeRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const start = startTimeRef.current;
      if (start === null) return;
      setElapsedMs(performance.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, finished]);


  // sample correct-char count each second for consistency
  useEffect(() => {
    if (!startedAt || finished) return;
    const id = window.setInterval(() => {
      setSamples((s) => [...s, correct]);
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, finished, correct]);

  const stats = useMemo(
    () =>
      computeStats(
        correct,
        incorrect,
        elapsed || 1,
        samples.map((v, i, a) => (i === 0 ? v : v - (a[i - 1] ?? 0))),
      ),
    [correct, incorrect, elapsed, samples],
  );

  const previousBest = useMemo(
    () => history.reduce((m, h) => Math.max(m, h.wpm), 0),
    [history],
  );
  const bestRef = useRef(0);
  useEffect(() => {
    if (!finished) bestRef.current = previousBest;
  }, [finished, previousBest]);
  const isRecord = finished && stats.wpm > bestRef.current && stats.wpm > 0;

  const finish = useCallback(() => {
    setFinished(true);
    if (savedRef.current) return;
    savedRef.current = true;
    if (correct + incorrect > 0) {
      setHistory(
        saveRun({
          ...stats,
          id: `${Date.now()}`,
          date: Date.now(),
          difficulty,
          mode: `${duration}s`,
        }),
      );
    }
  }, [stats, correct, incorrect, difficulty, duration]);

  useEffect(() => {
    if (startedAt && !finished && remaining <= 0) finish();
  }, [remaining, startedAt, finished, finish]);

  // Global shortcuts: Esc / Tab restart from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset]);

  const handleChange = (value: string) => {
    if (finished) return;
    if (!startedAt) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    }
    if (value.length < typed.length) {
      setTyped(value);
      return;
    }
    const added = value.slice(typed.length);
    let ok = 0;
    let bad = 0;
    const missed: Record<string, number> = {};
    for (let i = 0; i < added.length; i++) {
      const expected = text[typed.length + i];
      if (added[i] === expected) ok++;
      else {
        bad++;
        if (expected) missed[expected] = (missed[expected] ?? 0) + 1;
      }
    }
    setCorrect((c) => c + ok);
    setIncorrect((c) => c + bad);
    setPressedChar(added[added.length - 1] ?? null);
    if (bad > 0) {
      setMistakes((m) => {
        const next = { ...m };
        for (const [k, v] of Object.entries(missed)) next[k] = (next[k] ?? 0) + v;
        return next;
      });
      setErrorFlash(true);
      window.setTimeout(() => setErrorFlash(false), 140);
    }
    setTyped(value);
    if (value.length >= text.length - 60) {
      setText((t) => t + " " + generatePassage(difficulty, 200));
    }
  };

  const nextChar = finished ? null : (text[typed.length] ?? null);
  const progress = Math.min(100, startedAt ? (elapsed / 1000 / duration) * 100 : 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
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
          onClick={() => reset()}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Restart{" "}
          <span className="ml-1 font-mono text-xs text-muted-foreground">Esc / Tab</span>
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
        <StatCard label="WPM" value={stats.wpm.toFixed(0)} emphasis hint={`raw ${stats.rawWpm.toFixed(0)}`} />
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
        className="panel relative mt-3 cursor-text p-6 sm:p-8"
        onClick={() => inputRef.current?.focus()}
      >
        <div className={!focused && !finished ? "blur-[3px] transition-[filter]" : "transition-[filter]"}>
          <TypingText text={text} typed={typed} />
        </div>
        <input
          ref={inputRef}
          value={typed}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Typing input"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
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
              {stats.accuracy.toFixed(1)}% accuracy · {stats.correct} correct ·{" "}
              {stats.incorrect} errors · raw {stats.rawWpm.toFixed(0)} · consistency{" "}
              {stats.consistency.toFixed(0)}%
            </div>
            <ProblemKeys mistakes={mistakes} />
            <button
              onClick={() => reset()}
              className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Go again
            </button>
          </div>
        ) : null}
      </section>

      <div className="mt-4">
        <Keyboard nextChar={nextChar} errorFlash={errorFlash} pressedChar={pressedChar} />
      </div>

      <div className="mt-4">
        <HistoryPanel history={history} onClear={() => setHistory(clearHistory())} />
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Web edition of Typing Trainer Pro. Runs stay in your browser.
      </footer>
    </main>
  );
}
