import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CaretStyle } from "@/lib/drillSettings";

interface Props {
  text: string;
  typed: string;
  caretStyle?: CaretStyle;
}

interface Word {
  chars: string[];
  start: number;
}

function splitWords(text: string): Word[] {
  const words: Word[] = [];
  let chars: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    chars.push(ch);
    if (ch === " ") {
      words.push({ chars, start });
      chars = [];
      start = i + 1;
    }
  }
  if (chars.length) words.push({ chars, start });
  return words;
}

/** Words rendered before/after the caret word — keeps renders O(1) on long passages. */
const WINDOW_BEFORE = 12;
const WINDOW_AFTER = 40;

export const TypingText = memo(function TypingText({ text, typed, caretStyle = "smooth" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [caretPos, setCaretPos] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const words = useMemo(() => splitWords(text), [text]);

  const caretIndex = useMemo(() => {
    const i = words.findIndex(
      (w) => typed.length >= w.start && typed.length < w.start + w.chars.length,
    );
    return i === -1 ? words.length - 1 : i;
  }, [words, typed.length]);

  const visible = useMemo(
    () => words.slice(Math.max(0, caretIndex - WINDOW_BEFORE), caretIndex + WINDOW_AFTER + 1),
    [words, caretIndex],
  );

  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    const cursor = cursorRef.current;
    const container = containerRef.current;
    if (cursor && container) {
      const containerRect = container.getBoundingClientRect();
      const cursorRect = cursor.getBoundingClientRect();
      setCaretPos({
        left: cursorRect.left - containerRect.left + container.scrollLeft,
        top: cursorRect.top - containerRect.top + container.scrollTop,
        width: Math.max(2, cursorRect.width),
        height: Math.max(16, cursorRect.height),
      });
    } else {
      setCaretPos(null);
    }
  }, [typed.length, visible]);

  useEffect(() => {
    const handleResize = () => {
      const cursor = cursorRef.current;
      const container = containerRef.current;
      if (cursor && container) {
        const containerRect = container.getBoundingClientRect();
        const cursorRect = cursor.getBoundingClientRect();
        setCaretPos({
          left: cursorRect.left - containerRect.left + container.scrollLeft,
          top: cursorRect.top - containerRect.top + container.scrollTop,
          width: Math.max(2, cursorRect.width),
          height: Math.max(16, cursorRect.height),
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCaretClass = () => {
    switch (caretStyle) {
      case "block":
        return "rounded-[2px] bg-primary text-primary-foreground animate-pulse";
      case "bar":
        return "shadow-[inset_3px_0_0_0_var(--color-primary)] bg-transparent";
      case "underline":
        return "shadow-[inset_0_-3px_0_0_var(--color-primary)] bg-transparent";
      case "smooth":
      default:
        // When smooth floating caret is active, character cell retains a subtle indicator
        return caretPos != null
          ? "rounded-[2px] bg-primary/10"
          : "caret rounded-[2px] bg-primary/25 shadow-[inset_2px_0_0_0_var(--color-primary)]";
    }
  };

  return (
    <div ref={containerRef} className="relative max-h-[9.5rem] overflow-hidden sm:max-h-[11rem]">
      {caretPos != null && caretStyle === "smooth" ? (
        <span
          aria-hidden="true"
          className="caret-smooth pointer-events-none absolute left-0 top-0 z-10 w-[2.5px] rounded-full bg-primary will-change-transform"
          style={{
            height: `${caretPos.height}px`,
            transform: `translate3d(${caretPos.left}px, ${caretPos.top}px, 0)`,
          }}
        />
      ) : null}
      <p className="flex flex-wrap font-mono text-xl leading-[2.1rem] tracking-tight sm:text-2xl sm:leading-[2.6rem]">
        {visible.map((word) => (
          <span key={word.start} className="whitespace-pre">
            {word.chars.map((ch, j) => {
              const i = word.start + j;
              const t = typed[i];
              const isCursor = i === typed.length;
              let cls = "text-muted-foreground/60";
              if (t !== undefined) {
                cls =
                  t === ch
                    ? "text-foreground"
                    : "text-destructive underline decoration-destructive/70";
              }
              return (
                <span
                  key={i}
                  ref={isCursor ? cursorRef : undefined}
                  className={`${cls} ${isCursor ? getCaretClass() : ""}`}
                >
                  {t !== undefined && t !== ch && ch === " " ? "_" : ch}
                </span>
              );
            })}
          </span>
        ))}
        {typed.length >= text.length ? (
          <span ref={cursorRef} className="caret text-primary">
            |
          </span>
        ) : null}
      </p>
    </div>
  );
});
