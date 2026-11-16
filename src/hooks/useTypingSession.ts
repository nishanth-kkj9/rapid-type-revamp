import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  createInitialSessionState,
  selectSessionStats,
  typingSessionReducer,
  type TypingSessionState,
} from "@/lib/typingSession";
import type { DrillMode } from "@/lib/drillSettings";
import type { RunStats } from "@/lib/typingStats";

export interface UseTypingSessionOptions {
  initialText: string;
  initialQuoteAuthor?: string | null;
  drillMode: DrillMode;
  durationSec: number;
  /** Called lazily when Time mode needs more passage text appended. */
  getAppendText?: () => string;
  /** Called once whenever a session transitions to "finished". */
  onRunFinished?: (state: TypingSessionState, stats: RunStats) => void;
}

export function useTypingSession({
  initialText,
  initialQuoteAuthor = null,
  drillMode,
  durationSec,
  getAppendText,
  onRunFinished,
}: UseTypingSessionOptions) {
  const [state, dispatch] = useReducer(
    typingSessionReducer,
    {
      text: initialText,
      quoteAuthor: initialQuoteAuthor,
      drillMode,
      durationSec,
    },
    createInitialSessionState,
  );

  // Latest callbacks kept in ref so effect/RAF loops don't re-subscribe on callback identity change.
  const onRunFinishedRef = useRef(onRunFinished);
  onRunFinishedRef.current = onRunFinished;

  const getAppendTextRef = useRef(getAppendText);
  getAppendTextRef.current = getAppendText;

  const prevStatusRef = useRef(state.status);

  // High-precision rAF clock while running.
  useEffect(() => {
    if (state.status !== "running") return;
    let raf = 0;
    const step = () => {
      dispatch({ type: "TICK", nowMs: performance.now() });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.status]);

  const stats = useMemo(() => selectSessionStats(state), [state]);

  // Fire onRunFinished once per running -> finished transition.
  useEffect(() => {
    if (prevStatusRef.current !== "finished" && state.status === "finished") {
      onRunFinishedRef.current?.(state, stats);
    }
    prevStatusRef.current = state.status;
  }, [state, stats]);

  const start = useCallback(() => {
    dispatch({ type: "START", nowMs: performance.now() });
  }, []);

  const applyInputDelta = useCallback(
    (prevValue: string, nextValue: string) => {
      if (state.status === "finished" || !state.text) return;

      const clampedNext =
        nextValue.length > state.text.length ? nextValue.slice(0, state.text.length) : nextValue;

      let common = 0;
      const minLen = Math.min(prevValue.length, clampedNext.length);
      while (common < minLen && prevValue[common] === clampedNext[common]) {
        common++;
      }

      const deletedCount = prevValue.length - common;
      const inserted = clampedNext.slice(common);

      if (deletedCount > 0) {
        dispatch({ type: "BACKSPACE", count: deletedCount, nowMs: performance.now() });
      }
      if (inserted.length > 0) {
        const needsAppend =
          state.drillMode === "time" &&
          clampedNext.length >= state.text.length - 60 &&
          state.text.length < 6000;
        dispatch({
          type: "KEY",
          value: inserted,
          nowMs: performance.now(),
          appendText: needsAppend ? getAppendTextRef.current?.() : undefined,
        });
      }
    },
    [state.status, state.text, state.drillMode],
  );

  const finish = useCallback(() => {
    dispatch({ type: "FINISH", nowMs: performance.now() });
  }, []);

  const restart = useCallback(
    (opts: {
      text: string;
      quoteAuthor?: string | null;
      drillMode: DrillMode;
      durationSec: number;
      keepMissedWords?: boolean;
    }) => {
      dispatch({
        type: "RESTART",
        text: opts.text,
        quoteAuthor: opts.quoteAuthor,
        drillMode: opts.drillMode,
        durationSec: opts.durationSec,
        keepMissedWords: opts.keepMissedWords,
      });
    },
    [],
  );

  return {
    state,
    stats,
    dispatch,
    start,
    applyInputDelta,
    finish,
    restart,
  };
}
