import { z } from "zod";
import {
  ACHIEVEMENTS_KEY,
  EMPTY_ACHIEVEMENTS,
  sanitizeAchievements,
  saveAchievementsToStorage,
  type AchievementState,
} from "./achievements";
import {
  hydrateAppFromStorage,
  ONBOARDED_KEY,
  SHOOTER_BEST_KEY,
  type HydratedAppState,
} from "./appHydration";
import { removeBootPrefs } from "./bootPrefs";
import {
  CUSTOM_TEXTS_KEY,
  sanitizeCustomTexts,
  saveCustomTextsToStorage,
  type CustomTextEntry,
} from "./customTexts";
import {
  DAILY_STORAGE_KEY,
  DailyStateSchema,
  daysBetween,
  sanitizeDailyState,
  saveDailyToStorage,
  type DailyState,
} from "./daily";
import {
  DEFAULT_DRILL_SETTINGS,
  sanitizeDrillSettings,
  saveDrillSettingsToStorage,
  type DrillSettings,
} from "./drillSettings";
import {
  loadKeySpeedFromStorage,
  recordKeySpeedInStorage,
  sanitizeKeySpeed,
  type KeySpeedMap,
} from "./keySpeed";
import {
  KEY_BIGRAMS_KEY,
  KEY_STATS_KEY,
  recordKeyBigramsInStorage,
  recordKeyMistakesInStorage,
  sanitizeKeyBigrams,
  sanitizeKeyStats,
} from "./keyStats";
import {
  getActiveMissedWords,
  loadMissedWordRecordsFromStorage,
  MISSED_WORDS_KEY,
  sanitizeMissedWordRecords,
  saveMissedWordRecordsToStorage,
  type MissedWordRecord,
} from "./missedWords";
import {
  DEFAULT_SHOOTER_SETTINGS,
  sanitizeShooterSettings,
  saveShooterSettingsToStorage,
  type ShooterSettings,
} from "./shooterSettings";
import { LEGACY_EXACT_KEYS, LEGACY_SAMPLES_PREFIX, type Storage } from "./storage";
import {
  HISTORY_INDEX_KEY,
  HistoryEntrySchema,
  importHistoryToStorage,
  invalidateHistoryCache,
  MAX_IMPORT_RUNS,
  parseHistoryEntries,
  restoreHistoryToStorage,
  SamplesSchema,
  type HistoryEntry,
  type ImportFailureReason,
} from "./typingStats";
import { DEFAULT_UI_PREFS, sanitizeUiPrefs, saveUiPrefsToStorage, type UiPrefs } from "./uiPrefs";
import { getPreferredSystemTheme, saveThemeToStorage, ThemeSchema, type Theme } from "./useTheme";
import {
  createInitialLearnState,
  LEARN_STORAGE_KEY,
  mergeLearnStates,
  sanitizeLearnState,
  saveLearnToStorage,
  type LearnState,
} from "./learn";

export const APP_BACKUP_VERSION = 2;

export interface AppBackupPayloadV2 {
  schemaVersion: 2;
  exportedAt: number;
  history: HistoryEntry[];
  allTimeKeys: Record<string, number>;
  allTimeBigrams: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  achievements: AchievementState;
  daily: DailyState | null;
  missedWordRecords: MissedWordRecord[];
  customTexts: CustomTextEntry[];
  learn?: LearnState | undefined;
  drillSettings: DrillSettings;
  shooterSettings: ShooterSettings;
  uiPrefs: UiPrefs;
  theme: Theme;
  shooterBest: number;
  bestSamples?: Record<string, number[]> | undefined;
}

const BackupV2EnvelopeSchema = z.object({
  schemaVersion: z.literal(2),
  exportedAt: z.number().finite().min(0),
  history: z.array(HistoryEntrySchema).max(MAX_IMPORT_RUNS),
  allTimeKeys: z.record(z.string(), z.unknown()).optional(),
  allTimeBigrams: z.record(z.string(), z.unknown()).optional(),
  allTimeSpeed: z.record(z.string(), z.unknown()).optional(),
  achievements: z.unknown().optional(),
  daily: DailyStateSchema.nullable().optional(),
  missedWordRecords: z.array(z.unknown()).optional(),
  customTexts: z.array(z.unknown()).optional(),
  learn: z.unknown().optional(),
  drillSettings: z.unknown().optional(),
  shooterSettings: z.unknown().optional(),
  uiPrefs: z.unknown().optional(),
  theme: ThemeSchema.optional(),
  shooterBest: z.number().finite().min(0).optional(),
  bestSamples: z.record(z.string(), SamplesSchema).optional(),
});

export type BackupImportResult =
  | {
      ok: true;
      scope: "full" | "history-only";
      state: HydratedAppState;
    }
  | {
      ok: false;
      reason: ImportFailureReason;
    };

export async function exportAllAppDataFromStorage(storage: Storage): Promise<AppBackupPayloadV2> {
  const hydrated = await hydrateAppFromStorage(storage);
  const sampleKeys = await storage.list(LEGACY_SAMPLES_PREFIX);
  const bestSamples: Record<string, number[]> = {};
  for (const key of sampleKeys) {
    const raw = await storage.get(key);
    const parsed = SamplesSchema.safeParse(raw);
    if (parsed.success && parsed.data.length > 0) {
      bestSamples[key] = parsed.data;
    }
  }

  return {
    schemaVersion: 2,
    exportedAt: Date.now(),
    history: hydrated.history,
    allTimeKeys: hydrated.allTimeKeys,
    allTimeBigrams: hydrated.allTimeBigrams,
    allTimeSpeed: hydrated.allTimeSpeed,
    achievements: hydrated.achievements,
    daily: hydrated.daily,
    missedWordRecords: hydrated.missedWordRecords,
    customTexts: hydrated.customTexts,
    learn: hydrated.learn,
    drillSettings: hydrated.drillSettings,
    shooterSettings: hydrated.shooterSettings,
    uiPrefs: hydrated.uiPrefs,
    theme: hydrated.theme,
    shooterBest: hydrated.shooterBest,
    ...(Object.keys(bestSamples).length > 0 ? { bestSamples } : {}),
  };
}

function mergeAchievements(
  current: AchievementState,
  incoming: AchievementState,
): AchievementState {
  const unlocked: Record<string, string> = { ...current.unlocked };
  for (const [id, ts] of Object.entries(incoming.unlocked)) {
    if (!unlocked[id] || ts < unlocked[id]!) {
      unlocked[id] = ts;
    }
  }
  const counters: Record<string, number> = { ...current.counters };
  for (const [k, v] of Object.entries(incoming.counters)) {
    counters[k] = Math.max(counters[k] ?? 0, v);
  }
  return { unlocked, counters };
}

function mergeDaily(current: DailyState | null, incoming: DailyState | null): DailyState | null {
  if (!incoming) return current;
  if (!current) return incoming;
  const diff = daysBetween(current.lastDate, incoming.lastDate);
  if (diff > 0) {
    return {
      ...incoming,
      longestStreak: Math.max(current.longestStreak, incoming.longestStreak),
    };
  }
  if (diff < 0) {
    return {
      ...current,
      longestStreak: Math.max(current.longestStreak, incoming.longestStreak),
    };
  }
  return {
    ...current,
    streak: Math.max(current.streak, incoming.streak),
    longestStreak: Math.max(current.longestStreak, incoming.longestStreak),
    runsToday: Math.max(current.runsToday, incoming.runsToday),
    activeSecondsToday: Math.max(current.activeSecondsToday, incoming.activeSecondsToday),
    goalMetToday: current.goalMetToday || incoming.goalMetToday,
    lastGoalMetDate: current.lastGoalMetDate ?? incoming.lastGoalMetDate,
    lastFreezeUsedDate: current.lastFreezeUsedDate ?? incoming.lastFreezeUsedDate,
  };
}

function mergeMissedRecords(
  current: readonly MissedWordRecord[],
  incoming: readonly MissedWordRecord[],
): MissedWordRecord[] {
  const byWord = new Map<string, MissedWordRecord>();
  for (const rec of current) byWord.set(rec.word, rec);
  for (const rec of incoming) {
    const existing = byWord.get(rec.word);
    if (!existing || rec.lastSeenAt >= existing.lastSeenAt) {
      byWord.set(rec.word, rec);
    }
  }
  return sanitizeMissedWordRecords(
    Array.from(byWord.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt),
  );
}

function mergeCustomTexts(
  current: readonly CustomTextEntry[],
  incoming: readonly CustomTextEntry[],
): CustomTextEntry[] {
  const byId = new Map<string, CustomTextEntry>();
  for (const c of current) byId.set(c.id, c);
  for (const c of incoming) {
    const existing = byId.get(c.id);
    if (!existing || c.updatedAt >= existing.updatedAt) {
      byId.set(c.id, c);
    }
  }
  return sanitizeCustomTexts(Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt));
}

export async function importAllAppDataToStorage(
  storage: Storage,
  rawJson: string,
): Promise<BackupImportResult> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (
    parsedJson &&
    typeof parsedJson === "object" &&
    !Array.isArray(parsedJson) &&
    (parsedJson as { schemaVersion?: unknown }).schemaVersion === 2 &&
    Array.isArray((parsedJson as { history?: unknown }).history) &&
    (parsedJson as { history: unknown[] }).history.length > MAX_IMPORT_RUNS
  ) {
    return { ok: false, reason: "too-many-runs" };
  }

  const v2Check = BackupV2EnvelopeSchema.safeParse(parsedJson);
  if (!v2Check.success) {
    // Fall back gracefully to legacy v1 history import
    const legacyRes = await importHistoryToStorage(storage, rawJson);
    if (!legacyRes.ok) return { ok: false, reason: legacyRes.reason };
    await storage.set(ONBOARDED_KEY, "1");
    const state = await hydrateAppFromStorage(storage);
    return { ok: true, scope: "history-only", state };
  }

  const payload = v2Check.data;
  try {
    const current = await hydrateAppFromStorage(storage);

    const byId = new Map<string, HistoryEntry>();
    for (const h of current.history) byId.set(h.id, h);
    for (const h of parseHistoryEntries(payload.history)) byId.set(h.id, h);
    await restoreHistoryToStorage(storage, Array.from(byId.values()));

    const incomingKeys = sanitizeKeyStats(payload.allTimeKeys);
    if (Object.keys(incomingKeys).length > 0) {
      await recordKeyMistakesInStorage(storage, incomingKeys);
    }

    const incomingBigrams = sanitizeKeyBigrams(payload.allTimeBigrams);
    if (Object.keys(incomingBigrams).length > 0) {
      await recordKeyBigramsInStorage(storage, incomingBigrams);
    }

    const incomingSpeed = sanitizeKeySpeed(payload.allTimeSpeed);
    if (Object.keys(incomingSpeed).length > 0) {
      await recordKeySpeedInStorage(storage, incomingSpeed);
    }

    if (payload.achievements !== undefined) {
      const mergedAch = mergeAchievements(
        current.achievements,
        sanitizeAchievements(payload.achievements),
      );
      await saveAchievementsToStorage(storage, mergedAch);
    }

    if (payload.daily !== undefined) {
      const mergedDaily = mergeDaily(
        current.daily,
        payload.daily ? sanitizeDailyState(payload.daily) : null,
      );
      if (mergedDaily) {
        await saveDailyToStorage(storage, mergedDaily);
      }
    }

    if (payload.missedWordRecords !== undefined) {
      const existingRecs = await loadMissedWordRecordsFromStorage(storage);
      const mergedRecs = mergeMissedRecords(
        existingRecs,
        sanitizeMissedWordRecords(payload.missedWordRecords),
      );
      await saveMissedWordRecordsToStorage(storage, mergedRecs);
    }

    if (payload.customTexts !== undefined) {
      const mergedCustom = mergeCustomTexts(
        current.customTexts,
        sanitizeCustomTexts(payload.customTexts),
      );
      await saveCustomTextsToStorage(storage, mergedCustom);
    }

    if (payload.learn !== undefined) {
      const mergedLearn = mergeLearnStates(current.learn, sanitizeLearnState(payload.learn));
      await saveLearnToStorage(storage, mergedLearn);
    }

    if (payload.drillSettings !== undefined) {
      await saveDrillSettingsToStorage(storage, sanitizeDrillSettings(payload.drillSettings));
    }

    if (payload.shooterSettings !== undefined) {
      await saveShooterSettingsToStorage(storage, sanitizeShooterSettings(payload.shooterSettings));
    }

    if (payload.uiPrefs !== undefined) {
      await saveUiPrefsToStorage(storage, sanitizeUiPrefs(payload.uiPrefs));
    }

    if (payload.theme !== undefined) {
      await saveThemeToStorage(storage, payload.theme);
    }

    if (typeof payload.shooterBest === "number") {
      // shooterBest is now strictly derived from run history; remove any legacy standalone key
      await storage.delete(SHOOTER_BEST_KEY);
    }

    if (payload.bestSamples) {
      for (const [k, sampleArr] of Object.entries(payload.bestSamples)) {
        if (k.startsWith(LEGACY_SAMPLES_PREFIX) && sampleArr.length > 0) {
          await storage.set(k, sampleArr);
        }
      }
    }

    // Ensure keySpeed was reloaded cleanly if unused
    void loadKeySpeedFromStorage;

    await storage.set(ONBOARDED_KEY, "1");
    const nextState = await hydrateAppFromStorage(storage);
    return { ok: true, scope: "full", state: nextState };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export async function clearAllAppData(storage: Storage): Promise<HydratedAppState> {
  const keysToDelete = new Set<string>([
    ...LEGACY_EXACT_KEYS,
    HISTORY_INDEX_KEY,
    KEY_STATS_KEY,
    KEY_BIGRAMS_KEY,
    ACHIEVEMENTS_KEY,
    DAILY_STORAGE_KEY,
    MISSED_WORDS_KEY,
    CUSTOM_TEXTS_KEY,
    LEARN_STORAGE_KEY,
    SHOOTER_BEST_KEY,
    ONBOARDED_KEY,
  ]);

  try {
    const ttpKeys = await storage.list("ttp:");
    for (const key of ttpKeys) keysToDelete.add(key);
  } catch {
    // non-fatal
  }

  if (storage.deleteMany) {
    try {
      await storage.deleteMany(Array.from(keysToDelete));
    } catch {
      // fall through to individual deletes
    }
  } else {
    for (const key of keysToDelete) {
      try {
        await storage.delete(key);
      } catch {
        // continue deleting remaining keys
      }
    }
  }

  invalidateHistoryCache(storage);
  removeBootPrefs();
  if (typeof window !== "undefined") {
    try {
      const ls = window.localStorage;
      if (ls) {
        const lsKeys: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k && k.startsWith("ttp:")) lsKeys.push(k);
        }
        for (const k of lsKeys) {
          ls.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }

  const theme = getPreferredSystemTheme();
  return {
    history: [],
    drillSettings: { ...DEFAULT_DRILL_SETTINGS },
    shooterSettings: { ...DEFAULT_SHOOTER_SETTINGS },
    uiPrefs: { ...DEFAULT_UI_PREFS },
    theme,
    allTimeKeys: {},
    allTimeBigrams: {},
    allTimeSpeed: {},
    achievements: { ...EMPTY_ACHIEVEMENTS },
    daily: null,
    missedWordRecords: [],
    missedWords: getActiveMissedWords([]),
    customTexts: [],
    learn: createInitialLearnState(),
    shooterBest: 0,
    onboarded: true,
  };
}
