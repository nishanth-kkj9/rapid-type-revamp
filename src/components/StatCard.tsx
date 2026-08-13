interface Props {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}

export function StatCard({ label, value, hint, emphasis }: Props) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums sm:text-3xl ${
          emphasis ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
