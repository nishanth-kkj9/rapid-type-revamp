import {
  applyKeyToEnemies,
  computeDifficultyCurve,
  isBossLevel,
  pickBossWord,
  type Enemy,
  type KeyResult,
} from "./shooterEngine";
import type { Difficulty } from "./sentenceGenerator";

export interface CanvasShot {
  id: number;
  startX: number;
  targetX: number;
  startY: number;
  targetY: number;
  age: number;
  duration: number;
}

export interface CanvasExplosion {
  id: number;
  x: number;
  y: number;
  age: number;
  duration: number;
  particles: {
    dx: number;
    dy: number;
    colorKey: "primary" | "accent" | "destructive";
    size: number;
  }[];
}

export interface CanvasPopup {
  id: number;
  x: number;
  y: number;
  text: string;
  age: number;
  duration: number;
  tone: "primary" | "accent" | "destructive";
}

export interface CanvasFrameSnapshot {
  enemies: readonly Enemy[];
  shots: readonly CanvasShot[];
  explosions: readonly CanvasExplosion[];
  popups: readonly CanvasPopup[];
  targetId: number | null;
  shipX: number;
  slowTimeRemaining: number;
  slowTimeDuration: number;
  shieldCharges: number;
  shieldFlash: number;
  practiceMode: boolean;
}

export interface CanvasThemePalette {
  card: string;
  secondary: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  destructive: string;
  fontMono: string;
}

export function readCanvasThemePalette(el: HTMLElement): CanvasThemePalette {
  const styles = getComputedStyle(el);
  const pick = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    card: pick("--color-card", "#1f1d1a"),
    secondary: pick("--color-secondary", "#2b2824"),
    border: pick("--color-border", "#3f3b35"),
    foreground: pick("--color-foreground", "#f3efe6"),
    mutedForeground: pick("--color-muted-foreground", "#a69f92"),
    primary: pick("--color-primary", "#f59e0b"),
    primaryForeground: pick("--color-primary-foreground", "#1c1917"),
    accent: pick("--color-accent", "#34d399"),
    destructive: pick("--color-destructive", "#ef4444"),
    fontMono: pick("--font-mono", "ui-monospace, monospace"),
  };
}

export interface MutableSimState {
  enemies: Enemy[];
  shots: CanvasShot[];
  explosions: CanvasExplosion[];
  popups: CanvasPopup[];
  targetId: number | null;
  shipX: number;
  slowTimeRemaining: number;
  shieldFlash: number;
  nextId: number;
  spawnTimer: number;
}

export function makeInitialSim(enemies: Enemy[] = []): MutableSimState {
  return {
    enemies,
    shots: [],
    explosions: [],
    popups: [],
    targetId: null,
    shipX: 50,
    slowTimeRemaining: 0,
    shieldFlash: 0,
    nextId: 10,
    spawnTimer: 2.0,
  };
}

export function findTargetWord(sim: MutableSimState): string | null {
  return sim.enemies.find((e) => e.id === sim.targetId)?.word ?? null;
}

export function stepVisualEffects(sim: MutableSimState, dt: number, reducedMotion: boolean): void {
  sim.shots = sim.shots.map((s) => ({ ...s, age: s.age + dt })).filter((s) => s.age < s.duration);
  sim.explosions = reducedMotion
    ? []
    : sim.explosions
        .map((ex) => ({ ...ex, age: ex.age + dt }))
        .filter((ex) => ex.age < ex.duration)
        .slice(-8);
  sim.popups = sim.popups
    .map((p) => ({ ...p, age: p.age + dt }))
    .filter((p) => p.age < p.duration)
    .slice(-10);
}

export function spawnSimWaveEnemies(
  sim: MutableSimState,
  opts: {
    surviving: Enemy[];
    lvl: number;
    difficulty: Difficulty;
    speedMultiplier: number;
    pool: readonly string[];
    rng: () => number;
    bossDefeatedAtLevel: number;
    lastBossLevelSpawned: number;
  },
): { next: Enemy[]; bossSpawned: boolean; wordSpawned: boolean; lastBossLevelSpawned: number } {
  const { surviving, lvl, difficulty, speedMultiplier, pool, rng, bossDefeatedAtLevel } = opts;
  let lastBoss = opts.lastBossLevelSpawned;
  let bossSpawned = false;
  let wordSpawned = false;
  let next = surviving;
  const curve = computeDifficultyCurve(lvl, speedMultiplier);

  if (
    isBossLevel(lvl) &&
    bossDefeatedAtLevel < lvl &&
    lastBoss < lvl &&
    !next.some((e) => e.boss)
  ) {
    lastBoss = lvl;
    const bossWord = pickBossWord(difficulty, next, pool, rng);
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
    bossSpawned = true;
  }

  if (sim.spawnTimer <= 0 && next.length < curve.maxSimultaneous) {
    sim.spawnTimer = curve.spawnInterval;
    const activePool = pool.length ? pool : ["type", "swift", "laser", "focus", "speed"];
    const available = activePool.filter(
      (w) => !next.some((e) => e.word === w || e.word[0] === w[0]),
    );
    const pickFrom = available.length > 0 ? available : activePool;
    const pickedWord = pickFrom[Math.floor(rng() * Math.min(pickFrom.length, 60))] ?? "arcade";
    if (!next.some((e) => e.word === pickedWord)) {
      const speed = Math.min(
        curve.maxSpeed,
        curve.baseSpeed + rng() * (curve.maxSpeed - curve.baseSpeed),
      );
      next = [
        ...next,
        { id: sim.nextId++, word: pickedWord, typed: 0, x: 15 + rng() * 70, y: 0, speed },
      ];
      wordSpawned = true;
    }
  }

  return { next, bossSpawned, wordSpawned, lastBossLevelSpawned: lastBoss };
}

export function pushShieldSavedVisuals(
  sim: MutableSimState,
  breached: readonly Enemy[],
  shieldsUsed: number,
): void {
  if (shieldsUsed <= 0) return;
  sim.shieldFlash = 0.45;
  for (let i = 0; i < shieldsUsed; i++) {
    const b = breached[i];
    if (!b) continue;
    sim.popups.push({
      id: sim.nextId++,
      x: b.x,
      y: 84,
      text: "SHIELD SAVED!",
      age: 0,
      duration: 0.85,
      tone: "accent",
    });
  }
}

export function pushPopupVisual(
  sim: MutableSimState,
  x: number,
  y: number,
  text: string,
  tone: "primary" | "accent" | "destructive",
  duration = 0.9,
): void {
  sim.popups.push({ id: sim.nextId++, x, y, text, age: 0, duration, tone });
}

export function applyKeyStepToSim(sim: MutableSimState, char: string, streak: number): KeyResult {
  const res = applyKeyToEnemies(sim.enemies, char, sim.targetId, streak);
  sim.enemies = res.nextEnemies;
  sim.targetId = res.nextTargetId;
  if (!res.wrongKey && res.targetHit) {
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
  }
  return res;
}

export function pushDestroyVisuals(
  sim: MutableSimState,
  destroyed: Enemy,
  scoreGained: number,
  reducedMotion: boolean,
  powerUpText: "+1 SLOW TIME" | "+1 SHIELD" | null,
): void {
  if (powerUpText) {
    pushPopupVisual(sim, destroyed.x, Math.max(12, destroyed.y - 6), powerUpText, "accent", 0.9);
  }
  if (!reducedMotion) {
    const colors: ("primary" | "accent" | "destructive")[] = ["primary", "accent", "destructive"];
    const particles = Array.from({ length: 8 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        colorKey: colors[Math.floor(Math.random() * colors.length)] ?? "primary",
        size: 2.5 + Math.random() * 2.5,
      };
    });
    sim.explosions.push({
      id: sim.nextId++,
      x: destroyed.x,
      y: destroyed.y,
      age: 0,
      duration: 0.35,
      particles,
    });
  }
  pushPopupVisual(
    sim,
    destroyed.x,
    destroyed.y,
    `+${scoreGained}`,
    destroyed.boss ? "destructive" : "primary",
    0.7,
  );
}
