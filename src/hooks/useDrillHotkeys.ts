import { useEffect, type RefObject } from "react";
import type { QuickRestartKey } from "@/lib/drillSettings";

interface UseDrillHotkeysOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  againRef: RefObject<HTMLButtonElement | null>;
  finished: boolean;
  quickRestart: QuickRestartKey;
  onRestart: () => void;
  onRepeatSameText?: (() => void) | undefined;
}

export function useDrillHotkeys({
  inputRef,
  againRef,
  finished,
  quickRestart,
  onRestart,
  onRepeatSameText,
}: UseDrillHotkeysOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const active = document.activeElement;
      const isInFormControl =
        active !== inputRef.current &&
        active !== againRef.current &&
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName));

      if (e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onRepeatSameText && (finished || !isInFormControl)) {
          e.preventDefault();
          onRepeatSameText();
          return;
        }
      }

      if (quickRestart === "esc" && e.key === "Escape") {
        e.preventDefault();
        onRestart();
        return;
      }

      if (quickRestart === "tab" && e.key === "Tab" && !e.shiftKey) {
        if (active === inputRef.current || active === againRef.current || finished) {
          e.preventDefault();
          onRestart();
          return;
        }
        return;
      }

      if (quickRestart === "enter" && e.key === "Enter" && !e.shiftKey) {
        if (active === inputRef.current || active === againRef.current || finished) {
          e.preventDefault();
          onRestart();
          return;
        }
        return;
      }

      if (finished || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      if (active === inputRef.current) return;
      if (isInFormControl) {
        return;
      }
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef, againRef, finished, quickRestart, onRestart, onRepeatSameText]);
}
