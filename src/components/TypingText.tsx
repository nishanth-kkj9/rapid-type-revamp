import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CaretStyle } from "@/lib/drillSettings";

interface Props {
  text: string;
  typed: string;
  caretStyle?: CaretStyle;
  paceCaretIndex?: number | null;
}

interface Word {
  chars: string[];
  start: number;
}

interface CaretRect {
  left: number;
  top: number;
  width: number;
  height: number;
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

/** Chunked word window so visible DOM nodes only shift every ~10 words, eliminating per-keystroke layout thrashing. */
const WINDOW_STEP = 10;
const WINDOW_BEFORE = 12;
const WINDOW_AFTER = 42;

export const TypingText = memo(function TypingText({
  text,
  typed,
  caretStyle = "smooth",
  paceCaretIndex = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const charRectsRef = useRef<Map<number, CaretRect>>(new Map());
  const containerMetricsRef = useRef<{ height: number }>({ height: 160 });
  const [caretPos, setCaretPos] = useState<CaretRect | null>(null);
  const [pacePos, setPacePos] = useState<CaretRect | null>(null);
  const [measureVersion, setMeasureVersion] = useState(0);

  const words = useMemo(() => splitWords(text), [text]);

  const caretWordIndex = useMemo(() => {
    const i = words.findIndex(
      (w) => typed.length >= w.start && typed.length < w.start + w.chars.length,
    );
    return i === -1 ? Math.max(0, words.length - 1) : i;
  }, [words, typed.length]);

  const windowAnchor = Math.floor(caretWordIndex / WINDOW_STEP) * WINDOW_STEP;
  const sliceStart = Math.max(0, windowAnchor - WINDOW_BEFORE);
  const sliceEnd = Math.min(words.length, windowAnchor + WINDOW_STEP + WINDOW_AFTER);

  const visible = useMemo(() => words.slice(sliceStart, sliceEnd), [words, sliceStart, sliceEnd]);

  /** Pre-measure all visible character offsets ONLY when window slice or container width/font changes. */
  const measureVisibleLayout = useCallback(() => {
    const container = containerRef.current;
    const paragraph = paragraphRef.current;
    if (!container || !paragraph) return;

    const containerRect = container.getBoundingClientRect();
    containerMetricsRef.current.height = containerRect.height || container.clientHeight || 160;

    const nextMap = new Map<number, CaretRect>();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const charNodes = paragraph.querySelectorAll<HTMLSpanElement>("[data-char-index]");
    for (const node of charNodes) {
      const rawIdx = node.dataset["charIndex"];
      if (rawIdx === undefined) continue;
      const idx = Number(rawIdx);
      const rect = node.getBoundingClientRect();
      nextMap.set(idx, {
        left: rect.left - containerRect.left + scrollLeft,
        top: rect.top - containerRect.top + scrollTop,
        width: Math.max(2, rect.width),
        height: Math.max(16, rect.height),
      });
    }

    charRectsRef.current = nextMap;
    setMeasureVersion((v) => v + 1);
  }, []);

  useLayoutEffect(() => {
    measureVisibleLayout();
  }, [measureVisibleLayout, visible, text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      measureVisibleLayout();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureVisibleLayout]);

  /** O(1) pure-JS coordinate lookup on every keystroke — zero DOM layout reads! */
  useEffect(() => {
    const rect = charRectsRef.current.get(typed.length) ?? null;
    setCaretPos(rect);
    const nextPacePos =
      paceCaretIndex !== null && paceCaretIndex !== undefined
        ? (charRectsRef.current.get(paceCaretIndex) ?? null)
        : null;
    setPacePos(nextPacePos);

    const container = containerRef.current;
    if (rect && container) {
      const viewHeight = containerMetricsRef.current.height;
      const scrollTop = container.scrollTop;
      const lineBottom = rect.top + rect.height;
      const padding = 8;

      if (lineBottom > scrollTop + viewHeight - padding) {
        container.scrollTop = Math.max(0, lineBottom - viewHeight + padding);
      } else if (rect.top < scrollTop + padding) {
        container.scrollTop = Math.max(0, rect.top - padding);
      }
    }
  }, [typed.length, paceCaretIndex, measureVersion]);

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
        return caretPos != null
          ? "rounded-[2px] bg-primary/10"
          : "caret rounded-[2px] bg-primary/25 shadow-[inset_2px_0_0_0_var(--color-primary)]";
    }
  };

  return (
    <div ref={containerRef} className="relative max-h-[9.5rem] overflow-hidden sm:max-h-[11rem]">
      {pacePos != null ? (
        <span
          aria-hidden="true"
          data-testid="pace-caret"
          className="pace-caret pointer-events-none absolute left-0 top-0 z-[5] w-[2px] rounded-full bg-accent/70 will-change-transform"
          style={{
            height: `${pacePos.height}px`,
            transform: `translate3d(${pacePos.left}px, ${pacePos.top}px, 0)`,
          }}
        />
      ) : null}
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
      <p
        ref={paragraphRef}
        className="flex flex-wrap font-mono text-xl leading-[2.2rem] tracking-tight sm:text-2xl sm:leading-[2.7rem]"
      >
        {visible.map((word) => (
          <span key={word.start} className="whitespace-pre">
            {word.chars.map((ch, j) => {
              const i = word.start + j;
              const t = typed[i];
              const isCursor = i === typed.length;
              let cls = "text-muted-foreground";
              if (t !== undefined) {
                cls =
                  t === ch
                    ? "text-foreground"
                    : "text-destructive underline decoration-destructive/80";
              }
              return (
                <span
                  key={i}
                  data-char-index={i}
                  className={`${cls} ${isCursor ? getCaretClass() : ""}`}
                >
                  {t !== undefined && t !== ch && ch === " " ? "_" : ch}
                </span>
              );
            })}
          </span>
        ))}
        {typed.length >= text.length ? (
          <span data-char-index={text.length} className="caret text-primary">
            |
          </span>
        ) : null}
      </p>
    </div>
  );
});
