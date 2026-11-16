export interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Fritsch-Carlson monotone cubic spline SVG path so curves stay smooth without overshooting.
 */
export function buildMonotonePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  if (points.length === 2) {
    const [p0, p1] = points as [ChartPoint, ChartPoint];
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

export function niceTicks(minVal: number, maxVal: number, count = 4): number[] {
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
