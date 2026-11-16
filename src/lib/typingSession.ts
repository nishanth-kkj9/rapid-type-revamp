import type { DrillMode } from "./drillSettings";
import { PAUSE_CAP_MS, type KeySpeedMap } from "./keySpeed";
import { computeStats, reconcile, type RunSlowWord, type RunStats } from "./typingStats";

export type SessionStatus = "idle" | "running" | "finished";

export interface WordTimingEntry {
  totalMs: number;
  chars: number;
  count: number;
}

export interface TypingSessionState {
  status: SessionStatus;
  text: string;
  quoteAuthor: string | null;
  drillMode: DrillMode;
  durationSec: number;
  typed: string;
  startedAtMs: number | null;
  elapsedMs: number;
  /** Keystroke-level correct character presses (preserved across backspace). */
  keystrokesCorrect: number;
  /** Keystroke-level incorrect character presses (preserved across backspace). */
  keystrokesIncorrect: number;
  /** Expected character -> error count recorded at keystroke time. */
  mistakes: Record<string, number>;
  /** Two-letter expected bigrams where the second character errored. */
  bigramMistakes: Record<string, number>;
  /** Target words where at least one error keystroke occurred. */
  missedWords: string[];
  /** Per-word total error keystroke counts recorded during the run. */
  wordMistakeCounts: Record<string, number>;
  /** Per-word duration accumulation [totalMs, chars, completedCount] for slowest-word metrics. */
  wordTimings: Record<string, WordTimingEntry>;
  /** Start index of the word currently being typed for timing tracking. */
  activeWordIndex: number;
  /** Timestamp when typing began on `activeWordIndex`. */
  activeWordStartMs: number | null;
  /** Elapsed seconds (rounded 0.1s) of every error keystroke in the run. */
  errorSeconds: number[];
  /** Monotonic cumulative net-progress samples (per-second + final partial second). */
  samples: number[];
  /** Elapsed ms of the most recent recorded sample. */
  lastSampledMs: number;
  /** Highest reconciled correct character count reached during the run. */
  maxProgress: number;
  /** Per-key speed telemetry [totalMs, count]. */
  keySpeed: KeySpeedMap;
  /** Timestamp of last consecutive clean correct keystroke. */
  lastCorrectAtMs: number | null;
  /** Accumulated active typing duration in ms (idle pauses capped at 2s). */
  activeTypingMs: number;
  /** Timestamp of the most recent key or backspace input. */
  lastKeyInputMs: number | null;
  /** True when practicing missed words so missedWords are preserved on restart/finish. */
  keepMissedWords: boolean;
  /** Last keystroke feedback for transient UI cues (sound/flash). */
  lastKeyEvent: {
    seq: number;
    char: string;
    isError: boolean;
  } | null;
}

export type TypingSessionAction =
  | { type: "START"; nowMs: number }
  | { type: "KEY"; value: string; nowMs: number; appendText?: string | undefined }
  | { type: "BACKSPACE"; count?: number | undefined; nowMs?: number | undefined }
  | { type: "TICK"; nowMs: number }
  | { type: "FINISH"; nowMs?: number | undefined }
  | {
      type: "RESTART";
      text: string;
      quoteAuthor?: string | null | undefined;
      drillMode: DrillMode;
      durationSec: number;
      keepMissedWords?: boolean | undefined;
    };

export interface CreateSessionOptions {
  text: string;
  quoteAuthor?: string | null | undefined;
  drillMode: DrillMode;
  durationSec: number;
  keepMissedWords?: boolean | undefined;
  missedWords?: string[] | undefined;
}

const MAX_ERROR_EVENTS = 500;
const WORD_TIMING_MAX_MS = 12_000;

export const ACTIVE_INPUT_GAP_CAP_MS = 2000;
const INITIAL_KEYSTROKE_CREDIT_MS = 200;

export function createInitialSessionState(opts: CreateSessionOptions): TypingSessionState {
  return {
    status: "idle",
    text: opts.text,
    quoteAuthor: opts.quoteAuthor ?? null,
    drillMode: opts.drillMode,
    durationSec: opts.durationSec,
    typed: "",
    startedAtMs: null,
    elapsedMs: 0,
    keystrokesCorrect: 0,
    keystrokesIncorrect: 0,
    mistakes: {},
    bigramMistakes: {},
    missedWords: opts.keepMissedWords ? [...(opts.missedWords ?? [])] : [],
    wordMistakeCounts: {},
    wordTimings: {},
    activeWordIndex: 0,
    activeWordStartMs: null,
    errorSeconds: [],
    samples: [],
    lastSampledMs: 0,
    maxProgress: 0,
    keySpeed: {},
    lastCorrectAtMs: null,
    activeTypingMs: 0,
    lastKeyInputMs: null,
    keepMissedWords: Boolean(opts.keepMissedWords),
    lastKeyEvent: null,
  };
}

function extractTargetWord(text: string, index: number): string | null {
  const startIdx = text.lastIndexOf(" ", index) + 1;
  const spaceAfter = text.indexOf(" ", index);
  const endIdx = spaceAfter === -1 ? text.length : spaceAfter;
  const fullWord = text.slice(startIdx, endIdx);
  if (!fullWord) return null;
  const cleanWord = fullWord.replace(/[^\w]/g, "").toLowerCase();
  return cleanWord.length > 1 ? cleanWord : null;
}

function getWordSpanAt(
  text: string,
  index: number,
): { start: number; end: number; clean: string | null } {
  const start = text.lastIndexOf(" ", index) + 1;
  const spaceAfter = text.indexOf(" ", index);
  const end = spaceAfter === -1 ? text.length : spaceAfter;
  const raw = text.slice(start, end);
  const clean = raw.replace(/[^\w]/g, "").toLowerCase();
  return { start, end, clean: clean.length > 1 ? clean : null };
}

function appendSamplesUpTo(
  samples: readonly number[],
  lastSampledMs: number,
  targetElapsedMs: number,
  currentProgress: number,
  includePartialTail: boolean,
): { samples: number[]; lastSampledMs: number } {
  const nextSamples = [...samples];
  let nextLastMs = lastSampledMs;
  let runningMax = nextSamples.length > 0 ? nextSamples[nextSamples.length - 1]! : 0;
  const clampedProgress = Math.max(runningMax, currentProgress);

  while ((nextSamples.length + 1) * 1000 <= targetElapsedMs) {
    runningMax = Math.max(runningMax, clampedProgress);
    nextSamples.push(runningMax);
    nextLastMs = nextSamples.length * 1000;
  }

  if (includePartialTail && targetElapsedMs > nextLastMs) {
    runningMax = Math.max(runningMax, clampedProgress);
    nextSamples.push(runningMax);
    nextLastMs = targetElapsedMs;
  }

  return { samples: nextSamples, lastSampledMs: nextLastMs };
}

function finalizeSession(state: TypingSessionState, nowMs?: number): TypingSessionState {
  if (state.status === "finished" || state.status === "idle") return state;

  const rawElapsed =
    nowMs !== undefined && state.startedAtMs !== null
      ? Math.max(state.elapsedMs, nowMs - state.startedAtMs)
      : state.elapsedMs;
  const finalElapsedMs =
    state.drillMode === "time" ? state.durationSec * 1000 : Math.max(0, rawElapsed);

  const currentCorrect = reconcile(state.text, state.typed).correct;
  const nextMaxProgress = Math.max(state.maxProgress, currentCorrect);
  const { samples, lastSampledMs } = appendSamplesUpTo(
    state.samples,
    state.lastSampledMs,
    finalElapsedMs,
    nextMaxProgress,
    true,
  );

  return {
    ...state,
    status: "finished",
    elapsedMs: finalElapsedMs,
    maxProgress: nextMaxProgress,
    samples,
    lastSampledMs,
    lastCorrectAtMs: null,
  };
}

export function typingSessionReducer(
  state: TypingSessionState,
  action: TypingSessionAction,
): TypingSessionState {
  switch (action.type) {
    case "START": {
      if (state.status !== "idle") return state;
      return {
        ...state,
        status: "running",
        startedAtMs: action.nowMs,
        elapsedMs: 0,
      };
    }

    case "KEY": {
      if (state.status === "finished" || !state.text) return state;

      const startedAtMs = state.status === "idle" ? action.nowMs : state.startedAtMs;
      const status: SessionStatus = "running";
      const elapsedMs =
        startedAtMs !== null ? Math.max(state.elapsedMs, action.nowMs - startedAtMs) : 0;

      const remainingRoom = Math.max(0, state.text.length - state.typed.length);
      const incoming = action.value.slice(0, remainingRoom);
      if (incoming.length === 0) return state;

      const activeDeltaMs =
        state.lastKeyInputMs !== null
          ? Math.min(ACTIVE_INPUT_GAP_CAP_MS, Math.max(0, action.nowMs - state.lastKeyInputMs))
          : INITIAL_KEYSTROKE_CREDIT_MS;
      const activeTypingMs = state.activeTypingMs + activeDeltaMs;

      let nextTyped = state.typed;
      let keystrokesCorrect = state.keystrokesCorrect;
      let keystrokesIncorrect = state.keystrokesIncorrect;
      let mistakes = state.mistakes;
      let mistakesCopied = false;
      let bigramMistakes = state.bigramMistakes;
      let bigramsCopied = false;
      let missedWords = state.missedWords;
      let missedCopied = false;
      let wordMistakeCounts = state.wordMistakeCounts;
      let wordMistakesCopied = false;
      let wordTimings = state.wordTimings;
      let wordTimingsCopied = false;
      let activeWordIndex = state.activeWordIndex;
      let activeWordStartMs = state.activeWordStartMs;
      let errorSeconds = state.errorSeconds;
      let errorSecondsCopied = false;
      let keySpeed = state.keySpeed;
      let speedCopied = false;
      let lastCorrectAtMs = state.lastCorrectAtMs;
      let lastChar = state.lastKeyEvent?.char ?? "";
      let lastIsError = false;

      for (let idx = 0; idx < incoming.length; idx++) {
        const ch = incoming[idx]!;
        const pos = nextTyped.length;
        const expected = state.text[pos];
        const isError = expected === undefined || ch !== expected;
        lastChar = ch;
        lastIsError = isError;

        const span = getWordSpanAt(state.text, pos);
        if (expected !== " " && activeWordStartMs === null) {
          activeWordIndex = span.start;
          activeWordStartMs = action.nowMs;
        } else if (expected !== " " && span.start !== activeWordIndex) {
          activeWordIndex = span.start;
          activeWordStartMs = action.nowMs;
        }

        if (isError) {
          keystrokesIncorrect += 1;
          if (errorSeconds.length < MAX_ERROR_EVENTS) {
            if (!errorSecondsCopied) {
              errorSeconds = [...errorSeconds];
              errorSecondsCopied = true;
            }
            errorSeconds.push(Math.round(Math.max(0, elapsedMs / 1000) * 10) / 10);
          }

          if (expected !== undefined) {
            if (!mistakesCopied) {
              mistakes = { ...mistakes };
              mistakesCopied = true;
            }
            mistakes[expected] = (mistakes[expected] ?? 0) + 1;

            if (pos > 0) {
              const bg = state.text.slice(pos - 1, pos + 1).toLowerCase();
              if (/^[a-z]{2}$/.test(bg)) {
                if (!bigramsCopied) {
                  bigramMistakes = { ...bigramMistakes };
                  bigramsCopied = true;
                }
                bigramMistakes[bg] = (bigramMistakes[bg] ?? 0) + 1;
              }
            }

            const word = extractTargetWord(state.text, pos);
            if (word) {
              if (!wordMistakesCopied) {
                wordMistakeCounts = { ...wordMistakeCounts };
                wordMistakesCopied = true;
              }
              wordMistakeCounts[word] = (wordMistakeCounts[word] ?? 0) + 1;

              if (!missedWords.includes(word)) {
                if (!missedCopied) {
                  missedWords = [...missedWords];
                  missedCopied = true;
                }
                missedWords.push(word);
              }
            }
          }
          lastCorrectAtMs = null;
        } else {
          keystrokesCorrect += 1;
          const prevExpected = pos > 0 ? state.text[pos - 1] : undefined;
          const prevTyped = pos > 0 ? nextTyped[pos - 1] : undefined;
          const chainClean =
            incoming.length === 1 &&
            pos >= 1 &&
            prevExpected !== undefined &&
            prevTyped !== undefined &&
            prevExpected === prevTyped;

          if (chainClean && lastCorrectAtMs !== null) {
            const rawInterval = action.nowMs - lastCorrectAtMs;
            if (rawInterval > 0 && rawInterval <= PAUSE_CAP_MS) {
              const interval = Math.max(1, Math.round(rawInterval));
              if (!speedCopied) {
                keySpeed = { ...keySpeed };
                speedCopied = true;
              }
              const entry = keySpeed[ch] ?? [0, 0];
              keySpeed[ch] = [entry[0] + interval, entry[1] + 1];
            }
          }
          lastCorrectAtMs = incoming.length === 1 ? action.nowMs : null;

          // Complete word timing when typing the last char of a word cleanly
          const isWordEnd =
            expected !== " " &&
            pos === span.end - 1 &&
            span.clean !== null &&
            activeWordStartMs !== null &&
            activeWordIndex === span.start;
          if (isWordEnd && span.clean) {
            const wordDuration = Math.max(40, action.nowMs - activeWordStartMs!);
            if (wordDuration <= WORD_TIMING_MAX_MS) {
              if (!wordTimingsCopied) {
                wordTimings = { ...wordTimings };
                wordTimingsCopied = true;
              }
              const prevTiming = wordTimings[span.clean] ?? {
                totalMs: 0,
                chars: 0,
                count: 0,
              };
              wordTimings[span.clean] = {
                totalMs: prevTiming.totalMs + wordDuration,
                chars: prevTiming.chars + Math.max(1, span.end - span.start),
                count: prevTiming.count + 1,
              };
            }
            activeWordStartMs = null;
          }
        }

        nextTyped += ch;
      }

      const nextText =
        action.appendText &&
        state.drillMode === "time" &&
        nextTyped.length >= state.text.length - 60 &&
        state.text.length < 6000
          ? `${state.text} ${action.appendText}`
          : state.text;

      const currentCorrect = reconcile(nextText, nextTyped).correct;
      const nextMaxProgress = Math.max(state.maxProgress, currentCorrect);

      const nextState: TypingSessionState = {
        ...state,
        status,
        text: nextText,
        typed: nextTyped,
        startedAtMs,
        elapsedMs,
        keystrokesCorrect,
        keystrokesIncorrect,
        mistakes,
        bigramMistakes,
        missedWords,
        wordMistakeCounts,
        wordTimings,
        activeWordIndex,
        activeWordStartMs,
        errorSeconds,
        maxProgress: nextMaxProgress,
        keySpeed,
        lastCorrectAtMs,
        activeTypingMs,
        lastKeyInputMs: action.nowMs,
        lastKeyEvent: {
          seq: (state.lastKeyEvent?.seq ?? 0) + 1,
          char: lastChar,
          isError: lastIsError,
        },
      };

      if (
        (state.drillMode === "words" || state.drillMode === "quote") &&
        nextTyped.length >= nextText.length
      ) {
        return finalizeSession(nextState, action.nowMs);
      }

      return nextState;
    }

    case "BACKSPACE": {
      if (state.status !== "running" || state.typed.length === 0) return state;
      const deleteCount = Math.max(1, Math.min(state.typed.length, action.count ?? 1));
      const nextTyped = state.typed.slice(0, state.typed.length - deleteCount);
      const nextSpan = getWordSpanAt(state.text, nextTyped.length);
      const bsDelta =
        action.nowMs !== undefined && state.lastKeyInputMs !== null
          ? Math.min(ACTIVE_INPUT_GAP_CAP_MS, Math.max(0, action.nowMs - state.lastKeyInputMs))
          : 0;
      return {
        ...state,
        typed: nextTyped,
        activeWordIndex: nextSpan.start,
        lastCorrectAtMs: null,
        activeTypingMs: state.activeTypingMs + bsDelta,
        ...(action.nowMs !== undefined ? { lastKeyInputMs: action.nowMs } : {}),
      };
    }

    case "TICK": {
      if (state.status !== "running" || state.startedAtMs === null) return state;
      const rawElapsed = Math.max(0, action.nowMs - state.startedAtMs);
      const durationMs = state.durationSec * 1000;
      const cappedElapsed =
        state.drillMode === "time" ? Math.min(rawElapsed, durationMs) : rawElapsed;

      const currentCorrect = reconcile(state.text, state.typed).correct;
      const nextMaxProgress = Math.max(state.maxProgress, currentCorrect);
      const { samples, lastSampledMs } = appendSamplesUpTo(
        state.samples,
        state.lastSampledMs,
        cappedElapsed,
        nextMaxProgress,
        false,
      );

      if (state.drillMode === "time" && rawElapsed >= durationMs) {
        return finalizeSession(
          {
            ...state,
            elapsedMs: durationMs,
            maxProgress: nextMaxProgress,
            samples,
            lastSampledMs,
          },
          state.startedAtMs + durationMs,
        );
      }

      const prevBucket = Math.floor(state.elapsedMs / 100);
      const nextBucket = Math.floor(cappedElapsed / 100);
      if (prevBucket === nextBucket && samples.length === state.samples.length) {
        return state;
      }

      return {
        ...state,
        elapsedMs: cappedElapsed,
        maxProgress: nextMaxProgress,
        samples,
        lastSampledMs,
      };
    }

    case "FINISH": {
      return finalizeSession(state, action.nowMs);
    }

    case "RESTART": {
      return createInitialSessionState({
        text: action.text,
        quoteAuthor: action.quoteAuthor,
        drillMode: action.drillMode,
        durationSec: action.durationSec,
        keepMissedWords: action.keepMissedWords,
        missedWords: action.keepMissedWords ? state.missedWords : [],
      });
    }
  }
}

export function selectSessionStats(state: TypingSessionState): RunStats {
  const rec = reconcile(state.text, state.typed);
  const effectiveElapsedMs =
    state.status === "finished"
      ? state.drillMode === "time"
        ? state.durationSec * 1000
        : Math.max(1000, state.elapsedMs)
      : state.status === "running"
        ? state.elapsedMs || 1
        : 0;

  return computeStats(rec.correct, state.keystrokesIncorrect, effectiveElapsedMs, state.samples, {
    keystrokesCorrect: state.keystrokesCorrect,
    keystrokesIncorrect: state.keystrokesIncorrect,
    uncorrectedErrors: rec.incorrect,
  });
}

export interface RunWordSummary {
  slowestWords: RunSlowWord[];
  mostMissedWords: { word: string; errors: number }[];
}

export function computeRunWordSummary(
  wordTimings: Record<string, WordTimingEntry>,
  wordMistakeCounts: Record<string, number>,
  limit = 6,
): RunWordSummary {
  const slowestWords: RunSlowWord[] = Object.entries(wordTimings)
    .filter(([, entry]) => entry.chars > 0 && entry.totalMs > 0)
    .map(([word, entry]) => {
      const avgMs = Math.round(entry.totalMs / Math.max(1, entry.count));
      const minutes = entry.totalMs / 60_000;
      const wpm = minutes > 0 ? Math.round(entry.chars / 5 / minutes) : 0;
      return { word, wpm, avgMs };
    })
    .sort((a, b) => a.wpm - b.wpm || b.avgMs - a.avgMs)
    .slice(0, limit);

  const mostMissedWords = Object.entries(wordMistakeCounts)
    .filter(([, errors]) => errors > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, errors]) => ({ word, errors }));

  return { slowestWords, mostMissedWords };
}

/** Return unique normalized words completed cleanly without any error keystroke in the run. */
export function extractCompletedCleanWords(
  text: string,
  typed: string,
  missedWords: readonly string[],
): string[] {
  if (!text || !typed) return [];
  const missedSet = new Set(missedWords.map((w) => w.trim().toLowerCase()));
  const clean: string[] = [];
  const seen = new Set<string>();

  let pos = 0;
  for (const rawWord of text.split(" ")) {
    const start = pos;
    const end = start + rawWord.length;
    pos = end + 1;

    const finishedWord = end === text.length ? typed.length >= end : typed.length > end;
    if (!finishedWord) break;

    const normalized = rawWord.replace(/[^\w]/g, "").toLowerCase();
    if (normalized.length <= 1 || missedSet.has(normalized) || seen.has(normalized)) continue;

    if (typed.slice(start, end) === rawWord) {
      seen.add(normalized);
      clean.push(normalized);
    }
  }

  return clean;
}
