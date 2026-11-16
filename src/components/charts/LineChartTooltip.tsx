import type { LineSeriesConfig } from "./LineChart";

interface LineChartTooltipProps<T extends Record<string, unknown>> {
  row: T;
  hoverIdx: number;
  hoverX: number;
  width: number;
  xKey: keyof T & string;
  series: LineSeriesConfig<T>[];
  errorKey?: (keyof T & string) | undefined;
  formatTooltipTitle?: ((row: T) => string) | undefined;
}

export function LineChartTooltip<T extends Record<string, unknown>>({
  row,
  hoverIdx,
  hoverX,
  width,
  xKey,
  series,
  errorKey,
  formatTooltipTitle,
}: LineChartTooltipProps<T>) {
  const errors = errorKey ? Number(row[errorKey] ?? 0) : 0;

  return (
    <div
      className="pointer-events-none absolute top-2 z-20 min-w-[130px] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
      style={{
        left: hoverX > width * 0.58 ? undefined : `${Math.min(hoverX + 12, width - 145)}px`,
        right: hoverX > width * 0.58 ? `${Math.max(8, width - hoverX + 12)}px` : undefined,
      }}
    >
      <div className="mb-1 font-mono text-[11px] font-semibold text-foreground">
        {formatTooltipTitle ? formatTooltipTitle(row) : String(row[xKey] ?? hoverIdx + 1)}
      </div>
      <div className="space-y-0.5">
        {series.map((s) => {
          const raw = Number(row[s.key]);
          if (!Number.isFinite(raw)) return null;
          const formatted = s.formatValue ? s.formatValue(raw, row) : String(raw);
          return (
            <div
              key={s.key}
              className="flex items-center justify-between gap-3 font-mono text-[11px]"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-semibold text-foreground">{formatted}</span>
            </div>
          );
        })}
        {errors > 0 ? (
          <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-destructive">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-destructive" />
              Errors
            </span>
            <span className="font-semibold">{errors}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
