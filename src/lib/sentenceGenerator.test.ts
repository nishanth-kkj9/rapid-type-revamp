import { describe, expect, it } from "vitest";
import {
  generateSentence,
  generatePassage,
  pastTense,
  thirdPerson,
  plural,
  generateWordQuota,
  generateMissedWordsDrill,
} from "./sentenceGenerator";

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

  it("correctly inflects third-person verbs and plurals", () => {
    expect(thirdPerson("wash")).toBe("washes");
    expect(thirdPerson("push")).toBe("pushes");
    expect(thirdPerson("carry")).toBe("carries");
    expect(thirdPerson("identify")).toBe("identifies");
    expect(thirdPerson("establish")).toBe("establishes");
    expect(thirdPerson("see")).toBe("sees");

    expect(plural("fish")).toBe("fish");
    expect(plural("city")).toBe("cities");
    expect(plural("foot")).toBe("feet");
    expect(plural("hypothesis")).toBe("hypotheses");
    expect(plural("bus")).toBe("buses");
  });

  it("never produces malformed non-words (washs, pushs, carrys, identifys, fishs, etc.) across generated sentences", () => {
    const forbidden = /\b(washs|pushs|carrys|identifys|establishs|fishs|watchs|fixs)\b/i;
    for (let i = 0; i < 400; i++) {
      const diff = i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard";
      const { sentence } = generateSentence(diff);
      expect(sentence).not.toMatch(forbidden);
      // Also ensure no "A apple" / "a apple"
      expect(sentence).not.toMatch(/\b[Aa]\s+[aeiou][a-z]+/);
    }
  });

  it("generateWordQuota produces exactly the requested word count", () => {
    for (const count of [10, 25, 50]) {
      const passage = generateWordQuota(count, "medium");
      const words = passage.split(/\s+/).filter(Boolean);
      expect(words).toHaveLength(count);
    }
  });

  it("generateMissedWordsDrill creates targeted practice containing missed words", () => {
    const drill = generateMissedWordsDrill(["algorithm", "performance"], 15);
    const words = drill.split(/\s+/).filter(Boolean);
    expect(words).toHaveLength(15);
    expect(drill).toContain("algorithm");
    expect(drill).toContain("performance");
  });
});
