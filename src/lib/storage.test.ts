// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  IndexedDbStorage,
  MemoryStorage,
  migrateLegacyLocalStorage,
  type Storage,
} from "./storage";
import { hydrateAppFromStorage } from "./appHydration";
import {
  HISTORY_INDEX_KEY,
  HISTORY_STORAGE_KEY,
  RUN_KEY_PREFIX,
  importHistoryToStorage,
  loadHistoryFromStorage,
  restoreHistoryToStorage,
  saveRunToStorage,
} from "./typingStats";

describe("storage adapters & migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips values through IndexedDbStorage", async () => {
    const db = new IndexedDbStorage();
    await db.set("test:key:1", { count: 42, items: ["a", "b"] });
    expect(await db.get("test:key:1")).toEqual({ count: 42, items: ["a", "b"] });
    const listed = await db.list("test:key:");
    expect(listed).toContain("test:key:1");
    await db.delete("test:key:1");
    expect(await db.get("test:key:1")).toBeNull();
  });

  it("migrates legacy ttp:* localStorage keys on first load and removes old keys after success", async () => {
    const sampleRun = {
      id: "run-1",
      date: 1700000000000,
      difficulty: "medium",
      mode: "30s",
      wpm: 72,
      rawWpm: 74,
      adjustedWpm: 70,
      accuracy: 97,
      correct: 180,
      incorrect: 5,
      typed: 185,
      elapsed: 30,
      consistency: 88,
    };

    const shooterRun = {
      ...sampleRun,
      id: "run-shooter-1",
      mode: "shooter",
      score: 1500,
    };

    window.localStorage.setItem("ttp:history:v1", JSON.stringify([sampleRun, shooterRun]));
    window.localStorage.setItem("ttp:keystats:v1", JSON.stringify({ q: 3 }));
    window.localStorage.setItem("ttp:keyspeed:v1", JSON.stringify({ q: [400, 2] }));
    window.localStorage.setItem(
      "ttp:achievements:v1",
      JSON.stringify({ unlocked: { first_run: 1 }, counters: {} }),
    );
    window.localStorage.setItem(
      "ttp:daily:v1",
      JSON.stringify({ date: "2026-11-15", runsToday: 2, streak: 3 }),
    );
    window.localStorage.setItem("ttp:missed-words:v1", JSON.stringify(["rhythm"]));
    window.localStorage.setItem(
      "ttp:drill:settings:v1",
      JSON.stringify({ difficulty: "hard", duration: 60 }),
    );
    window.localStorage.setItem(
      "ttp:shooter:settings:v1",
      JSON.stringify({ difficulty: "easy", startingLives: 5 }),
    );
    window.localStorage.setItem("ttp:uiprefs:v1", JSON.stringify({ themeAccent: "cyan" }));
    window.localStorage.setItem("ttp:theme:v1", "light");
    window.localStorage.setItem("ttp:shooter:best:v1", "9999");
    window.localStorage.setItem("ttp:onboarded:v1", "1");
    window.localStorage.setItem("ttp:best:samples:v1:30s", JSON.stringify([5, 11, 18]));

    const mem = new MemoryStorage();
    const report = await migrateLegacyLocalStorage(mem, window.localStorage);

    expect(report.failed).toEqual([]);
    expect(report.migrated.length).toBeGreaterThanOrEqual(13);
    expect(window.localStorage.getItem("ttp:history:v1")).toBeNull();
    expect(window.localStorage.getItem("ttp:best:samples:v1:30s")).toBeNull();
    // Pre-paint boot keys remain until ttp:boot:v1 has been written
    expect(window.localStorage.getItem("ttp:theme:v1")).toBe("light");
    expect(window.localStorage.getItem("ttp:uiprefs:v1")).toBeTruthy();

    window.localStorage.setItem("ttp:boot:v1", JSON.stringify({ theme: "light" }));
    const secondReport = await migrateLegacyLocalStorage(mem, window.localStorage);
    expect(secondReport.removed).toContain("ttp:theme:v1");
    expect(secondReport.removed).toContain("ttp:uiprefs:v1");
    expect(window.localStorage.getItem("ttp:theme:v1")).toBeNull();
    expect(window.localStorage.getItem("ttp:uiprefs:v1")).toBeNull();

    const hydrated = await hydrateAppFromStorage(mem);
    expect(hydrated.history).toHaveLength(2);
    expect(hydrated.history.find((h) => h.id === "run-1")?.wpm).toBe(72);
    expect(hydrated.allTimeKeys["q"]).toBe(3);
    expect(hydrated.drillSettings.difficulty).toBe("hard");
    expect(hydrated.drillSettings.duration).toBe(60);
    expect(hydrated.shooterSettings.difficulty).toBe("easy");
    expect(hydrated.uiPrefs.themeAccent).toBe("cyan");
    expect(hydrated.theme).toBe("light");
    expect(hydrated.shooterBest).toBe(1500);
    expect(hydrated.onboarded).toBe(true);
    // Legacy ttp:history:v1 array is automatically migrated to ttp:run:<id> + ttp:history:index:v1
    expect(await mem.get(HISTORY_STORAGE_KEY)).toBeNull();
    expect(await mem.list(RUN_KEY_PREFIX)).toHaveLength(2);
    expect(await mem.get(HISTORY_INDEX_KEY)).toHaveLength(2);
  });

  it("retains legacy localStorage keys if any write fails", async () => {
    window.localStorage.setItem("ttp:theme:v1", "light");
    const failingStorage: Storage = {
      async get() {
        return null;
      },
      async set() {
        throw new Error("disk error");
      },
      async delete() {},
      async list() {
        return [];
      },
    };

    const report = await migrateLegacyLocalStorage(failingStorage, window.localStorage);
    expect(report.failed).toContain("ttp:theme:v1");
    expect(window.localStorage.getItem("ttp:theme:v1")).toBe("light");
  });

  it("handles corrupt storage entries gracefully with Zod defaults and supports schema v1 import without 100-run cap", async () => {
    const mem = new MemoryStorage();
    await mem.set("ttp:history:v1", [{ bad: true }]);
    await mem.set("ttp:drill:settings:v1", { difficulty: "impossible", duration: 999 });
    await mem.set("ttp:theme:v1", "neon");

    const hydrated = await hydrateAppFromStorage(mem);
    expect(hydrated.history).toEqual([]);
    expect(hydrated.drillSettings.difficulty).toBe("medium");
    expect(hydrated.drillSettings.duration).toBe(30);

    // Import schema v1 payload with > 100 entries (no cap)
    const manyEntries = Array.from({ length: 120 }, (_, i) => ({
      id: `id-${i}`,
      date: 1700000000000 + i,
      difficulty: "medium",
      mode: "30s",
      wpm: 60,
      rawWpm: 62,
      adjustedWpm: 58,
      accuracy: 96,
      correct: 150,
      incorrect: 5,
      typed: 155,
      elapsed: 30,
      consistency: 90,
    }));
    const res = await importHistoryToStorage(
      mem,
      JSON.stringify({ schemaVersion: 1, exportedAt: Date.now(), entries: manyEntries }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.list).toHaveLength(120);
    }

    await saveRunToStorage(mem, {
      ...manyEntries[0]!,
      id: "id-121",
      date: 1700000000999,
    });
    expect(await loadHistoryFromStorage(mem)).toHaveLength(121);
  });

  it("saves a new run into a 5,000-run IndexedDB history in under 100ms", async () => {
    const db = new IndexedDbStorage();
    const initialRuns = Array.from({ length: 5000 }, (_, i) => ({
      id: `bench-${i}`,
      date: 1700000000000 + i,
      difficulty: "medium",
      mode: "30s",
      wpm: 70 + (i % 20),
      rawWpm: 72,
      adjustedWpm: 68,
      accuracy: 96.5,
      correct: 175,
      incorrect: 5,
      typed: 180,
      elapsed: 30,
      consistency: 90,
    }));
    await restoreHistoryToStorage(db, initialRuns);
    const loaded = await loadHistoryFromStorage(db);
    expect(loaded).toHaveLength(5000);

    const t0 = performance.now();
    const res = await saveRunToStorage(
      db,
      {
        id: "bench-new-5001",
        date: 1700009999999,
        difficulty: "medium",
        mode: "30s",
        wpm: 88,
        rawWpm: 90,
        adjustedWpm: 87,
        accuracy: 98.5,
        correct: 220,
        incorrect: 3,
        typed: 223,
        elapsed: 30,
        consistency: 94,
      },
      loaded,
    );
    const elapsedMs = performance.now() - t0;

    expect(res.ok).toBe(true);
    expect(res.list).toHaveLength(5001);
    expect(elapsedMs).toBeLessThan(100);
    expect(await db.get(`${RUN_KEY_PREFIX}bench-new-5001`)).toMatchObject({ wpm: 88 });
    expect(await db.get(HISTORY_INDEX_KEY)).toHaveLength(5001);
  });
});
