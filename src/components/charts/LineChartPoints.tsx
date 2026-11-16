import type { RefObject } from "react";
import type { ChartPoint } from "./chartUtils";
import type { LineSeriesConfig } from "./LineChart";

interface SeriesPathEntry<T> {
  config: LineSeriesConfig<T>;
  points: ChartPoint[];
}

interface LineChartPointsProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  errorKey?: (keyof T & string) | undefined;
  primarySeries: LineSeriesConfig<T> | undefined;
  primaryPoints: ChartPoint[];
  seriesPaths: SeriesPathEntry<T>[];
  pointRefs: RefObject<(SVGCircleElement | null)[]>;
  hoverIdx: number | null;
  hoverX: number;
  padTop: number;
  plotH: number;
  expanded: boolean;
  formatXTick?: ((val: number | string) => string) | undefined;
  onFocusPoint: (idx: number) => void;
  onBlurPoint: (idx: number) => void;
  onPointKeyDown: (idx: number, e: React.KeyboardEvent<SVGCircleElement>) => void;
}

export function LineChartPoints<T extends Record<string, unknown>>({
  data,
  xKey,
  errorKey,
  primarySeries,
  primaryPoints,
  seriesPaths,
  pointRefs,
  hoverIdx,
  hoverX,
  padTop,
  plotH,
  expanded,
  formatXTick,
  onFocusPoint,
  onBlurPoint,
  onPointKeyDown,
}: LineChartPointsProps<T>) {
  const hoveredRow = hoverIdx !== null ? data[hoverIdx] : undefined;

  return (
    <>
      {primaryPoints.map((pt, i) => {
        const row = data[i];
        if (!row || !primarySeries) return null;
        const errCount = errorKey ? Number(row[errorKey] ?? 0) : 0;
        const xText = formatXTick
          ? formatXTick(row[xKey] as number | string)
          : String(row[xKey] ?? i + 1);
        const val = Number(row[primarySeries.key]);
        const valText = primarySeries.formatValue
          ? primarySeries.formatValue(val, row)
          : String(val);
        const ariaLabel = `${xText}: ${valText}${errCount > 0 ? `, ${errCount} error${errCount === 1 ? "" : "s"}` : ""}`;
        return (
          <circle
            key={`kb-${i}`}
            ref={(el) => {
              pointRefs.current[i] = el;
            }}
            cx={pt.x}
            cy={pt.y}
            r={errCount > 0 ? 4.5 : 5}
            fill={errCount > 0 ? "var(--color-destructive)" : "transparent"}
            stroke={errCount > 0 ? "var(--color-background)" : "none"}
            strokeWidth={errCount > 0 ? 1.5 : 0}
            tabIndex={0}
            role="button"
            aria-label={ariaLabel}
            onFocus={() => onFocusPoint(i)}
            onBlur={() => onBlurPoint(i)}
            onKeyDown={(e) => onPointKeyDown(i, e)}
            className="cursor-pointer focus:outline-none focus-visible:stroke-ring focus-visible:stroke-2"
          />
        );
      })}
      {hoverIdx !== null && hoveredRow ? (
        <g className="pointer-events-none">
          <line
            x1={hoverX}
            x2={hoverX}
            y1={padTop}
            y2={padTop + plotH}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="2 2"
            strokeOpacity={0.6}
          />
          {seriesPaths.map(({ config, points }) => {
            const pt = points[hoverIdx];
            if (!pt) return null;
            return (
              <circle
                key={`hover-${config.key}`}
                cx={pt.x}
                cy={pt.y}
                r={expanded ? 6 : 4.5}
                fill={config.color}
                stroke="var(--color-background)"
                strokeWidth={2}
              />
            );
          })}
        </g>
      ) : null}
    </>
  );
}
