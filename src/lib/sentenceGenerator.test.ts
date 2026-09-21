import { describe, expect, it } from "vitest";
import { generateSentence, generatePassage, pastTense } from "./sentenceGenerator";

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

  it("never produces malformed past-tense verbs (e.g. improveed, practiceed, identifyed)", () => {
    for (let i = 0; i < 300; i++) {
      const { sentence } = generateSentence("hard");
      expect(sentence).not.toMatch(/\w+eed\b/i);
      expect(sentence).not.toMatch(/\b\w+[^aeiou]yed\b/i);
    }
  });

  it("never doubles final consonants (openned, discoverred, developped)", () => {
    expect(pastTense("open")).toBe("opened");
    expect(pastTense("discover")).toBe("discovered");
    expect(pastTense("consider")).toBe("considered");
    expect(pastTense("develop")).toBe("developed");
    expect(pastTense("explain")).toBe("explained");
    expect(pastTense("deliver")).toBe("delivered");
    expect(pastTense("maintain")).toBe("maintained");
  });

  it("rejects any doubled consonant before -ed across generated sentences", () => {
    for (let i = 0; i < 300; i++) {
      const { sentence } = generateSentence(i % 2 ? "medium" : "hard");
      expect(sentence).not.toMatch(/([bcdfgklmnprstvz])\1ed\b/i);
    }
  });
});
