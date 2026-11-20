import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ShooterSettings } from "@/lib/shooterSettings";
import {
  computeShooterAccuracy,
  computeShooterHitRate,
  createInitialShooterState,
  shooterGameReducer,
  SLOW_TIME_DURATION_SEC,
  type Enemy,
  type PauseReason,
  type ShooterGameAction,
  type ShooterPhase,
} from "@/lib/shooterEngine";
import {
  buildBridgeRunSummary,
  createShooterRunTracker,
  getActiveTargetChar,
  initShooterSession,
  processShooterKeyPress,
  resolveShooterBreachBridge,
} from "@/lib/shooterGameBridge";
import {
  findTargetWord,
  makeInitialSim,
  pushPopupVisual,
  type MutableSimState,
} from "@/lib/shooterSimVisuals";
import type { ShooterRunSummary } from "@/lib/typingStats";
import { useShooterFeedback } from "@/hooks/useShooterFeedback";
import { useShooterLifecycle } from "@/hooks/useShooterLifecycle";
import { useShooterLoop } from "@/hooks/useShooterLoop";

export type { PauseReason, ShooterPhase };

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

export function useWordShooterGame(opts: UseWordShooterGameOptions) {
  const { settings, initialBest } = opts;
  const [state, dispatch] = useReducer(shooterGameReducer, undefined, () =>
    createInitialShooterState(initialBest, settings.startingLives, settings.practiceMode),
  );
  const gameRef = useRef(state);
  const simRef = useRef<MutableSimState>(makeInitialSim());
  const inputRef = useRef<HTMLInputElement>(null);
  const poolRef = useRef<string[]>([]);
  const rngRef = useRef<() => number>(Math.random);
  const cbRef = useRef(opts);
  cbRef.current = opts;

  const feedback = useShooterFeedback(settings.soundEnabled);
  const reducedMotionRef = useRef(feedback.reducedMotion);
  reducedMotionRef.current = feedback.reducedMotion;

  const phaseRef = useRef<ShooterPhase>(state.phase);
  const levelRef = useRef(state.level);
  const bossDefeatedAtLevelRef = useRef(state.bossDefeatedAtLevel);
  const shieldChargesRef = useRef(state.shieldCharges);
  const activeElapsedRef = useRef(0);
  const runRef = useRef(createShooterRunTracker(undefined));

  const commitState = useCallback((next: typeof state, action: ShooterGameAction) => {
    gameRef.current = next;
    phaseRef.current = next.phase;
    levelRef.current = next.level;
    bossDefeatedAtLevelRef.current = next.bossDefeatedAtLevel;
    shieldChargesRef.current = next.shieldCharges;
    dispatch(action);
    return next;
  }, []);

  const applyAction = useCallback(
    (action: ShooterGameAction) => commitState(shooterGameReducer(gameRef.current, action), action),
    [commitState],
  );

  useEffect(() => {
    applyAction({ type: "SYNC_BEST", best: initialBest });
  }, [applyAction, initialBest]);

  const emitActiveChar = useCallback((phase: ShooterPhase) => {
    const nextChar = getActiveTargetChar(simRef.current, phase);
    if (nextChar !== runRef.current.activeChar) {
      runRef.current.activeChar = nextChar;
      cbRef.current.onActiveTargetCharChange?.(nextChar);
    }
  }, []);

  const finishRun = useCallback(() => {
    const r = runRef.current;
    if (r.runEnded) return;
    r.runEnded = true;
    const durationSec = Math.max(1, Math.round(activeElapsedRef.current));
    const endState = applyAction({ type: "GAME_OVER", durationSec });
    r.activeChar = null;
    cbRef.current.onActiveTargetCharChange?.(null);
    feedback.playGameOver();
    feedback.announce(`Game over! Final score: ${endState.score}`);
    cbRef.current.onRunComplete?.(
      buildBridgeRunSummary(endState, durationSec, cbRef.current.settings, r),
    );
  }, [applyAction, feedback]);

  const handleBreach = useCallback(
    (breached: Enemy[]) => {
      const outcome = resolveShooterBreachBridge({
        sim: simRef.current,
        prev: gameRef.current,
        breached,
        practiceMode: cbRef.current.settings.practiceMode,
      });
      commitState(outcome.next, outcome.action);
      if (outcome.playBreach) feedback.playBreach();
      if (outcome.playShield) feedback.playExplosion();
      if (outcome.announcement) feedback.announce(outcome.announcement);
      if (outcome.gameOver) finishRun();
      return outcome.gameOver;
    },
    [commitState, feedback, finishRun],
  );

  const { fieldRef, canvasRef, drawFrame, resetLoopRefs } = useShooterLoop({
    phase: state.phase,
    difficulty: settings.difficulty,
    speedMultiplier: settings.speedMultiplier,
    practiceMode: settings.practiceMode,
    reducedMotion: feedback.reducedMotion,
    simRef,
    poolRef,
    rngRef,
    levelRef,
    bossDefeatedAtLevelRef,
    shieldChargesRef,
    activeElapsedRef,
    onSlowTimeExpired: () => applyAction({ type: "EXPIRE_SLOW_TIME" }),
    onTargetCleared: () => {
      applyAction({ type: "SET_TARGET_WORD", targetWord: findTargetWord(simRef.current) });
      emitActiveChar(gameRef.current.phase);
    },
    onBreach: handleBreach,
    onBossSpawned: () => {
      applyAction({ type: "WORD_SPAWNED", count: 1 });
      feedback.announce("Boss word incoming!");
    },
    onWordSpawned: () => applyAction({ type: "WORD_SPAWNED", count: 1 }),
    onDangerChange: (hasDanger) => applyAction({ type: "SET_DANGER", hasDanger }),
  });

  const start = useCallback(() => {
    const { settings: cur, missedWords, weakKeys = [] } = cbRef.current;
    const session = initShooterSession(cur, missedWords, weakKeys);
    rngRef.current = session.rng;
    poolRef.current = session.pool;
    simRef.current = session.sim;
    runRef.current = session.tracker;
    activeElapsedRef.current = 0;
    resetLoopRefs();
    applyAction({
      type: "START",
      initialWordsSpawned: session.initialCount,
      startingLives: cur.startingLives,
      practiceMode: cur.practiceMode,
      targetWord: session.targetWord,
    });
    cbRef.current.onStart?.();
    emitActiveChar("playing");
    feedback.announce(session.announcement);
    drawFrame();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [applyAction, drawFrame, emitActiveChar, feedback, resetLoopRefs]);

  const pauseNow = useCallback(
    (reason: PauseReason = "manual") => {
      if (gameRef.current.phase !== "playing" && gameRef.current.phase !== "resuming") return;
      applyAction({ type: "PAUSE", reason });
      runRef.current.activeChar = null;
      cbRef.current.onActiveTargetCharChange?.(null);
      feedback.announce("Game paused.");
    },
    [applyAction, feedback],
  );

  const beginResume = useCallback(() => {
    if (gameRef.current.phase !== "paused") return;
    applyAction({ type: "BEGIN_RESUME" });
    feedback.announce("Resuming in 3...");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [applyAction, feedback]);

  const togglePause = useCallback(() => {
    const p = gameRef.current.phase;
    if (p === "playing" || p === "resuming") pauseNow("manual");
    else if (p === "paused") beginResume();
  }, [beginResume, pauseNow]);

  const activateSlowTime = useCallback(() => {
    if (gameRef.current.phase !== "playing" || gameRef.current.slowCharges <= 0) return;
    applyAction({ type: "ACTIVATE_SLOW_TIME" });
    simRef.current.slowTimeRemaining = SLOW_TIME_DURATION_SEC;
    pushPopupVisual(simRef.current, 50, 45, "SLOW TIME!", "accent", 0.9);
    feedback.announce("Slow time activated!");
  }, [applyAction, feedback]);

  const handleKey = useCallback(
    (char: string) => {
      if (gameRef.current.phase !== "playing") return;
      cbRef.current.onCharPressed?.(char);
      const outcome = processShooterKeyPress({
        sim: simRef.current,
        prev: gameRef.current,
        tracker: runRef.current,
        char,
        nowMs: performance.now(),
        reducedMotion: reducedMotionRef.current,
      });
      commitState(outcome.next, outcome.action);
      if (outcome.wrongExpectedChar) cbRef.current.onWrongKey?.(outcome.wrongExpectedChar);
      if (outcome.playLaser) feedback.playLaser();
      if (outcome.playExplosion) feedback.playExplosion();
      if (outcome.announcement) feedback.announce(outcome.announcement);
      emitActiveChar("playing");
      drawFrame();
    },
    [commitState, drawFrame, emitActiveChar, feedback],
  );

  const { clearBlurTimer } = useShooterLifecycle({
    phase: state.phase,
    resumeCountdown: state.resumeCountdown,
    levelBanner: state.levelBanner,
    inputRef,
    phaseRef,
    onPause: pauseNow,
    onTogglePause: togglePause,
    onStart: start,
    onResumeTick: () => {
      const next = applyAction({ type: "RESUME_TICK" });
      if (next.phase === "playing") {
        feedback.announce("Game resumed.");
        emitActiveChar("playing");
        requestAnimationFrame(() => inputRef.current?.focus());
      } else if (next.resumeCountdown !== null)
        feedback.announce(`Resuming in ${next.resumeCountdown}...`);
    },
    onClearLevelBanner: () => applyAction({ type: "CLEAR_LEVEL_BANNER" }),
    onActivateSlowTime: activateSlowTime,
    onHandleKey: handleKey,
    onSampleTick: () =>
      runRef.current.samples.push(
        runRef.current.charsDestroyed > 0
          ? runRef.current.charsDestroyed
          : gameRef.current.hits * 5,
      ),
  });

  const startWithReset = useCallback(() => {
    clearBlurTimer();
    start();
  }, [clearBlurTimer, start]);

  return {
    ...state,
    reducedMotion: feedback.reducedMotion,
    hitRate: computeShooterHitRate(state.hits, state.wordsSpawned),
    typingAccuracy: computeShooterAccuracy(state.correctKeys, state.correctKeys + state.wrongKeys),
    soundMuted: feedback.soundMuted,
    setLocalMuteOverride: feedback.setLocalMuteOverride,
    liveAnnouncement: feedback.liveAnnouncement,
    fieldRef,
    canvasRef,
    inputRef,
    start: startWithReset,
    togglePause,
    beginResume,
    finishRun,
    activateSlowTime,
    handleKey,
  };
}
