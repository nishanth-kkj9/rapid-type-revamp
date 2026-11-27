import { describe, expect, it } from "vitest";
import {
  computeStats,
  toDeltas,
  HistoryEntrySchema,
  formatModeLabel,
  clampMonotonicSamples,
  computeRollingWpmSeries,
  getPersonalBestWpm,
  getModeHistory,
  computeHistoryProgressSeries,
  computePersonalBestsTable,
  computeSameTypeTrend,
  deleteRunFromStorage,
  filterVisibleHistory,
  loadHistoryFromStorage,
  saveRunToStorage,
  importHistoryToStorage,
  clearHistoryInStorage,
  parseImportHistoryResult,
  MAX_IMPORT_RUNS,
  HISTORY_INDEX_KEY,
  HISTORY_STORAGE_KEY,
  RUN_KEY_PREFIX,
  type HistoryEntry,
} from "./typingStats";
import { MemoryStorage } from "./storage";

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "a",
  date: 1,
  difficulty: "easy",
  mode: "30",
  wpm: 50,
  rawWpm: 55,
  adjustedWpm: 45,
  accuracy: 90,
  correct: 100,
  incorrect: 10,
  typed: 110,
  elapsed: 30,
  consistency: 80,
  ...over,
});

describe("computeStats", () => {
  it("computes wpm and accuracy over a minute", () => {
    const s = computeStats(50, 5, 60000, []);
    expect(s.wpm).toBe(10);
    expect(s.accuracy).toBe(Math.round((50 / 55) * 1000) / 10);
  });

  it("computes keystroke-level accuracy and exposes uncorrected errors separately", () => {
    const s = computeStats(100, 0, 60000, [], {
      keystrokesCorrect: 100,
      keystrokesIncorrect: 25,
      uncorrectedErrors: 0,
    });
    expect(s.wpm).toBe(20);
    expect(s.accuracy).toBe(80);
    expect(s.incorrect).toBe(25);
    expect(s.uncorrectedErrors).toBe(0);
    expect(s.adjustedWpm).toBe(20);
  });

  it("clamps sub-second elapsed time", () => {
    const s = computeStats(0, 0, 500, []);
    expect(s.wpm).toBe(0);
    expect(Number.isFinite(s.rawWpm)).toBe(true);
  });

  it("keeps consistency within 0..100", () => {
    const s = computeStats(10, 0, 60000, [2, 5, 8]);
    expect(s.consistency).toBeGreaterThanOrEqual(0);
    expect(s.consistency).toBeLessThanOrEqual(100);
  });
});

describe("toDeltas & rolling WPM", () => {
  it("converts cumulative counts to deltas", () => {
    expect(toDeltas([])).toEqual([]);
    expect(toDeltas([3])).toEqual([3]);
    expect(toDeltas([3, 7, 12])).toEqual([3, 4, 5]);
  });

  it("clamps monotonic samples and computes rolling 5s WPM series", () => {
    expect(clampMonotonicSamples([5, 3, 8, 6])).toEqual([5, 5, 8, 8]);
    // Steady 5 chars/sec = 60 WPM across a partial 2.5s final tail
    expect(computeRollingWpmSeries([5, 10, 12.5], 2.5)).toEqual([60, 60, 60]);
  });
});

describe("formatModeLabel & scoped PB", () => {
  it("formats drill and learn labels consistently", () => {
    expect(formatModeLabel("30")).toBe("30s");
    expect(formatModeLabel("30s")).toBe("30s");
    expect(formatModeLabel("25w")).toBe("25 words");
    expect(formatModeLabel("quote")).toBe("Quote");
    expect(formatModeLabel("learn")).toBe("Learn");
  });

  it("scopes personal bests by test type and difficulty (ignoring difficulty for quote)", () => {
    const history = [
      entry({ id: "1", mode: "30s", difficulty: "easy", wpm: 95 }),
      entry({ id: "2", mode: "30s", difficulty: "hard", wpm: 62 }),
      entry({ id: "3", mode: "25w", difficulty: "hard", wpm: 80 }),
      entry({ id: "4", mode: "quote", difficulty: "easy", wpm: 77 }),
    ];
    expect(getPersonalBestWpm(history, "30s", "hard")).toBe(62);
    expect(getPersonalBestWpm(history, "30s", "easy")).toBe(95);
    expect(getPersonalBestWpm(history, "25w", "hard")).toBe(80);
    expect(getPersonalBestWpm(history, "quote", "hard")).toBe(77);
  });

  it("excludes repeated and learn runs from personal bests and persists strict/repeated metadata", async () => {
    const history = [
      entry({ id: "1", mode: "30s", difficulty: "medium", wpm: 72 }),
      entry({ id: "2", mode: "30s", difficulty: "medium", wpm: 125, repeated: true }),
      entry({ id: "3", mode: "25w", difficulty: "medium", wpm: 110, repeated: true }),
      entry({ id: "4", mode: "learn", difficulty: "medium", wpm: 140 }),
      entry({ id: "5", mode: "learn-home-row", difficulty: "easy", wpm: 130 }),
    ];
    expect(getPersonalBestWpm(history, "30s", "medium")).toBe(72);
    expect(getPersonalBestWpm(history, "25w", "medium")).toBe(0);
    expect(getPersonalBestWpm(history, "learn", "medium")).toBe(0);

    const pbTable = computePersonalBestsTable(history);
    expect(pbTable).toHaveLength(1);
    expect(pbTable[0]?.bestWpm).toBe(72);

    const storage = new MemoryStorage();
    await saveRunToStorage(storage, entry({ id: "strict-rep", strict: "word", repeated: true }));
    const loaded = await loadHistoryFromStorage(storage);
    expect(loaded[0]?.strict).toBe("word");
    expect(loaded[0]?.repeated).toBe(true);
  });
});

describe("history storage", () => {
  it("round-trips a saved run through Storage", async () => {
    const storage = new MemoryStorage();
    const { ok } = await saveRunToStorage(storage, entry());
    expect(ok).toBe(true);
    expect(await loadHistoryFromStorage(storage)).toHaveLength(1);
  });

  it("rejects malformed, out-of-bounds, and oversized imports with explicit reasons", async () => {
    const storage = new MemoryStorage();
    expect(await importHistoryToStorage(storage, "not json")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await importHistoryToStorage(storage, JSON.stringify([{ id: "x", date: 1 }]))).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await importHistoryToStorage(storage, JSON.stringify([entry({ wpm: 9999 })]))).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await importHistoryToStorage(storage, JSON.stringify([entry({ accuracy: 120 })])),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await importHistoryToStorage(storage, JSON.stringify([entry({ accuracy: -5 })])),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(await importHistoryToStorage(storage, JSON.stringify([entry({ date: -1 })]))).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await importHistoryToStorage(storage, JSON.stringify([entry({ correct: 1.5 })])),
    ).toEqual({ ok: false, reason: "invalid" });

    expect(MAX_IMPORT_RUNS).toBe(20000);
    const overLimit = Array.from({ length: MAX_IMPORT_RUNS + 1 }, (_, i) =>
      entry({ id: `over-${i}`, date: 1700000000000 + i }),
    );
    expect(parseImportHistoryResult(JSON.stringify(overLimit))).toEqual({
      ok: false,
      reason: "too-many-runs",
    });
    expect(await importHistoryToStorage(storage, JSON.stringify(overLimit))).toEqual({
      ok: false,
      reason: "too-many-runs",
    });
  });

  it("merges imports by id without duplicating", async () => {
    const storage = new MemoryStorage();
    await saveRunToStorage(storage, entry());
    const merged = await importHistoryToStorage(
      storage,
      JSON.stringify([entry({ wpm: 70 }), entry({ id: "b", date: 2 })]),
    );
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.list).toHaveLength(2);
      expect(merged.list.find((e) => e.id === "a")!.wpm).toBe(70);
    }
  });

  it("clears history", async () => {
    const storage = new MemoryStorage();
    await saveRunToStorage(storage, entry());
    expect(await storage.list(RUN_KEY_PREFIX)).toEqual([`${RUN_KEY_PREFIX}a`]);
    expect(await clearHistoryInStorage(storage)).toEqual([]);
    expect(await loadHistoryFromStorage(storage)).toEqual([]);
    expect(await storage.get(HISTORY_STORAGE_KEY)).toBeNull();
    expect(await storage.get(HISTORY_INDEX_KEY)).toBeNull();
    expect(await storage.list(RUN_KEY_PREFIX)).toEqual([]);
  });

  it("migrates legacy monolithic ttp:history:v1 into ttp:run:<id> and ttp:history:index:v1", async () => {
    const storage = new MemoryStorage();
    await storage.set(HISTORY_STORAGE_KEY, [entry({ id: "leg-1", date: 100 })]);
    const loaded = await loadHistoryFromStorage(storage);
    expect(loaded.map((r) => r.id)).toEqual(["leg-1"]);
    expect(await storage.get(HISTORY_STORAGE_KEY)).toBeNull();
    expect(await storage.get(`${RUN_KEY_PREFIX}leg-1`)).toMatchObject({ id: "leg-1" });
    expect(await storage.get(HISTORY_INDEX_KEY)).toEqual([{ id: "leg-1", date: 100 }]);
  });

  it("accepts legacy entries without a mode field (defaults to 30s)", () => {
    const legacy = {
      id: "legacy-1",
      date: 1700000000000,
      difficulty: "medium",
      wpm: 55.2,
      accuracy: 96.1,
      correct: 140,
      incorrect: 6,
      typed: 146,
      elapsed: 30,
      consistency: 88.4,
    };
    const parsed = HistoryEntrySchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.mode).toBe("30");
  });

  it("preserves legacy mode 'shooter' entries on disk without showing them and clears drill-only view safely", async () => {
    const storage = new MemoryStorage();
    const drill = entry({ id: "drill-1", mode: "30", date: 10 });
    const legacyHidden = entry({ id: "legacy-shooter-1", mode: "shooter", date: 20 });
    await saveRunToStorage(storage, drill);
    await saveRunToStorage(storage, legacyHidden);

    const loaded = await loadHistoryFromStorage(storage);
    expect(loaded).toHaveLength(2);
    expect(filterVisibleHistory(loaded).map((e) => e.id)).toEqual(["drill-1"]);

    // Clearing Practice view deletes visible runs while leaving legacy shooter entry on disk
    const afterDrillClear = await clearHistoryInStorage(storage, "drill");
    expect(afterDrillClear.map((e) => e.id)).toEqual(["legacy-shooter-1"]);
    expect(filterVisibleHistory(afterDrillClear)).toEqual([]);

    // Full clear removes everything
    const afterAllClear = await clearHistoryInStorage(storage, "all");
    expect(afterAllClear).toEqual([]);
    expect(await loadHistoryFromStorage(storage)).toEqual([]);
  });
});

describe("History v2 analytics & single-run deletion", () => {
  it("computes chronological progress series with 7-run moving average", () => {
    const runs = [10, 20, 30, 40, 50, 60, 70, 80].map((wpm, i) =>
      entry({ id: `p-${i}`, date: 1000 + i * 1000, wpm, mode: "30s" }),
    );
    const series = computeHistoryProgressSeries([...runs].reverse(), 7);
    expect(series).toHaveLength(8);
    expect(series[0]?.wpm).toBe(10);
    expect(series[0]?.movingAvgWpm).toBe(10);
    // 7th run moving avg of [10,20,30,40,50,60,70] = 40
    expect(series[6]?.movingAvgWpm).toBe(40);
    // 8th run moving avg of [20,30,40,50,60,70,80] = 50
    expect(series[7]?.movingAvgWpm).toBe(50);
  });

  it("never mixes test types or difficulties when computing trend", () => {
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) =>
        entry({ id: `e-${i}`, date: 1000 + i, mode: "15s", difficulty: "easy", wpm: 40 }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        entry({ id: `h-${i}`, date: 2000 + i, mode: "30s", difficulty: "hard", wpm: 90 }),
      ),
    ];

    expect(computeSameTypeTrend(mixed, "all", "all")).toBeNull();

    const sameTypeAndDiff = [
      ...Array.from({ length: 5 }, (_, i) =>
        entry({ id: `a-${i}`, date: 1000 + i, mode: "25w", difficulty: "medium", wpm: 50 }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        entry({ id: `b-${i}`, date: 2000 + i, mode: "25w", difficulty: "medium", wpm: 60 }),
      ),
      entry({ id: "q-1", date: 3000, mode: "quote", difficulty: "medium", wpm: 140 }),
    ];

    const trend = computeSameTypeTrend(sameTypeAndDiff, "25w", "medium");
    expect(trend).not.toBeNull();
    expect(trend!.earlierAvgWpm).toBe(50);
    expect(trend!.recentAvgWpm).toBe(60);
    expect(trend!.deltaPercent).toBe(20);
  });

  it("filters 25 words and Quote runs and computes personal best table per test type", () => {
    const history = [
      entry({
        id: "w1",
        mode: "25w",
        difficulty: "medium",
        wpm: 71,
        accuracy: 96,
        punctuation: false,
        numbers: false,
      }),
      entry({
        id: "w2",
        mode: "25w",
        difficulty: "medium",
        wpm: 79,
        accuracy: 98,
        punctuation: true,
        numbers: true,
      }),
      entry({
        id: "q1",
        mode: "quote",
        difficulty: "hard",
        wpm: 64,
        accuracy: 99,
        quoteLength: "long",
      }),
      entry({ id: "l1", mode: "learn", difficulty: "easy", wpm: 120, accuracy: 95 }),
    ];
    expect(getModeHistory(history, "25w")).toHaveLength(2);
    expect(getModeHistory(history, "quote")).toHaveLength(1);

    const pbTable = computePersonalBestsTable(history);
    expect(pbTable).toHaveLength(2); // excludes learn
    expect(pbTable[0]?.modeLabel).toBe("25 words");
    expect(pbTable[0]?.bestWpm).toBe(79);
    expect(pbTable[0]?.runs).toBe(2);
    expect(pbTable[0]?.punctuation).toBe(true);
    expect(pbTable[0]?.numbers).toBe(true);
    expect(pbTable[1]?.modeLabel).toBe("Quote");
    expect(pbTable[1]?.quoteLength).toBe("long");
  });

  it("deletes a single run from storage cleanly", async () => {
    const storage = new MemoryStorage();
    await importHistoryToTest(storage);
    const { deleted, list } = await deleteRunFromStorage(storage, "del-1");
    expect(deleted?.id).toBe("del-1");
    expect(list.map((r) => r.id)).toEqual(["keep-2"]);
  });
});

async function importHistoryToTest(storage: MemoryStorage) {
  const { restoreHistoryToStorage } = await import("./typingStats");
  await restoreHistoryToStorage(storage, [
    entry({ id: "del-1", date: 100 }),
    entry({ id: "keep-2", date: 200 }),
  ]);
}
