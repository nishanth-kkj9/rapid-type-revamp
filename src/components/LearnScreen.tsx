import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { playDrillKeySound } from "@/lib/arcadeAudio";
import {
  getKeyboardLayout,
  getKeyboardStandard,
  getShowFingerZones,
  resolveTextOptions,
  type DrillSettings,
} from "@/lib/drillSettings";
import {
  generateLearnLesson,
  getFocusKey,
  getKeyRecentAccuracy,
  getNextLockedLetter,
  isKeyMastered,
  LEARN_ACCURACY_THRESHOLD,
  LEARN_MIN_KEY_HITS,
  LETTER_ORDER,
  MAX_LEARN_TARGET_WPM,
  MIN_LEARN_TARGET_WPM,
  targetMsForWpm,
  wpmFromMs,
  type LearnKeyStats,
  type LearnLessonUpdateResult,
  type LearnState,
} from "@/lib/learn";
import { newRunId } from "@/lib/typingStats";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import type { LearnRunCommitPayload } from "@/hooks/useAppStore";
import { useTypingSession } from "@/hooks/useTypingSession";
import { CompactTouchKeyboard } from "@/components/CompactTouchKeyboard";
import { Keyboard } from "@/components/Keyboard";
import { TypingArea } from "@/components/TypingArea";

const MemoKeyboard = memo(Keyboard);
const MemoCompactTouchKeyboard = memo(CompactTouchKeyboard);

interface LearnScreenProps {
  learnState: LearnState;
  drillSettings: DrillSettings;
  onTargetWpmChange: (wpm: number) => void;
  onCommitLesson: (payload: LearnRunCommitPayload) => LearnLessonUpdateResult;
  onOpenAchievements?: (() => void) | undefined;
}

interface LessonResultSnapshot {
  wpm: number;
  accuracy: number;
  elapsed: number;
  update: LearnLessonUpdateResult;
  practicedKeys: string[];
  nextFocusKey: string;
}

export function LearnScreen({
  learnState,
  drillSettings,
  onTargetWpmChange,
  onCommitLesson,
  onOpenAchievements,
}: LearnScreenProps) {
  const coarsePointer = useCoarsePointer();
  const layout = getKeyboardLayout(drillSettings);
  const standard = getKeyboardStandard(drillSettings);
  const showFingerZones = getShowFingerZones(drillSettings);
  const textOpts = resolveTextOptions(drillSettings);

  const [seed, setSeed] = useState(
    () => (Date.now() ^ ((learnState.lessons + 1) * 2654435761)) >>> 0,
  );
  const [focused, setFocused] = useState(true);
  const [errorFlash, setErrorFlash] = useState(false);
  const [pressedChar, setPressedChar] = useState<string | null>(null);
  const [lessonResult, setLessonResult] = useState<LessonResultSnapshot | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const lastSoundSeqRef = useRef(0);
  const onCommitRef = useRef(onCommitLesson);
  onCommitRef.current = onCommitLesson;

  const lesson = useMemo(
    () =>
      generateLearnLesson(learnState, seed, {
        includePunctuation: textOpts.punctuation,
        includeCapitals: textOpts.capitals,
        includeNumbers: textOpts.numbers,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only regenerate lesson passage explicitly on seed or unlocked-list change
    [seed, learnState.unlocked.join(",")],
  );

  const { state, stats, applyInputDelta, restart } = useTypingSession({
    initialText: lesson.text,
    drillMode: "words",
    durationSec: 0,
    strictMode: "off",
    onRunFinished: (finishedState, finalStats) => {
      const activeSeconds = Math.min(
        finalStats.elapsed,
        Math.max(0, Math.round((finishedState.activeTypingMs / 1000) * 10) / 10),
      );
      const update = onCommitRef.current({
        entry: {
          ...finalStats,
          id: newRunId(),
          date: Date.now(),
          difficulty: "learn",
          mode: "learn",
          samples: finishedState.samples,
          ...(finishedState.errorSeconds.length > 0
            ? { errorSeconds: finishedState.errorSeconds }
            : {}),
          ...(Object.keys(finishedState.mistakes).length > 0
            ? { mistakes: finishedState.mistakes }
            : {}),
        },
        keyHits: finishedState.keyHits,
        keySpeed: finishedState.keySpeed,
        mistakes: finishedState.mistakes,
        activeSeconds,
      });

      const practicedSet = new Set<string>();
      for (const k of [
        ...Object.keys(finishedState.keyHits),
        ...Object.keys(finishedState.mistakes),
        ...Object.keys(finishedState.keySpeed),
      ]) {
        const low = k.toLowerCase();
        if (update.state.unlocked.includes(low)) practicedSet.add(low);
      }
      const practicedKeys = Array.from(practicedSet).sort(
        (a, b) => update.state.unlocked.indexOf(a) - update.state.unlocked.indexOf(b),
      );

      setLessonResult({
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        elapsed: finalStats.elapsed,
        update,
        practicedKeys,
        nextFocusKey: getFocusKey(update.state),
      });
    },
  });

  const finished = state.status === "finished";
  const running = state.status === "running";

  const startLessonWithSeed = useCallback(
    (nextSeed: number, overrideState?: LearnState) => {
      const targetState = overrideState ?? learnState;
      const nextLesson = generateLearnLesson(targetState, nextSeed, {
        includePunctuation: textOpts.punctuation,
        includeCapitals: textOpts.capitals,
        includeNumbers: textOpts.numbers,
      });
      setSeed(nextSeed);
      setLessonResult(null);
      setErrorFlash(false);
      setPressedChar(null);
      lastSoundSeqRef.current = 0;
      restart({
        text: nextLesson.text,
        drillMode: "words",
        durationSec: 0,
        strictMode: "off",
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [learnState, restart, textOpts.capitals, textOpts.numbers, textOpts.punctuation],
  );

  const handleNextLesson = useCallback(() => {
    const nextSeed = (seed + 1 + Math.floor(performance.now())) >>> 0;
    startLessonWithSeed(nextSeed, lessonResult?.update.state);
  }, [lessonResult, seed, startLessonWithSeed]);

  const handleRepeatLesson = useCallback(() => {
    startLessonWithSeed(seed);
  }, [seed, startLessonWithSeed]);

  // Sound & transient keycap feedback
  useEffect(() => {
    const evt = state.lastKeyEvent;
    if (!evt || evt.seq === lastSoundSeqRef.current) return;
    lastSoundSeqRef.current = evt.seq;

    playDrillKeySound(drillSettings.sound, evt.isError);
    setPressedChar(evt.char);
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressedChar(null), 130);

    if (evt.isError) {
      setErrorFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setErrorFlash(false), 180);
    }
  }, [state.lastKeyEvent, drillSettings.sound]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  // Enter shortcut when lesson finishes -> Next lesson
  useEffect(() => {
    if (!finished) return;
    const id = requestAnimationFrame(() => nextBtnRef.current?.focus());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "BUTTON" && document.activeElement !== nextBtnRef.current) return;
      e.preventDefault();
      handleNextLesson();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finished, handleNextLesson]);

  const unlockedSet = useMemo(() => new Set(learnState.unlocked), [learnState.unlocked]);
  const lockedKeys = useMemo(() => {
    const locked = new Set<string>();
    for (const ch of LETTER_ORDER) {
      if (!unlockedSet.has(ch)) locked.add(ch);
    }
    return locked;
  }, [unlockedSet]);

  const focusKey = useMemo(() => getFocusKey(learnState), [learnState]);
  const focusStats = learnState.perKey[focusKey];
  const focusHits = focusStats?.hits ?? 0;
  const focusWpm = focusStats ? wpmFromMs(focusStats.emaMs) : 0;
  const focusAccPct =
    focusStats && focusStats.hits > 0 ? Math.round(getKeyRecentAccuracy(focusStats) * 100) : 0;
  const nextLocked = useMemo(() => getNextLockedLetter(learnState.unlocked), [learnState.unlocked]);
  const targetMs = targetMsForWpm(learnState.targetWpm);
  const nextChar = finished ? null : (state.text[state.typed.length] ?? null);
  const wordCount = lesson.words.length;
  const minAccuracyPct = Math.round(LEARN_ACCURACY_THRESHOLD * 100);

  return (
    <section aria-label="Learn touch typing" className="mt-4 space-y-4">
      {/* Top Learn Header Bar */}
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <GraduationCap className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-foreground">Learn</h2>
            <span
              className="rounded-md border border-primary/40 bg-primary/12 px-2 py-0.5 font-mono text-[13px] font-semibold tabular-nums text-primary"
              data-testid="learn-unlocked-count"
            >
              {learnState.unlocked.length}/{LETTER_ORDER.length} letters
            </span>
            <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
              {learnState.lessons} {learnState.lessons === 1 ? "lesson" : "lessons"}
            </span>
          </div>
          <p
            className="text-[13px] text-muted-foreground sm:text-sm"
            data-testid="learn-unlock-status"
          >
            {nextLocked ? (
              <>
                Unlock{" "}
                <strong className="font-mono text-foreground">{nextLocked.toUpperCase()}</strong>{" "}
                when all keys reach{" "}
                <strong className="font-mono tabular-nums text-primary">
                  {learnState.targetWpm} WPM
                </strong>{" "}
                and{" "}
                <strong className="font-mono tabular-nums text-primary">
                  {minAccuracyPct}% accuracy
                </strong>
                .
              </>
            ) : (
              "All 26 letters unlocked! Keep refining your speed and rhythm across the full alphabet."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/50 px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <label htmlFor="learn-target-wpm" className="font-medium text-foreground">
                Target WPM:{" "}
                <strong className="font-mono tabular-nums text-primary">
                  {learnState.targetWpm}
                </strong>
              </label>
              <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                &le;{Math.round(targetMs)} ms/key
              </span>
            </div>
            <input
              id="learn-target-wpm"
              aria-label="Target WPM"
              type="range"
              min={MIN_LEARN_TARGET_WPM}
              max={MAX_LEARN_TARGET_WPM}
              step={5}
              value={learnState.targetWpm}
              onChange={(e) => onTargetWpmChange(Number(e.target.value))}
              className="h-11 w-40 cursor-pointer accent-primary sm:h-6"
            />
          </div>

          <button
            type="button"
            onClick={handleNextLesson}
            className="flex min-h-11 sm:min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            New text
          </button>
        </div>
      </div>

      <div
        role="status"
        aria-label="Live lesson metrics"
        className="flex h-10 items-center justify-between gap-2 overflow-hidden rounded-xl border border-border bg-card/80 px-3 text-[13px] tabular-nums sm:px-4"
      >
        <span className="truncate text-muted-foreground">
          {running || finished ? (
            <>
              <strong className="font-mono text-foreground">
                {state.typed.length}/{state.text.length}
              </strong>{" "}
              chars · {wordCount} words
            </>
          ) : (
            <>
              Lesson {learnState.lessons + 1} · {wordCount} words · {learnState.unlocked.length}{" "}
              letters
            </>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {drillSettings.showLiveWpm || finished ? (
            <>
              <span>
                <strong className="font-mono text-primary">
                  {finished || (running && stats.elapsed > 1) ? Math.round(stats.wpm) : "—"}
                </strong>{" "}
                WPM
              </span>
              <span>
                <strong className="font-mono text-foreground">
                  {running || finished ? `${stats.accuracy.toFixed(0)}%` : "—%"}
                </strong>
              </span>
            </>
          ) : null}
          <span>
            Focus <strong className="font-mono text-accent">{focusKey.toUpperCase()}</strong>
          </span>
        </div>
      </div>

      {drillSettings.showKeyboard && coarsePointer ? (
        <MemoCompactTouchKeyboard
          nextChar={nextChar}
          errorFlash={errorFlash}
          layout={layout}
          standard={standard}
          showFingerZones={showFingerZones}
          lockedKeys={lockedKeys}
          focusKey={focusKey}
        />
      ) : null}

      {/* Reused Typing Area (no PB glow, no pace caret) */}
      <TypingArea
        inputRef={inputRef}
        text={state.text}
        typed={state.typed}
        caretStyle={drillSettings.caretStyle}
        paceCaretIndex={null}
        strictRejectSeq={state.strictRejectSeq}
        drillMode="words"
        quoteAuthor={null}
        finished={finished}
        focused={focused}
        errorFlash={errorFlash}
        isRecord={false}
        finalWpm={stats.wpm}
        finalAccuracy={stats.accuracy}
        onFocusChange={setFocused}
        onInputChange={applyInputDelta}
      />

      {/* Lesson Results Panel */}
      {finished && lessonResult ? (
        <section
          aria-label="Lesson results"
          className="panel space-y-4 p-5 sm:p-6"
          data-testid="learn-results"
        >
          {lessonResult.update.newlyUnlockedKey ? (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/60 bg-accent/15 px-4 py-3"
              data-testid="learn-unlock-celebration"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-5 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-foreground">
                    New letter unlocked:{" "}
                    <span className="font-mono text-base text-primary">
                      {lessonResult.update.newlyUnlockedKey.toUpperCase()}
                    </span>
                    !
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {lessonResult.update.state.unlocked.length}/{LETTER_ORDER.length} letters active
                    · Next focus key:{" "}
                    <strong className="font-mono text-foreground">
                      {lessonResult.nextFocusKey.toUpperCase()}
                    </strong>
                  </div>
                </div>
              </div>
              {onOpenAchievements ? (
                <button
                  type="button"
                  onClick={onOpenAchievements}
                  className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary"
                >
                  View achievements
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-baseline gap-6">
              <div>
                <div className="text-[13px] text-muted-foreground">Lesson WPM</div>
                <div className="font-mono text-3xl font-bold tabular-nums text-primary">
                  {Math.round(lessonResult.wpm)}
                </div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Accuracy</div>
                <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
                  {lessonResult.accuracy.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Time</div>
                <div className="font-mono text-xl font-semibold tabular-nums text-muted-foreground">
                  {lessonResult.elapsed.toFixed(1)}s
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRepeatLesson}
                className="flex min-h-11 sm:min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Repeat
              </button>
              <button
                ref={nextBtnRef}
                type="button"
                onClick={handleNextLesson}
                className="flex min-h-11 sm:min-h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Next lesson
                <ArrowRight className="size-4" aria-hidden="true" />
                <kbd className="ml-1 rounded bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[13px]">
                  Enter
                </kbd>
              </button>
            </div>
          </div>

          {lessonResult.practicedKeys.length > 0 ? (
            <div className="border-t border-border/60 pt-3">
              <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
                Per-key speed change
              </div>
              <div className="flex flex-wrap gap-2">
                {lessonResult.practicedKeys.map((ch) => {
                  const prevStats: LearnKeyStats | undefined = lessonResult.update.prevPerKey[ch];
                  const nextStats: LearnKeyStats | undefined = lessonResult.update.state.perKey[ch];
                  const nextWpm = nextStats ? wpmFromMs(nextStats.emaMs) : 0;
                  const prevWpm = prevStats ? wpmFromMs(prevStats.emaMs) : 0;
                  const deltaWpm = prevStats && prevStats.emaMs > 0 ? nextWpm - prevWpm : null;
                  const newlyMastered = lessonResult.update.newlyMasteredKeys.includes(ch);
                  const accPct = Math.round(getKeyRecentAccuracy(nextStats) * 100);

                  return (
                    <div
                      key={ch}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[13px] tabular-nums ${
                        newlyMastered
                          ? "border-accent/60 bg-accent/15 text-foreground"
                          : "border-border bg-secondary/40 text-foreground"
                      }`}
                    >
                      <span className="font-bold">{ch.toUpperCase()}</span>
                      <span>{nextWpm > 0 ? `${nextWpm} wpm` : "—"}</span>
                      {deltaWpm !== null && deltaWpm !== 0 ? (
                        <span
                          className={
                            deltaWpm > 0 ? "text-foreground font-semibold" : "text-destructive"
                          }
                        >
                          {deltaWpm > 0 ? `+${deltaWpm}` : deltaWpm}
                        </span>
                      ) : prevStats?.emaMs ? (
                        <span className="text-muted-foreground">+0</span>
                      ) : (
                        <span className="text-primary">new</span>
                      )}
                      <span className="text-muted-foreground">{accPct}%</span>
                      {newlyMastered ? (
                        <CheckCircle2
                          className="size-3.5 text-accent"
                          aria-label={`${ch} mastered`}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Interactive Keyboard Guide with Locked & Focus Overlay */}
      {drillSettings.showKeyboard && !coarsePointer ? (
        <MemoKeyboard
          nextChar={nextChar}
          errorFlash={errorFlash}
          pressedChar={pressedChar}
          layout={layout}
          standard={standard}
          showFingerZones={showFingerZones}
          lockedKeys={lockedKeys}
          focusKey={focusKey}
        />
      ) : null}

      {/* Key progress row */}
      <section
        className="panel space-y-2.5 p-3.5 sm:p-4"
        aria-label="Key progress"
        data-testid="learn-key-progress"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Key progress ({learnState.unlocked.length}/{LETTER_ORDER.length})
          </h3>
          <span
            className="text-[13px] tabular-nums text-muted-foreground"
            data-testid="learn-key-progress-requirements"
          >
            Need {learnState.targetWpm} WPM, {minAccuracyPct}% accuracy, {LEARN_MIN_KEY_HITS} hits
          </span>
        </div>

        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Unlocked letters in order">
          {learnState.unlocked.map((ch) => {
            const ks = learnState.perKey[ch];
            const mastered = isKeyMastered(ks, learnState.targetWpm);
            const isFocus = ch === focusKey;
            const hits = ks?.hits ?? 0;
            const acc = hits > 0 ? Math.round(getKeyRecentAccuracy(ks) * 100) : 0;
            const wpm = ks ? wpmFromMs(ks.emaMs) : 0;

            return (
              <li
                key={ch}
                data-learn-key={ch}
                data-focus={isFocus ? "true" : undefined}
                data-mastered={mastered ? "true" : undefined}
                aria-current={isFocus ? "step" : undefined}
                title={`${ch.toUpperCase()}: ${wpm} WPM, ${acc}% accuracy, ${hits}/${LEARN_MIN_KEY_HITS} hits`}
                className={`inline-flex min-w-8 items-center justify-center gap-1 rounded-lg border px-2 py-1 font-mono text-[13px] font-semibold tabular-nums ${
                  isFocus
                    ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary"
                    : mastered
                      ? "border-accent/55 bg-accent/12 text-foreground"
                      : "border-border bg-secondary/35 text-muted-foreground"
                }`}
              >
                <span>{ch.toUpperCase()}</span>
                {mastered ? (
                  <CheckCircle2 className="size-3 text-accent" aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <p
          className="text-[13px] tabular-nums text-muted-foreground"
          data-testid="learn-key-progress-detail"
        >
          Working on <strong className="font-mono text-foreground">{focusKey}</strong>:{" "}
          <span className="font-mono">{focusWpm}</span> WPM,{" "}
          <span className="font-mono">{focusAccPct}%</span> /{" "}
          <span className="font-mono">{minAccuracyPct}%</span> accuracy,{" "}
          <span className="font-mono">
            {focusHits}/{LEARN_MIN_KEY_HITS}
          </span>{" "}
          hits
        </p>
      </section>
    </section>
  );
}
