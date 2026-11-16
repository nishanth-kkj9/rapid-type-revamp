import { lazy, memo, Suspense, useRef, useState } from "react";
import { CompactTouchKeyboard } from "@/components/CompactTouchKeyboard";
import { Keyboard } from "@/components/Keyboard";
import { ProblemKeys } from "@/components/ProblemKeys";
import { KeyHeatmap } from "@/components/KeyHeatmap";
import { AchievementsStrip } from "@/components/AchievementsStrip";
import type { AchievementState } from "@/lib/achievements";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { ShooterSettings } from "@/lib/shooterSettings";
import type { ShooterRunSummary } from "@/lib/typingStats";

const LazyWordShooter = lazy(() =>
  import("@/components/WordShooter").then((m) => ({ default: m.WordShooter })),
);
const LazyWordShooterProgress = lazy(() =>
  import("@/components/WordShooterProgress").then((m) => ({ default: m.WordShooterProgress })),
);

const MemoKeyboard = memo(Keyboard);
const MemoCompactTouchKeyboard = memo(CompactTouchKeyboard);

interface ShooterScreenProps {
  settings: ShooterSettings;
  missedWords: string[];
  weakKeysAll: string[];
  allTimeKeys: Record<string, number>;
  shooterBest: number;
  achState: AchievementState;
  effectiveShooterSummary: ShooterRunSummary | null;
  coarsePointer: boolean;
  layout: KeyboardLayoutId;
  standard: KeyboardStandard;
  showFingerZones: boolean;
  onOpenSettings: () => void;
  onUpdateSettings: (patch: Partial<ShooterSettings>) => void;
  onCommitRun: (s: ShooterRunSummary, mistakes: Record<string, number>) => void;
  onSummaryChange: (summary: ShooterRunSummary) => void;
  onOpenAchievements: () => void;
}

export function ShooterScreen({
  settings,
  missedWords,
  weakKeysAll,
  allTimeKeys,
  shooterBest,
  achState,
  effectiveShooterSummary,
  coarsePointer,
  layout,
  standard,
  showFingerZones,
  onOpenSettings,
  onUpdateSettings,
  onCommitRun,
  onSummaryChange,
  onOpenAchievements,
}: ShooterScreenProps) {
  const [activeShooterChar, setActiveShooterChar] = useState<string | null>(null);
  const [shooterPressedChar, setShooterPressedChar] = useState<string | null>(null);
  const [shooterMistakes, setShooterMistakes] = useState<Record<string, number>>({});
  const shooterMistakesRef = useRef<Record<string, number>>({});
  const pressTimerRef = useRef<number | null>(null);

  return (
    <>
      <Suspense fallback={<div className="h-64 sm:h-96" />}>
        <LazyWordShooter
          settings={settings}
          missedWords={missedWords}
          weakKeys={weakKeysAll}
          initialBest={shooterBest}
          onOpenSettings={onOpenSettings}
          onUpdateSettings={onUpdateSettings}
          onActiveTargetCharChange={setActiveShooterChar}
          onCharPressed={(char) => {
            setShooterPressedChar(char);
            if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
            pressTimerRef.current = window.setTimeout(() => setShooterPressedChar(null), 160);
          }}
          onRunComplete={(s) => {
            onSummaryChange(s);
            onCommitRun(s, shooterMistakesRef.current);
          }}
          onWrongKey={(expectedChar) => {
            const next = {
              ...shooterMistakesRef.current,
              [expectedChar]: (shooterMistakesRef.current[expectedChar] ?? 0) + 1,
            };
            shooterMistakesRef.current = next;
            setShooterMistakes(next);
          }}
          onStart={() => {
            shooterMistakesRef.current = {};
            setShooterMistakes({});
          }}
        />
      </Suspense>

      {settings.showKeyboard && coarsePointer ? (
        <div className="mt-3">
          <MemoCompactTouchKeyboard
            nextChar={activeShooterChar}
            errorFlash={false}
            layout={layout}
            standard={standard}
            showFingerZones={showFingerZones}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {effectiveShooterSummary ? (
          <Suspense fallback={null}>
            <LazyWordShooterProgress
              summary={effectiveShooterSummary}
              samples={effectiveShooterSummary.samples}
              highScore={shooterBest}
              className="mb-1"
            />
          </Suspense>
        ) : null}
        <ProblemKeys mistakes={shooterMistakes} />
        {Object.keys(allTimeKeys).length > 0 ? (
          <ProblemKeys mistakes={allTimeKeys} limit={8} label="All-time problem keys" />
        ) : null}
        {Object.keys(allTimeKeys).length > 0 ? (
          <KeyHeatmap mistakes={allTimeKeys} layout={layout} standard={standard} />
        ) : null}
        <AchievementsStrip
          unlocked={achState.unlocked}
          counters={achState.counters}
          onOpenAchievements={onOpenAchievements}
        />
      </div>

      {settings.showKeyboard && !coarsePointer ? (
        <div className="mt-4">
          <MemoKeyboard
            nextChar={activeShooterChar}
            errorFlash={false}
            pressedChar={shooterPressedChar}
            layout={layout}
            standard={standard}
            showFingerZones={showFingerZones}
          />
        </div>
      ) : null}
    </>
  );
}
