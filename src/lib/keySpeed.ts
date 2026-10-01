/**
 * Lifetime per-key speed statistics (drill mode), persisted across sessions.
 * Shape per raw character: [totalMs, samples] — sums merge without precision
 * loss; averages are derived at render time. Attribution rules live in the
 * drill input handler; this module only stores, merges, caps and queries.
 */
export const KEY_SPEED_KEY = "ttp:keyspeed:v1";
const MAX_KEYS = 64;

/** Matches the pause cap used by the input handler's attribution rules. */
export const PAUSE_CAP_MS = 2000;

export type SpeedEntry = [number, number];
export type KeySpeedMap = Record<string, SpeedEntry>;

function sanitize(raw: unknown): KeySpeedMap {
  if (!raw || typeof raw !== "object") return {};
  const out: KeySpeedMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof k === "string" &&
      k.length === 1 &&
      Array.isArray(v) &&
      v.length === 2 &&
      Number.isInteger(v[0]) &&
      (v[0] as number) >= 0 &&
      (v[0] as number) <= 1_000_000_000 &&
      Number.isInteger(v[1]) &&
      (v[1] as number) > 0 &&
      (v[1] as number) <= 1_000_000 &&
      (v[1] as number) <= (v[0] as number)
    ) {
      out[k] = [v[0] as number, v[1] as number];
    }
  }
  return out;
}

export function loadKeySpeed(): KeySpeedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_SPEED_KEY);
    if (!raw) return {};
    return sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Merge one run's [sumMs, count] map into the persisted stats. Returns the new map. */
export function recordKeySpeed(run: KeySpeedMap): KeySpeedMap {
  const merged = loadKeySpeed();
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
  // Cap: keep the 64 most-sampled keys.
  const entries = Object.entries(merged)
    .sort((a, b) => b[1][1] - a[1][1])
    .slice(0, MAX_KEYS);
  const capped: KeySpeedMap = Object.fromEntries(entries);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY_SPEED_KEY, JSON.stringify(capped));
    } catch {
      // quota-safe: speed stats are non-critical, drop the write
    }
  }
  return capped;
}

export function clearKeySpeed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_SPEED_KEY);
  } catch {
    // ignore
  }
}

/** Average milliseconds for a raw character, or null with no samples. */
export function averageMs(map: KeySpeedMap, char: string): number | null {
  const entry = map[char];
  if (!entry || entry[1] <= 0) return null;
  return entry[0] / entry[1];
}
