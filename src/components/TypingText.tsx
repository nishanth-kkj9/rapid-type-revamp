import { useEffect, useMemo, useRef } from "react";

interface Props {
  text: string;
  typed: string;
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

export function TypingText({ text, typed }: Props) {
  const cursorRef = useRef<HTMLSpanElement>(null);
  const words = useMemo(() => splitWords(text), [text]);

  const caretIndex = useMemo(() => {
    const i = words.findIndex(
      (w) => typed.length >= w.start && typed.length < w.start + w.chars.length,
    );
    return i === -1 ? words.length - 1 : i;
  }, [words, typed.length]);

  const visible = useMemo(
    () =>
      words.slice(Math.max(0, caretIndex - WINDOW_BEFORE), caretIndex + WINDOW_AFTER + 1),
    [words, caretIndex],
  );

  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [typed.length]);

  return (
    <div className="max-h-[9.5rem] overflow-hidden sm:max-h-[11rem]">
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
                  className={`${cls} ${
                    isCursor
                      ? "caret rounded-[2px] bg-primary/25 shadow-[inset_2px_0_0_0_var(--color-primary)]"
                      : ""
                  }`}
                >
                  {t !== undefined && t !== ch && ch === " " ? "_" : ch}
                </span>
              );
            })}
          </span>
        ))}
        {typed.length >= text.length ? <span className="caret text-primary">|</span> : null}
      </p>
    </div>
  );
}
