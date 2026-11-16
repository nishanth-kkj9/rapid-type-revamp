import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { appStorage } from "@/lib/storage";
import { hydrateAppFromStorage, type HydratedAppState } from "@/lib/appHydration";
import { clearAllAppData, importAllAppDataToStorage, type BackupImportResult } from "@/lib/backup";
import { syncSeoMetadata } from "@/lib/seo";
import { parseUrlState, syncUrlState, type AppMode, type SettingsTabId } from "@/lib/urlState";
import { applyTheme, useTheme, type Theme } from "@/lib/useTheme";
import {
  DEFAULT_DRILL_SETTINGS,
  sanitizeDrillSettings,
  saveDrillSettingsToStorage,
  type DrillSettings,
} from "@/lib/drillSettings";
import {
  DEFAULT_SHOOTER_SETTINGS,
  saveShooterSettingsToStorage,
  type ShooterSettings,
} from "@/lib/shooterSettings";
import {
  applyDyslexiaFont,
  applyThemeAccent,
  DEFAULT_UI_PREFS,
  saveUiPrefsToStorage,
  type ThemeAccent,
} from "@/lib/uiPrefs";
import {
  clearHistoryInStorage,
  computeStats,
  deleteRunFromStorage,
  getShooterBestScore,
  newRunId,
  saveRunToStorage,
  type HistoryEntry,
  type ShooterRunSummary,
} from "@/lib/typingStats";
import {
  evaluateAchievements,
  saveAchievementsToStorage,
  type AchievementState,
} from "@/lib/achievements";
import {
  getEffectiveDaily,
  getLocalDateString,
  recordRunToday,
  saveDailyToStorage,
  updateDailyGoalConfig,
  type DailyGoalConfig,
  type DailyState,
} from "@/lib/daily";
import { recordKeyBigramsInStorage, recordKeyMistakesInStorage } from "@/lib/keyStats";
import { recordKeySpeedInStorage, type KeySpeedMap } from "@/lib/keySpeed";
import {
  getActiveMissedWords,
  recordMissedWordsRun,
  saveMissedWordRecordsToStorage,
  type MissedWordRecord,
} from "@/lib/missedWords";
import {
  MAX_CUSTOM_TEXT_LISTS,
  normalizeCustomText,
  saveCustomTextsToStorage,
  type CustomTextEntry,
} from "@/lib/customTexts";
import type { DrillRunCommitPayload } from "@/components/DrillScreen";

function getInitialUrlPatch() {
  if (typeof window === "undefined") return {};
  return parseUrlState(window.location.search);
}

export function useAppStore() {
  const [initialUrlPatch] = useState(getInitialUrlPatch);
  const [hydrated, setHydrated] = useState(false);
  const [hydratedTheme, setHydratedTheme] = useState<Theme | undefined>(undefined);
  const { theme, selectTheme, toggleTheme } = useTheme(hydratedTheme);

  const [mode, setMode] = useState<AppMode>(() => initialUrlPatch.mode ?? "drill");
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>(
    () => initialUrlPatch.settingsTab ?? "typing",
  );
  const [returnMode, setReturnMode] = useState<Exclude<AppMode, "settings">>(() =>
    initialUrlPatch.mode && initialUrlPatch.mode !== "settings" ? initialUrlPatch.mode : "drill",
  );
  const [drillSettings, setDrillSettings] = useState<DrillSettings>(() =>
    sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, ...initialUrlPatch }),
  );
  const [shooterSettings, setShooterSettings] = useState<ShooterSettings>(DEFAULT_SHOOTER_SETTINGS);
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>(DEFAULT_UI_PREFS.themeAccent);
  const [dyslexiaFont, setDyslexiaFontState] = useState<boolean>(DEFAULT_UI_PREFS.dyslexiaFont);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allTimeKeys, setAllTimeKeys] = useState<Record<string, number>>({});
  const [allTimeBigrams, setAllTimeBigrams] = useState<Record<string, number>>({});
  const [allTimeSpeed, setAllTimeSpeed] = useState<KeySpeedMap>({});
  const [missedWordRecords, setMissedWordRecords] = useState<MissedWordRecord[]>([]);
  const [storedMissedWords, setStoredMissedWords] = useState<string[]>([]);
  const [customTexts, setCustomTexts] = useState<CustomTextEntry[]>([]);
  const [achState, setAchState] = useState<AchievementState>({ unlocked: {}, counters: {} });
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(true);
  const [historyReady, setHistoryReady] = useState(false);

  const shooterBest = useMemo(() => getShooterBestScore(history), [history]);

  const achStateRef = useRef<AchievementState>({ unlocked: {}, counters: {} });
  const dailyRef = useRef<DailyState | null>(null);
  const missedWordRecordsRef = useRef<MissedWordRecord[]>([]);
  const customTextsRef = useRef<CustomTextEntry[]>([]);

  const applyHydratedState = useCallback(
    (data: HydratedAppState, urlPatch?: Partial<DrillSettings>) => {
      const mergedDrill = urlPatch
        ? sanitizeDrillSettings({ ...data.drillSettings, ...urlPatch })
        : sanitizeDrillSettings(data.drillSettings);
      setDrillSettings(mergedDrill);
      setShooterSettings(data.shooterSettings);
      setThemeAccent(data.uiPrefs.themeAccent);
      applyThemeAccent(data.uiPrefs.themeAccent);
      setDyslexiaFontState(data.uiPrefs.dyslexiaFont);
      applyDyslexiaFont(data.uiPrefs.dyslexiaFont);
      setHydratedTheme(data.theme);
      applyTheme(data.theme);

      setHistory(data.history);
      setAllTimeKeys(data.allTimeKeys);
      setAllTimeBigrams(data.allTimeBigrams);
      setAllTimeSpeed(data.allTimeSpeed);
      missedWordRecordsRef.current = data.missedWordRecords;
      setMissedWordRecords(data.missedWordRecords);
      setStoredMissedWords(data.missedWords);
      customTextsRef.current = data.customTexts;
      setCustomTexts(data.customTexts);
      achStateRef.current = data.achievements;
      setAchState(data.achievements);
      dailyRef.current = data.daily;
      setDaily(data.daily);
      setAlreadyOnboarded(data.onboarded);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void hydrateAppFromStorage(appStorage).then((data) => {
      if (cancelled) return;
      applyHydratedState(data, initialUrlPatch);
      setHydrated(true);
    });

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === "function") {
      const idleId = win.requestIdleCallback(() => setHistoryReady(true), { timeout: 600 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
      };
    }
    const timer = globalThis.setTimeout(() => setHistoryReady(true), 150);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [initialUrlPatch, applyHydratedState]);

  useEffect(() => {
    syncSeoMetadata(mode);
    if (!hydrated) return;
    syncUrlState(mode, drillSettings, settingsTab);
  }, [hydrated, mode, drillSettings, settingsTab]);

  const navigateMode = useCallback((nextMode: AppMode) => {
    if (nextMode !== "settings") {
      setReturnMode(nextMode);
    }
    setMode(nextMode);
  }, []);

  const openSettings = useCallback(
    (tab?: SettingsTabId) => {
      if (mode !== "settings") {
        setReturnMode(mode);
      }
      if (tab) {
        setSettingsTab(tab);
      } else {
        setSettingsTab(mode === "shooter" ? "game" : "typing");
      }
      setMode("settings");
    },
    [mode],
  );

  const closeSettings = useCallback(() => {
    setMode(returnMode);
  }, [returnMode]);

  const updateDrillSettings = useCallback((patch: Partial<DrillSettings>) => {
    setDrillSettings((prev) => {
      const next = sanitizeDrillSettings({ ...prev, ...patch });
      void saveDrillSettingsToStorage(appStorage, next);
      return next;
    });
  }, []);

  const saveDrillSettings = useCallback((next: DrillSettings) => {
    const clean = sanitizeDrillSettings(next);
    setDrillSettings(clean);
    void saveDrillSettingsToStorage(appStorage, clean);
    return clean;
  }, []);

  const saveShooterSettings = useCallback((next: ShooterSettings) => {
    setShooterSettings(next);
    void saveShooterSettingsToStorage(appStorage, next);
  }, []);

  const selectAccent = useCallback((accent: ThemeAccent) => {
    setThemeAccent(accent);
    applyThemeAccent(accent);
    void saveUiPrefsToStorage(appStorage, { themeAccent: accent });
  }, []);

  const setDyslexiaFont = useCallback((enabled: boolean) => {
    setDyslexiaFontState(enabled);
    applyDyslexiaFont(enabled);
    void saveUiPrefsToStorage(appStorage, { dyslexiaFont: enabled });
  }, []);

  const saveCustomText = useCallback(
    (input: { id?: string; name: string; text: string; activate?: boolean }) => {
      const normalized = normalizeCustomText(input.text);
      if (!normalized.text) return null;
      const now = Date.now();
      const id = input.id ?? `ct-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: CustomTextEntry = {
        id,
        name: input.name.trim() || "Custom Passage",
        text: normalized.text,
        createdAt: customTextsRef.current.find((item) => item.id === id)?.createdAt ?? now,
        updatedAt: now,
      };
      const existing = customTextsRef.current.filter((item) => item.id !== id);
      const nextList = [entry, ...existing].slice(0, MAX_CUSTOM_TEXT_LISTS);
      customTextsRef.current = nextList;
      setCustomTexts(nextList);
      void saveCustomTextsToStorage(appStorage, nextList);
      if (input.activate) {
        updateDrillSettings({ customTextId: entry.id });
      }
      return entry;
    },
    [updateDrillSettings],
  );

  const deleteCustomText = useCallback((id: string) => {
    const nextList = customTextsRef.current.filter((item) => item.id !== id);
    customTextsRef.current = nextList;
    setCustomTexts(nextList);
    void saveCustomTextsToStorage(appStorage, nextList);
    setDrillSettings((prev) => {
      if (prev.customTextId !== id) return prev;
      const next = sanitizeDrillSettings({ ...prev, customTextId: null });
      void saveDrillSettingsToStorage(appStorage, next);
      return next;
    });
  }, []);

  const commitAchievements = useCallback((ctx: Parameters<typeof evaluateAchievements>[0]) => {
    const { state, newlyUnlocked } = evaluateAchievements(ctx, achStateRef.current);
    if (newlyUnlocked.length === 0) return;
    achStateRef.current = state;
    setAchState(state);
    void saveAchievementsToStorage(appStorage, state);
    for (const a of newlyUnlocked) {
      toast.success(`Achievement unlocked — ${a.title}`, {
        description: a.description,
        action: {
          label: "View",
          onClick: () => setMode("achievements"),
        },
      });
    }
  }, []);

  const recordDaily = useCallback((activeSeconds: number) => {
    const today = getLocalDateString();
    const prevDaily = dailyRef.current;
    const prevEffective = getEffectiveDaily(prevDaily, today);
    const nextDaily = recordRunToday(prevDaily, today, activeSeconds);
    dailyRef.current = nextDaily;
    setDaily(nextDaily);
    void saveDailyToStorage(appStorage, nextDaily);
    if (!prevEffective.goalMetToday && nextDaily.goalMetToday) {
      toast.success("Daily goal complete!");
    }
    return nextDaily;
  }, []);

  const updateDailyGoal = useCallback((patch: Partial<DailyGoalConfig>) => {
    const nextDaily = updateDailyGoalConfig(dailyRef.current, patch, getLocalDateString());
    dailyRef.current = nextDaily;
    setDaily(nextDaily);
    void saveDailyToStorage(appStorage, nextDaily);
  }, []);

  const commitDrillRun = useCallback(
    (payload: DrillRunCommitPayload) => {
      void saveRunToStorage(appStorage, payload.entry).then(({ list, ok }) => {
        setHistory(list);
        if (!ok) toast.error("Couldn't save this run to local storage.");
      });
      if (Object.keys(payload.mistakes).length > 0) {
        void recordKeyMistakesInStorage(appStorage, payload.mistakes).then(setAllTimeKeys);
      }
      if (Object.keys(payload.bigramMistakes).length > 0) {
        void recordKeyBigramsInStorage(appStorage, payload.bigramMistakes).then(setAllTimeBigrams);
      }
      if (Object.keys(payload.keySpeed).length > 0) {
        void recordKeySpeedInStorage(appStorage, payload.keySpeed).then(setAllTimeSpeed);
      }
      let wordsGraduated = 0;
      if (
        payload.missedWords.length > 0 ||
        (missedWordRecordsRef.current.length > 0 && payload.cleanWordsInRun.length > 0)
      ) {
        const prevWords = new Set(missedWordRecordsRef.current.map((r) => r.word));
        const cleanSet = new Set(payload.cleanWordsInRun.map((w) => w.trim().toLowerCase()));
        const nextRecords = recordMissedWordsRun(missedWordRecordsRef.current, {
          missedInRun: payload.missedWords,
          cleanWordsInRun: payload.cleanWordsInRun,
        });
        const nextWords = new Set(nextRecords.map((r) => r.word));
        for (const w of prevWords) {
          if (cleanSet.has(w) && !nextWords.has(w)) {
            wordsGraduated += 1;
          }
        }
        missedWordRecordsRef.current = nextRecords;
        setMissedWordRecords(nextRecords);
        setStoredMissedWords(getActiveMissedWords(nextRecords));
        void saveMissedWordRecordsToStorage(appStorage, nextRecords);
      }
      const nextDaily = recordDaily(payload.activeSeconds);
      commitAchievements({
        mode: "drill",
        drillMode: payload.drillMode,
        durationSec: payload.durationSec,
        wpm: payload.entry.wpm,
        accuracy: payload.entry.accuracy,
        consistency: payload.entry.consistency,
        typed: payload.entry.typed,
        correctChars: payload.entry.correct,
        streak: nextDaily.streak,
        focused: payload.focused,
        improvedWeakKey: payload.improvedWeakKey,
        wordsGraduated,
      });
    },
    [commitAchievements, recordDaily],
  );

  const commitShooterRun = useCallback(
    (s: ShooterRunSummary, mistakes: Record<string, number>) => {
      const incorrect = s.wrongKeys ?? 0;
      const realChars = s.charsDestroyed ?? s.wordsDestroyed * 5;
      const fs = computeStats(realChars, incorrect, s.durationSec * 1000, s.samples ?? []);
      void saveRunToStorage(appStorage, {
        ...fs,
        accuracy: s.accuracy,
        id: newRunId(),
        date: Date.now(),
        difficulty: s.difficulty,
        mode: "shooter",
        score: s.score,
        wordsDestroyed: s.wordsDestroyed,
        wordsSpawned: s.wordsSpawned,
        hitRate: s.hitRate,
        maxStreak: s.maxStreak,
        strayKeys: s.strayKeys,
        bossesDefeated: s.bossesDefeated,
        practiceMode: s.practiceMode,
        dailyChallengeDate: s.dailyChallengeDate,
        level: s.level ?? 1,
        samples: s.samples,
        mistakes: Object.keys(mistakes).length > 0 ? mistakes : undefined,
      }).then(({ list, ok }) => {
        setHistory(list);
        if (!ok) toast.error("Couldn't save this run to local storage.");
      });

      if (Object.keys(mistakes).length > 0) {
        void recordKeyMistakesInStorage(appStorage, mistakes).then(setAllTimeKeys);
      }

      const nextDaily = recordDaily(s.activeDurationSec ?? s.durationSec);
      commitAchievements({
        mode: "shooter",
        wpm: fs.wpm,
        accuracy: s.accuracy,
        wordsDestroyed: s.wordsDestroyed,
        shooterStreak: s.maxStreak,
        level: s.level,
        bossesDefeated: s.bossesDefeated,
        streak: nextDaily.streak,
      });
    },
    [commitAchievements, recordDaily],
  );

  const clearHistory = useCallback((m?: "all" | "drill" | "shooter") => {
    void clearHistoryInStorage(appStorage, m).then(setHistory);
  }, []);

  const deleteHistoryRun = useCallback(async (id: string) => {
    const res = await deleteRunFromStorage(appStorage, id);
    setHistory(res.list);
    return res.deleted;
  }, []);

  const restoreHistoryRun = useCallback(async (entry: HistoryEntry) => {
    const { list } = await saveRunToStorage(appStorage, entry);
    setHistory(list);
  }, []);

  const importFullBackup = useCallback(
    async (rawJson: string): Promise<BackupImportResult> => {
      const res = await importAllAppDataToStorage(appStorage, rawJson);
      if (res.ok) {
        applyHydratedState(res.state);
      }
      return res;
    },
    [applyHydratedState],
  );

  const deleteAllData = useCallback(async () => {
    const clean = await clearAllAppData(appStorage);
    applyHydratedState(clean);
  }, [applyHydratedState]);

  return {
    hydrated,
    theme,
    selectTheme,
    toggleTheme,
    mode,
    setMode: navigateMode,
    settingsTab,
    setSettingsTab,
    openSettings,
    closeSettings,
    drillSettings,
    shooterSettings,
    themeAccent,
    dyslexiaFont,
    setDyslexiaFont,
    history,
    setHistory,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    missedWordRecords,
    storedMissedWords,
    customTexts,
    achState,
    daily,
    shooterBest,
    alreadyOnboarded,
    historyReady,
    updateDrillSettings,
    saveDrillSettings,
    saveShooterSettings,
    selectAccent,
    saveCustomText,
    deleteCustomText,
    commitDrillRun,
    commitShooterRun,
    updateDailyGoal,
    clearHistory,
    deleteHistoryRun,
    restoreHistoryRun,
    importFullBackup,
    deleteAllData,
  };
}
