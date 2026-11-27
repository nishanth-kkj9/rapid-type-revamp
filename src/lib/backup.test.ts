import { describe, expect, it } from "vitest";
import { MemoryStorage } from "./storage";
import { exportAllAppDataFromStorage, importAllAppDataToStorage, clearAllAppData } from "./backup";
import {
  MAX_IMPORT_RUNS,
  saveRunToStorage,
  loadBestSamplesFromStorage,
  saveBestSamplesToStorage,
  filterVisibleHistory,
  type HistoryEntry,
} from "./typingStats";
import { recordKeyMistakesInStorage, recordKeyBigramsInStorage } from "./keyStats";
import { recordKeySpeedInStorage } from "./keySpeed";
import { saveDailyToStorage } from "./daily";
import { saveMissedWordRecordsToStorage } from "./missedWords";
import { saveCustomTextsToStorage } from "./customTexts";
import { saveDrillSettingsToStorage } from "./drillSettings";
import { saveThemeToStorage } from "./useTheme";
import { hydrateAppFromStorage } from "./appHydration";
import { saveLearnToStorage } from "./learn";

const sampleEntry: HistoryEntry = {
  id: "run-backup-1",
  date: 1730000000000,
  difficulty: "hard",
  mode: "25w",
  wpm: 74,
  rawWpm: 78,
  adjustedWpm: 72,
  accuracy: 96.5,
  correct: 120,
  incorrect: 4,
  typed: 124,
  elapsed: 19.5,
  consistency: 88,
  samples: [10, 22, 35, 50],
  errorSeconds: [4.2, 11.8],
};

describe("Backup v2 & full deletion", () => {
  it("exports everything, wipes all data permanently, then restores every domain from backup", async () => {
    const storage = new MemoryStorage();

    await saveRunToStorage(storage, sampleEntry);
    await recordKeyMistakesInStorage(storage, { q: 5, x: 3 });
    await recordKeyBigramsInStorage(storage, { qu: 4 });
    await recordKeySpeedInStorage(storage, { q: [900, 3] });
    await saveDailyToStorage(storage, {
      lastDate: "2026-11-15",
      streak: 5,
      longestStreak: 5,
      activeSecondsToday: 240,
      goalMetToday: false,
      lastGoalMetDate: "2026-11-14",
      previousGoalMetDate: "2026-11-13",
      goalTarget: 5,
    });
    await saveMissedWordRecordsToStorage(storage, [
      { word: "rhythm", cleanStreak: 1, lastSeenAt: 1730000000000 },
    ]);
    await saveCustomTextsToStorage(storage, [
      { id: "ct-1", name: "Warmup", text: "alpha beta gamma", createdAt: 100, updatedAt: 200 },
    ]);
    await saveDrillSettingsToStorage(storage, {
      wordList: "1000",
      duration: 60,
      sound: "beep",
      caretStyle: "block",
      targetWpm: 85,
      showLiveWpm: false,
      showKeyboard: true,
      focusWeakKeys: true,
      drillMode: "words",
      wordCount: 25,
    });
    await saveThemeToStorage(storage, "light");
    await saveBestSamplesToStorage(storage, "25w", [12, 24, 38], "hard");
    await saveLearnToStorage(storage, {
      unlocked: ["e", "t", "a", "o", "i", "n", "s"],
      perKey: { s: { emaMs: 250, hits: 32, errors: 1, recentAcc: 0.96 } },
      targetWpm: 45,
      lessons: 6,
      updatedAt: 1730000002000,
    });

    // 1. Export everything
    const exported = await exportAllAppDataFromStorage(storage);
    expect(exported.schemaVersion).toBe(2);
    expect(exported.history).toHaveLength(1);
    expect(exported.allTimeKeys["q"]).toBe(5);
    expect(exported.allTimeBigrams["qu"]).toBe(4);
    expect(exported.allTimeSpeed["q"]).toEqual([900, 3]);
    expect(exported.daily?.streak).toBe(5);
    expect(exported.missedWordRecords[0]?.word).toBe("rhythm");
    expect(exported.customTexts[0]?.name).toBe("Warmup");
    expect(exported.drillSettings.targetWpm).toBe(85);
    expect(exported.learn?.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
    expect(exported.learn?.targetWpm).toBe(45);

    const backupJson = JSON.stringify(exported);

    // 2. Delete all data
    const cleared = await clearAllAppData(storage);
    expect(cleared.history).toEqual([]);
    expect(cleared.allTimeKeys).toEqual({});
    expect(cleared.daily).toBeNull();
    expect(cleared.missedWordRecords).toEqual([]);
    expect(cleared.customTexts).toEqual([]);

    const rehydratedEmpty = await hydrateAppFromStorage(storage);
    expect(rehydratedEmpty.history).toEqual([]);
    expect(rehydratedEmpty.allTimeKeys).toEqual({});
    expect(rehydratedEmpty.allTimeSpeed).toEqual({});
    expect(rehydratedEmpty.daily).toBeNull();
    expect(rehydratedEmpty.learn.unlocked).toEqual(["e", "t", "a", "o", "i", "n"]);
    expect(rehydratedEmpty.learn.lessons).toBe(0);
    expect(await loadBestSamplesFromStorage(storage, "25w", "hard")).toBeUndefined();

    // 3. Import backup -> restores everything
    const restoredRes = await importAllAppDataToStorage(storage, backupJson);
    expect(restoredRes.ok).toBe(true);
    if (!restoredRes.ok) return;
    expect(restoredRes.scope).toBe("full");
    expect(restoredRes.state.history).toHaveLength(1);
    expect(restoredRes.state.history.find((h) => h.id === "run-backup-1")?.errorSeconds).toEqual([
      4.2, 11.8,
    ]);
    expect(restoredRes.state.allTimeKeys["q"]).toBe(5);
    expect(restoredRes.state.allTimeBigrams["qu"]).toBe(4);
    expect(restoredRes.state.allTimeSpeed["q"]).toEqual([900, 3]);
    expect(restoredRes.state.daily?.streak).toBe(5);
    expect(restoredRes.state.missedWords).toContain("rhythm");
    expect(restoredRes.state.customTexts[0]?.name).toBe("Warmup");
    expect(restoredRes.state.drillSettings.targetWpm).toBe(85);
    expect(restoredRes.state.theme).toBe("light");
    expect(restoredRes.state.learn.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
    expect(restoredRes.state.learn.targetWpm).toBe(45);
    expect(await loadBestSamplesFromStorage(storage, "25w", "hard")).toEqual([12, 24, 38]);
  });

  it("imports 12,000 runs cleanly and rejects >20,000 runs with too-many-runs", async () => {
    const storage = new MemoryStorage();
    const makeRuns = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        ...sampleEntry,
        id: `bulk-${i}`,
        date: 1730000000000 + i,
      }));

    const valid12k = JSON.stringify({
      schemaVersion: 2,
      exportedAt: 1730000000000,
      history: makeRuns(12000),
    });
    const ok12k = await importAllAppDataToStorage(storage, valid12k);
    expect(ok12k.ok).toBe(true);
    if (ok12k.ok) {
      expect(ok12k.scope).toBe("full");
      expect(ok12k.state.history).toHaveLength(12000);
    }

    const overV2 = JSON.stringify({
      schemaVersion: 2,
      exportedAt: 1730000000000,
      history: makeRuns(MAX_IMPORT_RUNS + 1),
    });
    expect(await importAllAppDataToStorage(storage, overV2)).toEqual({
      ok: false,
      reason: "too-many-runs",
    });

    const overV1 = JSON.stringify({
      schemaVersion: 1,
      exportedAt: 1730000000000,
      entries: makeRuns(MAX_IMPORT_RUNS + 1),
    });
    expect(await importAllAppDataToStorage(storage, overV1)).toEqual({
      ok: false,
      reason: "too-many-runs",
    });
  });

  it("remains compatible with schemaVersion 1 history exports and rejects corrupted data", async () => {
    const storage = new MemoryStorage();
    const v1Json = JSON.stringify({
      schemaVersion: 1,
      exportedAt: 1730000000000,
      entries: [sampleEntry],
    });
    const res = await importAllAppDataToStorage(storage, v1Json);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.scope).toBe("history-only");
      expect(res.state.history).toHaveLength(1);
    }

    const bad = await importAllAppDataToStorage(storage, "{not-valid-json");
    expect(bad).toEqual({ ok: false, reason: "invalid" });
  });

  it("imports old-format v2 backup containing removed shooter data and achievements without error", async () => {
    const storage = new MemoryStorage();
    // Simulate leftover legacy IndexedDB keys from earlier versions
    await storage.set("ttp:shooter:settings:v1", { difficulty: "hard", startingLives: 5 });
    await storage.set("ttp:shooter:best:v1", 4200);
    await storage.set("ttp:achievements:v1", {
      unlocked: { "first-run": "2026-11-14T10:00:00.000Z" },
      counters: {},
    });

    const oldFormatV2 = JSON.stringify({
      schemaVersion: 2,
      exportedAt: 1730000000000,
      history: [
        sampleEntry,
        {
          ...sampleEntry,
          id: "run-shooter-legacy",
          date: 1730000001000,
          mode: "shooter",
          score: 4200,
          wordsDestroyed: 35,
          wordsSpawned: 38,
          hitRate: 92,
          maxStreak: 14,
          strayKeys: 2,
          bossesDefeated: 1,
          practiceMode: false,
          dailyChallengeDate: "2026-11-14",
          level: 5,
        },
      ],
      achievements: {
        unlocked: {
          "first-run": "2026-11-14T10:00:00.000Z",
          "boss-slayer": "2026-11-14T10:05:00.000Z",
        },
        counters: { wordsDestroyed: 35, bossesDefeated: 1 },
      },
      shooterSettings: {
        difficulty: "hard",
        speedMultiplier: 1.5,
        startingLives: 5,
        soundEnabled: false,
        showKeyboard: true,
        practiceMode: false,
        dailyChallenge: false,
      },
      shooterBest: 4200,
      daily: {
        lastDate: "2026-11-14",
        streak: 5,
        longestStreak: 7,
        runsToday: 3,
        activeSecondsToday: 120,
        goalMetToday: true,
        lastGoalMetDate: "2026-11-14",
        goalType: "runs",
        goalTarget: 3,
        freezeEnabled: true,
        lastFreezeUsedDate: "2026-11-12",
      },
      drillSettings: {
        difficulty: "hard",
        textStyle: "sentences",
        duration: 45,
      },
      uiPrefs: { heatmapMetric: "speed", themeAccent: "violet", dyslexiaFont: true },
    });

    const res = await importAllAppDataToStorage(storage, oldFormatV2);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.scope).toBe("full");
    expect(res.state.drillSettings.wordList).toBe("1000");
    expect(res.state.drillSettings.duration).toBe(45);
    expect(res.state.uiPrefs).toEqual({
      heatmapMetric: "speed",
      dyslexiaFont: true,
      learnPromptDismissed: false,
    });
    expect(res.state.daily?.goalTarget).toBe(5);
    expect(res.state.daily?.streak).toBe(5);
    // Legacy achievements key already on disk is left untouched on import
    expect(await storage.get("ttp:achievements:v1")).toBeTruthy();
    // Legacy shooter run is preserved on disk, hidden by filterVisibleHistory
    expect(res.state.history.some((h) => h.id === "run-shooter-legacy")).toBe(true);
    expect(filterVisibleHistory(res.state.history).map((h) => h.id)).toEqual(["run-backup-1"]);

    // Delete all data still clears every ttp:* key including leftover legacy keys
    await clearAllAppData(storage);
    expect(await storage.list("ttp:")).toEqual([]);
  });
});
