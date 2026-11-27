import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { appStorage } from "@/lib/storage";
import { hydrateAppFromStorage, type HydratedAppState } from "@/lib/appHydration";
import { clearAllAppData, importAllAppDataToStorage, type BackupImportResult } from "@/lib/backup";
import { removeBootPrefs, writeBootPrefs } from "@/lib/bootPrefs";
import { syncSeoMetadata } from "@/lib/seo";
import { parseUrlState, syncUrlState, type AppMode } from "@/lib/urlState";
import { applyTheme, useTheme, type Theme } from "@/lib/useTheme";
import {
  DEFAULT_DRILL_SETTINGS,
  sanitizeDrillSettings,
  saveDrillSettingsToStorage,
  type DrillSettings,
} from "@/lib/drillSettings";
import { applyDyslexiaFont, DEFAULT_UI_PREFS, saveUiPrefsToStorage } from "@/lib/uiPrefs";
import {
  clearHistoryInStorage,
  deleteRunFromStorage,
  saveRunToStorage,
  type HistoryEntry,
} from "@/lib/typingStats";
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
import {
  applyLearnLessonUpdate,
  clampLearnTargetWpm,
  createInitialLearnState,
  saveLearnToStorage,
  type LearnLessonUpdateResult,
  type LearnState,
} from "@/lib/learn";
import type { DrillRunCommitPayload } from "@/components/DrillScreen";

export interface LearnRunCommitPayload {
  entry: HistoryEntry;
  keyHits: Record<string, number>;
  keySpeed: KeySpeedMap;
  mistakes: Record<string, number>;
  activeSeconds: number;
}

function getInitialUrlPatch() {
  if (typeof window === "undefined") return {};
  return parseUrlState(window.location.search);
}

export function useAppStore() {
  const [initialUrlPatch] = useState(getInitialUrlPatch);
  const [hydrated, setHydrated] = useState(false);
  const [hydratedTheme, setHydratedTheme] = useState<Theme | undefined>(undefined);
  const { theme, selectTheme } = useTheme(hydratedTheme);

  const [mode, setMode] = useState<AppMode>(() => initialUrlPatch.mode ?? "drill");
  const [returnMode, setReturnMode] = useState<Exclude<AppMode, "settings">>(() =>
    initialUrlPatch.mode && initialUrlPatch.mode !== "settings" ? initialUrlPatch.mode : "drill",
  );
  const [drillSettings, setDrillSettings] = useState<DrillSettings>(() =>
    sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, ...initialUrlPatch }),
  );
  const [dyslexiaFont, setDyslexiaFontState] = useState<boolean>(DEFAULT_UI_PREFS.dyslexiaFont);
  const [learnPromptDismissed, setLearnPromptDismissedState] = useState<boolean>(
    DEFAULT_UI_PREFS.learnPromptDismissed,
  );

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allTimeKeys, setAllTimeKeys] = useState<Record<string, number>>({});
  const [allTimeBigrams, setAllTimeBigrams] = useState<Record<string, number>>({});
  const [allTimeSpeed, setAllTimeSpeed] = useState<KeySpeedMap>({});
  const [missedWordRecords, setMissedWordRecords] = useState<MissedWordRecord[]>([]);
  const [storedMissedWords, setStoredMissedWords] = useState<string[]>([]);
  const [customTexts, setCustomTexts] = useState<CustomTextEntry[]>([]);
  const [learnState, setLearnState] = useState<LearnState>(() => createInitialLearnState());
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const historyRef = useRef<HistoryEntry[]>([]);
  const dailyRef = useRef<DailyState | null>(null);
  const missedWordRecordsRef = useRef<MissedWordRecord[]>([]);
  const customTextsRef = useRef<CustomTextEntry[]>([]);
  const learnStateRef = useRef<LearnState>(learnState);

  const announceQueueRef = useRef<string[]>([]);
  const announceMicrotaskScheduledRef = useRef(false);

  const announce = useCallback((message: string) => {
    announceQueueRef.current.push(message);
    if (!announceMicrotaskScheduledRef.current) {
      announceMicrotaskScheduledRef.current = true;
      queueMicrotask(() => {
        announceQueueRef.current = [];
        announceMicrotaskScheduledRef.current = false;
      });
    }
    const combined = announceQueueRef.current.join(" ");
    setLiveAnnouncement((prev) => (prev === combined ? `${combined} ` : combined));
  }, []);

  const applyHydratedState = useCallback(
    (data: HydratedAppState, urlPatch?: Partial<DrillSettings>, skipBootWrite = false) => {
      const mergedDrill = urlPatch
        ? sanitizeDrillSettings({ ...data.drillSettings, ...urlPatch })
        : sanitizeDrillSettings(data.drillSettings);
      setDrillSettings(mergedDrill);
      setDyslexiaFontState(data.uiPrefs.dyslexiaFont);
      setLearnPromptDismissedState(data.uiPrefs.learnPromptDismissed);
      applyDyslexiaFont(data.uiPrefs.dyslexiaFont);
      setHydratedTheme(data.theme);
      applyTheme(data.theme);

      if (!skipBootWrite) {
        writeBootPrefs({
          theme: data.theme,
          dyslexiaFont: data.uiPrefs.dyslexiaFont,
        });
      }

      historyRef.current = data.history;
      setHistory(data.history);
      setAllTimeKeys(data.allTimeKeys);
      setAllTimeBigrams(data.allTimeBigrams);
      setAllTimeSpeed(data.allTimeSpeed);
      missedWordRecordsRef.current = data.missedWordRecords;
      setMissedWordRecords(data.missedWordRecords);
      setStoredMissedWords(data.missedWords);
      customTextsRef.current = data.customTexts;
      setCustomTexts(data.customTexts);
      learnStateRef.current = data.learn;
      setLearnState(data.learn);
      dailyRef.current = data.daily;
      setDaily(data.daily);
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
    syncUrlState(mode, drillSettings);
  }, [hydrated, mode, drillSettings]);

  const navigateMode = useCallback((nextMode: AppMode) => {
    if (nextMode !== "settings") {
      setReturnMode(nextMode);
    }
    setMode(nextMode);
  }, []);

  const openSettings = useCallback(() => {
    if (mode !== "settings") {
      setReturnMode(mode);
    }
    setMode("settings");
  }, [mode]);

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

  const setDyslexiaFont = useCallback((enabled: boolean) => {
    setDyslexiaFontState(enabled);
    applyDyslexiaFont(enabled);
    writeBootPrefs({ dyslexiaFont: enabled });
    void saveUiPrefsToStorage(appStorage, { dyslexiaFont: enabled });
  }, []);

  const dismissLearnPrompt = useCallback(() => {
    setLearnPromptDismissedState(true);
    void saveUiPrefsToStorage(appStorage, { learnPromptDismissed: true });
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

  const recordDaily = useCallback(
    (activeSeconds: number) => {
      const today = getLocalDateString();
      const prevDaily = dailyRef.current;
      const prevEffective = getEffectiveDaily(prevDaily, today);
      const nextDaily = recordRunToday(prevDaily, today, activeSeconds);
      dailyRef.current = nextDaily;
      setDaily(nextDaily);
      void saveDailyToStorage(appStorage, nextDaily);
      if (!prevEffective.goalMetToday && nextDaily.goalMetToday) {
        toast.success("Daily goal complete!");
        announce("Daily goal complete!");
      }
    },
    [announce],
  );

  const updateDailyGoal = useCallback((patch: Partial<DailyGoalConfig>) => {
    const nextDaily = updateDailyGoalConfig(dailyRef.current, patch, getLocalDateString());
    dailyRef.current = nextDaily;
    setDaily(nextDaily);
    void saveDailyToStorage(appStorage, nextDaily);
  }, []);

  const commitDrillRun = useCallback(
    (payload: DrillRunCommitPayload) => {
      void saveRunToStorage(appStorage, payload.entry, historyRef.current).then(({ list, ok }) => {
        historyRef.current = list;
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
      if (
        payload.missedWords.length > 0 ||
        (missedWordRecordsRef.current.length > 0 && payload.cleanWordsInRun.length > 0)
      ) {
        const nextRecords = recordMissedWordsRun(missedWordRecordsRef.current, {
          missedInRun: payload.missedWords,
          cleanWordsInRun: payload.cleanWordsInRun,
        });
        missedWordRecordsRef.current = nextRecords;
        setMissedWordRecords(nextRecords);
        setStoredMissedWords(getActiveMissedWords(nextRecords));
        void saveMissedWordRecordsToStorage(appStorage, nextRecords);
      }
      recordDaily(payload.activeSeconds);
    },
    [recordDaily],
  );

  const updateLearnTargetWpm = useCallback((wpm: number) => {
    const cleanWpm = clampLearnTargetWpm(wpm);
    const next: LearnState = {
      ...learnStateRef.current,
      targetWpm: cleanWpm,
      updatedAt: Date.now(),
    };
    learnStateRef.current = next;
    setLearnState(next);
    void saveLearnToStorage(appStorage, next);
  }, []);

  const commitLearnRun = useCallback(
    (payload: LearnRunCommitPayload): LearnLessonUpdateResult => {
      void saveRunToStorage(appStorage, payload.entry, historyRef.current).then(({ list, ok }) => {
        historyRef.current = list;
        setHistory(list);
        if (!ok) toast.error("Couldn't save this run to local storage.");
      });
      if (Object.keys(payload.mistakes).length > 0) {
        void recordKeyMistakesInStorage(appStorage, payload.mistakes).then(setAllTimeKeys);
      }
      if (Object.keys(payload.keySpeed).length > 0) {
        void recordKeySpeedInStorage(appStorage, payload.keySpeed).then(setAllTimeSpeed);
      }

      const update = applyLearnLessonUpdate(learnStateRef.current, {
        keyHits: payload.keyHits,
        keySpeed: payload.keySpeed,
        mistakes: payload.mistakes,
      });
      learnStateRef.current = update.state;
      setLearnState(update.state);
      void saveLearnToStorage(appStorage, update.state);

      if (update.newlyUnlockedKey) {
        const msg = `Unlocked letter "${update.newlyUnlockedKey.toUpperCase()}"! (${update.state.unlocked.length}/26)`;
        toast.success(msg);
        announce(msg);
      }

      recordDaily(payload.activeSeconds);

      return update;
    },
    [announce, recordDaily],
  );

  const updateHistoryState = useCallback((nextHistory: HistoryEntry[]) => {
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }, []);

  const clearHistory = useCallback((m?: "all" | "drill") => {
    void clearHistoryInStorage(appStorage, m).then((list) => {
      historyRef.current = list;
      setHistory(list);
    });
  }, []);

  const deleteHistoryRun = useCallback(async (id: string) => {
    const res = await deleteRunFromStorage(appStorage, id);
    historyRef.current = res.list;
    setHistory(res.list);
    return res.deleted;
  }, []);

  const restoreHistoryRun = useCallback(async (entry: HistoryEntry) => {
    const { list } = await saveRunToStorage(appStorage, entry, historyRef.current);
    historyRef.current = list;
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
    removeBootPrefs();
    applyHydratedState(clean, undefined, true);
  }, [applyHydratedState]);

  return {
    hydrated,
    theme,
    selectTheme,
    mode,
    setMode: navigateMode,
    openSettings,
    closeSettings,
    drillSettings,
    dyslexiaFont,
    setDyslexiaFont,
    learnPromptDismissed,
    dismissLearnPrompt,
    history,
    setHistory: updateHistoryState,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    missedWordRecords,
    storedMissedWords,
    customTexts,
    learnState,
    daily,
    historyReady,
    liveAnnouncement,
    updateDrillSettings,
    saveDrillSettings,
    saveCustomText,
    deleteCustomText,
    commitDrillRun,
    updateLearnTargetWpm,
    commitLearnRun,
    updateDailyGoal,
    clearHistory,
    deleteHistoryRun,
    restoreHistoryRun,
    importFullBackup,
    deleteAllData,
  };
}
