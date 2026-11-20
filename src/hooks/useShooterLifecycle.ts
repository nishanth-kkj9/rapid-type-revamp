import { useEffect, useRef, type RefObject } from "react";
import type { PauseReason, ShooterPhase } from "@/lib/shooterEngine";

export interface UseShooterLifecycleOptions {
  phase: ShooterPhase;
  resumeCountdown: number | null;
  levelBanner: number | null;
  inputRef: RefObject<HTMLInputElement | null>;
  phaseRef: RefObject<ShooterPhase>;
  onPause: (reason: PauseReason) => void;
  onTogglePause: () => void;
  onStart: () => void;
  onResumeTick: () => void;
  onClearLevelBanner: () => void;
  onActivateSlowTime: () => void;
  onHandleKey: (char: string) => void;
  onSampleTick: () => void;
}

export function useShooterLifecycle({
  phase,
  resumeCountdown,
  levelBanner,
  inputRef,
  phaseRef,
  onPause,
  onTogglePause,
  onStart,
  onResumeTick,
  onClearLevelBanner,
  onActivateSlowTime,
  onHandleKey,
  onSampleTick,
}: UseShooterLifecycleOptions) {
  const blurTimerRef = useRef<number | null>(null);
  const actionsRef = useRef({
    onPause,
    onTogglePause,
    onStart,
    onResumeTick,
    onClearLevelBanner,
    onActivateSlowTime,
    onHandleKey,
    onSampleTick,
  });
  actionsRef.current = {
    onPause,
    onTogglePause,
    onStart,
    onResumeTick,
    onClearLevelBanner,
    onActivateSlowTime,
    onHandleKey,
    onSampleTick,
  };

  const clearBlurTimer = () => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (phase !== "resuming" || resumeCountdown === null) return undefined;
    const t = window.setTimeout(() => actionsRef.current.onResumeTick(), 750);
    return () => window.clearTimeout(t);
  }, [phase, resumeCountdown]);

  useEffect(() => {
    const onVis = () => {
      const p = phaseRef.current;
      if (document.hidden && (p === "playing" || p === "resuming")) {
        clearBlurTimer();
        actionsRef.current.onPause("hidden");
      }
    };
    const onBlur = () => {
      if (phaseRef.current !== "playing") return;
      clearBlurTimer();
      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = null;
        if (phaseRef.current === "playing") actionsRef.current.onPause("blur");
      }, 1500);
    };
    const onFocus = () => clearBlurTimer();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      clearBlurTimer();
    };
  }, [phaseRef]);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const id = setInterval(() => actionsRef.current.onSampleTick(), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (levelBanner === null) return undefined;
    const t = setTimeout(() => actionsRef.current.onClearLevelBanner(), 1200);
    return () => clearTimeout(t);
  }, [levelBanner]);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = phaseRef.current;
      if (e.key === "Escape") {
        e.preventDefault();
        if (p === "playing" || p === "paused" || p === "resuming")
          actionsRef.current.onTogglePause();
        else actionsRef.current.onStart();
      } else if (e.key === "F2") {
        e.preventDefault();
        actionsRef.current.onTogglePause();
      } else if (p === "playing" && (e.key === "Tab" || e.key === "1")) {
        e.preventDefault();
        actionsRef.current.onActivateSlowTime();
      } else if (p === "idle" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        actionsRef.current.onStart();
      } else if (p === "playing" && e.key.length === 1 && /^[a-z'-]$/i.test(e.key)) {
        if (document.activeElement === inputRef.current) return;
        actionsRef.current.onHandleKey(e.key.toLowerCase());
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [inputRef, phaseRef]);

  return { clearBlurTimer };
}
