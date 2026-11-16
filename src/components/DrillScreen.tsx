import { forwardRef, memo, useImperativeHandle } from "react";
import type { AchievementState } from "@/lib/achievements";
import type { CustomTextEntry } from "@/lib/customTexts";
import {
  getKeyboardLayout,
  getKeyboardStandard,
  getShowFingerZones,
  type DrillSettings,
} from "@/lib/drillSettings";
import type { KeySpeedMap } from "@/lib/keySpeed";
import type { HistoryEntry } from "@/lib/typingStats";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useDrillController, type DrillRunCommitPayload } from "@/hooks/useDrillController";
import { CompactTouchKeyboard } from "@/components/CompactTouchKeyboard";
import { DrillControls } from "@/components/DrillControls";
import { StatCards } from "@/components/StatCards";
import { TypingArea } from "@/components/TypingArea";
import { ResultsPanel } from "@/components/ResultsPanel";
import { Keyboard } from "@/components/Keyboard";

const MemoKeyboard = memo(Keyboard);
const MemoCompactTouchKeyboard = memo(CompactTouchKeyboard);

export type { DrillRunCommitPayload };

export interface DrillScreenHandle {
  restart: (overrideSettings?: DrillSettings) => void;
  focusInput: () => void;
  practiceWeakKeys: () => void;
  practiceSlowKeys: () => void;
  practiceMissedWords: () => void;
}

interface DrillScreenProps {
  drillSettings: DrillSettings;
  history: HistoryEntry[];
  allTimeKeys: Record<string, number>;
  allTimeBigrams: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  storedMissedWords: string[];
  customTexts: CustomTextEntry[];
  achievements: AchievementState;
  onUpdateDrillSettings: (patch: Partial<DrillSettings>) => void;
  onOpenCustomText: () => void;
  onCommitRun: (payload: DrillRunCommitPayload) => void;
  onSwitchToShooter: () => void;
  onOpenAchievements?: (() => void) | undefined;
  onFocusDimmedChange: (dimmed: boolean) => void;
}

export const DrillScreen = forwardRef<DrillScreenHandle, DrillScreenProps>(function DrillScreen(
  {
    drillSettings,
    history,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    storedMissedWords,
    customTexts,
    achievements,
    onUpdateDrillSettings,
    onOpenCustomText,
    onCommitRun,
    onSwitchToShooter,
    onOpenAchievements,
    onFocusDimmedChange,
  },
  ref,
) {
  const coarsePointer = useCoarsePointer();
  const layout = getKeyboardLayout(drillSettings);
  const standard = getKeyboardStandard(drillSettings);
  const showFingerZones = getShowFingerZones(drillSettings);

  const c = useDrillController({
    drillSettings,
    history,
    allTimeKeys,
    allTimeBigrams,
    allTimeSpeed,
    storedMissedWords,
    customTexts,
    achievements,
    onCommitRun,
    onFocusDimmedChange,
  });

  useImperativeHandle(
    ref,
    () => ({
      restart: (overrideSettings) => c.restartWithSettings(overrideSettings),
      focusInput: c.focusInput,
      practiceWeakKeys: c.practiceWeakKeys,
      practiceSlowKeys: c.practiceSlowKeys,
      practiceMissedWords: c.practiceMissedWords,
    }),
    [c],
  );

  const nextChar = c.finished ? null : (c.state.text[c.state.typed.length] ?? null);

  return (
    <>
      <DrillControls
        settings={drillSettings}
        focusDimmed={c.running && !c.finished}
        activeCustomText={c.activeCustomText}
        onUpdateSettings={onUpdateDrillSettings}
        onOpenCustomText={onOpenCustomText}
        onClearCustomText={() => onUpdateDrillSettings({ customTextId: null })}
      />
      <StatCards
        shown={c.stats}
        running={c.running}
        finished={c.finished}
        settled={c.elapsed > 1000}
        showLiveWpm={drillSettings.showLiveWpm}
        drillMode={c.drillMode}
        duration={drillSettings.duration}
        remaining={c.remaining}
        wordCount={c.wordCount}
        typed={c.state.typed}
        textLength={c.state.text.length}
        quoteAuthor={c.state.quoteAuthor}
        samplesCount={c.state.samples.length}
        previousBest={c.previousBest}
        progress={c.progress}
      />
      {drillSettings.showKeyboard && coarsePointer ? (
        <div className="mb-3">
          <MemoCompactTouchKeyboard
            nextChar={nextChar}
            errorFlash={c.errorFlash}
            layout={layout}
            standard={standard}
            showFingerZones={showFingerZones}
          />
        </div>
      ) : null}
      <TypingArea
        inputRef={c.inputRef}
        text={c.state.text}
        typed={c.state.typed}
        caretStyle={drillSettings.caretStyle}
        drillMode={c.drillMode}
        quoteAuthor={c.state.quoteAuthor}
        finished={c.finished}
        focused={c.focused}
        errorFlash={c.errorFlash}
        isRecord={c.isRecord}
        finalWpm={c.stats.wpm}
        finalAccuracy={c.stats.accuracy}
        onFocusChange={c.setFocused}
        onInputChange={c.applyInputDelta}
      />
      {c.resultData ? (
        <ResultsPanel
          resultsRef={c.resultsRef}
          againRef={c.againRef}
          result={c.resultData}
          onRestart={() => c.restartWithSettings()}
          onPracticeWeakKeys={c.practiceWeakKeys}
          onPracticeSlowKeys={c.practiceSlowKeys}
          onPracticeMissedWords={c.practiceMissedWords}
          onSwitchToShooter={onSwitchToShooter}
          onOpenAchievements={onOpenAchievements}
        />
      ) : null}
      {drillSettings.showKeyboard && !coarsePointer ? (
        <div className="mt-4">
          <MemoKeyboard
            nextChar={nextChar}
            errorFlash={c.errorFlash}
            pressedChar={c.pressedChar}
            layout={layout}
            standard={standard}
            showFingerZones={showFingerZones}
          />
        </div>
      ) : null}
    </>
  );
});
