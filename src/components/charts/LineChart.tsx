import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface LineSeriesConfig<T> {
  key: keyof T & string;
  label: string;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  axis?: "left" | "right";
  showDots?: boolean;
  fillArea?: boolean;
  formatValue?: (val: number, row: T) => string;
}

export interface SvgLineChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  xLabel?: string | undefined;
  series: LineSeriesConfig<T>[];
  referenceLine?:
    | {
        value: number;
        label: string;
        color?: string | undefined;
      }
    | undefined;
  formatXTick?: ((val: number | string) => string) | undefined;
  formatTooltipTitle?: ((row: T) => string) | undefined;
  className?: string | undefined;
  expanded?: boolean | undefined;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Fritsch-Carlson monotone cubic spline SVG path so curves stay smooth without overshooting.
 */
function buildMonotonePath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  if (points.length === 2) {
    const [p0, p1] = points as [Point, Point];
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const n = points.length;
  const dxs: number[] = [];
  const dys: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1]!.x - points[i]!.x;
    const dy = points[i + 1]!.y - points[i]!.y;
    dxs.push(dx);
    dys.push(dy);
    slopes.push(dx !== 0 ? dy / dx : 0);
  }

  const tangents: number[] = [slopes[0]!];
  for (let i = 1; i < n - 1; i++) {
    const m0 = slopes[i - 1]!;
    const m1 = slopes[i]!;
    if (m0 * m1 <= 0) {
      tangents.push(0);
    } else {
      const dx0 = dxs[i - 1]!;
      const dx1 = dxs[i]!;
      const common = dx0 + dx1;
      tangents.push((3 * common) / ((common + dx1) / m0 + (common + dx0) / m1));
    }
  }
  tangents.push(slopes[n - 2]!);

  let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const dx = dxs[i]!;
    const cp1x = p0.x + dx / 3;
    const cp1y = p0.y + (tangents[i]! * dx) / 3;
    const cp2x = p1.x - dx / 3;
    const cp2y = p1.y - (tangents[i + 1]! * dx) / 3;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

function niceTicks(minVal: number, maxVal: number, count = 4): number[] {
  if (maxVal <= minVal) {
    const base = Math.max(0, Math.floor(minVal));
    return [base, base + 10];
  }
  const range = maxVal - minVal;
  const rawStep = range / Math.max(1, count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step = mag;
  if (norm > 5) step = 10 * mag;
  else if (norm > 2) step = 5 * mag;
  else if (norm > 1) step = 2 * mag;

  const start = Math.max(0, Math.floor(minVal / step) * step);
  const end = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 0.001; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  if (ticks.length < 2) ticks.push(start + step);
  return ticks;
}

export function SvgLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  xLabel,
  series,
  referenceLine,
  formatXTick,
  formatTooltipTitle,
  className = "",
  expanded = false,
}: SvgLineChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  const [size, setSize] = useState({ width: 560, height: 180 });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  const hasRightAxis = series.some((s) => s.axis === "right");
  const pad = {
    top: 14,
    right: hasRightAxis ? 36 : 16,
    bottom: xLabel ? 28 : 22,
    left: expanded ? 42 : 36,
  };
  const plotW = Math.max(40, size.width - pad.left - pad.right);
  const plotH = Math.max(40, size.height - pad.top - pad.bottom);

  const { leftTicks, leftMin, leftMax } = useMemo(() => {
    const vals: number[] = [];
    for (const s of series) {
      if (s.axis === "right") continue;
      for (const row of data) {
        const v = Number(row[s.key]);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    if (referenceLine && Number.isFinite(referenceLine.value)) {
      vals.push(referenceLine.value);
    }
    const rawMin = vals.length ? Math.min(...vals) : 0;
    const rawMax = vals.length ? Math.max(...vals) : 100;
    const domainMin = Math.max(0, Math.floor(rawMin * 0.85));
    const domainMax = Math.max(domainMin + 10, Math.ceil(rawMax * 1.1));
    const ticks = niceTicks(domainMin, domainMax, expanded ? 5 : 4);
    return {
      leftTicks: ticks,
      leftMin: ticks[0] ?? 0,
      leftMax: ticks[ticks.length - 1] ?? 100,
    };
  }, [data, series, referenceLine, expanded]);

  const rightTicks = [0, 25, 50, 75, 100];

  const xPos = (index: number) => {
    if (data.length <= 1) return pad.left + plotW / 2;
    return pad.left + (index / (data.length - 1)) * plotW;
  };

  const yPosLeft = (val: number) => {
    const span = leftMax - leftMin || 1;
    const ratio = (val - leftMin) / span;
    return pad.top + plotH - ratio * plotH;
  };

  const yPosRight = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return pad.top + plotH - (clamped / 100) * plotH;
  };

  const seriesPaths = useMemo(() => {
    return series.map((s) => {
      const yFn = s.axis === "right" ? yPosRight : yPosLeft;
      const pts: Point[] = [];
      for (let i = 0; i < data.length; i++) {
        const raw = Number(data[i]?.[s.key]);
        if (Number.isFinite(raw)) {
          pts.push({ x: xPos(i), y: yFn(raw) });
        }
      }
      const linePath = buildMonotonePath(pts);
      const areaPath =
        s.fillArea && pts.length >= 2
          ? `${linePath} L ${pts[pts.length - 1]!.x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${pts[0]!.x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`
          : "";
      return { config: s, points: pts, linePath, areaPath };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, series, size.width, size.height, leftMin, leftMax]);

  const xTickIndices = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length <= 6) return data.map((_, i) => i);
    const maxLabels = expanded ? 10 : 6;
    const step = Math.ceil((data.length - 1) / (maxLabels - 1));
    const indices: number[] = [];
    for (let i = 0; i < data.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== data.length - 1) {
      indices.push(data.length - 1);
    }
    return indices;
  }, [data, expanded]);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    if (data.length === 1) {
      setHoverIdx(0);
      return;
    }
    const clampedX = Math.max(pad.left, Math.min(pad.left + plotW, relX));
    const ratio = (clampedX - pad.left) / (plotW || 1);
    const idx = Math.round(ratio * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hoveredRow = hoverIdx !== null ? data[hoverIdx] : undefined;
  const hoverX = hoverIdx !== null ? xPos(hoverIdx) : 0;
  const refY = referenceLine ? yPosLeft(referenceLine.value) : null;
  const fontSize = expanded ? 11 : 10;

  return (
    <div ref={containerRef} className={`relative h-full w-full select-none ${className}`}>
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        className="block h-full w-full overflow-visible"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIdx(null)}
        role="img"
        aria-label={xLabel ? `Line chart over ${xLabel}` : "Performance line chart"}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={series[0]?.color ?? "var(--color-primary)"}
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor={series[0]?.color ?? "var(--color-primary)"}
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Left Y Ticks */}
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

        {/* Right Y Axis Ticks (e.g. Accuracy %) */}
        {hasRightAxis &&
          rightTicks.map((tick) => {
            const y = yPosRight(tick);
            return (
              <text
                key={`r-${tick}`}
                x={pad.left + plotW + 6}
                y={y + 3}
                textAnchor="start"
                fill="var(--color-muted-foreground)"
                fontSize={fontSize}
                className="font-mono"
              >
                {tick}%
              </text>
            );
          })}

        {/* X Axis Baseline & Ticks */}
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
          const rawX = row[xKey];
          const label = formatXTick
            ? formatXTick(rawX as number | string)
            : String(rawX ?? idx + 1);
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
            y={size.height - 2}
            textAnchor="end"
            fill="var(--color-muted-foreground)"
            fontSize={fontSize - 1}
            opacity={0.85}
          >
            {xLabel}
          </text>
        ) : null}

        {/* Optional Target Reference Line */}
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

        {/* Area Fills & Series Lines */}
        {seriesPaths.map(({ config, points, linePath, areaPath }) => (
          <g key={config.key}>
            {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke={config.color}
                strokeWidth={config.strokeWidth ?? (expanded ? 2.8 : 2)}
                strokeDasharray={config.dashed ? "5 4" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {config.showDots &&
              points.map((pt, i) => (
                <circle
                  key={`${config.key}-dot-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={expanded ? 3 : 2}
                  fill={config.color}
                />
              ))}
          </g>
        ))}

        {/* Hover Crosshair & Active Dots */}
        {hoverIdx !== null && hoveredRow ? (
          <g className="pointer-events-none">
            <line
              x1={hoverX}
              x2={hoverX}
              y1={pad.top}
              y2={pad.top + plotH}
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
      </svg>

      {/* Floating Hover Tooltip */}
      {hoverIdx !== null && hoveredRow ? (
        <div
          className="pointer-events-none absolute top-2 z-20 min-w-[130px] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
          style={{
            left:
              hoverX > size.width * 0.58
                ? undefined
                : `${Math.min(hoverX + 12, size.width - 145)}px`,
            right:
              hoverX > size.width * 0.58 ? `${Math.max(8, size.width - hoverX + 12)}px` : undefined,
          }}
        >
          <div className="mb-1 font-mono text-[11px] font-semibold text-foreground">
            {formatTooltipTitle
              ? formatTooltipTitle(hoveredRow)
              : String(hoveredRow[xKey] ?? hoverIdx + 1)}
          </div>
          <div className="space-y-0.5">
            {series.map((s) => {
              const raw = Number(hoveredRow[s.key]);
              if (!Number.isFinite(raw)) return null;
              const formatted = s.formatValue ? s.formatValue(raw, hoveredRow) : String(raw);
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
