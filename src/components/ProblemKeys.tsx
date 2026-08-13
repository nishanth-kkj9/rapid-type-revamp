interface Props {
  mistakes: Record<string, number>;
  limit?: number;
}

export function ProblemKeys({ mistakes, limit = 6 }: Props) {
  const top = Object.entries(mistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (top.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Problem keys
      </span>
      {top.map(([key, count]) => (
        <span
          key={key}
          className="rounded-md border border-destructive/40 bg-destructive/15 px-2 py-1 font-mono text-xs"
        >
          {key === " " ? "space" : key}
          <span className="ml-1.5 text-muted-foreground">{count}</span>
        </span>
      ))}
    </div>
  );
}
