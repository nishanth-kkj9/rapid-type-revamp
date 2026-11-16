import { describe, expect, it } from "vitest";
import {
  WORD_LISTS,
  chooseArticle,
  generateAdaptiveWeakDrill,
  generateMissedWordsDrill,
  generatePassage,
  generateSentence,
  generateWordQuota,
  pastTense,
  plural,
  thirdPerson,
} from "./sentenceGenerator";

describe("word lists & generator v2", () => {
  it("provides tiered frequency-ranked English word pools", () => {
    expect(WORD_LISTS.easy.length).toBeGreaterThanOrEqual(200);
    expect(WORD_LISTS.medium.length).toBeGreaterThanOrEqual(1000);
    expect(WORD_LISTS.hard.length).toBeGreaterThanOrEqual(4000);
  });

  it("200 generated Hard passages contain >= 1,000 distinct words", () => {
    const distinct = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const passage = generatePassage("hard", 240);
      for (const raw of passage.split(/\s+/)) {
        const clean = raw.toLowerCase().replace(/[^a-z]/g, "");
        if (clean.length > 0) distinct.add(clean);
      }
    }
    expect(distinct.size).toBeGreaterThanOrEqual(1000);
  });

  it("maintains subject-verb agreement across 300 generated sentences", () => {
    // Spot-check clear agreement violations (plural determiner + singular verb, etc.)
    const badPluralPatterns = [
      /\b(?:several|many|numerous|these|those|two|both)\s+(?:[a-z]+\s+)?[a-z]+s\s+(?:is|was|has|does|goes|runs|builds|writes)\b/i,
      /\b(?:a|an|every|each)\s+(?:[a-z]+\s+)?(?:scientist|engineer|student|child|woman|man)\s+are\b/i,
    ];
    for (let i = 0; i < 300; i++) {
      const diff = i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard";
      const { sentence } = generateSentence(diff);
      for (const rx of badPluralPatterns) {
        expect(sentence).not.toMatch(rx);
      }
    }
  });

  it("Words mode with toggles off yields strictly lowercase words without punctuation or digits", () => {
    const text = generateWordQuota(50, "medium", {
      style: "words",
      punctuation: false,
      numbers: false,
      capitals: false,
    });
    const words = text.split(" ");
    expect(words).toHaveLength(50);
    for (const w of words) {
      expect(w).toMatch(/^[a-z]+$/);
    }
  });

  it("Medium and Hard can produce digits and punctuation when toggles are enabled", () => {
    let sawDigit = false;
    let sawPunct = false;
    for (let i = 0; i < 40; i++) {
      const passage = generatePassage(i % 2 === 0 ? "medium" : "hard", 260, {
        style: "sentences",
        punctuation: true,
        numbers: true,
        capitals: true,
      });
      if (/\d/.test(passage)) sawDigit = true;
      if (/[.,;?]/.test(passage)) sawPunct = true;
    }
    expect(sawDigit).toBe(true);
    expect(sawPunct).toBe(true);
  });

  it("never repeats a word more than twice in any 20-word window", () => {
    const text = generateWordQuota(100, "easy", { style: "words" });
    const words = text.split(/\s+/);
    for (let start = 0; start <= words.length - 20; start++) {
      const counts = new Map<string, number>();
      for (let i = start; i < start + 20; i++) {
        const w = words[i]!;
        const c = (counts.get(w) ?? 0) + 1;
        expect(c).toBeLessThanOrEqual(2);
        counts.set(w, c);
      }
    }
  });

  it("chooses a/an by pronunciation", () => {
    expect(chooseArticle("hour")).toBe("an");
    expect(chooseArticle("honest")).toBe("an");
    expect(chooseArticle("apple")).toBe("an");
    expect(chooseArticle("university")).toBe("a");
    expect(chooseArticle("user")).toBe("a");
    expect(chooseArticle("unique")).toBe("a");
    expect(chooseArticle("API")).toBe("an");
    expect(chooseArticle("URL")).toBe("a");
  });
});

describe("generatePassage", () => {
  it("produces at least the requested length", () => {
    expect(generatePassage("easy", 220).length).toBeGreaterThanOrEqual(220);
    expect(generatePassage("hard", 400).length).toBeGreaterThanOrEqual(400);
  });
});

describe("generateSentence", () => {
  it("avoids repeats within the caller-owned dedupe window", () => {
    let recent: string[] = [];
    for (let i = 0; i < 15; i++) {
      const next = generateSentence("easy", recent);
      expect(recent).not.toContain(next.sentence);
      recent = next.recent;
    }
    expect(recent.length).toBeLessThanOrEqual(12);
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

  it("never produces malformed past-tense or doubled consonants", () => {
    expect(pastTense("open")).toBe("opened");
    expect(pastTense("discover")).toBe("discovered");
    expect(pastTense("consider")).toBe("considered");
    expect(pastTense("develop")).toBe("developed");
    expect(pastTense("improve")).toBe("improved");
    expect(pastTense("practice")).toBe("practiced");
    expect(pastTense("identify")).toBe("identified");
    expect(pastTense("succeed")).toBe("succeeded");
    for (let i = 0; i < 200; i++) {
      const { sentence } = generateSentence(i % 2 ? "medium" : "hard");
      expect(sentence).not.toMatch(
        /\b(?:improveed|practiceed|identifyed|createed|produceed|completeed|openned|developped|discoverred)\b/i,
      );
      expect(sentence).not.toMatch(/\b\w+[^aeiou]yed\b/i);
      expect(sentence).not.toMatch(/([bcdfgkmnprvz])\1ed\b/i);
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

  it("generateWordQuota produces exactly the requested word count", () => {
    for (const count of [10, 25, 50]) {
      const passage = generateWordQuota(count, "medium");
      const words = passage.split(/\s+/).filter(Boolean);
      expect(words).toHaveLength(count);
    }
  });

  it("generateAdaptiveWeakDrill targets weak keys and bigrams", () => {
    const drill = generateAdaptiveWeakDrill(["q", "x"], ["qu", "th"], 30);
    const words = drill.split(/\s+/).filter(Boolean);
    expect(words).toHaveLength(30);
    expect(words.some((w) => w.includes("qu"))).toBe(true);
    expect(words.some((w) => w.includes("th") || w.includes("q") || w.includes("x"))).toBe(true);
  });

  it("generateMissedWordsDrill creates targeted practice containing missed words", () => {
    const drill = generateMissedWordsDrill(["algorithm", "performance"], 15);
    const words = drill.split(/\s+/).filter(Boolean);
    expect(words).toHaveLength(15);
    expect(drill).toContain("algorithm");
    expect(drill).toContain("performance");
  });
});
