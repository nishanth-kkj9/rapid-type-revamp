import { describe, expect, it } from "vitest";
import { buildHistoryCsv, escapeCsvCell } from "./historyExport";
import type { HistoryEntry } from "./typingStats";

const mkEntry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "run-1",
  date: Date.UTC(2026, 2, 14, 9, 30, 0),
  difficulty: "medium",
  mode: "30s",
  wpm: 72,
  rawWpm: 75,
  adjustedWpm: 69,
  accuracy: 96.5,
  correct: 180,
  incorrect: 5,
  uncorrectedErrors: 1,
  typed: 185,
  elapsed: 30,
  consistency: 91,
  ...over,
});

describe("historyExport CSV", () => {
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("produces one header row plus one row per visible run with escaped special characters", () => {
    const entries: HistoryEntry[] = [
      mkEntry({ id: 'run,"special"', mode: "custom,list", strict: "word", repeated: true }),
      mkEntry({ id: "learn-1", mode: "learn", wpm: 45, consistency: 92 }),
    ];

    const csv = buildHistoryCsv(entries);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(entries.length + 1);
    expect(lines[0]).toContain("id,date_iso,mode,difficulty,wpm,raw_wpm");
    expect(lines[0]).not.toContain("words_destroyed");
    expect(lines[1]).toContain('"run,""special"""');
    expect(lines[1]).toContain('"custom,list"');
    expect(lines[1]).toContain(",word,true");
    expect(lines[2]).toContain(",learn,");
  });
});
