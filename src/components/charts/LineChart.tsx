import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { buildMonotonePath, niceTicks, type ChartPoint } from "./chartUtils";
import { LineChartAxes } from "./LineChartAxes";
import { LineChartPoints } from "./LineChartPoints";
import { LineChartTable } from "./LineChartTable";
import { LineChartTooltip } from "./LineChartTooltip";

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
  errorKey?: (keyof T & string) | undefined;
  ariaCaption?: string | undefined;
  referenceLine?: { value: number; label: string; color?: string | undefined } | undefined;
  formatXTick?: ((val: number | string) => string) | undefined;
  formatTooltipTitle?: ((row: T) => string) | undefined;
  className?: string | undefined;
  expanded?: boolean | undefined;
}

export function SvgLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  xLabel,
  series,
  errorKey,
  ariaCaption,
  referenceLine,
  formatXTick,
  formatTooltipTitle,
  className = "",
  expanded = false,
}: SvgLineChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointRefs = useRef<(SVGCircleElement | null)[]>([]);
  const gradientId = useId();
  const [size, setSize] = useState({ width: 560, height: 180 });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

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
  }, [expanded, showTable]);

  const hasRightAxis = series.some((s) => s.axis === "right");
  const svgHeight = Math.max(120, size.height - 28);
  const pad = {
    top: 14,
    right: hasRightAxis ? 44 : 20,
    bottom: xLabel ? 32 : 24,
    left: expanded ? 48 : 42,
  };
  const plotW = Math.max(40, size.width - pad.left - pad.right);
  const plotH = Math.max(40, svgHeight - pad.top - pad.bottom);

  const { leftTicks, leftMin, leftMax } = useMemo(() => {
    const vals: number[] = [];
    for (const s of series) {
      if (s.axis === "right") continue;
      for (const row of data) {
        const v = Number(row[s.key]);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    if (referenceLine && Number.isFinite(referenceLine.value)) vals.push(referenceLine.value);
    const rawMin = vals.length ? Math.min(...vals) : 0;
    const rawMax = vals.length ? Math.max(...vals) : 100;
    const ticks = niceTicks(
      Math.max(0, Math.floor(rawMin * 0.85)),
      Math.max(Math.max(0, Math.floor(rawMin * 0.85)) + 10, Math.ceil(rawMax * 1.1)),
      expanded ? 5 : 4,
    );
    return { leftTicks: ticks, leftMin: ticks[0] ?? 0, leftMax: ticks[ticks.length - 1] ?? 100 };
  }, [data, series, referenceLine, expanded]);

  const xPos = useCallback(
    (index: number) =>
      data.length <= 1 ? pad.left + plotW / 2 : pad.left + (index / (data.length - 1)) * plotW,
    [data.length, pad.left, plotW],
  );
  const yPosLeft = useCallback(
    (val: number) => pad.top + plotH - ((val - leftMin) / (leftMax - leftMin || 1)) * plotH,
    [leftMax, leftMin, pad.top, plotH],
  );
  const yPosRight = useCallback(
    (val: number) => pad.top + plotH - (Math.max(0, Math.min(100, val)) / 100) * plotH,
    [pad.top, plotH],
  );

  const seriesPaths = useMemo(
    () =>
      series.map((s) => {
        const yFn = s.axis === "right" ? yPosRight : yPosLeft;
        const pts: ChartPoint[] = [];
        for (let i = 0; i < data.length; i++) {
          const raw = Number(data[i]?.[s.key]);
          if (Number.isFinite(raw)) pts.push({ x: xPos(i), y: yFn(raw) });
        }
        const linePath = buildMonotonePath(pts);
        const areaPath =
          s.fillArea && pts.length >= 2
            ? `${linePath} L ${pts[pts.length - 1]!.x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${pts[0]!.x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`
            : "";
        return { config: s, points: pts, linePath, areaPath };
      }),
    [data, series, xPos, yPosLeft, yPosRight, pad.top, plotH],
  );

  const xTickIndices = useMemo(() => {
    if (data.length <= 5) return data.map((_, i) => i);
    const maxLabels = expanded ? 9 : 5;
    const step = Math.ceil((data.length - 1) / (maxLabels - 1));
    const indices: number[] = [];
    for (let i = 0; i < data.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== data.length - 1) indices.push(data.length - 1);
    return indices;
  }, [data, expanded]);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    if (data.length === 1) return setHoverIdx(0);
    const relX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const clampedX = Math.max(pad.left, Math.min(pad.left + plotW, relX));
    const idx = Math.round(((clampedX - pad.left) / (plotW || 1)) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const handlePointKeyDown = (idx: number, e: React.KeyboardEvent<SVGCircleElement>) => {
    if (e.key === "ArrowRight" && idx + 1 < data.length) {
      e.preventDefault();
      pointRefs.current[idx + 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx - 1 >= 0) {
      e.preventDefault();
      pointRefs.current[idx - 1]?.focus();
    }
  };

  const hoveredRow = hoverIdx !== null ? data[hoverIdx] : undefined;
  const hoverX = hoverIdx !== null ? xPos(hoverIdx) : 0;
  const fontSize = 13;
  const primaryPoints = seriesPaths[0]?.points ?? [];
  const primarySeries = series[0];

  return (
    <div ref={containerRef} className={`relative h-full w-full select-none ${className}`}>
      {data.length > 0 ? (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            aria-pressed={showTable}
            onClick={(e) => {
              e.stopPropagation();
              setShowTable((v) => !v);
            }}
            className="cursor-pointer rounded border border-border bg-secondary px-2 py-0.5 text-[13px] text-foreground transition-colors hover:border-primary"
          >
            {showTable ? "Show chart" : "Data table"}
          </button>
        </div>
      ) : null}

      {!showTable ? (
        <div className="relative h-[calc(100%-1.75rem)] w-full">
          <svg
            width={size.width}
            height={svgHeight}
            viewBox={`0 0 ${size.width} ${svgHeight}`}
            className="block h-full w-full overflow-visible"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIdx(null)}
            role="img"
            aria-label={
              ariaCaption ?? (xLabel ? `Line chart over ${xLabel}` : "Performance line chart")
            }
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={primarySeries?.color ?? "var(--color-primary)"}
                  stopOpacity="0.22"
                />
                <stop
                  offset="100%"
                  stopColor={primarySeries?.color ?? "var(--color-primary)"}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <LineChartAxes
              data={data}
              xKey={xKey}
              xLabel={xLabel}
              leftTicks={leftTicks}
              hasRightAxis={hasRightAxis}
              xTickIndices={xTickIndices}
              pad={pad}
              plotW={plotW}
              plotH={plotH}
              width={size.width}
              height={svgHeight}
              fontSize={fontSize}
              referenceLine={referenceLine}
              xPos={xPos}
              yPosLeft={yPosLeft}
              yPosRight={yPosRight}
              formatXTick={formatXTick}
            />
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
            <LineChartPoints
              data={data}
              xKey={xKey}
              errorKey={errorKey}
              primarySeries={primarySeries}
              primaryPoints={primaryPoints}
              seriesPaths={seriesPaths}
              pointRefs={pointRefs}
              hoverIdx={hoverIdx}
              hoverX={hoverX}
              padTop={pad.top}
              plotH={plotH}
              expanded={expanded}
              formatXTick={formatXTick}
              onFocusPoint={(i) => setHoverIdx(i)}
              onBlurPoint={(i) => setHoverIdx((curr) => (curr === i ? null : curr))}
              onPointKeyDown={handlePointKeyDown}
            />
          </svg>
          {hoverIdx !== null && hoveredRow ? (
            <LineChartTooltip
              row={hoveredRow}
              hoverIdx={hoverIdx}
              hoverX={hoverX}
              width={size.width}
              xKey={xKey}
              series={series}
              errorKey={errorKey}
              formatTooltipTitle={formatTooltipTitle}
            />
          ) : null}
        </div>
      ) : null}
      <LineChartTable
        caption={ariaCaption ?? "Chart data"}
        data={data}
        xKey={xKey}
        series={series}
        errorKey={errorKey}
        formatXTick={formatXTick}
        visible={showTable}
      />
    </div>
  );
}
