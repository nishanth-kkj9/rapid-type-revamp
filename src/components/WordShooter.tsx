import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generatePassage, type Difficulty } from "@/lib/sentenceGenerator";

interface Enemy {
  id: number;
  word: string;
  typed: number;
  x: number; // percent
  y: number; // percent
  speed: number; // percent per second
}

interface Shot {
  id: number;
  x: number;
  y: number;
}

const HIGH_SCORE_KEY = "ttp:shooter:best:v1";

function wordPool(difficulty: Difficulty): string[] {
  const words = generatePassage(difficulty, 900)
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return words.length ? Array.from(new Set(words)) : ["type", "fast", "word"];
}

export function WordShooter({ difficulty }: { difficulty: Difficulty }) {
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shipX, setShipX] = useState(50);

  const idRef = useRef(1);
  const poolRef = useRef<string[]>([]);
  const spawnRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef({ phase, targetId });
  stateRef.current = { phase, targetId };

  useEffect(() => {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (raw) setBest(Number(raw) || 0);
  }, []);

  useEffect(() => {
    poolRef.current = wordPool(difficulty);
  }, [difficulty]);

  const level = useMemo(() => 1 + Math.floor(score / 400), [score]);

  const start = useCallback(() => {
    poolRef.current = wordPool(difficulty);
    idRef.current = 1;
    spawnRef.current = 0;
    setEnemies([]);
    setShots([]);
    setScore(0);
    setLives(3);
    setStreak(0);
    setHits(0);
    setMisses(0);
    setTargetId(null);
    setShipX(50);
    setPhase("playing");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [difficulty]);

  // Game loop: move enemies, spawn new ones, drop lives on breaches.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const lvl = 1 + Math.floor(score / 400);

      spawnRef.current -= dt;
      setEnemies((prev) => {
        let next = prev.map((e) => ({ ...e, y: e.y + e.speed * dt }));
        const breached = next.filter((e) => e.y >= 88);
        if (breached.length) {
          next = next.filter((e) => e.y < 88);
          setLives((l) => Math.max(0, l - breached.length));
          setMisses((m) => m + breached.length);
          setStreak(0);
          if (breached.some((e) => e.id === stateRef.current.targetId)) setTargetId(null);
        }
        if (spawnRef.current <= 0 && next.length < 7) {
          spawnRef.current = Math.max(0.7, 2.2 - lvl * 0.15);
          const pool = poolRef.current;
          const word = pool[Math.floor(Math.random() * pool.length)] ?? "type";
          if (!next.some((e) => e.word === word)) {
            next = [
              ...next,
              {
                id: idRef.current++,
                word,
                typed: 0,
                x: 8 + Math.random() * 84,
                y: -4,
                speed: 3.2 + lvl * 0.9 + Math.random() * 1.6,
              },
            ];
          }
        }
        return next;
      });
      setShots((prev) => prev.map((s) => ({ ...s, y: s.y - 220 * dt })).filter((s) => s.y > -10));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, score]);

  useEffect(() => {
    if (phase === "playing" && lives <= 0) {
      setPhase("over");
      setScore((s) => {
        setBest((b) => {
          const nb = Math.max(b, s);
          localStorage.setItem(HIGH_SCORE_KEY, String(nb));
          return nb;
        });
        return s;
      });
    }
  }, [lives, phase]);

  const fire = useCallback((enemy: Enemy) => {
    setShipX(enemy.x);
    setShots((s) => [...s, { id: idRef.current++, x: enemy.x, y: 88 }]);
  }, []);

  const handleKey = useCallback(
    (char: string) => {
      if (phase !== "playing") return;
      setEnemies((prev) => {
        const current = targetId != null ? prev.find((e) => e.id === targetId) : undefined;
        let target = current;
        if (!target) {
          // Lock the lowest enemy whose first letter matches.
          target = prev
            .filter((e) => e.word[0] === char)
            .sort((a, b) => b.y - a.y)
            .at(0);
          if (!target) {
            setStreak(0);
            return prev;
          }
          setTargetId(target.id);
        }
        if (target.word[target.typed] !== char) {
          setStreak(0);
          return prev;
        }
        const typed = target.typed + 1;
        fire(target);
        if (typed >= target.word.length) {
          setTargetId(null);
          setHits((h) => h + 1);
          setStreak((st) => {
            const ns = st + 1;
            setScore((s) => s + target.word.length * 10 * Math.min(5, 1 + Math.floor(ns / 5)));
            return ns;
          });
          return prev.filter((e) => e.id !== target.id);
        }
        return prev.map((e) => (e.id === target.id ? { ...e, typed } : e));
      });
    },
    [phase, targetId, fire],
  );

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 100;

  return (
    <section className="panel mt-3 p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        <span className="font-mono text-lg font-bold text-primary sm:text-xl">{score}</span>
        <span className="text-muted-foreground">pts</span>
        <span className="text-muted-foreground">Level {level}</span>
        <span className="text-muted-foreground">Streak {streak}</span>
        <span className="text-muted-foreground">Destroyed {hits}</span>
        <span className="text-muted-foreground">Hit rate {accuracy}%</span>
        <span className="ml-auto font-mono" aria-label={`${lives} lives left`}>
          {"❤".repeat(Math.max(0, lives))}
          <span className="text-muted-foreground">{"·".repeat(Math.max(0, 3 - lives))}</span>
        </span>
      </div>

      <div
        className="relative h-[380px] w-full cursor-text overflow-hidden rounded-xl border border-border bg-secondary/40 sm:h-[440px]"
        onClick={() => inputRef.current?.focus()}
      >
        {enemies.map((e) => {
          const active = e.id === targetId;
          return (
            <div
              key={e.id}
              className={`absolute -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 font-mono text-sm sm:text-base ${
                active ? "bg-primary/15 ring-1 ring-primary" : ""
              }`}
              style={{ left: `${e.x}%`, top: `${e.y}%` }}
            >
              <span className="text-primary">{e.word.slice(0, e.typed)}</span>
              <span className={active ? "text-foreground" : "text-muted-foreground"}>
                {e.word.slice(e.typed)}
              </span>
            </div>
          );
        })}

        {shots.map((s) => (
          <div
            key={s.id}
            className="absolute h-4 w-[2px] -translate-x-1/2 rounded-full bg-accent"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          />
        ))}

        <div
          className="absolute bottom-2 size-0 -translate-x-1/2 border-x-[12px] border-b-[20px] border-x-transparent border-b-primary transition-[left] duration-100"
          style={{ left: `${shipX}%` }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-border" />

        {phase !== "playing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/90 px-6 text-center backdrop-blur-sm">
            <h2 className="font-mono text-xl font-bold sm:text-2xl">
              {phase === "idle" ? "Word Shooter" : "Game over"}
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {phase === "idle"
                ? "Words fall from the sky. Type a word to lock on and shoot it down before it reaches your ship."
                : `You scored ${score} points, destroyed ${hits} words with ${accuracy}% hit rate.`}
            </p>
            <p className="text-xs text-muted-foreground">Best score: {best}</p>
            <button
              onClick={start}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {phase === "idle" ? "Start game" : "Play again"}
            </button>
          </div>
        ) : null}

        <input
          ref={inputRef}
          value=""
          aria-label="Word shooter input"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length === 1) handleKey(v.toLowerCase());
            e.target.value = "";
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              start();
            }
          }}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Type the letters of a falling word to fire. Esc restarts. Each missed word costs a life.
      </p>
    </section>
  );
}
