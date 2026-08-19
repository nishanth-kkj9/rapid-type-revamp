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
    <div className="panel px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums transition-colors sm:text-3xl ${
          warn ? "text-destructive" : emphasis ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>

      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
