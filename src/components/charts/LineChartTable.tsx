import type { LineSeriesConfig } from "./LineChart";

interface LineChartTableProps<T extends Record<string, unknown>> {
  caption: string;
  data: T[];
  xKey: keyof T & string;
  series: LineSeriesConfig<T>[];
  errorKey?: (keyof T & string) | undefined;
  formatXTick?: ((val: number | string) => string) | undefined;
  visible?: boolean | undefined;
}

export function LineChartTable<T extends Record<string, unknown>>({
  caption,
  data,
  xKey,
  series,
  errorKey,
  formatXTick,
  visible = false,
}: LineChartTableProps<T>) {
  if (data.length === 0) return null;

  if (!visible) {
    return (
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{xKey}</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
            {errorKey ? <th scope="col">Errors</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const rawX = row[xKey];
            const xDisplay = formatXTick
              ? formatXTick(rawX as number | string)
              : String(rawX ?? idx + 1);
            return (
              <tr key={idx}>
                <th scope="row">{xDisplay}</th>
                {series.map((s) => {
                  const val = Number(row[s.key]);
                  const text = Number.isFinite(val)
                    ? s.formatValue
                      ? s.formatValue(val, row)
                      : String(val)
                    : "-";
                  return <td key={s.key}>{text}</td>;
                })}
                {errorKey ? <td>{Number(row[errorKey] ?? 0)}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="max-h-56 overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-secondary text-foreground">
          <tr>
            <th scope="col" className="border-b border-border px-3 py-2 capitalize">
              {xKey}
            </th>
            {series.map((s) => (
              <th key={s.key} scope="col" className="border-b border-border px-3 py-2">
                {s.label}
              </th>
            ))}
            {errorKey ? (
              <th scope="col" className="border-b border-border px-3 py-2">
                Errors
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {data.map((row, idx) => {
            const rawX = row[xKey];
            const xDisplay = formatXTick
              ? formatXTick(rawX as number | string)
              : String(rawX ?? idx + 1);
            return (
              <tr key={idx} className="hover:bg-secondary/40">
                <th scope="row" className="px-3 py-1.5 font-semibold text-foreground">
                  {xDisplay}
                </th>
                {series.map((s) => {
                  const val = Number(row[s.key]);
                  const text = Number.isFinite(val)
                    ? s.formatValue
                      ? s.formatValue(val, row)
                      : String(val)
                    : "-";
                  return (
                    <td key={s.key} className="px-3 py-1.5 font-mono tabular-nums text-foreground">
                      {text}
                    </td>
                  );
                })}
                {errorKey ? (
                  <td className="px-3 py-1.5 font-mono tabular-nums text-foreground">
                    {Number(row[errorKey] ?? 0)}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
