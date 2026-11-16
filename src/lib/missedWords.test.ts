import { describe, expect, it } from "vitest";
import {
  GRADUATION_STREAK,
  MAX_MISSED_WORDS,
  getActiveMissedWords,
  mergeMissedWords,
  recordMissedWordsRun,
  sanitizeMissedWords,
} from "./missedWords";

describe("missedWords", () => {
  it("sanitizes arrays, trimming, deduping, and discarding empty or oversize strings", () => {
    const raw = [" hello ", "hello", "", "a".repeat(30), 123, null, "world"];
    const result = sanitizeMissedWords(raw);
    expect(result).toEqual(["hello", "world"]);
  });

  it("caps sanitized list at MAX_MISSED_WORDS", () => {
    const raw = Array.from({ length: 60 }, (_, i) => `word${i}`);
    const result = sanitizeMissedWords(raw);
    expect(result.length).toBe(MAX_MISSED_WORDS);
    expect(result[0]).toBe("word0");
    expect(result[MAX_MISSED_WORDS - 1]).toBe(`word${MAX_MISSED_WORDS - 1}`);
  });

  it("merges fresh words ahead of existing words with deduping", () => {
    const existing = ["apple", "banana", "cherry"];
    const fresh = ["date", "banana", "elderberry"];
    const merged = mergeMissedWords(existing, fresh);

    expect(merged).toEqual(["date", "banana", "elderberry", "apple", "cherry"]);
  });

  it("returns empty array for non-array input", () => {
    expect(sanitizeMissedWords(null)).toEqual([]);
    expect(sanitizeMissedWords({})).toEqual([]);
    expect(sanitizeMissedWords("hello")).toEqual([]);
  });

  it("graduates a missed word after 3 separate clean runs and resets streak if missed again", () => {
    let records = recordMissedWordsRun([], {
      missedInRun: ["rhythm"],
      cleanWordsInRun: ["typing"],
      nowMs: 100,
    });
    expect(getActiveMissedWords(records)).toEqual(["rhythm"]);
    expect(records[0]?.cleanStreak).toBe(0);

    // Clean run 1 & 2
    records = recordMissedWordsRun(records, {
      missedInRun: [],
      cleanWordsInRun: ["rhythm"],
      nowMs: 200,
    });
    expect(records[0]?.cleanStreak).toBe(1);

    records = recordMissedWordsRun(records, {
      missedInRun: [],
      cleanWordsInRun: ["rhythm"],
      nowMs: 300,
    });
    expect(records[0]?.cleanStreak).toBe(2);

    // Missing it resets cleanStreak to 0
    records = recordMissedWordsRun(records, {
      missedInRun: ["rhythm"],
      cleanWordsInRun: [],
      nowMs: 400,
    });
    expect(records[0]?.cleanStreak).toBe(0);

    // 3 consecutive clean runs graduate it out of the queue
    for (let i = 0; i < GRADUATION_STREAK; i++) {
      records = recordMissedWordsRun(records, {
        missedInRun: [],
        cleanWordsInRun: ["rhythm"],
        nowMs: 500 + i,
      });
    }
    expect(getActiveMissedWords(records)).toEqual([]);
  });
});
