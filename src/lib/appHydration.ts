import { z } from "./zodSetup";
import { migrateLegacyLocalStorage, type Storage } from "./storage";
import { getShooterBestScore, loadHistoryFromStorage, type HistoryEntry } from "./typingStats";
import { loadDrillSettingsFromStorage, type DrillSettings } from "./drillSettings";
import { loadShooterSettingsFromStorage, type ShooterSettings } from "./shooterSettings";
import { loadUiPrefsFromStorage, type UiPrefs } from "./uiPrefs";
import { loadThemeFromStorage, type Theme } from "./useTheme";
import { loadKeyBigramsFromStorage, loadKeyStatsFromStorage } from "./keyStats";
import { loadKeySpeedFromStorage, type KeySpeedMap } from "./keySpeed";
import { loadAchievementsFromStorage, type AchievementState } from "./achievements";
import { loadDailyFromStorage, type DailyState } from "./daily";
import {
  getActiveMissedWords,
  loadMissedWordRecordsFromStorage,
  type MissedWordRecord,
} from "./missedWords";
import { loadCustomTextsFromStorage, type CustomTextEntry } from "./customTexts";
import { loadLearnFromStorage, type LearnState } from "./learn";

export const SHOOTER_BEST_KEY = "ttp:shooter:best:v1";
export const ONBOARDED_KEY = "ttp:onboarded:v1";

const ShooterBestSchema = z.number().finite().min(0);

export async function loadShooterBestFromStorage(storage: Storage): Promise<number> {
  try {
    const raw = await storage.get(SHOOTER_BEST_KEY);
    const parsed = ShooterBestSchema.safeParse(typeof raw === "string" ? Number(raw) : raw);
    return parsed.success ? parsed.data : 0;
  } catch {
    return 0;
  }
}

export async function saveShooterBestToStorage(storage: Storage, score: number): Promise<void> {
  const parsed = ShooterBestSchema.safeParse(score);
  if (!parsed.success) return;
  try {
    await storage.set(SHOOTER_BEST_KEY, parsed.data);
  } catch {
    // non-fatal
  }
}

export async function loadOnboardedFromStorage(storage: Storage): Promise<boolean> {
  try {
    const raw = await storage.get(ONBOARDED_KEY);
    return raw === "1" || raw === true;
  } catch {
    return false;
  }
}

export async function saveOnboardedToStorage(storage: Storage, done = true): Promise<void> {
  try {
    await storage.set(ONBOARDED_KEY, done ? "1" : "0");
  } catch {
    // non-fatal
  }
}

export interface HydratedAppState {
  history: HistoryEntry[];
  drillSettings: DrillSettings;
  shooterSettings: ShooterSettings;
  uiPrefs: UiPrefs;
  theme: Theme;
  allTimeKeys: Record<string, number>;
  allTimeBigrams: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  achievements: AchievementState;
  daily: DailyState | null;
  missedWordRecords: MissedWordRecord[];
  missedWords: string[];
  customTexts: CustomTextEntry[];
  learn: LearnState;
  shooterBest: number;
  onboarded: boolean;
}

export async function hydrateAppFromStorage(storage: Storage): Promise<HydratedAppState> {
  await migrateLegacyLocalStorage(storage);

  const [
    history,
    drillSettings,
    shooterSettings,
    uiPrefs,
    theme,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    achievements,
    daily,
    missedWordRecords,
    customTexts,
    learn,
    onboarded,
  ] = await Promise.all([
    loadHistoryFromStorage(storage),
    loadDrillSettingsFromStorage(storage),
    loadShooterSettingsFromStorage(storage),
    loadUiPrefsFromStorage(storage),
    loadThemeFromStorage(storage),
    loadKeyStatsFromStorage(storage),
    loadKeyBigramsFromStorage(storage),
    loadKeySpeedFromStorage(storage),
    loadAchievementsFromStorage(storage),
    loadDailyFromStorage(storage),
    loadMissedWordRecordsFromStorage(storage),
    loadCustomTextsFromStorage(storage),
    loadLearnFromStorage(storage),
    loadOnboardedFromStorage(storage),
  ]);

  return {
    history,
    drillSettings,
    shooterSettings,
    uiPrefs,
    theme,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    achievements,
    daily,
    missedWordRecords,
    missedWords: getActiveMissedWords(missedWordRecords),
    customTexts,
    learn,
    shooterBest: getShooterBestScore(history),
    onboarded,
  };
}
