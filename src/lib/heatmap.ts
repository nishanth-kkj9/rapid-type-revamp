/** Pure helpers that turn per-key mistake and speed maps into keyboard-heatmap data. */
import { keyFor } from "./keyboardLayout";
import type { KeySpeedMap } from "./keySpeed";

/**
 * Aggregate raw per-character mistakes onto physical base keys:
 * "?" -> "/", "A" -> "a", " " -> "Space". Invalid entries are dropped.
 * Characters that exist in the data but not on the layout are kept
 * (the heatmap render simply never shows them).
 */
export function aggregateKeyMistakes(mistakes: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [char, count] of Object.entries(mistakes)) {
    if (typeof char !== "string" || char.length !== 1) continue;
    if (!Number.isInteger(count) || count <= 0) continue;
    const { key } = keyFor(char);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + count;
  }
  return out;
}

/** 0 = no data; 1–4 = intensity quartiles relative to the worst key. */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!(count > 0) || !(max > 0)) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * Aggregate raw per-char speed entries onto physical base keys:
 * "?" -> "/", "A" -> "a", " " -> "Space". Sums and sample counts both
 * merge; invalid entries are dropped.
 */
export function aggregateKeySpeed(speed: KeySpeedMap): KeySpeedMap {
  const out: KeySpeedMap = {};
  for (const [char, entry] of Object.entries(speed)) {
    if (typeof char !== "string" || char.length !== 1) continue;
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [sum, count] = entry;
    if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) continue;
    const { key } = keyFor(char);
    if (!key) continue;
    const prev = out[key] ?? [0, 0];
    out[key] = [prev[0] + sum, prev[1] + count];
  }
  return out;
}

/** Average milliseconds per physical base key. */
export function averageMsByKey(speed: KeySpeedMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, [sum, count]] of Object.entries(aggregateKeySpeed(speed))) {
    if (count > 0) out[k] = sum / count;
  }
  return out;
}
