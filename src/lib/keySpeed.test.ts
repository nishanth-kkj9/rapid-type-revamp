import { describe, expect, it } from "vitest";
import {
  KEY_SPEED_KEY,
  averageMs,
  loadKeySpeedFromStorage,
  recordKeySpeedInStorage,
  topSlowKeys,
  type KeySpeedMap,
} from "./keySpeed";
import { aggregateKeySpeed, averageMsByKey } from "./heatmap";
import { MemoryStorage } from "./storage";

describe("keySpeed", () => {
  it("returns empty map when storage is empty", async () => {
    const storage = new MemoryStorage();
    expect(await loadKeySpeedFromStorage(storage)).toEqual({});
  });

  it("sanitizes corrupted shapes: wrong tuples, negative, count>sum, multi-char keys", async () => {
    const storage = new MemoryStorage();
    await storage.set(KEY_SPEED_KEY, {
      a: [300, 2],
      b: [10, 20],
      c: [-5, 1],
      d: [100],
      e: [100, 2, 3],
      ab: [100, 2],
      f: ["fast", 2],
      g: 7,
    });
    expect(await loadKeySpeedFromStorage(storage)).toEqual({ a: [300, 2] });
  });

  it("record + load round-trip merges sums and counts additively", async () => {
    const storage = new MemoryStorage();
    const run1: KeySpeedMap = { a: [100, 2], "?": [400, 1] };
    const run2: KeySpeedMap = { a: [50, 1] };
    await recordKeySpeedInStorage(storage, run1);
    const merged = await recordKeySpeedInStorage(storage, run2);
    expect(merged["a"]).toEqual([150, 3]);
    expect(merged["?"]).toEqual([400, 1]);
    expect((await loadKeySpeedFromStorage(storage))["a"]).toEqual([150, 3]);
  });

  it("record drops malformed run entries and ignores empty input", async () => {
    const storage = new MemoryStorage();
    // a: count > sum (physically impossible avg < 1ms) -> dropped;
    // c: zero count -> dropped; ab: multi-char key -> dropped.
    const out = await recordKeySpeedInStorage(storage, {
      a: [5, 10],
      b: [50, 1],
      ab: [5, 5],
      c: [0, 0],
    });
    expect(out).toEqual({ b: [50, 1] });
    expect(await recordKeySpeedInStorage(storage, {})).toEqual({ b: [50, 1] });
  });

  it("caps storage at the 64 most-sampled keys", async () => {
    const storage = new MemoryStorage();
    // 70 distinct single-char keys (codepoints 33..102), sample counts 1..70.
    const chars = Array.from({ length: 70 }, (_, i) => String.fromCharCode(33 + i));
    const wide: KeySpeedMap = {};
    chars.forEach((ch, i) => {
      wide[ch] = [(i + 1) * 10, i + 1];
    });
    const out = await recordKeySpeedInStorage(storage, wide);
    expect(Object.keys(out).length).toBe(64);
    // The six lowest-sampled keys (counts 1..6) must have been dropped.
    expect(out[chars[0]!]).toBeUndefined();
    expect(out[chars[5]!]).toBeUndefined();
    expect(out[chars[6]!]).toEqual([70, 7]);
    expect(out[chars[69]!]).toEqual([700, 70]);
  });

  it("averageMs derives the mean and returns null for missing chars", async () => {
    const storage = new MemoryStorage();
    await recordKeySpeedInStorage(storage, { a: [310, 2] });
    const loaded = await loadKeySpeedFromStorage(storage);
    expect(averageMs(loaded, "a")).toBe(155);
    expect(averageMs(loaded, "z")).toBeNull();
  });

  it("aggregateKeySpeed maps shifted/uppercase/space onto base keys and merges", () => {
    const out = aggregateKeySpeed({
      "?": [200, 1],
      "/": [100, 1],
      A: [300, 2],
      a: [100, 1],
      " ": [500, 5],
    });
    expect(out["/"]).toEqual([300, 2]);
    expect(out["a"]).toEqual([400, 3]);
    expect(out["Space"]).toEqual([500, 5]);
  });

  it("aggregateKeySpeed drops invalid entries; averageMsByKey derives means", () => {
    const out = averageMsByKey({ a: [310, 2], b: [90, 1], ab: [1, 1], c: [10, 0] });
    expect(out).toEqual({ a: 155, b: 90 });
  });

  it("topSlowKeys orders slowest keys first", () => {
    const slow = topSlowKeys({ a: [300, 3], q: [1200, 4], z: [900, 3], " ": [500, 5] }, 2);
    expect(slow).toEqual(["q", "z"]);
  });
});
