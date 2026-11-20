import { describe, expect, it } from "vitest";
import { MemoryStorage } from "./storage";
import { exportAllAppDataFromStorage, importAllAppDataToStorage, clearAllAppData } from "./backup";
import {
  MAX_IMPORT_RUNS,
  saveRunToStorage,
  loadBestSamplesFromStorage,
  saveBestSamplesToStorage,
  type HistoryEntry,
} from "./typingStats";
import { recordKeyMistakesInStorage, recordKeyBigramsInStorage } from "./keyStats";
import { recordKeySpeedInStorage } from "./keySpeed";
import { saveAchievementsToStorage } from "./achievements";
import { saveDailyToStorage } from "./daily";
import { saveMissedWordRecordsToStorage } from "./missedWords";
import { saveCustomTextsToStorage } from "./customTexts";
import { saveDrillSettingsToStorage } from "./drillSettings";
import { saveShooterSettingsToStorage } from "./shooterSettings";
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

const shooterSampleEntry: HistoryEntry = {
  ...sampleEntry,
  id: "run-shooter-backup-1",
  date: 1730000001000,
  mode: "shooter",
  score: 4200,
  wordsDestroyed: 35,
  level: 5,
};

describe("Backup v2 & full deletion", () => {
  it("exports everything, wipes all data permanently, then restores every domain from backup", async () => {
    const storage = new MemoryStorage();

    await saveRunToStorage(storage, sampleEntry);
    await saveRunToStorage(storage, shooterSampleEntry);
    await recordKeyMistakesInStorage(storage, { q: 5, x: 3 });
    await recordKeyBigramsInStorage(storage, { qu: 4 });
    await recordKeySpeedInStorage(storage, { q: [900, 3] });
    await saveAchievementsToStorage(storage, {
      unlocked: { "first-run": "2026-11-14T10:00:00.000Z" },
      counters: { focusRuns: 3 },
    });
    await saveDailyToStorage(storage, {
      lastDate: "2026-11-15",
      streak: 5,
      longestStreak: 5,
      runsToday: 2,
      activeSecondsToday: 240,
      goalMetToday: false,
      lastGoalMetDate: "2026-11-14",
      previousGoalMetDate: "2026-11-13",
      goalType: "minutes",
      goalTarget: 5,
      freezeEnabled: true,
      lastFreezeUsedDate: null,
    });
    await saveMissedWordRecordsToStorage(storage, [
      { word: "rhythm", cleanStreak: 1, lastSeenAt: 1730000000000 },
    ]);
    await saveCustomTextsToStorage(storage, [
      { id: "ct-1", name: "Warmup", text: "alpha beta gamma", createdAt: 100, updatedAt: 200 },
    ]);
    await saveDrillSettingsToStorage(storage, {
      difficulty: "hard",
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
    await saveShooterSettingsToStorage(storage, {
      difficulty: "hard",
      speedMultiplier: 1.5,
      startingLives: 5,
      soundEnabled: false,
      showKeyboard: true,
      practiceMode: false,
      dailyChallenge: false,
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
    expect(exported.history).toHaveLength(2);
    expect(exported.allTimeKeys["q"]).toBe(5);
    expect(exported.allTimeBigrams["qu"]).toBe(4);
    expect(exported.allTimeSpeed["q"]).toEqual([900, 3]);
    expect(exported.achievements.unlocked["first-run"]).toBeTruthy();
    expect(exported.daily?.streak).toBe(5);
    expect(exported.missedWordRecords[0]?.word).toBe("rhythm");
    expect(exported.customTexts[0]?.name).toBe("Warmup");
    expect(exported.drillSettings.targetWpm).toBe(85);
    expect(exported.shooterBest).toBe(4200);
    expect(exported.learn?.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
    expect(exported.learn?.targetWpm).toBe(45);

    const backupJson = JSON.stringify(exported);

    // 2. Delete all data
    const cleared = await clearAllAppData(storage);
    expect(cleared.history).toEqual([]);
    expect(cleared.allTimeKeys).toEqual({});
    expect(cleared.achievements.unlocked).toEqual({});
    expect(cleared.daily).toBeNull();
    expect(cleared.missedWordRecords).toEqual([]);
    expect(cleared.customTexts).toEqual([]);

    const rehydratedEmpty = await hydrateAppFromStorage(storage);
    expect(rehydratedEmpty.history).toEqual([]);
    expect(rehydratedEmpty.allTimeKeys).toEqual({});
    expect(rehydratedEmpty.allTimeSpeed).toEqual({});
    expect(rehydratedEmpty.daily).toBeNull();
    expect(rehydratedEmpty.shooterBest).toBe(0);
    expect(rehydratedEmpty.learn.unlocked).toEqual(["e", "t", "a", "o", "i", "n"]);
    expect(rehydratedEmpty.learn.lessons).toBe(0);
    expect(await loadBestSamplesFromStorage(storage, "25w", "hard")).toBeUndefined();

    // 3. Import backup -> restores everything
    const restoredRes = await importAllAppDataToStorage(storage, backupJson);
    expect(restoredRes.ok).toBe(true);
    if (!restoredRes.ok) return;
    expect(restoredRes.scope).toBe("full");
    expect(restoredRes.state.history).toHaveLength(2);
    expect(restoredRes.state.history.find((h) => h.id === "run-backup-1")?.errorSeconds).toEqual([
      4.2, 11.8,
    ]);
    expect(restoredRes.state.allTimeKeys["q"]).toBe(5);
    expect(restoredRes.state.allTimeBigrams["qu"]).toBe(4);
    expect(restoredRes.state.allTimeSpeed["q"]).toEqual([900, 3]);
    expect(restoredRes.state.achievements.unlocked["first-run"]).toBeTruthy();
    expect(restoredRes.state.daily?.streak).toBe(5);
    expect(restoredRes.state.missedWords).toContain("rhythm");
    expect(restoredRes.state.customTexts[0]?.name).toBe("Warmup");
    expect(restoredRes.state.drillSettings.targetWpm).toBe(85);
    expect(restoredRes.state.shooterSettings.startingLives).toBe(5);
    expect(restoredRes.state.theme).toBe("light");
    expect(restoredRes.state.shooterBest).toBe(4200);
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
});
