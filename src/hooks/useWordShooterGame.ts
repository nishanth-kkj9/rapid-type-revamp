import { useCallback, useEffect, useRef, useState } from "react";
import type { ShooterSettings } from "@/lib/shooterSettings";
import {
  playBreachSound,
  playExplosionSound,
  playGameOverSound,
  playLaserSound,
} from "@/lib/arcadeAudio";
import {
  applyKeyToEnemies,
  awardPowerUpsForStreak,
  computeDifficultyCurve,
  computeShooterAccuracy,
  computeShooterHitRate,
  computeShooterLevel,
  createInitialEnemies,
  createSeededRng,
  dateStringToSeed,
  isBossLevel,
  pickBossWord,
  SLOW_TIME_DURATION_SEC,
  SLOW_TIME_SPEED_FACTOR,
  stepEnemies,
  wordPoolFor,
  type Enemy,
} from "@/lib/shooterEngine";
import {
  readCanvasThemePalette,
  renderShooterCanvas,
  type CanvasFrameSnapshot,
  type CanvasThemePalette,
} from "@/lib/shooterCanvasRenderer";
import { getLocalDateString } from "@/lib/daily";
import type { ShooterRunSummary } from "@/lib/typingStats";

export type ShooterPhase = "idle" | "playing" | "paused" | "resuming" | "over";
export type PauseReason = "manual" | "hidden" | "blur" | null;

export interface UseWordShooterGameOptions {
  settings: ShooterSettings;
  missedWords: string[];
  weakKeys?: string[] | undefined;
  initialBest: number;
  onActiveTargetCharChange?: ((char: string | null) => void) | undefined;
  onCharPressed?: ((char: string) => void) | undefined;
  onRunComplete?: ((s: ShooterRunSummary) => void) | undefined;
  onWrongKey?: ((expectedChar: string) => void) | undefined;
  onStart?: (() => void) | undefined;
}

interface MutableSimState {
  enemies: Enemy[];
  shots: CanvasFrameSnapshot["shots"][number][];
  explosions: CanvasFrameSnapshot["explosions"][number][];
  popups: CanvasFrameSnapshot["popups"][number][];
  targetId: number | null;
  shipX: number;
  slowTimeRemaining: number;
  shieldFlash: number;
  nextId: number;
  spawnTimer: number;
  poolIndex: number;
}

function makeInitialSim(): MutableSimState {
  return {
    enemies: [],
    shots: [],
    explosions: [],
    popups: [],
    targetId: null,
    shipX: 50,
    slowTimeRemaining: 0,
    shieldFlash: 0,
    nextId: 10,
    spawnTimer: 2.0,
    poolIndex: 0,
  };
}

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useWordShooterGame({
  settings,
  missedWords,
  weakKeys = [],
  initialBest,
  onActiveTargetCharChange,
  onCharPressed,
  onRunComplete,
  onWrongKey,
  onStart,
}: UseWordShooterGameOptions) {
  const [phase, setPhase] = useState<ShooterPhase>("idle");
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(getPrefersReducedMotion);
  const [fieldSize, setFieldSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 440,
  });
  const [levelBanner, setLevelBanner] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.startingLives);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [best, setBest] = useState(initialBest);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hits, setHits] = useState(0);
  const [wordsSpawned, setWordsSpawned] = useState(0);
  const [correctKeys, setCorrectKeys] = useState(0);
  const [wrongKeys, setWrongKeys] = useState(0);
  const [strayKeys, setStrayKeys] = useState(0);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [slowCharges, setSlowCharges] = useState(0);
  const [shieldCharges, setShieldCharges] = useState(0);
  const [slowTimeActive, setSlowTimeActive] = useState(false);
  const [hasDangerEnemy, setHasDangerEnemy] = useState(false);
  const [targetWord, setTargetWord] = useState<string | null>(null);
  const [localMuteOverride, setLocalMuteOverride] = useState<boolean | null>(null);
  const soundMuted = localMuteOverride ?? !settings.soundEnabled;
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [durationSecDisplay, setDurationSecDisplay] = useState(1);

  const simRef = useRef<MutableSimState>(makeInitialSim());
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<CanvasThemePalette | null>(null);
  const poolRef = useRef<string[]>([]);
  const rngRef = useRef<() => number>(Math.random);
  const dailyDateRef = useRef<string | undefined>(undefined);

  const phaseRef = useRef<ShooterPhase>(phase);
  phaseRef.current = phase;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const soundMutedRef = useRef(soundMuted);
  soundMutedRef.current = soundMuted;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);
  const hitsRef = useRef(0);
  const wordsSpawnedRef = useRef(0);
  const correctKeysRef = useRef(0);
  const wrongKeysRef = useRef(0);
  const strayKeysRef = useRef(0);
  const bossesDefeatedRef = useRef(0);
  const bossDefeatedAtLevelRef = useRef(0);
  const lastBossLevelSpawnedRef = useRef(0);
  const slowChargesRef = useRef(0);
  const shieldChargesRef = useRef(0);
  const charsDestroyedRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const activeElapsedRef = useRef(0);
  const activeTypingSecRef = useRef(0);
  const lastKeyMsRef = useRef<number | null>(null);
  const hasDangerRef = useRef(false);
  const targetWordRef = useRef<string | null>(null);
  const activeCharRef = useRef<string | null>(null);
  const runEndedRef = useRef(false);
  const blurTimerRef = useRef<number | null>(null);

  // Sync best strictly from single source of truth (`initialBest` derived from history)
  useEffect(() => {
    setBest(initialBest);
  }, [initialBest]);

  useEffect(() => {
    setLocalMuteOverride(null);
  }, [settings.soundEnabled]);

  // Listen to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Track field dimensions & DPR canvas buffer sizing
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFieldSize({ width: rect.width, height: rect.height });
        paletteRef.current = readCanvasThemePalette(el);
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-read canvas palette when theme/accent classes change on root
  useEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof MutationObserver === "undefined") return;
    const obs = new MutationObserver(() => {
      paletteRef.current = readCanvasThemePalette(el);
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent", "style"],
    });
    return () => obs.disconnect();
  }, []);

  // Scale active enemy speeds when speedMultiplier changes mid-game
  const prevSpeedRef = useRef(settings.speedMultiplier);
  useEffect(() => {
    const prevSpeed = prevSpeedRef.current;
    if (prevSpeed !== settings.speedMultiplier && prevSpeed > 0) {
      const ratio = settings.speedMultiplier / prevSpeed;
      simRef.current.enemies = simRef.current.enemies.map((e) => ({
        ...e,
        speed: e.speed * ratio,
      }));
    }
    prevSpeedRef.current = settings.speedMultiplier;
  }, [settings.speedMultiplier]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const fieldEl = fieldRef.current;
    if (!canvas || !fieldEl) return;
    const width = fieldSize.width;
    const height = fieldSize.height;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = paletteRef.current ?? readCanvasThemePalette(fieldEl);
    paletteRef.current = palette;

    const sim = simRef.current;
    renderShooterCanvas(
      ctx,
      width,
      height,
      {
        enemies: sim.enemies,
        shots: sim.shots,
        explosions: sim.explosions,
        popups: sim.popups,
        targetId: sim.targetId,
        shipX: sim.shipX,
        slowTimeRemaining: sim.slowTimeRemaining,
        slowTimeDuration: SLOW_TIME_DURATION_SEC,
        shieldCharges: shieldChargesRef.current,
        shieldFlash: sim.shieldFlash,
        practiceMode: settingsRef.current.practiceMode,
      },
      palette,
      reducedMotionRef.current,
    );
  }, [fieldSize.height, fieldSize.width]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame, phase, reducedMotion, settings.practiceMode]);

  const syncTargetHints = useCallback(() => {
    const sim = simRef.current;
    const currentEnemy = sim.enemies.find((e) => e.id === sim.targetId);
    const nextWord = currentEnemy ? currentEnemy.word : null;
    if (nextWord !== targetWordRef.current) {
      targetWordRef.current = nextWord;
      setTargetWord(nextWord);
    }

    const nextChar =
      phaseRef.current === "playing" &&
      currentEnemy &&
      currentEnemy.typed < currentEnemy.word.length
        ? (currentEnemy.word[currentEnemy.typed] ?? null)
        : null;
    if (nextChar !== activeCharRef.current) {
      activeCharRef.current = nextChar;
      onActiveTargetCharChange?.(nextChar);
    }
  }, [onActiveTargetCharChange]);

  const finishRun = useCallback(() => {
    if (runEndedRef.current) return;
    runEndedRef.current = true;

    const durationSec = Math.max(1, Math.round(activeElapsedRef.current));
    setDurationSecDisplay(durationSec);
    setPhase("over");
    setPauseReason(null);
    setResumeCountdown(null);
    activeCharRef.current = null;
    onActiveTargetCharChange?.(null);

    const currentScore = scoreRef.current;
    const currentHits = hitsRef.current;
    const spawned = wordsSpawnedRef.current;
    const totalKeystrokes = correctKeysRef.current + wrongKeysRef.current;
    const accuracy = computeShooterAccuracy(correctKeysRef.current, totalKeystrokes);
    const hitRate = computeShooterHitRate(currentHits, spawned);

    playGameOverSound(soundMutedRef.current);
    setLiveAnnouncement(`Game over! Final score: ${currentScore}`);

    if (!settingsRef.current.practiceMode && currentScore > best) {
      setIsNewRecord(true);
      setBest(currentScore);
    }

    onRunComplete?.({
      score: currentScore,
      wordsDestroyed: currentHits,
      wordsSpawned: spawned,
      charsDestroyed: charsDestroyedRef.current > 0 ? charsDestroyedRef.current : currentHits * 5,
      accuracy,
      hitRate,
      maxStreak: maxStreakRef.current,
      durationSec,
      activeDurationSec: Math.min(
        durationSec,
        Math.max(0, Math.round(activeTypingSecRef.current * 10) / 10),
      ),
      difficulty: settingsRef.current.difficulty,
      misses: Math.max(0, spawned - currentHits),
      wrongKeys: wrongKeysRef.current,
      strayKeys: strayKeysRef.current,
      bossesDefeated: bossesDefeatedRef.current,
      practiceMode: settingsRef.current.practiceMode,
      dailyChallengeDate: dailyDateRef.current,
      level: levelRef.current,
      samples: samplesRef.current.length > 1 ? [...samplesRef.current] : undefined,
    });
  }, [best, onActiveTargetCharChange, onRunComplete]);

  const start = useCallback(() => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }

    const today = getLocalDateString();
    const rng = settings.dailyChallenge ? createSeededRng(dateStringToSeed(today)) : Math.random;
    rngRef.current = rng;
    dailyDateRef.current = settings.dailyChallenge ? today : undefined;

    const pool = wordPoolFor(settings.difficulty, { missedWords, weakKeys, rng });
    poolRef.current = pool;

    const initial = createInitialEnemies(pool, settings.speedMultiplier, 1, rng);
    const sim = makeInitialSim();
    sim.enemies = initial;
    sim.poolIndex = 3;
    simRef.current = sim;

    runEndedRef.current = false;
    scoreRef.current = 0;
    levelRef.current = 1;
    streakRef.current = 0;
    maxStreakRef.current = 0;
    hitsRef.current = 0;
    wordsSpawnedRef.current = initial.length;
    correctKeysRef.current = 0;
    wrongKeysRef.current = 0;
    strayKeysRef.current = 0;
    bossesDefeatedRef.current = 0;
    bossDefeatedAtLevelRef.current = 0;
    lastBossLevelSpawnedRef.current = 0;
    slowChargesRef.current = 0;
    shieldChargesRef.current = 0;
    charsDestroyedRef.current = 0;
    activeElapsedRef.current = 0;
    activeTypingSecRef.current = 0;
    lastKeyMsRef.current = null;
    hasDangerRef.current = false;
    samplesRef.current = [0];

    setScore(0);
    setLives(settings.practiceMode ? 0 : settings.startingLives);
    setLevel(1);
    setLevelBanner(null);
    setStreak(0);
    setMaxStreak(0);
    setHits(0);
    setWordsSpawned(initial.length);
    setCorrectKeys(0);
    setWrongKeys(0);
    setStrayKeys(0);
    setBossesDefeated(0);
    setSlowCharges(0);
    setShieldCharges(0);
    setSlowTimeActive(false);
    setHasDangerEnemy(false);
    setIsNewRecord(false);
    setPauseReason(null);
    setResumeCountdown(null);
    setDurationSecDisplay(1);

    onStart?.();
    syncTargetHints();
    setPhase("playing");
    setLiveAnnouncement(
      settings.dailyChallenge
        ? `Daily Challenge started for ${today}. Type the falling words.`
        : "Game started. Type the falling words.",
    );
    drawFrame();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [
    drawFrame,
    missedWords,
    onStart,
    settings.dailyChallenge,
    settings.difficulty,
    settings.practiceMode,
    settings.speedMultiplier,
    settings.startingLives,
    syncTargetHints,
    weakKeys,
  ]);

  const pauseNow = useCallback(
    (reason: PauseReason = "manual") => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      if (phaseRef.current !== "playing" && phaseRef.current !== "resuming") return;
      setResumeCountdown(null);
      setPauseReason(reason);
      setPhase("paused");
      activeCharRef.current = null;
      onActiveTargetCharChange?.(null);
      setLiveAnnouncement("Game paused.");
    },
    [onActiveTargetCharChange],
  );

  const beginResume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    setPauseReason(null);
    setResumeCountdown(3);
    setPhase("resuming");
    setLiveAnnouncement("Resuming in 3...");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const togglePause = useCallback(() => {
    if (phaseRef.current === "playing" || phaseRef.current === "resuming") {
      pauseNow("manual");
    } else if (phaseRef.current === "paused") {
      beginResume();
    }
  }, [beginResume, pauseNow]);

  // 3-2-1 resume countdown timer
  useEffect(() => {
    if (phase !== "resuming" || resumeCountdown === null) return undefined;
    const t = window.setTimeout(() => {
      if (resumeCountdown <= 1) {
        setResumeCountdown(null);
        setPhase("playing");
        setLiveAnnouncement("Game resumed.");
        syncTargetHints();
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        const nextVal = resumeCountdown - 1;
        setResumeCountdown(nextVal);
        setLiveAnnouncement(`Resuming in ${nextVal}...`);
      }
    }, 750);
    return () => window.clearTimeout(t);
  }, [phase, resumeCountdown, syncTargetHints]);

  // Auto-pause on tab hidden (instant) and window blur (1.5s grace period)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (phaseRef.current === "playing" || phaseRef.current === "resuming")) {
        pauseNow("hidden");
      }
    };
    const handleBlur = () => {
      if (phaseRef.current !== "playing") return;
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = null;
        if (phaseRef.current === "playing") {
          pauseNow("blur");
        }
      }, 1500);
    };
    const handleFocus = () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };
  }, [pauseNow]);

  // Per-second velocity sampling
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const interval = setInterval(() => {
      const chars = charsDestroyedRef.current > 0 ? charsDestroyedRef.current : hitsRef.current * 5;
      samplesRef.current.push(chars);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (levelBanner === null) return undefined;
    const t = setTimeout(() => setLevelBanner(null), 1200);
    return () => clearTimeout(t);
  }, [levelBanner]);

  const activateSlowTime = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    if (slowChargesRef.current <= 0) return;
    slowChargesRef.current -= 1;
    setSlowCharges(slowChargesRef.current);
    simRef.current.slowTimeRemaining = SLOW_TIME_DURATION_SEC;
    setSlowTimeActive(true);
    simRef.current.popups.push({
      id: simRef.current.nextId++,
      x: 50,
      y: 45,
      text: "SLOW TIME!",
      age: 0,
      duration: 0.9,
      tone: "accent",
    });
    setLiveAnnouncement("Slow time activated!");
  }, []);

  // Main 60fps Canvas Game Loop (zero React state updates on ordinary frames)
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (phaseRef.current !== "playing") return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      activeElapsedRef.current += dt;

      const sim = simRef.current;
      const currentSettings = settingsRef.current;
      const lvl = levelRef.current;
      const curve = computeDifficultyCurve(lvl, currentSettings.speedMultiplier);

      if (sim.slowTimeRemaining > 0) {
        sim.slowTimeRemaining = Math.max(0, sim.slowTimeRemaining - dt);
        if (sim.slowTimeRemaining === 0) {
          setSlowTimeActive(false);
        }
      }
      if (sim.shieldFlash > 0) {
        sim.shieldFlash = Math.max(0, sim.shieldFlash - dt);
      }

      const speedFactor = sim.slowTimeRemaining > 0 ? SLOW_TIME_SPEED_FACTOR : 1;
      sim.spawnTimer -= dt * (sim.slowTimeRemaining > 0 ? 0.65 : 1);

      const { surviving, breached, clearedTargetId } = stepEnemies(
        sim.enemies,
        dt,
        sim.targetId,
        speedFactor,
      );

      if (breached.length > 0) {
        if (clearedTargetId) {
          sim.targetId = null;
          syncTargetHints();
        }
        if (breached.some((e) => e.boss)) {
          lastBossLevelSpawnedRef.current = Math.min(lastBossLevelSpawnedRef.current, lvl - 1);
        }

        if (currentSettings.practiceMode) {
          setStreak(0);
          streakRef.current = 0;
        } else {
          let damage = 0;
          for (const b of breached) {
            if (shieldChargesRef.current > 0) {
              shieldChargesRef.current -= 1;
              setShieldCharges(shieldChargesRef.current);
              sim.shieldFlash = 0.45;
              sim.popups.push({
                id: sim.nextId++,
                x: b.x,
                y: 84,
                text: "SHIELD SAVED!",
                age: 0,
                duration: 0.85,
                tone: "accent",
              });
            } else {
              damage += 1;
            }
          }

          if (damage > 0) {
            setStreak(0);
            streakRef.current = 0;
            playBreachSound(soundMutedRef.current);
            setLiveAnnouncement(`${damage} word${damage > 1 ? "s" : ""} breached defense!`);
            setLives((prevLives) => {
              const nextLives = Math.max(0, prevLives - damage);
              if (nextLives <= 0) {
                queueMicrotask(finishRun);
              }
              return nextLives;
            });
          } else {
            playExplosionSound(soundMutedRef.current);
            setLiveAnnouncement("Shield absorbed breach!");
          }
        }
      }

      let next = surviving;
      const rng = rngRef.current;

      // Spawn boss on boss levels (5, 10, 15...)
      if (
        isBossLevel(lvl) &&
        bossDefeatedAtLevelRef.current < lvl &&
        lastBossLevelSpawnedRef.current < lvl &&
        !next.some((e) => e.boss)
      ) {
        lastBossLevelSpawnedRef.current = lvl;
        const bossWord = pickBossWord(currentSettings.difficulty, next, poolRef.current, rng);
        next = [
          ...next,
          {
            id: sim.nextId++,
            word: bossWord,
            typed: 0,
            x: 20 + rng() * 60,
            y: 0,
            speed: Math.max(2.0, curve.baseSpeed * 0.55),
            boss: true,
          },
        ];
        wordsSpawnedRef.current += 1;
        setWordsSpawned(wordsSpawnedRef.current);
        setLiveAnnouncement("Boss word incoming!");
      }

      // Spawn regular enemies
      if (sim.spawnTimer <= 0 && next.length < curve.maxSimultaneous) {
        sim.spawnTimer = curve.spawnInterval;
        const pool = poolRef.current.length
          ? poolRef.current
          : ["type", "swift", "laser", "focus", "speed"];
        const available = pool.filter((w) => !next.some((e) => e.word === w || e.word[0] === w[0]));
        const pickFrom = available.length > 0 ? available : pool;
        const pickedWord = pickFrom[Math.floor(rng() * Math.min(pickFrom.length, 60))] ?? "arcade";

        if (!next.some((e) => e.word === pickedWord)) {
          const speed = Math.min(
            curve.maxSpeed,
            curve.baseSpeed + rng() * (curve.maxSpeed - curve.baseSpeed),
          );
          next = [
            ...next,
            {
              id: sim.nextId++,
              word: pickedWord,
              typed: 0,
              x: 15 + rng() * 70,
              y: 0,
              speed,
            },
          ];
          wordsSpawnedRef.current += 1;
          setWordsSpawned(wordsSpawnedRef.current);
        }
      }

      sim.enemies = next;

      // Advance shots, explosions, popups inside mutable frame state
      sim.shots = sim.shots
        .map((s) => ({ ...s, age: s.age + dt }))
        .filter((s) => s.age < s.duration);
      sim.explosions = sim.explosions
        .map((ex) => ({ ...ex, age: ex.age + dt }))
        .filter((ex) => ex.age < ex.duration)
        .slice(-8);
      sim.popups = sim.popups
        .map((p) => ({ ...p, age: p.age + dt }))
        .filter((p) => p.age < p.duration)
        .slice(-10);

      const dangerNow = !currentSettings.practiceMode && next.some((e) => e.y > 65);
      if (dangerNow !== hasDangerRef.current) {
        hasDangerRef.current = dangerNow;
        setHasDangerEnemy(dangerNow);
      }

      drawFrame();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drawFrame, finishRun, phase, syncTargetHints]);

  const handleKey = useCallback(
    (char: string) => {
      if (phaseRef.current !== "playing") return;
      const now = performance.now();
      const keyDeltaSec =
        lastKeyMsRef.current !== null
          ? Math.min(2.5, Math.max(0, (now - lastKeyMsRef.current) / 1000))
          : 0.25;
      activeTypingSecRef.current += keyDeltaSec;
      lastKeyMsRef.current = now;
      onCharPressed?.(char);

      const sim = simRef.current;
      const res = applyKeyToEnemies(sim.enemies, char, sim.targetId, streakRef.current);
      sim.enemies = res.nextEnemies;
      sim.targetId = res.nextTargetId;

      if (res.wrongKey) {
        streakRef.current = 0;
        setStreak(0);
        wrongKeysRef.current += 1;
        setWrongKeys(wrongKeysRef.current);
        if (res.isStrayKey) {
          strayKeysRef.current += 1;
          setStrayKeys(strayKeysRef.current);
        } else if (res.expectedChar) {
          onWrongKey?.(res.expectedChar);
        }
        syncTargetHints();
        drawFrame();
        return;
      }

      correctKeysRef.current += 1;
      setCorrectKeys(correctKeysRef.current);

      if (res.targetHit) {
        sim.shipX = res.targetHit.x;
        sim.shots.push({
          id: sim.nextId++,
          startX: res.targetHit.x,
          targetX: res.targetHit.x,
          startY: 88,
          targetY: Math.max(4, res.targetHit.y + 3),
          age: 0,
          duration: 0.14,
        });
        playLaserSound(soundMutedRef.current);
      }

      if (res.wordDestroyed) {
        hitsRef.current += 1;
        setHits(hitsRef.current);
        charsDestroyedRef.current += res.wordDestroyed.word.length;
        streakRef.current = res.newStreak;
        setStreak(res.newStreak);
        if (res.newStreak > maxStreakRef.current) {
          maxStreakRef.current = res.newStreak;
          setMaxStreak(res.newStreak);
        }

        if (res.wordDestroyed.boss) {
          bossesDefeatedRef.current += 1;
          setBossesDefeated(bossesDefeatedRef.current);
          bossDefeatedAtLevelRef.current = Math.max(
            bossDefeatedAtLevelRef.current,
            levelRef.current,
          );
        }

        const powerGrant = awardPowerUpsForStreak(
          res.newStreak,
          slowChargesRef.current,
          shieldChargesRef.current,
        );
        if (powerGrant.earnedSlow) {
          slowChargesRef.current = powerGrant.slowCharges;
          setSlowCharges(powerGrant.slowCharges);
          sim.popups.push({
            id: sim.nextId++,
            x: res.wordDestroyed.x,
            y: Math.max(12, res.wordDestroyed.y - 6),
            text: "+1 SLOW TIME",
            age: 0,
            duration: 0.9,
            tone: "accent",
          });
        } else if (powerGrant.earnedShield) {
          shieldChargesRef.current = powerGrant.shieldCharges;
          setShieldCharges(powerGrant.shieldCharges);
          sim.popups.push({
            id: sim.nextId++,
            x: res.wordDestroyed.x,
            y: Math.max(12, res.wordDestroyed.y - 6),
            text: "+1 SHIELD",
            age: 0,
            duration: 0.9,
            tone: "accent",
          });
        }

        scoreRef.current += res.scoreGained;
        setScore(scoreRef.current);
        playExplosionSound(soundMutedRef.current);

        if (!reducedMotionRef.current) {
          const colorKeys: ("primary" | "accent" | "destructive")[] = [
            "primary",
            "accent",
            "destructive",
          ];
          const particles = Array.from({ length: 8 }).map(() => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            return {
              dx: Math.cos(angle) * dist,
              dy: Math.sin(angle) * dist,
              colorKey: colorKeys[Math.floor(Math.random() * colorKeys.length)] ?? "primary",
              size: 2.5 + Math.random() * 2.5,
            };
          });
          sim.explosions.push({
            id: sim.nextId++,
            x: res.wordDestroyed.x,
            y: res.wordDestroyed.y,
            age: 0,
            duration: 0.35,
            particles,
          });
        }

        sim.popups.push({
          id: sim.nextId++,
          x: res.wordDestroyed.x,
          y: res.wordDestroyed.y,
          text: `+${res.scoreGained}`,
          age: 0,
          duration: 0.7,
          tone: res.wordDestroyed.boss ? "destructive" : "primary",
        });

        const totalKeys = correctKeysRef.current + wrongKeysRef.current;
        const acc = computeShooterAccuracy(correctKeysRef.current, totalKeys);
        const nextLevel = computeShooterLevel({
          wordsDestroyed: hitsRef.current,
          accuracy: acc,
          currentLevel: levelRef.current,
          bossDefeatedAtLevel: bossDefeatedAtLevelRef.current,
        });
        if (nextLevel > levelRef.current) {
          levelRef.current = nextLevel;
          setLevel(nextLevel);
          setLevelBanner(nextLevel);
          setLiveAnnouncement(`Level up! Level ${nextLevel}`);
        }
      }

      syncTargetHints();
      drawFrame();
    },
    [drawFrame, onCharPressed, onWrongKey, syncTargetHints],
  );

  // Global keyboard bindings
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (
          phaseRef.current === "playing" ||
          phaseRef.current === "paused" ||
          phaseRef.current === "resuming"
        ) {
          togglePause();
        } else {
          start();
        }
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (phaseRef.current === "playing" && (e.key === "Tab" || e.key === "1")) {
        e.preventDefault();
        activateSlowTime();
        return;
      }
      if (phaseRef.current === "idle" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        start();
        return;
      }
      if (phaseRef.current === "playing" && e.key.length === 1 && /^[a-z'-]$/i.test(e.key)) {
        if (document.activeElement === inputRef.current) return;
        handleKey(e.key.toLowerCase());
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [activateSlowTime, handleKey, start, togglePause]);

  const totalKeystrokes = correctKeys + wrongKeys;
  const typingAccuracy = computeShooterAccuracy(correctKeys, totalKeystrokes);
  const hitRate = computeShooterHitRate(hits, wordsSpawned);

  return {
    phase,
    pauseReason,
    resumeCountdown,
    reducedMotion,
    fieldSize,
    levelBanner,
    score,
    lives,
    streak,
    maxStreak,
    best,
    isNewRecord,
    hits,
    wordsSpawned,
    level,
    hitRate,
    typingAccuracy,
    strayKeys,
    bossesDefeated,
    slowCharges,
    shieldCharges,
    slowTimeActive,
    hasDangerEnemy,
    targetWord,
    soundMuted,
    setLocalMuteOverride,
    liveAnnouncement,
    durationSecDisplay,
    fieldRef,
    canvasRef,
    inputRef,
    start,
    togglePause,
    beginResume,
    finishRun,
    activateSlowTime,
    handleKey,
  };
}
