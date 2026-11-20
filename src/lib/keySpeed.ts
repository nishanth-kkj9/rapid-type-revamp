import { z } from "./zodSetup";
import type { Storage } from "./storage";

/**
 * Lifetime per-key speed statistics (drill mode), persisted across sessions.
 * Shape per raw character: [totalMs, samples] — sums merge without precision
 * loss; averages are derived at render time.
 */
export const KEY_SPEED_KEY = "ttp:keyspeed:v1";
const MAX_KEYS = 64;

/** Matches the pause cap used by the input handler's attribution rules. */
export const PAUSE_CAP_MS = 2000;

export type SpeedEntry = [number, number];
export type KeySpeedMap = Record<string, SpeedEntry>;

export const KeySpeedEntrySchema = z
  .tuple([z.number().int().min(0).max(1_000_000_000), z.number().int().min(1).max(1_000_000)])
  .refine(([ms, n]) => n <= ms);

export const KeySpeedSchema = z.record(z.string().length(1), KeySpeedEntrySchema);

export function sanitizeKeySpeed(raw: unknown): KeySpeedMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: KeySpeedMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === "string" && k.length === 1) {
      const parsed = KeySpeedEntrySchema.safeParse(v);
      if (parsed.success) {
        out[k] = parsed.data;
      }
    }
  }
  return out;
}

function mergeAndCapKeySpeed(existing: KeySpeedMap, run: KeySpeedMap): KeySpeedMap {
  const merged: KeySpeedMap = { ...existing };
  for (const [k, entry] of Object.entries(run)) {
    if (
      typeof k === "string" &&
      k.length === 1 &&
      Array.isArray(entry) &&
      entry.length === 2 &&
      Number.isInteger(entry[0]) &&
      Number.isInteger(entry[1]) &&
      entry[1] > 0 &&
      entry[0] >= entry[1]
    ) {
      const prev = merged[k] ?? [0, 0];
      merged[k] = [prev[0] + entry[0], prev[1] + entry[1]];
    }
  }
  const entries = Object.entries(merged)
    .sort((a, b) => b[1][1] - a[1][1])
    .slice(0, MAX_KEYS);
  return Object.fromEntries(entries);
}

export async function loadKeySpeedFromStorage(storage: Storage): Promise<KeySpeedMap> {
  try {
    const raw = await storage.get(KEY_SPEED_KEY);
    if (raw === null) return {};
    return sanitizeKeySpeed(raw);
  } catch {
    return {};
  }
}

export async function recordKeySpeedInStorage(
  storage: Storage,
  run: KeySpeedMap,
): Promise<KeySpeedMap> {
  const current = await loadKeySpeedFromStorage(storage);
  const capped = mergeAndCapKeySpeed(current, run);
  try {
    await storage.set(KEY_SPEED_KEY, capped);
  } catch {
    // non-fatal
  }
  return capped;
}

/** Average milliseconds for a raw character, or null with no samples. */
export function averageMs(map: KeySpeedMap, char: string): number | null {
  const entry = map[char];
  if (!entry || entry[1] <= 0) return null;
  return entry[0] / entry[1];
}

/** Slowest keys ordered by highest average latency descending. */
export function topSlowKeys(map: KeySpeedMap, limit = 8, minSamples = 3): string[] {
  const entries = Object.entries(map)
    .filter(([k, entry]) => k.trim().length === 1 && entry[1] >= minSamples)
    .map(([k, entry]) => ({ key: k.toLowerCase(), avg: entry[0] / entry[1] }));

  if (entries.length === 0 && minSamples > 1) {
    return topSlowKeys(map, limit, 1);
  }

  const bestByChar = new Map<string, number>();
  for (const item of entries) {
    const prev = bestByChar.get(item.key);
    if (prev === undefined || item.avg > prev) {
      bestByChar.set(item.key, item.avg);
    }
  }

  return Array.from(bestByChar.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
