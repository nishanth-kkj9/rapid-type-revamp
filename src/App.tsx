import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { DrillScreen, type DrillScreenHandle } from "@/components/DrillScreen";
import { PanelSkeleton } from "@/components/Skeletons";
import { useAppStore } from "@/hooks/useAppStore";
import {
  DRILL_DURATIONS,
  getDrillMode,
  getKeyboardLayout,
  getKeyboardStandard,
  getQuoteLength,
  getWordCount,
} from "@/lib/drillSettings";
import { topSlowKeys } from "@/lib/keySpeed";
import { topWeakBigrams, topWeakKeys } from "@/lib/keyStats";

const LazyLearnScreen = lazy(() =>
  import("@/components/LearnScreen").then((m) => ({ default: m.LearnScreen })),
);
const LazyStatsPage = lazy(() =>
  import("@/components/StatsPage").then((m) => ({ default: m.StatsPage })),
);
const LazySettingsPage = lazy(() =>
  import("@/components/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const LazyCommandPalette = lazy(() =>
  import("@/components/CommandPalette").then((m) => ({ default: m.CommandPalette })),
);
const CustomTextDialog = lazy(() =>
  import("@/components/CustomTextDialog").then((m) => ({ default: m.CustomTextDialog })),
);

export function App() {
  const store = useAppStore();

  const [focusDimmed, setFocusDimmed] = useState(false);
  const [customTextOpen, setCustomTextOpen] = useState(false);

  const drillRef = useRef<DrillScreenHandle>(null);

  const weakKeysAll = useMemo(() => topWeakKeys(store.allTimeKeys, 12), [store.allTimeKeys]);
  const weakKeys1 = weakKeysAll.slice(0, 1);
  const weakBigrams1 = useMemo(
    () => topWeakBigrams(store.allTimeBigrams, 1),
    [store.allTimeBigrams],
  );
  const slowKeys1 = useMemo(() => topSlowKeys(store.allTimeSpeed, 1), [store.allTimeSpeed]);
  const layout = getKeyboardLayout(store.drillSettings);
  const standard = getKeyboardStandard(store.drillSettings);

  return (
    <>
      <a
        href="#typing-area"
        onClick={(e) => {
          e.preventDefault();
          if (store.mode === "drill" || store.mode === "learn") {
            const input = document.getElementById("typing_practice_input");
            if (input instanceof HTMLElement) {
              input.focus();
              input.scrollIntoView({ block: "center" });
              return;
            }
          }
          const area = document.getElementById("typing-area");
          if (area instanceof HTMLElement) {
            area.focus();
            area.scrollIntoView({ block: "nearest" });
          }
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-primary focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-foreground"
      >
        Skip to typing area
      </a>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="app-live-announcer"
        className="sr-only"
      >
        {store.liveAnnouncement}
      </div>
      <main
        className="mx-auto min-h-dvh w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-10"
        data-protonpass-ignore="true"
        data-lpignore="true"
        data-1p-ignore="true"
      >
        <AppHeader
          mode={store.mode}
          focusDimmed={store.mode === "drill" && focusDimmed}
          daily={store.daily}
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
          onOpenDailyGoalSettings={() => {
            setFocusDimmed(false);
            store.openSettings();
          }}
        />

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
            showLearnPrompt={store.hydrated && !store.learnPromptDismissed}
            onUpdateDrillSettings={store.updateDrillSettings}
            onOpenCustomText={() => setCustomTextOpen(true)}
            onOpenLearn={() => {
              setFocusDimmed(false);
              store.setMode("learn");
            }}
            onDismissLearnPrompt={store.dismissLearnPrompt}
            onCommitRun={store.commitDrillRun}
            onFocusDimmedChange={setFocusDimmed}
          />
        ) : store.mode === "learn" ? (
          <Suspense fallback={<PanelSkeleton lines={5} />}>
            <LazyLearnScreen
              learnState={store.learnState}
              drillSettings={store.drillSettings}
              onTargetWpmChange={store.updateLearnTargetWpm}
              onCommitLesson={store.commitLearnRun}
            />
          </Suspense>
        ) : (
          <div id="typing-area" tabIndex={-1}>
            {store.mode === "settings" ? (
              <Suspense fallback={<PanelSkeleton lines={5} />}>
                <LazySettingsPage
                  drillSettings={store.drillSettings}
                  daily={store.daily}
                  theme={store.theme}
                  dyslexiaFont={store.dyslexiaFont}
                  customTexts={store.customTexts}
                  history={store.history}
                  storedMissedWordsCount={store.storedMissedWords.length}
                  onBack={store.closeSettings}
                  onUpdateDrill={store.updateDrillSettings}
                  onSaveDrill={store.saveDrillSettings}
                  onUpdateDailyGoal={store.updateDailyGoal}
                  onSelectTheme={store.selectTheme}
                  onToggleDyslexiaFont={store.setDyslexiaFont}
                  onImportBackup={store.importFullBackup}
                  onDeleteAllData={store.deleteAllData}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<PanelSkeleton lines={5} />}>
                <LazyStatsPage
                  history={store.history}
                  historyReady={store.historyReady}
                  daily={store.daily}
                  allTimeKeys={store.allTimeKeys}
                  allTimeSpeed={store.allTimeSpeed}
                  layout={layout}
                  standard={standard}
                  onClearHistory={store.clearHistory}
                  onImportHistory={store.setHistory}
                  onDeleteRun={store.deleteHistoryRun}
                  onRestoreRun={store.restoreHistoryRun}
                  onOpenGoalSettings={() => {
                    setFocusDimmed(false);
                    store.openSettings();
                  }}
                  onStartRun={() => {
                    store.setMode("drill");
                    requestAnimationFrame(() => drillRef.current?.focusInput());
                  }}
                />
              </Suspense>
            )}
          </div>
        )}

        <footer className="mt-10 text-center text-[13px] text-muted-foreground">
          Runs locally in your browser. Ctrl/⌘ K opens commands.
        </footer>

        <Suspense fallback={null}>
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
            wordList={store.drillSettings.wordList}
            duration={store.drillSettings.duration}
            drillMode={getDrillMode(store.drillSettings)}
            wordCount={getWordCount(store.drillSettings)}
            quoteLength={getQuoteLength(store.drillSettings)}
            keyboardLayout={layout}
            theme={store.theme}
            dyslexiaFont={store.dyslexiaFont}
            durations={DRILL_DURATIONS}
            mode={store.mode}
            onWordList={(w) => {
              store.setMode("drill");
              store.updateDrillSettings({ wordList: w });
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
            onToggleDyslexiaFont={() => store.setDyslexiaFont(!store.dyslexiaFont)}
            onRestart={() => drillRef.current?.restart()}
            onRepeatSameText={
              store.mode === "drill" ? () => drillRef.current?.repeatSameText() : undefined
            }
            onModeChange={(nextMode) => {
              store.setMode(nextMode);
              if (nextMode !== "drill") setFocusDimmed(false);
            }}
            onOpenSettings={() => {
              setFocusDimmed(false);
              store.openSettings();
            }}
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
