import { describe, expect, it } from "vitest";
import {
  QUOTES,
  getQuoteLengthCategory,
  getRandomQuote,
  resetQuoteBag,
  type QuoteLength,
} from "./quotes";

describe("quotes", () => {
  it("contains >= 200 curated quotes with verified author and source", () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(200);
    for (const q of QUOTES) {
      expect(q.text.length).toBeGreaterThan(10);
      expect(q.author.length).toBeGreaterThan(2);
      expect(q.source.length).toBeGreaterThan(2);
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

  it("never repeats a quote across 50 consecutive draws in any length bucket", () => {
    const buckets: QuoteLength[] = ["short", "medium", "long"];
    for (const bucket of buckets) {
      resetQuoteBag();
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const q = getRandomQuote(bucket);
        expect(q.length).toBe(bucket);
        expect(seen.has(q.id)).toBe(false);
        seen.add(q.id);
      }
      expect(seen.size).toBe(50);
    }
  });
});
