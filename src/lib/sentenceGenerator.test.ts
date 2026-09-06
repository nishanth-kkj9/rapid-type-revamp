import { describe, expect, it } from "vitest";
import { generateSentence, generatePassage } from "./sentenceGenerator";

describe("generatePassage", () => {
  it("produces at least the requested length", () => {
    expect(generatePassage("easy", 220).length).toBeGreaterThanOrEqual(220);
    expect(generatePassage("hard", 400).length).toBeGreaterThanOrEqual(400);
  });
});

describe("generateSentence", () => {
  it("avoids repeats within the caller-owned dedupe window", () => {
    const seen: string[] = [];
    let recent: string[] = [];
    for (let i = 0; i < 15; i++) {
      const next = generateSentence("easy", recent);
      expect(recent).not.toContain(next.sentence);
      recent = next.recent;
      seen.push(next.sentence);
    }
    expect(recent.length).toBeLessThanOrEqual(10);
  });

  it("does not mutate the buffer it was given", () => {
    const recent: string[] = [];
    generateSentence("easy", recent);
    expect(recent).toHaveLength(0);
  });

  it("produces tidy, punctuated sentences", () => {
    for (let i = 0; i < 20; i++) {
      const { sentence } = generateSentence("medium");
      expect(sentence).not.toMatch(/\s{2,}/);
      expect(sentence).not.toMatch(/\s[,.;:?!]/);
      expect(sentence).toMatch(/[.?!]$/);
    }
  });
});
