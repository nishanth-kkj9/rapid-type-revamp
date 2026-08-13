interface Props {
  text: string;
  typed: string;
}

export function TypingText({ text, typed }: Props) {
  return (
    <p className="font-mono text-xl leading-[2.1rem] tracking-tight sm:text-2xl sm:leading-[2.6rem]">
      {text.split("").map((ch, i) => {
        const t = typed[i];
        const isCursor = i === typed.length;
        let cls = "text-muted-foreground/60";
        if (t !== undefined) {
          cls = t === ch ? "text-foreground" : "text-destructive underline decoration-destructive/70";
        }
        return (
          <span
            key={i}
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
      {typed.length >= text.length ? <span className="caret text-primary">|</span> : null}
    </p>
  );
}
