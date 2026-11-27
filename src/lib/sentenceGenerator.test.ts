import { describe, expect, it } from "vitest";
import {
  WORD_LISTS,
  generateAdaptiveWeakDrill,
  generateMissedWordsDrill,
  generatePassage,
  generateWordQuota,
} from "./sentenceGenerator";

describe("word lists & generator", () => {
  it("provides Common 200 and Common 1000 word pools from wordLists.json", () => {
    expect(WORD_LISTS["200"]).toHaveLength(200);
    expect(WORD_LISTS["1000"]).toHaveLength(1000);
  });

  it("Common 1000 passages draw broadly across the 1,000-word pool", () => {
    const distinct = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const passage = generatePassage("1000", 240);
      for (const raw of passage.split(/\s+/)) {
        const clean = raw.toLowerCase().replace(/[^a-z]/g, "");
        if (clean.length > 0) distinct.add(clean);
      }
    }
    expect(distinct.size).toBeGreaterThanOrEqual(800);
  });

  it("default word-stream output yields strictly lowercase words without punctuation or digits", () => {
    const text = generateWordQuota(50, "200");
    const words = text.split(" ");
    expect(words).toHaveLength(50);
    for (const w of words) {
      expect(w).toMatch(/^[a-z]+$/);
    }
  });

  it("produces digits, capitals, and punctuation when modifiers are enabled", () => {
    let sawDigit = false;
    let sawPunct = false;
    let sawCapital = false;
    for (let i = 0; i < 40; i++) {
      const passage = generatePassage(i % 2 === 0 ? "200" : "1000", 260, {
        punctuation: true,
        numbers: true,
        capitals: true,
      });
      if (/\d/.test(passage)) sawDigit = true;
      if (/[.,;?]/.test(passage)) sawPunct = true;
      if (/[A-Z]/.test(passage)) sawCapital = true;
    }
    expect(sawDigit).toBe(true);
    expect(sawPunct).toBe(true);
    expect(sawCapital).toBe(true);
  });

  it("never repeats a word more than twice in any 20-word window", () => {
    const text = generateWordQuota(100, "200");
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
});

describe("generatePassage & drills", () => {
  it("produces at least the requested length", () => {
    expect(generatePassage("200", 220).length).toBeGreaterThanOrEqual(220);
    expect(generatePassage("1000", 400).length).toBeGreaterThanOrEqual(400);
  });

  it("generateWordQuota produces exactly the requested word count", () => {
    for (const count of [10, 25, 50]) {
      const passage = generateWordQuota(count, "1000");
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
