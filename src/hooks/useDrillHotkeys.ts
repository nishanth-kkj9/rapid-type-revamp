import { useEffect, type RefObject } from "react";

interface UseDrillHotkeysOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  againRef: RefObject<HTMLButtonElement | null>;
  finished: boolean;
  tabToRestart: boolean;
  onRestart: () => void;
}

export function useDrillHotkeys({
  inputRef,
  againRef,
  finished,
  tabToRestart,
  onRestart,
}: UseDrillHotkeysOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (tabToRestart && e.key === "Tab" && !e.shiftKey) {
        const active = document.activeElement;
        if (active === inputRef.current || active === againRef.current) {
          e.preventDefault();
          onRestart();
          return;
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onRestart();
        return;
      }
      if (finished || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      const active = document.activeElement;
      if (active === inputRef.current) return;
      if (
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName))
      ) {
        return;
      }
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef, againRef, finished, tabToRestart, onRestart]);
}
