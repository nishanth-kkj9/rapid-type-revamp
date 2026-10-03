import { describe, expect, it } from "vitest";
import { QUOTES, getRandomQuote, getQuoteLengthCategory } from "./quotes";

describe("quotes", () => {
  it("contains curated quotes", () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(20);
    for (const q of QUOTES) {
      expect(q.text.length).toBeGreaterThan(10);
      expect(q.author.length).toBeGreaterThan(2);
      expect(["short", "medium", "long"]).toContain(q.length);
    }
  });

  it("every quote has length tag matching its derived length band", () => {
    for (const q of QUOTES) {
      expect(q.length).toBe(getQuoteLengthCategory(q.text));
      if (q.length === "short") {
        expect(q.text.length).toBeLessThan(100);
      } else if (q.length === "medium") {
        expect(q.text.length).toBeGreaterThanOrEqual(100);
        expect(q.text.length).toBeLessThan(200);
      } else {
        expect(q.text.length).toBeGreaterThanOrEqual(200);
      }
    }
  });

  it("getRandomQuote returns a quote with valid properties", () => {
    const q = getRandomQuote();
    expect(q.text).toBeDefined();
    expect(q.author).toBeDefined();
  });

  it("filters quotes by length category", () => {
    const shortQuote = getRandomQuote("short");
    expect(shortQuote.length).toBe("short");

    const mediumQuote = getRandomQuote("medium");
    expect(mediumQuote.length).toBe("medium");

    const longQuote = getRandomQuote("long");
    expect(longQuote.length).toBe("long");
  });
});
