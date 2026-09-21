import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generatePassage, type Difficulty } from "@/lib/sentenceGenerator";
import type { ShooterSettings } from "@/lib/shooterSettings";
import {
  playLaserSound,
  playExplosionSound,
  playBreachSound,
  playGameOverSound,
} from "@/lib/arcadeAudio";
import { Sliders, Volume2, VolumeX, Pause, Play, RotateCcw, Crosshair, Award } from "lucide-react";

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
  startX: number;
  targetX: number;
  y: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  particles: { dx: number; dy: number; color: string; size: number }[];
}

const HIGH_SCORE_KEY = "ttp:shooter:best:v1";

function wordPool(difficulty: Difficulty): string[] {
  const words = generatePassage(difficulty, 900)
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return words.length ? Array.from(new Set(words)) : ["type", "fast", "word", "laser", "ship"];
}

function createInitialEnemies(pool: string[], speedMult: number, lvl: number): Enemy[] {
  const words: string[] = [];
  const usedLetters = new Set<string>();
  const candidates = pool.length ? pool : ["type", "swift", "laser", "react", "speed", "focus"];

  for (const w of candidates) {
    if (words.length >= 3) break;
    const first = w[0]?.toLowerCase() ?? "";
    if (!usedLetters.has(first)) {
      usedLetters.add(first);
      words.push(w);
    }
  }

  while (words.length < 3) {
    words.push(candidates[words.length % candidates.length] ?? "word");
  }

  const positions = [
    { x: 25, y: 12 },
    { x: 55, y: 26 },
    { x: 78, y: 40 },
  ];

  return words.map((word, i) => {
    const baseSpeed = (3.0 + lvl * 0.6 + Math.random() * 0.8) * speedMult;
    return {
      id: i + 1,
      word,
      typed: 0,
      x: positions[i]?.x ?? 20 + i * 25,
      y: positions[i]?.y ?? 12 + i * 14,
      speed: baseSpeed,
    };
  });
}

interface WordShooterProps {
  settings: ShooterSettings;
  onOpenSettings: () => void;
  onActiveTargetCharChange?: (char: string | null) => void;
}

export function WordShooter({
  settings,
  onOpenSettings,
  onActiveTargetCharChange,
}: WordShooterProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "over">("playing");
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.startingLives);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shipX, setShipX] = useState(50);
  const [soundMuted, setSoundMuted] = useState(!settings.soundEnabled);

  const idRef = useRef(10);
  const poolRef = useRef<string[]>([]);
  const spawnRef = useRef(2.0);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef({ phase, targetId, settings, soundMuted });
  stateRef.current = { phase, targetId, settings, soundMuted };

  // Sync sound muted with settings
  useEffect(() => {
    setSoundMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  useEffect(() => {
    setMounted(true);
    const pool = wordPool(settings.difficulty);
    poolRef.current = pool;
    const initial = createInitialEnemies(pool, settings.speedMultiplier, 1);
    setEnemies(initial);
    idRef.current = 10;
    spawnRef.current = 2.0;

    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (raw) setBest(Number(raw) || 0);

    requestAnimationFrame(() => inputRef.current?.focus());
  }, [settings.difficulty, settings.speedMultiplier]);

  useEffect(() => {
    poolRef.current = wordPool(settings.difficulty);
  }, [settings.difficulty]);

  const level = useMemo(() => 1 + Math.floor(score / 400), [score]);

  // Pass active expected character up to keyboard
  useEffect(() => {
    if (!onActiveTargetCharChange) return;
    if (phase !== "playing") {
      onActiveTargetCharChange(null);
      return;
    }
    const currentEnemy = enemies.find((e) => e.id === targetId);
    if (currentEnemy && currentEnemy.typed < currentEnemy.word.length) {
      onActiveTargetCharChange(currentEnemy.word[currentEnemy.typed] ?? null);
    } else {
      onActiveTargetCharChange(null);
    }
  }, [enemies, targetId, phase, onActiveTargetCharChange]);

  const start = useCallback(() => {
    const pool = wordPool(settings.difficulty);
    poolRef.current = pool;
    idRef.current = 10;
    spawnRef.current = 2.0;
    const initial = createInitialEnemies(pool, settings.speedMultiplier, 1);
    setEnemies(initial);
    setShots([]);
    setExplosions([]);
    setScore(0);
    setLives(settings.startingLives);
    setStreak(0);
    setHits(0);
    setMisses(0);
    setTargetId(null);
    setShipX(50);
    setIsNewRecord(false);
    setPhase("playing");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [settings.difficulty, settings.speedMultiplier, settings.startingLives]);

  const togglePause = useCallback(() => {
    if (phase === "playing") {
      setPhase("paused");
    } else if (phase === "paused") {
      setPhase("playing");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [phase]);

  // Main game physics and animation loop
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const currentSettings = stateRef.current.settings;
      const speedMult = currentSettings.speedMultiplier;
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

          playBreachSound(stateRef.current.soundMuted);

          if (breached.some((e) => e.id === stateRef.current.targetId)) {
            setTargetId(null);
          }
        }

        // Spawn new enemy word if ready
        const maxSimultaneous = Math.min(8, 3 + Math.floor(lvl / 2));
        if (spawnRef.current <= 0 && next.length < maxSimultaneous) {
          const spawnInterval = Math.max(0.8, (2.2 - lvl * 0.15) / Math.sqrt(speedMult));
          spawnRef.current = spawnInterval;

          const pool = poolRef.current.length
            ? poolRef.current
            : ["type", "swift", "laser", "focus", "speed"];
          const available = pool.filter(
            (w) => !next.some((e) => e.word === w || e.word[0] === w[0]),
          );
          const word =
            (available.length > 0
              ? available[Math.floor(Math.random() * available.length)]
              : null) ??
            pool[Math.floor(Math.random() * pool.length)] ??
            "arcade";

          if (!next.some((e) => e.word === word)) {
            const baseSpeed = (3.2 + lvl * 0.8 + Math.random() * 1.5) * speedMult;
            next = [
              ...next,
              {
                id: idRef.current++,
                word,
                typed: 0,
                x: 15 + Math.random() * 70,
                y: 0,
                speed: baseSpeed,
              },
            ];
          }
        }

        return next;
      });

      // Advance shots
      setShots((prev) => prev.map((s) => ({ ...s, y: s.y - 240 * dt })).filter((s) => s.y > -10));

      // Clean up explosions after short delay
      setExplosions((prev) => prev.slice(-8));

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, score]);

  // Handle Game Over
  useEffect(() => {
    if (phase === "playing" && lives <= 0) {
      setPhase("over");
      playGameOverSound(soundMuted);

      setScore((currentScore) => {
        setBest((b) => {
          if (currentScore > b) {
            setIsNewRecord(true);
            localStorage.setItem(HIGH_SCORE_KEY, String(currentScore));
            return currentScore;
          }
          return b;
        });
        return currentScore;
      });
    }
  }, [lives, phase, soundMuted]);

  const fire = useCallback(
    (enemy: Enemy) => {
      setShipX(enemy.x);
      setShots((s) => [
        ...s,
        {
          id: idRef.current++,
          startX: shipX,
          targetX: enemy.x,
          y: 86,
        },
      ]);
      playLaserSound(soundMuted);
    },
    [shipX, soundMuted],
  );

  const spawnExplosion = useCallback((x: number, y: number) => {
    const colors = [
      "var(--color-primary)",
      "var(--color-accent)",
      "var(--color-success)",
      "#f59e0b",
    ];
    const particles = Array.from({ length: 8 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#f59e0b",
        size: 3 + Math.random() * 3,
      };
    });

    const exp: Explosion = {
      id: Date.now() + Math.random(),
      x,
      y,
      particles,
    };

    setExplosions((prev) => [...prev, exp]);
    setTimeout(() => {
      setExplosions((prev) => prev.filter((e) => e.id !== exp.id));
    }, 400);
  }, []);

  const handleKey = useCallback(
    (char: string) => {
      if (phase !== "playing") return;

      setEnemies((prev) => {
        const current = targetId != null ? prev.find((e) => e.id === targetId) : undefined;
        let target = current;

        if (!target) {
          // Lock onto the lowest enemy that starts with this char
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
          // Word destroyed!
          setTargetId(null);
          setHits((h) => h + 1);
          playExplosionSound(soundMuted);
          spawnExplosion(target.x, target.y);

          setStreak((st) => {
            const ns = st + 1;
            const streakBonus = Math.min(5, 1 + Math.floor(ns / 5));
            const points = target.word.length * 10 * streakBonus;
            setScore((s) => s + points);
            return ns;
          });

          return prev.filter((e) => e.id !== target.id);
        }

        return prev.map((e) => (e.id === target.id ? { ...e, typed } : e));
      });
    },
    [phase, targetId, fire, soundMuted, spawnExplosion],
  );

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 100;
  const hasDangerEnemy = enemies.some((e) => e.y > 65);

  // Global key listener so users can type immediately without having to focus the hidden input first
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        e.preventDefault();
        start();
        return;
      }

      if (e.key === "p" || e.key === "P") {
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          (active.tagName === "INPUT" || active.tagName === "BUTTON") &&
          active.id !== "word_shooter_input"
        ) {
          return;
        }
        e.preventDefault();
        togglePause();
        return;
      }

      if (phase === "idle" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        start();
        return;
      }

      if (phase === "playing" && e.key.length === 1 && /^[a-z0-9'-]$/i.test(e.key)) {
        handleKey(e.key.toLowerCase());
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [phase, handleKey, start, togglePause]);

  return (
    <section className="panel mt-3 p-3 sm:p-5">
      {/* Top Status Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-bold text-primary sm:text-2xl">{score}</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">pts</span>
          </div>
          <span className="rounded-md border border-border bg-secondary/80 px-2 py-0.5 text-xs font-medium">
            Level {level}
          </span>
          <span className="text-muted-foreground">
            Streak <span className="font-mono font-semibold text-foreground">{streak}</span>
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            Hit rate <span className="font-mono font-semibold text-foreground">{accuracy}%</span>
          </span>
        </div>

        {/* Action buttons and lives */}
        <div className="flex items-center gap-3">
          {/* Hearts / Lives Counter */}
          <div
            className="flex items-center gap-0.5 font-mono text-sm"
            aria-label={`${lives} of ${settings.startingLives} lives left`}
            title={`${lives} / ${settings.startingLives} lives`}
          >
            <span className="text-destructive">{"❤".repeat(Math.min(6, Math.max(0, lives)))}</span>
            {lives > 6 && (
              <span className="ml-0.5 text-xs font-bold text-destructive">+{lives - 6}</span>
            )}
            <span className="text-muted-foreground/40">
              {"·".repeat(Math.max(0, Math.min(6, settings.startingLives) - Math.min(6, lives)))}
            </span>
          </div>

          {/* Audio toggle button */}
          <button
            type="button"
            onClick={() => setSoundMuted((m) => !m)}
            aria-label={soundMuted ? "Unmute arcade sound effects" : "Mute arcade sound effects"}
            title={soundMuted ? "Unmute arcade audio" : "Mute arcade audio"}
            className="rounded-lg border border-border bg-secondary p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {soundMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4 text-accent" />
            )}
          </button>

          {/* Pause / Resume Button (when playing) */}
          {phase === "playing" || phase === "paused" ? (
            <button
              type="button"
              onClick={togglePause}
              aria-label={phase === "playing" ? "Pause game" : "Resume game"}
              title={phase === "playing" ? "Pause game" : "Resume game"}
              className="rounded-lg border border-border bg-secondary p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {phase === "playing" ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4 text-primary" />
              )}
            </button>
          ) : null}

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Open Word Shooter Settings"
          >
            <Sliders className="size-3.5 text-primary" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Game Playfield Canvas Container */}
      <div
        className={`relative h-[400px] w-full cursor-text overflow-hidden rounded-xl border border-border bg-secondary/30 transition-all duration-300 sm:h-[460px] ${
          hasDangerEnemy && phase === "playing"
            ? "shadow-[0_0_24px_rgba(239,68,68,0.15)] ring-1 ring-destructive/40"
            : ""
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Starfield / Grid background lines */}
        <div className="pointer-events-none absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Falling Word Enemies */}
        {enemies.map((e) => {
          const active = e.id === targetId;
          const isDanger = e.y > 65;

          return (
            <div
              key={e.id}
              className={`absolute -translate-x-1/2 select-none whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-sm font-semibold transition-transform duration-75 sm:text-base ${
                active
                  ? "bg-primary/20 text-foreground ring-2 ring-primary shadow-lg shadow-primary/20 scale-105 z-20"
                  : isDanger
                    ? "bg-destructive/15 text-destructive ring-1 ring-destructive/50"
                    : "bg-card/90 border border-border text-foreground shadow-sm"
              }`}
              style={{ left: `${e.x}%`, top: `${e.y}%` }}
            >
              {active ? (
                <Crosshair className="absolute -left-5 top-1/2 size-4 -translate-y-1/2 text-primary animate-pulse" />
              ) : null}
              <span className="text-primary underline decoration-primary decoration-2 underline-offset-2">
                {e.word.slice(0, e.typed)}
              </span>
              <span className={active ? "text-foreground font-bold" : "text-muted-foreground"}>
                {e.word.slice(e.typed)}
              </span>
            </div>
          );
        })}

        {/* Laser Projectile Shots */}
        {shots.map((s) => (
          <div
            key={s.id}
            className="absolute h-5 w-[3px] -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]"
            style={{ left: `${s.targetX}%`, top: `${s.y}%` }}
          />
        ))}

        {/* Particle Explosions on Word Destruction */}
        {explosions.map((exp) => (
          <div
            key={exp.id}
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${exp.x}%`, top: `${exp.y}%` }}
          >
            {exp.particles.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-ping"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  transform: `translate(${p.dx}px, ${p.dy}px)`,
                }}
              />
            ))}
          </div>
        ))}

        {/* Player Ship */}
        <div
          className="absolute bottom-3 size-0 -translate-x-1/2 border-x-[14px] border-b-[24px] border-x-transparent border-b-primary transition-[left] duration-100 ease-out z-10"
          style={{ left: `${shipX}%` }}
          aria-hidden
        >
          {/* Thruster Jet Glow */}
          <div className="absolute left-[-4px] top-[24px] h-3 w-2 animate-pulse rounded-b-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
        </div>

        {/* Bottom Defense Line / Shield */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Overlay screens: Idle / Paused / Game Over */}
        {phase === "idle" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/90 px-6 text-center backdrop-blur-sm z-30">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Crosshair className="size-8" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                Word Shooter
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
                Hostile words are descending. Type any falling word’s first letter to lock on and
                fire your cannons before they breach your shield!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="rounded-md border border-border bg-secondary px-2.5 py-1">
                Difficulty:{" "}
                <strong className="capitalize text-primary">{settings.difficulty}</strong>
              </span>
              <span className="rounded-md border border-border bg-secondary px-2.5 py-1">
                Speed:{" "}
                <strong className="text-primary">{settings.speedMultiplier.toFixed(2)}x</strong>
              </span>
              <span className="rounded-md border border-border bg-secondary px-2.5 py-1">
                Lives: <strong className="text-destructive">{settings.startingLives} ❤</strong>
              </span>
            </div>

            {best > 0 && (
              <p className="text-xs font-mono text-muted-foreground">
                Current Best Score: <span className="font-bold text-primary">{best}</span> pts
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={start}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                Start Game
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Sliders className="size-4 text-primary" />
                Settings
              </button>
            </div>
          </div>
        ) : null}

        {phase === "paused" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/90 px-6 text-center backdrop-blur-sm z-30">
            <h2 className="font-mono text-2xl font-bold tracking-tight">Game Paused</h2>
            <p className="text-sm text-muted-foreground">
              Current score: <span className="font-mono font-bold text-primary">{score}</span> pts
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="size-4" />
                Resume Game
              </button>
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-4" />
                Restart
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-xl border border-border bg-secondary p-2.5 text-muted-foreground hover:text-foreground"
                title="Settings"
              >
                <Sliders className="size-4 text-primary" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === "over" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 px-6 text-center backdrop-blur-sm z-30">
            {isNewRecord && (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-accent ring-1 ring-accent">
                <Award className="size-3.5" />
                New High Score!
              </div>
            )}
            <h2 className="font-mono text-3xl font-bold text-foreground sm:text-4xl">Game Over</h2>
            <div className="font-mono text-4xl font-extrabold text-primary">
              {score} <span className="text-base font-normal text-muted-foreground">pts</span>
            </div>
            <div className="max-w-xs text-xs text-muted-foreground sm:text-sm">
              Destroyed <strong className="text-foreground">{hits}</strong> words with{" "}
              <strong className="text-foreground">{accuracy}%</strong> hit rate. Reached level{" "}
              <strong className="text-foreground">{level}</strong>.
            </div>
            <p className="text-xs font-mono text-muted-foreground">All-time best: {best} pts</p>

            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={start}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Sliders className="size-4 text-primary" />
                Tune Settings
              </button>
            </div>
          </div>
        ) : null}

        {/* Hidden Input for Capturing Keystrokes */}
        {mounted ? (
          <input
            ref={inputRef}
            type="text"
            name="word_shooter_input"
            id="word_shooter_input"
            data-form-type="other"
            data-lpignore="true"
            data-protonpass-ignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
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
              } else if (e.key === "p" || e.key === "P") {
                if (phase === "playing" || phase === "paused") {
                  e.preventDefault();
                  togglePause();
                }
              }
            }}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        ) : null}
      </div>

      {/* Footer Instructions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Type falling word letters to fire cannon ·{" "}
          <kbd className="rounded border border-border bg-secondary px-1 font-mono">P</kbd> Pause ·{" "}
          <kbd className="rounded border border-border bg-secondary px-1 font-mono">Esc</kbd>{" "}
          Restart
        </p>
        <span className="font-mono text-[11px]">
          Target:{" "}
          {targetId != null ? (
            <span className="font-semibold text-primary">
              {enemies.find((e) => e.id === targetId)?.word ?? "none"}
            </span>
          ) : (
            "auto-locking"
          )}
        </span>
      </div>
    </section>
  );
}
