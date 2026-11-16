import { describe, expect, it } from "vitest";
import { formatResultShareText } from "./shareResult";

describe("formatResultShareText", () => {
  const stats = {
    wpm: 78.4,
    rawWpm: 82.1,
    adjustedWpm: 76,
    accuracy: 97.4,
    correct: 250,
    incorrect: 6,
    typed: 256,
    elapsed: 30,
    consistency: 89.2,
  };

  it("formats time/words drill summaries clearly", () => {
    const text = formatResultShareText({
      stats,
      modeKey: "25w",
      difficulty: "medium",
      dateMs: Date.UTC(2026, 10, 15, 12, 0, 0),
      isRecord: true,
    });
    expect(text).toContain("78 WPM [PB]");
    expect(text).toContain("97.4% acc");
    expect(text).toContain("82 raw");
    expect(text).toContain("89% consistency");
    expect(text).toContain("25 words · medium");
  });

  it("formats quote summaries cleanly with author attribution", () => {
    const text = formatResultShareText({
      stats,
      modeKey: "quote",
      difficulty: "medium",
      dateMs: Date.UTC(2026, 10, 15, 12, 0, 0),
      quoteAuthor: "Ada Lovelace",
    });
    expect(text).toContain("Quote · Ada Lovelace");
    expect(text).not.toContain("[PB]");
  });
});
