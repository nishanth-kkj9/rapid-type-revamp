import { describe, expect, it } from "vitest";
import { sanitizeMissedWords, mergeMissedWords, MAX_MISSED_WORDS } from "./missedWords";

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
});
