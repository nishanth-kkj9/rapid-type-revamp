import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShooterSettings } from "@/lib/shooterSettings";
import {
  playLaserSound,
  playExplosionSound,
  playBreachSound,
  playGameOverSound,
} from "@/lib/arcadeAudio";
import {
  applyKeyToEnemies,
  createInitialEnemies,
  getLevel,
  isBossLevel,
  stepEnemies,
  wordPoolFor,
  type Enemy,
} from "@/lib/shooterEngine";
import type { ShooterRunSummary } from "@/lib/typingStats";
import { Sliders, Volume2, VolumeX, Pause, Play, RotateCcw, Crosshair, Award } from "lucide-react";

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

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
}

const HIGH_SCORE_KEY = "ttp:shooter:best:v1";

interface WordShooterProps {
  settings: ShooterSettings;
  onOpenSettings: () => void;
  onActiveTargetCharChange?: (char: string | null) => void;
  onCharPressed?: (char: string) => void;
  onRunComplete?: (s: ShooterRunSummary) => void;
  onWrongKey?: (expectedChar: string) => void;
  onStart?: () => void;
}

export function WordShooter({
  settings,
  onOpenSettings,
  onActiveTargetCharChange,
  onCharPressed,
  onRunComplete,
  onWrongKey,
  onStart,
}: WordShooterProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "over">("idle");
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [levelBanner, setLevelBanner] = useState<number | null>(null);
  const prevLevelRef = useRef(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.startingLives);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrongKeys, setWrongKeys] = useState(0);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shipX, setShipX] = useState(50);
  const [localMuteOverride, setLocalMuteOverride] = useState<boolean | null>(null);
  const soundMuted = localMuteOverride ?? !settings.soundEnabled;
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const enemiesRef = useRef<Enemy[]>([]);
  const idRef = useRef(10);
  const poolRef = useRef<string[]>([]);
  const spawnRef = useRef(2.0);
  const inputRef = useRef<HTMLInputElement>(null);
  const streakRef = useRef(streak);
  streakRef.current = streak;
  const targetIdRef = useRef(targetId);
  targetIdRef.current = targetId;
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const stateRef = useRef({ phase, targetId, settings, soundMuted });
  stateRef.current = { phase, targetId, settings, soundMuted };
  const activeElapsedRef = useRef(0); // seconds of *playing* time, excludes pauses
  const lastBossLevelSpawnedRef = useRef(0);

  // Reset local override when settings change
  useEffect(() => {
    setLocalMuteOverride(null);
  }, [settings.soundEnabled]);

  // Load high score and mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (raw) setBest(Number(raw) || 0);
    } catch {
      // safe storage fallback
    }
  }, []);

  // Smoothly update speed on existing enemies without resetting the field
  const prevSpeedRef = useRef(settings.speedMultiplier);
  useEffect(() => {
    const prevSpeed = prevSpeedRef.current;
    if (prevSpeed !== settings.speedMultiplier && prevSpeed > 0) {
      const ratio = settings.speedMultiplier / prevSpeed;
      const next = enemiesRef.current.map((e) => ({ ...e, speed: e.speed * ratio }));
      enemiesRef.current = next;
      setEnemies(next);
    }
    prevSpeedRef.current = settings.speedMultiplier;
  }, [settings.speedMultiplier]);

  // Update spawn pool when difficulty changes without killing current active targets
  useEffect(() => {
    poolRef.current = wordPoolFor(settings.difficulty);
  }, [settings.difficulty]);

  const level = useMemo(() => getLevel(score), [score]);

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
    const pool = poolRef.current.length ? poolRef.current : wordPoolFor(settings.difficulty);
    poolRef.current = pool;
    idRef.current = 10;
    spawnRef.current = 2.0;
    const initial = createInitialEnemies(pool, settings.speedMultiplier, 1);
    enemiesRef.current = initial;
    setEnemies(initial);
    setShots([]);
    setExplosions([]);
    setPopups([]);
    setLevelBanner(null);
    prevLevelRef.current = 1;
    lastBossLevelSpawnedRef.current = 0;
    setScore(0);
    setLives(settings.startingLives);
    setStreak(0);
    setHits(0);
    setMisses(0);
    setWrongKeys(0);
    onStart?.();
    // reset ref eagerly — independent of render timing
    targetIdRef.current = null;
    setTargetId(null);
    setShipX(50);
    setIsNewRecord(false);
    activeElapsedRef.current = 0;
    setPhase("playing");
    setLiveAnnouncement("Game started. Type the falling words.");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [settings.difficulty, settings.speedMultiplier, settings.startingLives, onStart]);

  const togglePause = useCallback(() => {
    if (phase === "playing") {
      setPhase("paused");
      setLiveAnnouncement("Game paused.");
    } else if (phase === "paused") {
      setPhase("playing");
      setLiveAnnouncement("Game resumed.");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [phase]);

  // F-1: Auto-pause when window loses focus or tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === "playing") {
        setPhase("paused");
        setLiveAnnouncement("Game paused automatically.");
      }
    };
    const handleBlur = () => {
      if (phase === "playing") {
        setPhase("paused");
        setLiveAnnouncement("Game paused automatically.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [phase]);

  const fire = useCallback(
    (enemy: Enemy) => {
      setShipX(enemy.x);
      setShots((s) => [
        ...s,
        {
          id: idRef.current++,
          startX: enemy.x,
          targetX: enemy.x,
          y: 86,
        },
      ]);
      playLaserSound(soundMuted);
    },
    [soundMuted],
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
      id: idRef.current++,
      x,
      y,
      particles,
    };

    setExplosions((prev) => [...prev, exp]);
    setTimeout(() => {
      setExplosions((prev) => prev.filter((e) => e.id !== exp.id));
    }, 400);
  }, []);

  const spawnPopup = useCallback((x: number, y: number, text: string) => {
    const p: Popup = {
      id: idRef.current++,
      x,
      y,
      text,
    };
    setPopups((prev) => [...prev, p]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((item) => item.id !== p.id));
    }, 700);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const currentLevel = getLevel(score);
    if (currentLevel > prevLevelRef.current) {
      prevLevelRef.current = currentLevel;
      setLevelBanner(currentLevel);
      setLiveAnnouncement(`Level up! Level ${currentLevel}`);
    }
    return undefined;
  }, [score, phase]);

  // Banner auto-dismiss timer — keyed on the banner itself so pause/resume
  // can never orphan it (cleanup only fires on change/unmount).
  useEffect(() => {
    if (levelBanner === null) return undefined;
    const t = setTimeout(() => setLevelBanner(null), 1200);
    return () => clearTimeout(t);
  }, [levelBanner]);

  // Main game physics loop (pure step logic, decoupled side-effects)
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      activeElapsedRef.current += dt;

      const currentSettings = stateRef.current.settings;
      const speedMult = currentSettings.speedMultiplier;
      const lvl = getLevel(scoreRef.current);

      spawnRef.current -= dt;

      // PURE step — computed outside setState
      const { surviving, breached, clearedTargetId } = stepEnemies(
        enemiesRef.current,
        dt,
        targetIdRef.current,
      );

      // Side effects of breaching — OUTSIDE the updater
      if (breached.length > 0) {
        const count = breached.length;
        setLives((l) => Math.max(0, l - count));
        setMisses((m) => m + count);
        setStreak(0);
        playBreachSound(stateRef.current.soundMuted);
        setLiveAnnouncement(`${count} word${count > 1 ? "s" : ""} breached defense!`);
        if (clearedTargetId) {
          targetIdRef.current = null;
          setTargetId(null);
        }
      }

      let next = surviving;

      // Boss word every 5 levels
      if (isBossLevel(lvl) && lastBossLevelSpawnedRef.current < lvl && !next.some((e) => e.boss)) {
        lastBossLevelSpawnedRef.current = lvl;
        const candidates = poolRef.current
          .filter((w) => w.length >= 8 && !next.some((e) => e.word === w || e.word[0] === w[0]))
          .sort((a, b) => b.length - a.length);
        const bossWord = candidates[0] ?? "corrupted";
        const baseSpeed = (3.2 + lvl * 0.8 + Math.random() * 1.5) * speedMult;
        next = [
          ...next,
          {
            id: idRef.current++,
            word: bossWord,
            typed: 0,
            x: 20 + Math.random() * 60,
            y: 0,
            speed: baseSpeed * 0.55,
            boss: true,
          },
        ];
        setLiveAnnouncement("Boss word incoming!");
      }

      const maxSimultaneous = Math.min(8, 3 + Math.floor(lvl / 2));
      if (spawnRef.current <= 0 && next.length < maxSimultaneous) {
        const spawnInterval = Math.max(0.8, (2.2 - lvl * 0.15) / Math.sqrt(speedMult));
        spawnRef.current = spawnInterval;

        const pool = poolRef.current.length
          ? poolRef.current
          : ["type", "swift", "laser", "focus", "speed"];
        const available = pool.filter((w) => !next.some((e) => e.word === w || e.word[0] === w[0]));
        const word =
          (available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null) ??
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

      // Commit plain value; keep ref mirror in sync
      enemiesRef.current = next;
      setEnemies(next);

      // Advance shots
      setShots((prev) =>
        prev.length > 0
          ? prev.map((s) => ({ ...s, y: s.y - 240 * dt })).filter((s) => s.y > -10)
          : prev,
      );

      // Clean up explosions
      setExplosions((prev) => (prev.length > 8 ? prev.slice(-8) : prev));

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const totalActions = hits + misses + wrongKeys;
  const hitRate = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 100;
  const typingAccuracy = totalActions > 0 ? Math.round((hits / totalActions) * 100) : 100;
  const hasDangerEnemy = enemies.some((e) => e.y > 65);

  // Handle Game Over safely with try/catch
  useEffect(() => {
    if (phase === "playing" && lives <= 0) {
      setPhase("over");
      playGameOverSound(soundMuted);
      setLiveAnnouncement(`Game over! Final score: ${scoreRef.current}`);

      const currentScore = scoreRef.current;
      if (currentScore > best) {
        setIsNewRecord(true);
        setBest(currentScore);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, String(currentScore));
        } catch {
          // Quota safe
        }
      }

      const durationSec = Math.max(1, Math.round(activeElapsedRef.current));
      onRunComplete?.({
        score: currentScore,
        wordsDestroyed: hits,
        accuracy: typingAccuracy,
        durationSec,
        difficulty: settings.difficulty,
        misses,
        wrongKeys,
        level: getLevel(currentScore),
      });
    }
  }, [
    lives,
    phase,
    soundMuted,
    best,
    hits,
    misses,
    wrongKeys,
    typingAccuracy,
    settings.difficulty,
    onRunComplete,
  ]);

  // Key handler: pure resolution OUTSIDE setState, side effects after.
  const handleKey = useCallback(
    (char: string) => {
      if (phase !== "playing") return;
      onCharPressed?.(char);

      const res = applyKeyToEnemies(
        enemiesRef.current,
        char,
        targetIdRef.current,
        streakRef.current,
      );

      // Commit plain values — no functional updaters, no side effects inside.
      enemiesRef.current = res.nextEnemies;
      setEnemies(res.nextEnemies);
      targetIdRef.current = res.nextTargetId;
      setTargetId(res.nextTargetId);

      if (res.wrongKey) {
        setStreak(0);
        setWrongKeys((w) => w + 1);
        if (res.expectedChar) {
          onWrongKey?.(res.expectedChar);
        }
        return;
      }

      if (res.targetHit) {
        fire(res.targetHit);
      }

      if (res.wordDestroyed) {
        setHits((h) => h + 1);
        setStreak(res.newStreak);
        streakRef.current = res.newStreak; // mirror immediately so same-frame keystrokes read the fresh streak for the bonus tier
        setScore((s) => s + res.scoreGained);
        playExplosionSound(soundMuted);
        spawnExplosion(res.wordDestroyed.x, res.wordDestroyed.y);
        spawnPopup(res.wordDestroyed.x, res.wordDestroyed.y, `+${res.scoreGained}`);
      }
    },
    [phase, fire, soundMuted, spawnExplosion, spawnPopup, onCharPressed, onWrongKey],
  );

  // Global key listener
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (phase === "playing" || phase === "paused") {
          togglePause(); // Esc pauses / resumes — never destroys progress
        } else {
          start(); // idle or game-over screen: start a fresh run
        }
        return;
      }

      // Allow Pause hotkey on F2 or Pause button
      if (e.key === "F2") {
        e.preventDefault();
        togglePause();
        return;
      }

      if (phase === "idle" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        start();
        return;
      }

      // Directly handle typed characters without intercepting 'p'
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
      {/* Screen reader live announcements */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Top Status Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-bold text-primary sm:text-2xl">{score}</span>
            <span className="text-[11px] text-muted-foreground">pts</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-bold uppercase text-foreground">
              Lvl {level}
            </span>
          </div>

          <div className="flex items-center gap-1 text-destructive">
            <span className="font-mono font-bold">{lives}</span>
            <span className="text-sm">{"❤".repeat(Math.max(0, Math.min(5, lives)))}</span>
            {lives > 5 ? (
              <span className="font-mono text-xs font-semibold">+{lives - 5}</span>
            ) : null}
          </div>

          {streak >= 3 ? (
            <div className="flex items-center gap-1 font-mono text-xs font-semibold text-accent animate-pulse">
              <span>{streak}x Streak</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden font-mono text-xs text-muted-foreground sm:block">
            Hit Rate: <span className="font-semibold text-foreground">{hitRate}%</span> · Acc:{" "}
            <span className="font-semibold text-foreground">{typingAccuracy}%</span>
          </div>

          <button
            type="button"
            onClick={() => setLocalMuteOverride(!soundMuted)}
            className="rounded-lg border border-border bg-secondary p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={soundMuted ? "Unmute audio" : "Mute audio"}
          >
            {soundMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4 text-accent" />
            )}
          </button>

          {phase === "playing" || phase === "paused" ? (
            <button
              type="button"
              onClick={togglePause}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {phase === "playing" ? (
                <>
                  <Pause className="size-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>Resume</span>
                </>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={start}
            className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Arena */}
      <div
        role="region"
        aria-label="Word shooter game field"
        onClick={() => {
          if (phase === "playing") inputRef.current?.focus();
        }}
        className={`relative h-96 sm:h-[440px] w-full overflow-hidden rounded-2xl border transition-colors ${
          hasDangerEnemy
            ? "border-destructive/60 bg-gradient-to-b from-card via-card to-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            : "border-border bg-card/75"
        }`}
      >
        {/* Background Grid Lines for Space Arcade Feel */}
        <div className="pointer-events-none absolute inset-0 opacity-15 bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Falling Enemy Words */}
        {enemies.map((enemy) => {
          const isTarget = enemy.id === targetId;
          const typedPart = enemy.word.slice(0, enemy.typed);
          const nextChar = enemy.word[enemy.typed] ?? "";
          const remainingPart = enemy.word.slice(enemy.typed + 1);
          const isDanger = enemy.y > 65;

          return (
            <div
              key={enemy.id}
              className={`absolute -translate-x-1/2 select-none transition-transform duration-75 ${
                isTarget ? "z-20 scale-105" : "z-10"
              }`}
              style={{
                left: `${enemy.x}%`,
                top: `${enemy.y}%`,
              }}
            >
              <div
                className={`relative flex items-center gap-1 rounded-xl border font-mono shadow-md transition-colors ${
                  enemy.boss
                    ? "border-destructive ring-2 ring-destructive animate-pulse bg-destructive/20 text-foreground text-base px-3.5 py-2 font-semibold"
                    : isTarget
                      ? "border-primary bg-primary/20 text-primary-foreground ring-2 ring-primary text-sm px-3 py-1.5"
                      : isDanger
                        ? "border-destructive/80 bg-destructive/15 text-foreground animate-pulse text-sm px-3 py-1.5"
                        : "border-border/80 bg-secondary/90 text-foreground text-sm px-3 py-1.5"
                }`}
              >
                {/* Crosshair indicator on active targeted enemy */}
                {isTarget ? (
                  <Crosshair className="size-3.5 animate-spin text-primary [animation-duration:4s]" />
                ) : null}

                <span>
                  <span className="font-bold text-accent">{typedPart}</span>
                  {nextChar ? (
                    <span className="font-extrabold underline decoration-primary decoration-2 underline-offset-2 text-primary">
                      {nextChar}
                    </span>
                  ) : null}
                  <span className="opacity-75">{remainingPart}</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* Laser Shots */}
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="pointer-events-none absolute h-6 w-1 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-all"
            style={{
              left: `${shot.targetX}%`,
              top: `${shot.y}%`,
            }}
          />
        ))}

        {/* Explosion Particles */}
        {explosions.map((exp) => (
          <div
            key={exp.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${exp.x}%`,
              top: `${exp.y}%`,
            }}
          >
            {exp.particles.map((p, idx) => (
              <div
                key={idx}
                className="absolute rounded-full transition-transform duration-300 ease-out"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  transform: `translate(${p.dx}px, ${p.dy}px)`,
                  opacity: 0,
                  transition: "transform 400ms ease-out, opacity 400ms ease-out",
                }}
              />
            ))}
          </div>
        ))}

        {/* Floating Score Popups */}
        {popups.map((pop) => (
          <span
            key={pop.id}
            className="score-popup pointer-events-none absolute z-20 -translate-x-1/2 font-mono text-sm font-bold text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{
              left: `${pop.x}%`,
              top: `${pop.y}%`,
            }}
          >
            {pop.text}
          </span>
        ))}

        {/* Level Up Banner */}
        {levelBanner !== null && (
          <div className="level-banner pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/60 bg-card/95 px-6 py-3 shadow-2xl backdrop-blur-md">
            <span className="font-mono text-xl font-extrabold uppercase tracking-widest text-primary sm:text-2xl">
              LEVEL {levelBanner}
            </span>
          </div>
        )}

        {/* Defender Ship Cannon */}
        <div
          className="pointer-events-none absolute bottom-4 -translate-x-1/2 transition-all duration-100 ease-out"
          style={{ left: `${shipX}%` }}
        >
          <div className="relative flex flex-col items-center">
            {/* Cannon Barrel */}
            <div className="h-3 w-1.5 rounded-t bg-primary shadow-[0_0_6px_var(--color-primary)]" />
            {/* Cannon Hull */}
            <div className="h-4 w-7 rounded-md border border-primary/50 bg-secondary shadow-lg" />
            {/* Thruster Jet Glow */}
            <div className="absolute left-[-4px] top-[24px] h-3 w-2 animate-pulse rounded-b-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          </div>
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
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                Start Game
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
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
            <p className="text-xs text-muted-foreground">Press Resume or F2 to continue</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition-transform hover:scale-105"
              >
                <Play className="size-4" />
                Resume
              </button>
              <button
                type="button"
                onClick={start}
                className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Restart
              </button>
            </div>
          </div>
        ) : null}

        {phase === "over" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/95 px-6 text-center backdrop-blur-sm z-30">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-inner">
              <Award className="size-8" />
            </div>

            <div>
              <h2 className="font-mono text-2xl font-bold tracking-tight text-destructive sm:text-3xl">
                Shield Depleted!
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Final Score: <strong className="text-foreground">{score} pts</strong> · Words
                Destroyed: <strong className="text-foreground">{hits}</strong> · Time:{" "}
                <strong className="text-foreground">
                  {Math.max(1, Math.round(activeElapsedRef.current))}s
                </strong>
              </p>
            </div>

            {isNewRecord ? (
              <div className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1 text-xs font-mono font-bold text-accent animate-bounce">
                🎉 New High Score: {score} pts!
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="size-4" />
                Play Again
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Sliders className="size-4" />
                Settings
              </button>
            </div>
          </div>
        ) : null}

        {/* Hidden Input for Keystroke Capture */}
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
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        ) : null}
      </div>

      {/* Footer Instructions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Type falling word letters to fire cannon ·{" "}
          <kbd className="rounded border border-border bg-secondary px-1 font-mono">F2/Esc</kbd>{" "}
          Pause ·{" "}
          <kbd className="rounded border border-border bg-secondary px-1 font-mono">Esc</kbd> (on
          menus) Start
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
