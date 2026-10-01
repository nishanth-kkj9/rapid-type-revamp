/** Pure helpers that turn per-key mistake maps into keyboard-heatmap data. */
import { keyFor } from "./keyboardLayout";

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
