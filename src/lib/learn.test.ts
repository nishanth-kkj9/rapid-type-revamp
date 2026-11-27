import { describe, expect, it } from "vitest";
import {
  applyLearnLessonUpdate,
  createInitialLearnState,
  DEFAULT_LEARN_TARGET_WPM,
  generateLearnLesson,
  generatePseudoWords,
  getFocusKey,
  getKeyRecentAccuracy,
  getUnlockedCandidateWords,
  INITIAL_UNLOCKED_COUNT,
  isKeyAccurate,
  isKeyFastEnough,
  isKeyMastered,
  LEARN_MIN_KEY_HITS,
  LEARN_REPEAT_WINDOW,
  LETTER_ORDER,
  loadLearnFromStorage,
  mergeLearnStates,
  sanitizeLearnState,
  saveLearnToStorage,
  targetMsForWpm,
  wpmFromMs,
} from "./learn";
import { MemoryStorage } from "./storage";

describe("learn domain logic", () => {
  it("starts with the first 6 English-frequency letters and validates targetWpm/storage", async () => {
    const initial = createInitialLearnState(1000);
    expect(initial.unlocked).toEqual(["e", "t", "a", "o", "i", "n"]);
    expect(initial.unlocked).toHaveLength(INITIAL_UNLOCKED_COUNT);
    expect(initial.targetWpm).toBe(DEFAULT_LEARN_TARGET_WPM);
    expect(initial.lessons).toBe(0);

    const storage = new MemoryStorage();
    await saveLearnToStorage(storage, {
      ...initial,
      unlocked: ["e", "t", "a", "o", "i", "n", "s"],
      targetWpm: 999,
      lessons: 4,
    });
    const loaded = await loadLearnFromStorage(storage);
    expect(loaded.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
    expect(loaded.targetWpm).toBe(80);
    expect(loaded.lessons).toBe(4);

    // Corrupted data sanitizes safely and never drops below the initial 6 letters
    const repaired = sanitizeLearnState({ unlocked: ["z"], targetWpm: 5, lessons: -3 });
    expect(repaired.unlocked.slice(0, 6)).toEqual(["e", "t", "a", "o", "i", "n"]);
    expect(repaired.unlocked).toContain("z");
    expect(repaired.targetWpm).toBe(20);
    expect(repaired.lessons).toBe(0);
  });

  it("evaluates speed (12000/WPM ms) and accuracy (>= 94% over >= 30 hits) thresholds", () => {
    // At 35 WPM, threshold is 12000/35 ≈ 342.857ms
    expect(targetMsForWpm(40)).toBe(300);
    expect(wpmFromMs(300)).toBe(40);

    const fastAndAccurate = { emaMs: 280, hits: 30, errors: 1 }; // 29/30 = 96.7%
    expect(isKeyFastEnough(fastAndAccurate, 40)).toBe(true);
    expect(isKeyAccurate(fastAndAccurate)).toBe(true);
    expect(isKeyMastered(fastAndAccurate, 40)).toBe(true);

    // Too slow
    expect(isKeyMastered({ emaMs: 320, hits: 40, errors: 0 }, 40)).toBe(false);
    // Too few hits (< 30)
    expect(isKeyAccurate({ emaMs: 200, hits: 29, errors: 0 })).toBe(false);
    // Accuracy below 94% (e.g. 28/30 = 93.3%)
    expect(isKeyAccurate({ emaMs: 200, hits: 30, errors: 2 })).toBe(false);
    expect(getKeyRecentAccuracy({ emaMs: 200, hits: 30, errors: 2 })).toBeCloseTo(28 / 30, 4);
  });

  it("unlocks the next letter ONLY when ALL unlocked keys are mastered and never relocks", () => {
    const start = createInitialLearnState(100);
    // Set 5 of 6 keys already mastered, 1 key ('n') not yet at 30 hits
    start.targetWpm = 35;
    for (const ch of ["e", "t", "a", "o", "i"]) {
      start.perKey[ch] = { emaMs: 240, hits: 35, errors: 1, recentAcc: 0.97 };
    }
    start.perKey["n"] = { emaMs: 240, hits: 20, errors: 0, recentAcc: 1 };

    // Lesson adds only 5 hits to 'n' (total 25 < 30): must NOT unlock yet
    const res1 = applyLearnLessonUpdate(start, {
      keyHits: { n: 5, e: 5 },
      keySpeed: { n: [1200, 5], e: [1200, 5] },
      mistakes: {},
      now: 200,
    });
    expect(res1.newlyUnlockedKey).toBeNull();
    expect(res1.state.unlocked).toEqual(["e", "t", "a", "o", "i", "n"]);
    expect(res1.state.lessons).toBe(1);

    // Next lesson brings 'n' to >= 30 hits cleanly -> unlocks 7th letter ('s')
    const res2 = applyLearnLessonUpdate(res1.state, {
      keyHits: { n: 10 },
      keySpeed: { n: [2200, 10] },
      mistakes: {},
      now: 300,
    });
    expect(res2.newlyUnlockedKey).toBe("s");
    expect(res2.state.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
    expect(getFocusKey(res2.state)).toBe("s");

    // Even if subsequent performance degrades or targetWpm rises, unlocked keys are NEVER locked again
    const harderState = { ...res2.state, targetWpm: 80 };
    const res3 = applyLearnLessonUpdate(harderState, {
      keyHits: { s: 10 },
      keySpeed: { s: [6000, 10] },
      mistakes: { s: 4 },
      now: 400,
    });
    expect(res3.newlyUnlockedKey).toBeNull();
    expect(res3.state.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
  });

  it("merges backup states monotonically without relocking keys", () => {
    const a = sanitizeLearnState({
      unlocked: ["e", "t", "a", "o", "i", "n", "s", "h"],
      lessons: 5,
      updatedAt: 500,
    });
    const b = sanitizeLearnState({
      unlocked: ["e", "t", "a", "o", "i", "n", "s"],
      perKey: { r: { emaMs: 250, hits: 40, errors: 1 } },
      lessons: 8,
      updatedAt: 900,
    });
    const merged = mergeLearnStates(a, b);
    expect(merged.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s", "h"]);
    expect(merged.lessons).toBe(8);
    expect(merged.perKey["r"]?.hits).toBe(40);
  });
});

describe("learn seeded lesson generation", () => {
  it("is deterministic for a given seed and contains ONLY unlocked letters before 20 unlocks", () => {
    const state = createInitialLearnState(1000);
    const l1 = generateLearnLesson(state, 424242, {
      includePunctuation: true,
      includeCapitals: true,
      includeNumbers: true,
    });
    const l2 = generateLearnLesson(state, 424242, {
      includePunctuation: true,
      includeCapitals: true,
      includeNumbers: true,
    });
    expect(l1.text).toBe(l2.text);
    expect(l1.words.length).toBeGreaterThanOrEqual(35);
    expect(l1.words.length).toBeLessThanOrEqual(40);

    // Must contain only the 6 unlocked letters + spaces (no digits, capitals, punctuation)
    const unlockedSet = new Set(state.unlocked);
    for (const w of l1.words) {
      expect(w).toMatch(/^[a-z]+$/);
      for (const ch of w) {
        expect(unlockedSet.has(ch)).toBe(true);
      }
    }
  });

  it("uses all real words first before falling back to pseudo-words", () => {
    for (const count of [6, 7, 8]) {
      const state = {
        ...createInitialLearnState(1000),
        unlocked: LETTER_ORDER.slice(0, count),
      };
      const realWords = getUnlockedCandidateWords(state.unlocked);
      const realSet = new Set(realWords);
      const lesson = generateLearnLesson(state, 98765 + count);

      expect(lesson.usedPseudoWords).toBe(true);
      expect(lesson.words.length).toBeGreaterThanOrEqual(35);
      expect(lesson.words.length).toBeLessThanOrEqual(40);
      // Every real word must appear before any made-up pseudo-word
      expect(lesson.words.slice(0, realWords.length).sort()).toEqual([...realWords].sort());
      expect(lesson.words.slice(realWords.length).every((w) => !realSet.has(w))).toBe(true);
    }

    // Stage 23 ('j') has 19 real focus words for <=18 focus slots -> 0 pseudo-words needed
    const stage23 = {
      ...createInitialLearnState(1000),
      unlocked: LETTER_ORDER.slice(0, 23),
    };
    const lesson23 = generateLearnLesson(stage23, 98765);
    expect(lesson23.usedPseudoWords).toBe(false);

    // Direct pseudo-word helper only uses unlocked letters
    const pseudo = generatePseudoWords(LETTER_ORDER.slice(0, 6), 12, 1234);
    expect(pseudo).toHaveLength(12);
    expect(pseudo.every((w) => /^[etaoin]+$/.test(w))).toBe(true);
  });

  it("enforces >= 40% focus-key word density and avoids repeats within 20 words across stages", () => {
    // Test both 6 letters (newest 'n') and 10 letters (newest 'd')
    for (const count of [6, 10, 16]) {
      const state = {
        ...createInitialLearnState(1000),
        unlocked: LETTER_ORDER.slice(0, count),
      };
      const lesson = generateLearnLesson(state, 777 + count);
      const focusKey = lesson.focusKey;
      const focusCount = lesson.words.filter((w) => w.includes(focusKey)).length;
      expect(focusCount / lesson.words.length).toBeGreaterThanOrEqual(0.4);

      // Check sliding window uniqueness across >= 20-word windows
      for (let i = 0; i < lesson.words.length; i++) {
        const w = lesson.words[i]!;
        const prevWindow = lesson.words.slice(Math.max(0, i - LEARN_REPEAT_WINDOW), i);
        expect(prevWindow).not.toContain(w);
      }
    }
  });

  it("gates punctuation/capitals/numbers until >= 20 letters are unlocked", () => {
    const state19 = {
      ...createInitialLearnState(1000),
      unlocked: LETTER_ORDER.slice(0, 19),
    };
    const l19 = generateLearnLesson(state19, 111, {
      includePunctuation: true,
      includeCapitals: true,
      includeNumbers: true,
    });
    expect(l19.text).toMatch(/^[a-z ]+$/);

    const state20 = {
      ...createInitialLearnState(1000),
      unlocked: LETTER_ORDER.slice(0, 20),
    };
    const l20 = generateLearnLesson(state20, 111, {
      includePunctuation: true,
      includeCapitals: true,
      includeNumbers: true,
    });
    expect(l20.text).toMatch(/[A-Z0-9.,]/);
  });

  it("meets exact hit-count boundary of 30 hits cleanly across a simulated progression", () => {
    let state = createInitialLearnState(1000);
    // Simulate completing lessons until the 7th letter ('s') unlocks
    for (let step = 0; step < 3 && state.unlocked.length === 6; step++) {
      const keyHits: Record<string, number> = {};
      const keySpeed: Record<string, [number, number]> = {};
      for (const ch of state.unlocked) {
        keyHits[ch] = 15;
        keySpeed[ch] = [15 * 220, 15]; // 220ms ≈ 54.5 WPM >= 35 WPM
      }
      const res = applyLearnLessonUpdate(state, {
        keyHits,
        keySpeed,
        mistakes: {},
        now: 2000 + step,
      });
      state = res.state;
    }
    expect(state.unlocked).toEqual(["e", "t", "a", "o", "i", "n", "s"]);
    expect(state.perKey["e"]?.hits).toBeGreaterThanOrEqual(LEARN_MIN_KEY_HITS);
  });
});
