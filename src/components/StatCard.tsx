interface Props {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  /** Highlights the value in the destructive colour (e.g. time running out). */
  warn?: boolean;
}

export function StatCard({ label, value, hint, emphasis, warn }: Props) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        key={value}
        className={`digit-pop mt-1 inline-block font-mono text-2xl font-semibold tabular-nums sm:text-3xl ${
          warn ? "text-destructive" : emphasis ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>

      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
