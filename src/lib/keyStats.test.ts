import { describe, expect, it } from "vitest";
import {
  KEY_STATS_KEY,
  loadKeyStatsFromStorage,
  pickWeakKeyPassage,
  recordKeyMistakesInStorage,
  sanitizeKeyBigrams,
  sanitizeKeyStats,
  topWeakBigrams,
  topWeakKeys,
} from "./keyStats";
import { MemoryStorage } from "./storage";

describe("keyStats", () => {
  it("returns empty stats when storage is empty", async () => {
    const storage = new MemoryStorage();
    expect(await loadKeyStatsFromStorage(storage)).toEqual({});
  });

  it("merges mistake maps and accumulates across calls", async () => {
    const storage = new MemoryStorage();
    await recordKeyMistakesInStorage(storage, { a: 2, b: 1 });
    const merged = await recordKeyMistakesInStorage(storage, { a: 1, c: 3 });
    expect(merged).toEqual({ a: 3, b: 1, c: 3 });
    expect(await loadKeyStatsFromStorage(storage)).toEqual({ a: 3, b: 1, c: 3 });
  });

  it("ignores invalid mistake entries (multi-char keys, bad counts)", async () => {
    const storage = new MemoryStorage();
    const merged = await recordKeyMistakesInStorage(storage, {
      abc: 5,
      x: -1,
      y: 1.5,
      z: 0,
      q: 2,
    });
    expect(merged).toEqual({ q: 2 });
  });

  it("caps stored keys at 64, keeping the highest counts", async () => {
    const storage = new MemoryStorage();
    const flood: Record<string, number> = {};
    for (let i = 0; i < 80; i++) flood[String.fromCharCode(33 + i)] = i + 1;
    const merged = await recordKeyMistakesInStorage(storage, flood);
    expect(Object.keys(merged).length).toBe(64);
    const counts = Object.values(merged);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(17); // top 64 of 1..80
  });

  it("sanitizes corrupted stored stats on load", async () => {
    const storage = new MemoryStorage();
    await storage.set(KEY_STATS_KEY, { ab: 3, c: "many", d: -2, e: 4 });
    expect(await loadKeyStatsFromStorage(storage)).toEqual({ e: 4 });
    expect(sanitizeKeyStats({ ab: 3, c: "many", d: -2, e: 4 })).toEqual({ e: 4 });
  });

  it("falls back to empty on malformed storage payload and keeps recording", async () => {
    const storage = new MemoryStorage();
    await storage.set(KEY_STATS_KEY, "{broken");
    expect(await loadKeyStatsFromStorage(storage)).toEqual({});
    expect(await recordKeyMistakesInStorage(storage, { k: 1 })).toEqual({ k: 1 });
  });

  it("topWeakKeys sorts worst-first and respects the limit", () => {
    expect(topWeakKeys({ a: 1, b: 5, c: 3 }, 2)).toEqual(["b", "c"]);
  });

  it("sanitizes bigrams and picks passages rich in weak bigrams", () => {
    const clean = sanitizeKeyBigrams({ th: 4, qu: 2, a: 1, TH: 3, "12": 5, io: -1 });
    expect(clean).toEqual({ th: 4, qu: 2 });
    expect(topWeakBigrams(clean, 2)).toEqual(["th", "qu"]);

    const cands = ["simple calm line", "quiet thoughtful thread", "plain words"];
    expect(pickWeakKeyPassage(cands, ["q"], ["th", "qu"])).toBe("quiet thoughtful thread");
  });

  it("pickWeakKeyPassage picks the candidate richest in weak keys; ties keep the first", () => {
    const cands = ["hello world", "zealous zebras zigzag", "plain text here"];
    expect(pickWeakKeyPassage(cands, ["z"])).toBe("zealous zebras zigzag");
    expect(pickWeakKeyPassage(cands, ["q"])).toBe("hello world"); // all zero -> first
    expect(pickWeakKeyPassage(cands, [])).toBe("hello world"); // empty weak list
    expect(pickWeakKeyPassage([], ["a"])).toBe(""); // no candidates
  });
});
