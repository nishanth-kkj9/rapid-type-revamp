import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { QuickRestartKey } from "@/lib/drillSettings";

interface UseDrillHotkeysOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  againRef: RefObject<HTMLButtonElement | null>;
  finished: boolean;
  quickRestart: QuickRestartKey;
  typedLength: number;
  onRestart: () => void;
  onRepeatSameText?: (() => void) | undefined;
}

export function useDrillHotkeys({
  inputRef,
  againRef,
  finished,
  quickRestart,
  typedLength,
  onRestart,
  onRepeatSameText,
}: UseDrillHotkeysOptions): boolean {
  const [restartArmed, setRestartArmed] = useState(false);
  const armedUntilRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearArmed = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    armedUntilRef.current = 0;
    setRestartArmed(false);
  }, []);

  useEffect(() => clearArmed, [finished, quickRestart, clearArmed]);
  useEffect(() => {
    if (typedLength <= 10) clearArmed();
  }, [typedLength, clearArmed]);

  useEffect(() => {
    const confirmableRestart = () => {
      const now = performance.now();
      if (
        !finished &&
        typedLength > 10 &&
        (armedUntilRef.current === 0 || now > armedUntilRef.current)
      ) {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        armedUntilRef.current = now + 1000;
        setRestartArmed(true);
        timerRef.current = window.setTimeout(clearArmed, 1000);
        return;
      }
      clearArmed();
      onRestart();
    };

    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const active = document.activeElement;
      const canRestartFocused =
        active === inputRef.current || active === againRef.current || finished;
      const isInFormControl =
        active !== inputRef.current &&
        active !== againRef.current &&
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName));

      if (e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onRepeatSameText && (finished || !isInFormControl)) {
          e.preventDefault();
          clearArmed();
          onRepeatSameText();
        }
        return;
      }
      if (quickRestart === "esc" && e.key === "Escape") {
        e.preventDefault();
        if (!e.repeat) confirmableRestart();
        return;
      }
      if (quickRestart === "tab" && e.key === "Tab" && !e.shiftKey) {
        if (canRestartFocused) {
          e.preventDefault();
          clearArmed();
          onRestart();
        }
        return;
      }
      if (quickRestart === "enter" && e.key === "Enter" && !e.shiftKey) {
        if (canRestartFocused) {
          e.preventDefault();
          if (!e.repeat) confirmableRestart();
        }
        return;
      }
      if (finished || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      if (active !== inputRef.current && !isInFormControl) inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    inputRef,
    againRef,
    finished,
    quickRestart,
    typedLength,
    onRestart,
    onRepeatSameText,
    clearArmed,
  ]);

  return restartArmed;
}
