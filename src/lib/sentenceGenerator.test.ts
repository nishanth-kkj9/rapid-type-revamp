import { describe, expect, it } from "vitest";
import { generateSentence, generatePassage } from "./sentenceGenerator";

describe("generatePassage", () => {
  it("produces at least the requested length", () => {
    expect(generatePassage("easy", 220).length).toBeGreaterThanOrEqual(220);
    expect(generatePassage("hard", 400).length).toBeGreaterThanOrEqual(400);
  });
});

describe("generateSentence", () => {
  it("avoids repeats within the dedupe window", () => {
    const seen: string[] = [];
    for (let i = 0; i < 15; i++) {
      const s = generateSentence("easy");
      expect(seen.slice(-10)).not.toContain(s);
      seen.push(s);
    }
  });

  it("produces tidy, punctuated sentences", () => {
    for (let i = 0; i < 20; i++) {
      const s = generateSentence("medium");
      expect(s).not.toMatch(/\s{2,}/);
      expect(s).not.toMatch(/\s[,.;:?!]/);
      expect(s).toMatch(/[.?!]$/);
    }
  });
});
