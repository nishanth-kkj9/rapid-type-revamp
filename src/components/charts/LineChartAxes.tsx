interface LineChartAxesProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  xLabel?: string | undefined;
  leftTicks: number[];
  hasRightAxis: boolean;
  xTickIndices: number[];
  pad: { top: number; right: number; bottom: number; left: number };
  plotW: number;
  plotH: number;
  width: number;
  height: number;
  fontSize: number;
  referenceLine?: { value: number; label: string; color?: string | undefined } | undefined;
  xPos: (index: number) => number;
  yPosLeft: (val: number) => number;
  yPosRight: (val: number) => number;
  formatXTick?: ((val: number | string) => string) | undefined;
}

const RIGHT_TICKS = [0, 25, 50, 75, 100];

export function LineChartAxes<T extends Record<string, unknown>>({
  data,
  xKey,
  xLabel,
  leftTicks,
  hasRightAxis,
  xTickIndices,
  pad,
  plotW,
  plotH,
  height,
  fontSize,
  referenceLine,
  xPos,
  yPosLeft,
  yPosRight,
  formatXTick,
}: LineChartAxesProps<T>) {
  const refY = referenceLine ? yPosLeft(referenceLine.value) : null;

  return (
    <>
      {leftTicks.map((tick) => {
        const y = yPosLeft(tick);
        return (
          <g key={`l-${tick}`}>
            <line
              x1={pad.left}
              x2={pad.left + plotW}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              strokeOpacity={0.45}
            />
            <text
              x={pad.left - 6}
              y={y + 3}
              textAnchor="end"
              fill="var(--color-muted-foreground)"
              fontSize={fontSize}
              className="font-mono"
            >
              {tick}
            </text>
          </g>
        );
      })}
      {hasRightAxis &&
        RIGHT_TICKS.map((tick) => (
          <text
            key={`r-${tick}`}
            x={pad.left + plotW + 6}
            y={yPosRight(tick) + 3}
            textAnchor="start"
            fill="var(--color-muted-foreground)"
            fontSize={fontSize}
            className="font-mono"
          >
            {tick}%
          </text>
        ))}
      <line
        x1={pad.left}
        x2={pad.left + plotW}
        y1={pad.top + plotH}
        y2={pad.top + plotH}
        stroke="var(--color-border)"
        strokeOpacity={0.8}
      />
      {xTickIndices.map((idx) => {
        const row = data[idx];
        if (!row) return null;
        const label = formatXTick
          ? formatXTick(row[xKey] as number | string)
          : String(row[xKey] ?? idx + 1);
        return (
          <text
            key={`x-${idx}`}
            x={xPos(idx)}
            y={pad.top + plotH + 14}
            textAnchor="middle"
            fill="var(--color-muted-foreground)"
            fontSize={fontSize}
            className="font-mono"
          >
            {label}
          </text>
        );
      })}
      {xLabel ? (
        <text
          x={pad.left + plotW}
          y={height - 2}
          textAnchor="end"
          fill="var(--color-muted-foreground)"
          fontSize={fontSize - 1}
          opacity={0.85}
        >
          {xLabel}
        </text>
      ) : null}
      {referenceLine && refY !== null && refY >= pad.top && refY <= pad.top + plotH ? (
        <g>
          <line
            x1={pad.left}
            x2={pad.left + plotW}
            y1={refY}
            y2={refY}
            stroke={referenceLine.color ?? "var(--color-primary)"}
            strokeDasharray="4 4"
            strokeOpacity={0.8}
          />
          <text
            x={pad.left + plotW - 4}
            y={refY - 5}
            textAnchor="end"
            fill="var(--color-muted-foreground)"
            fontSize={fontSize}
            className="font-mono"
          >
            {referenceLine.label}
          </text>
        </g>
      ) : null}
    </>
  );
}
