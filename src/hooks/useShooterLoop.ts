import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Difficulty } from "@/lib/sentenceGenerator";
import {
  SLOW_TIME_DURATION_SEC,
  SLOW_TIME_SPEED_FACTOR,
  stepEnemies,
  type Enemy,
  type ShooterPhase,
} from "@/lib/shooterEngine";
import {
  readCanvasThemePalette,
  spawnSimWaveEnemies,
  stepVisualEffects,
  type CanvasThemePalette,
  type MutableSimState,
} from "@/lib/shooterSimVisuals";
import { renderShooterCanvas } from "@/lib/shooterCanvasRenderer";

export interface UseShooterLoopOptions {
  phase: ShooterPhase;
  difficulty: Difficulty;
  speedMultiplier: number;
  practiceMode: boolean;
  reducedMotion: boolean;
  simRef: RefObject<MutableSimState>;
  poolRef: RefObject<string[]>;
  rngRef: RefObject<() => number>;
  levelRef: RefObject<number>;
  bossDefeatedAtLevelRef: RefObject<number>;
  shieldChargesRef: RefObject<number>;
  activeElapsedRef: RefObject<number>;
  onSlowTimeExpired: () => void;
  onTargetCleared: () => void;
  onBreach: (breached: Enemy[]) => boolean;
  onBossSpawned: () => void;
  onWordSpawned: () => void;
  onDangerChange: (hasDanger: boolean) => void;
}

export function useShooterLoop({
  phase,
  difficulty,
  speedMultiplier,
  practiceMode,
  reducedMotion,
  simRef,
  poolRef,
  rngRef,
  levelRef,
  bossDefeatedAtLevelRef,
  shieldChargesRef,
  activeElapsedRef,
  onSlowTimeExpired,
  onTargetCleared,
  onBreach,
  onBossSpawned,
  onWordSpawned,
  onDangerChange,
}: UseShooterLoopOptions) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<CanvasThemePalette | null>(null);
  const fieldSizeRef = useRef({ width: 800, height: 440 });
  const lastBossLevelSpawnedRef = useRef(0);
  const hasDangerRef = useRef(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const speedMultiplierRef = useRef(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;
  const practiceModeRef = useRef(practiceMode);
  practiceModeRef.current = practiceMode;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const callbacksRef = useRef({
    onSlowTimeExpired,
    onTargetCleared,
    onBreach,
    onBossSpawned,
    onWordSpawned,
    onDangerChange,
  });
  callbacksRef.current = {
    onSlowTimeExpired,
    onTargetCleared,
    onBreach,
    onBossSpawned,
    onWordSpawned,
    onDangerChange,
  };

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const fieldEl = fieldRef.current;
    if (!canvas || !fieldEl) return;
    const { width, height } = fieldSizeRef.current;
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
        explosions: reducedMotionRef.current ? [] : sim.explosions,
        popups: sim.popups,
        targetId: sim.targetId,
        shipX: sim.shipX,
        slowTimeRemaining: sim.slowTimeRemaining,
        slowTimeDuration: SLOW_TIME_DURATION_SEC,
        shieldCharges: shieldChargesRef.current,
        shieldFlash: sim.shieldFlash,
        practiceMode: practiceModeRef.current,
      },
      palette,
      reducedMotionRef.current,
    );
  }, [shieldChargesRef, simRef]);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fieldSizeRef.current = { width: rect.width, height: rect.height };
        paletteRef.current = readCanvasThemePalette(el);
        drawFrame();
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawFrame]);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof MutationObserver === "undefined") return;
    const obs = new MutationObserver(() => {
      paletteRef.current = readCanvasThemePalette(el);
      drawFrame();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent", "style"],
    });
    return () => obs.disconnect();
  }, [drawFrame]);

  const prevSpeedRef = useRef(speedMultiplier);
  useEffect(() => {
    const prev = prevSpeedRef.current;
    if (prev !== speedMultiplier && prev > 0) {
      const ratio = speedMultiplier / prev;
      simRef.current.enemies = simRef.current.enemies.map((e) => ({
        ...e,
        speed: e.speed * ratio,
      }));
    }
    prevSpeedRef.current = speedMultiplier;
  }, [simRef, speedMultiplier]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame, phase, reducedMotion, practiceMode]);

  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (phaseRef.current !== "playing") return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      activeElapsedRef.current += dt;

      const sim = simRef.current;
      const lvl = levelRef.current;

      if (sim.slowTimeRemaining > 0) {
        sim.slowTimeRemaining = Math.max(0, sim.slowTimeRemaining - dt);
        if (sim.slowTimeRemaining === 0) callbacksRef.current.onSlowTimeExpired();
      }
      if (sim.shieldFlash > 0) sim.shieldFlash = Math.max(0, sim.shieldFlash - dt);

      sim.spawnTimer -= dt * (sim.slowTimeRemaining > 0 ? 0.65 : 1);
      const { surviving, breached, clearedTargetId } = stepEnemies(
        sim.enemies,
        dt,
        sim.targetId,
        sim.slowTimeRemaining > 0 ? SLOW_TIME_SPEED_FACTOR : 1,
      );

      if (breached.length > 0) {
        if (clearedTargetId) {
          sim.targetId = null;
          callbacksRef.current.onTargetCleared();
        }
        if (breached.some((e) => e.boss)) {
          lastBossLevelSpawnedRef.current = Math.min(lastBossLevelSpawnedRef.current, lvl - 1);
        }
        if (callbacksRef.current.onBreach(breached)) {
          sim.enemies = surviving;
          drawFrame();
          return;
        }
      }

      const spawned = spawnSimWaveEnemies(sim, {
        surviving,
        lvl,
        difficulty: difficultyRef.current,
        speedMultiplier: speedMultiplierRef.current,
        pool: poolRef.current,
        rng: rngRef.current,
        bossDefeatedAtLevel: bossDefeatedAtLevelRef.current,
        lastBossLevelSpawned: lastBossLevelSpawnedRef.current,
      });
      lastBossLevelSpawnedRef.current = spawned.lastBossLevelSpawned;
      if (spawned.bossSpawned) callbacksRef.current.onBossSpawned();
      if (spawned.wordSpawned) callbacksRef.current.onWordSpawned();

      sim.enemies = spawned.next;
      stepVisualEffects(sim, dt, reducedMotionRef.current);

      const dangerNow = !practiceModeRef.current && spawned.next.some((e) => e.y > 65);
      if (dangerNow !== hasDangerRef.current) {
        hasDangerRef.current = dangerNow;
        callbacksRef.current.onDangerChange(dangerNow);
      }

      drawFrame();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    activeElapsedRef,
    bossDefeatedAtLevelRef,
    drawFrame,
    levelRef,
    phase,
    poolRef,
    rngRef,
    simRef,
  ]);

  const resetLoopRefs = useCallback(() => {
    lastBossLevelSpawnedRef.current = 0;
    hasDangerRef.current = false;
  }, []);

  return { fieldRef, canvasRef, drawFrame, resetLoopRefs };
}
