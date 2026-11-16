import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { DailyGoal } from "@/components/DailyGoal";
import { DrillScreen, type DrillScreenHandle } from "@/components/DrillScreen";
import { PanelSkeleton } from "@/components/Skeletons";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useAppStore } from "@/hooks/useAppStore";
import { getEffectiveDaily, getLocalDateString } from "@/lib/daily";
import {
  DRILL_DIFFICULTIES,
  DRILL_DURATIONS,
  getDrillMode,
  getKeyboardLayout,
  getKeyboardStandard,
  getQuoteLength,
  getShowFingerZones,
  getWordCount,
} from "@/lib/drillSettings";
import { downloadFullBackupJson } from "@/lib/historyExport";
import { topSlowKeys } from "@/lib/keySpeed";
import { topWeakBigrams, topWeakKeys } from "@/lib/keyStats";
import { appStorage } from "@/lib/storage";
import type { ShooterRunSummary } from "@/lib/typingStats";

const LazyShooterScreen = lazy(() =>
  import("@/components/ShooterScreen").then((m) => ({ default: m.ShooterScreen })),
);
const LazyHistoryPanel = lazy(() =>
  import("@/components/HistoryPanel").then((m) => ({ default: m.HistoryPanel })),
);
const LazyAchievementsPage = lazy(() =>
  import("@/components/AchievementsPage").then((m) => ({ default: m.AchievementsPage })),
);
const LazySettingsPage = lazy(() =>
  import("@/components/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const LazyCommandPalette = lazy(() =>
  import("@/components/CommandPalette").then((m) => ({ default: m.CommandPalette })),
);
const LazyOnboarding = lazy(() =>
  import("@/components/Onboarding").then((m) => ({ default: m.Onboarding })),
);
const CustomTextDialog = lazy(() =>
  import("@/components/CustomTextDialog").then((m) => ({ default: m.CustomTextDialog })),
);

export function App() {
  const store = useAppStore();
  const coarsePointer = useCoarsePointer();

  const [focusDimmed, setFocusDimmed] = useState(false);
  const [customTextOpen, setCustomTextOpen] = useState(false);
  const [lastShooterSummary, setLastShooterSummary] = useState<ShooterRunSummary | null>(null);

  const drillRef = useRef<DrillScreenHandle>(null);

  const effectiveShooterSummary = useMemo(() => {
    if (lastShooterSummary) return lastShooterSummary;
    const latest = store.history.find((h) => h.mode === "shooter");
    if (!latest) return null;
    return {
      score: latest.score ?? 0,
      wordsDestroyed: latest.wordsDestroyed ?? latest.correct,
      wordsSpawned: latest.wordsSpawned,
      accuracy: latest.accuracy,
      hitRate: latest.hitRate,
      maxStreak: latest.maxStreak,
      strayKeys: latest.strayKeys,
      bossesDefeated: latest.bossesDefeated,
      practiceMode: latest.practiceMode,
      dailyChallengeDate: latest.dailyChallengeDate,
      durationSec: Math.max(1, Math.round(latest.elapsed)),
      difficulty: latest.difficulty,
      level: latest.level ?? 1,
      samples: latest.samples,
    } satisfies ShooterRunSummary;
  }, [lastShooterSummary, store.history]);

  const weakKeysAll = useMemo(() => topWeakKeys(store.allTimeKeys, 12), [store.allTimeKeys]);
  const weakKeys1 = weakKeysAll.slice(0, 1);
  const weakBigrams1 = useMemo(
    () => topWeakBigrams(store.allTimeBigrams, 1),
    [store.allTimeBigrams],
  );
  const slowKeys1 = useMemo(() => topSlowKeys(store.allTimeSpeed, 1), [store.allTimeSpeed]);
  const layout = getKeyboardLayout(store.drillSettings);
  const standard = getKeyboardStandard(store.drillSettings);
  const showFingerZones = getShowFingerZones(store.drillSettings);
  const unlockedCount = Object.keys(store.achState.unlocked).length;
  const effectiveDaily = getEffectiveDaily(store.daily, getLocalDateString());

  return (
    <>
      <main
        className="mx-auto min-h-dvh w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-14"
        data-protonpass-ignore="true"
        data-lpignore="true"
        data-1p-ignore="true"
      >
        <AppHeader
          mode={store.mode}
          focusDimmed={store.mode === "drill" && focusDimmed}
          theme={store.theme}
          accent={store.themeAccent}
          drillSettings={store.drillSettings}
          shooterSettings={store.shooterSettings}
          unlockedAchievementsCount={unlockedCount}
          onModeChange={(nextMode) => {
            store.setMode(nextMode);
            if (nextMode !== "drill") setFocusDimmed(false);
          }}
          onOpenSettings={() => {
            if (store.mode === "settings") {
              store.closeSettings();
            } else {
              store.openSettings();
              setFocusDimmed(false);
            }
          }}
          onToggleTheme={store.toggleTheme}
          onSelectAccent={store.selectAccent}
          onRestartDrill={() => drillRef.current?.restart()}
        />

        {store.mode !== "settings" ? (
          <div className="mt-4">
            <DailyGoal
              daily={store.daily}
              onOpenGoalSettings={() => {
                setFocusDimmed(false);
                store.openSettings("typing");
              }}
            />
          </div>
        ) : null}

        {store.mode === "drill" ? (
          <DrillScreen
            ref={drillRef}
            drillSettings={store.drillSettings}
            history={store.history}
            allTimeKeys={store.allTimeKeys}
            allTimeBigrams={store.allTimeBigrams}
            allTimeSpeed={store.allTimeSpeed}
            storedMissedWords={store.storedMissedWords}
            customTexts={store.customTexts}
            achievements={store.achState}
            onUpdateDrillSettings={store.updateDrillSettings}
            onOpenCustomText={() => setCustomTextOpen(true)}
            onCommitRun={store.commitDrillRun}
            onSwitchToShooter={() => store.setMode("shooter")}
            onOpenAchievements={() => store.setMode("achievements")}
            onFocusDimmedChange={setFocusDimmed}
          />
        ) : store.mode === "shooter" ? (
          <Suspense fallback={<PanelSkeleton lines={5} />}>
            <LazyShooterScreen
              settings={store.shooterSettings}
              missedWords={store.storedMissedWords}
              weakKeysAll={weakKeysAll}
              allTimeKeys={store.allTimeKeys}
              shooterBest={store.shooterBest}
              achState={store.achState}
              effectiveShooterSummary={effectiveShooterSummary}
              coarsePointer={coarsePointer}
              layout={layout}
              standard={standard}
              showFingerZones={showFingerZones}
              onOpenSettings={() => store.openSettings("game")}
              onUpdateSettings={(patch) =>
                store.saveShooterSettings({ ...store.shooterSettings, ...patch })
              }
              onCommitRun={store.commitShooterRun}
              onSummaryChange={setLastShooterSummary}
              onOpenAchievements={() => store.setMode("achievements")}
            />
          </Suspense>
        ) : store.mode === "settings" ? (
          <Suspense fallback={<PanelSkeleton lines={5} />}>
            <LazySettingsPage
              activeTab={store.settingsTab}
              drillSettings={store.drillSettings}
              shooterSettings={store.shooterSettings}
              daily={store.daily}
              theme={store.theme}
              accent={store.themeAccent}
              dyslexiaFont={store.dyslexiaFont}
              customTexts={store.customTexts}
              history={store.history}
              achState={store.achState}
              storedMissedWordsCount={store.storedMissedWords.length}
              onSelectTab={store.setSettingsTab}
              onBack={store.closeSettings}
              onUpdateDrill={store.updateDrillSettings}
              onSaveDrill={store.saveDrillSettings}
              onUpdateShooter={(patch) =>
                store.saveShooterSettings({ ...store.shooterSettings, ...patch })
              }
              onSaveShooter={store.saveShooterSettings}
              onUpdateDailyGoal={store.updateDailyGoal}
              onSelectTheme={store.selectTheme}
              onSelectAccent={store.selectAccent}
              onToggleDyslexiaFont={store.setDyslexiaFont}
              onOpenCustomText={() => setCustomTextOpen(true)}
              onImportBackup={store.importFullBackup}
              onDeleteAllData={async () => {
                await store.deleteAllData();
                setLastShooterSummary(null);
              }}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<PanelSkeleton lines={4} />}>
            <LazyAchievementsPage
              achState={store.achState}
              history={store.history}
              longestStreak={effectiveDaily.longestStreak}
              onBack={() => store.setMode("drill")}
            />
          </Suspense>
        )}

        {store.mode === "drill" || store.mode === "shooter" ? (
          <div className="mt-4">
            {store.historyReady ? (
              <Suspense fallback={<PanelSkeleton lines={1} />}>
                <LazyHistoryPanel
                  history={store.history}
                  mode={store.mode}
                  onClear={(m) => {
                    store.clearHistory(m);
                    if (!m || m === "all" || m === "shooter") {
                      setLastShooterSummary(null);
                    }
                  }}
                  onImportHistory={store.setHistory}
                  onImportBackup={store.importFullBackup}
                  onDeleteRun={store.deleteHistoryRun}
                  onRestoreRun={store.restoreHistoryRun}
                  onDeleteAllData={async () => {
                    await store.deleteAllData();
                    setLastShooterSummary(null);
                  }}
                  onStartRun={() => {
                    store.setMode("drill");
                    requestAnimationFrame(() => drillRef.current?.focusInput());
                  }}
                />
              </Suspense>
            ) : (
              <PanelSkeleton lines={1} />
            )}
          </div>
        ) : null}

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Typing Trainer Pro · Runs stay locally in your browser · Press{" "}
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">
            Ctrl/⌘ K
          </kbd>{" "}
          for the command palette.
        </footer>

        <Suspense fallback={null}>
          <LazyOnboarding
            ready={store.hydrated}
            alreadyOnboarded={store.alreadyOnboarded}
            initialLayout={layout}
            onStart={(choices) => {
              const next = store.saveDrillSettings({
                ...store.drillSettings,
                difficulty: choices.difficulty,
                targetWpm: choices.targetWpm,
                keyboardLayout: choices.keyboardLayout,
                drillMode: "time",
                duration: choices.runPlacementTest ? 15 : store.drillSettings.duration,
              });
              store.setMode("drill");
              requestAnimationFrame(() => {
                drillRef.current?.restart(next);
                drillRef.current?.focusInput();
              });
            }}
          />

          <CustomTextDialog
            open={customTextOpen}
            onOpenChange={setCustomTextOpen}
            customTexts={store.customTexts}
            activeCustomTextId={store.drillSettings.customTextId ?? null}
            onSaveCustomText={store.saveCustomText}
            onDeleteCustomText={store.deleteCustomText}
            onSelectCustomText={(id) => store.updateDrillSettings({ customTextId: id })}
          />

          <LazyCommandPalette
            difficulty={store.drillSettings.difficulty}
            duration={store.drillSettings.duration}
            drillMode={getDrillMode(store.drillSettings)}
            wordCount={getWordCount(store.drillSettings)}
            quoteLength={getQuoteLength(store.drillSettings)}
            keyboardLayout={layout}
            theme={store.theme}
            accent={store.themeAccent}
            dyslexiaFont={store.dyslexiaFont}
            difficulties={DRILL_DIFFICULTIES}
            durations={DRILL_DURATIONS}
            mode={store.mode}
            onDifficulty={(d) => {
              store.setMode("drill");
              store.updateDrillSettings({ difficulty: d });
            }}
            onDuration={(dur) => {
              store.setMode("drill");
              store.updateDrillSettings({ drillMode: "time", duration: dur });
            }}
            onWordCount={(wc) => {
              store.setMode("drill");
              store.updateDrillSettings({ drillMode: "words", wordCount: wc });
            }}
            onQuoteLength={(ql) => {
              store.setMode("drill");
              store.updateDrillSettings({ drillMode: "quote", quoteLength: ql });
            }}
            onKeyboardLayout={(nextLayout) =>
              store.updateDrillSettings({ keyboardLayout: nextLayout })
            }
            onSelectTheme={store.selectTheme}
            onSelectAccent={store.selectAccent}
            onToggleDyslexiaFont={() => store.setDyslexiaFont(!store.dyslexiaFont)}
            onRestart={() => drillRef.current?.restart()}
            onModeChange={(nextMode) => {
              store.setMode(nextMode);
              if (nextMode !== "drill") setFocusDimmed(false);
            }}
            onOpenSettingsTab={(tab) => {
              setFocusDimmed(false);
              store.openSettings(tab);
            }}
            onExportAllData={() => void downloadFullBackupJson(appStorage)}
            onOpenCustomText={() => setCustomTextOpen(true)}
            onPracticeMissedWords={
              store.storedMissedWords.length > 0
                ? () => drillRef.current?.practiceMissedWords()
                : undefined
            }
            onPracticeWeakKeys={
              weakKeys1.length > 0 || weakBigrams1.length > 0
                ? () => drillRef.current?.practiceWeakKeys()
                : undefined
            }
            onPracticeSlowKeys={
              slowKeys1.length > 0 ? () => drillRef.current?.practiceSlowKeys() : undefined
            }
          />
        </Suspense>
      </main>
      <Toaster position="top-center" />
    </>
  );
}
