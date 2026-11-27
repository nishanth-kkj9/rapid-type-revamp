import { migrateLegacyLocalStorage, type Storage } from "./storage";
import { loadHistoryFromStorage, type HistoryEntry } from "./typingStats";
import { loadDrillSettingsFromStorage, type DrillSettings } from "./drillSettings";
import { loadUiPrefsFromStorage, type UiPrefs } from "./uiPrefs";
import { loadThemeFromStorage, type Theme } from "./useTheme";
import { loadKeyBigramsFromStorage, loadKeyStatsFromStorage } from "./keyStats";
import { loadKeySpeedFromStorage, type KeySpeedMap } from "./keySpeed";
import { loadDailyFromStorage, type DailyState } from "./daily";
import {
  getActiveMissedWords,
  loadMissedWordRecordsFromStorage,
  type MissedWordRecord,
} from "./missedWords";
import { loadCustomTextsFromStorage, type CustomTextEntry } from "./customTexts";
import { loadLearnFromStorage, type LearnState } from "./learn";

export interface HydratedAppState {
  history: HistoryEntry[];
  drillSettings: DrillSettings;
  uiPrefs: UiPrefs;
  theme: Theme;
  allTimeKeys: Record<string, number>;
  allTimeBigrams: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  daily: DailyState | null;
  missedWordRecords: MissedWordRecord[];
  missedWords: string[];
  customTexts: CustomTextEntry[];
  learn: LearnState;
}

export async function hydrateAppFromStorage(storage: Storage): Promise<HydratedAppState> {
  await migrateLegacyLocalStorage(storage);

  const [
    history,
    drillSettings,
    uiPrefs,
    theme,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    daily,
    missedWordRecords,
    customTexts,
    learn,
  ] = await Promise.all([
    loadHistoryFromStorage(storage),
    loadDrillSettingsFromStorage(storage),
    loadUiPrefsFromStorage(storage),
    loadThemeFromStorage(storage),
    loadKeyStatsFromStorage(storage),
    loadKeyBigramsFromStorage(storage),
    loadKeySpeedFromStorage(storage),
    loadDailyFromStorage(storage),
    loadMissedWordRecordsFromStorage(storage),
    loadCustomTextsFromStorage(storage),
    loadLearnFromStorage(storage),
  ]);

  return {
    history,
    drillSettings,
    uiPrefs,
    theme,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    daily,
    missedWordRecords,
    missedWords: getActiveMissedWords(missedWordRecords),
    customTexts,
    learn,
  };
}
