import { describe, expect, it } from "vitest";
import { MAX_CUSTOM_TEXT_CHARS, buildCustomPassage, normalizeCustomText } from "./customTexts";

describe("customTexts", () => {
  it("normalizes curly quotes, em/en dashes, accents, and non-breaking spaces with warnings", () => {
    const raw = `“Café”—said\u00A0Alice…\u2013‘wonderful’!`;
    const res = normalizeCustomText(raw);
    expect(res.text).toBe(`"Cafe"-said Alice...-'wonderful'!`);
    expect(res.hadReplacements).toBe(true);
    expect(res.truncated).toBe(false);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it("strips unsupported non-ASCII symbols and truncates at MAX_CUSTOM_TEXT_CHARS", () => {
    const longInput = `${"hello ".repeat(900)}🚀`;
    const res = normalizeCustomText(longInput);
    expect(res.text.length).toBeLessThanOrEqual(MAX_CUSTOM_TEXT_CHARS);
    expect(res.truncated).toBe(true);
    expect(res.hadReplacements).toBe(true);
    expect(res.text).not.toContain("🚀");
  });

  it("builds custom passages for quote, words, and time modes", () => {
    const source = "alpha beta gamma";
    expect(buildCustomPassage(source, "quote")).toBe(source);
    expect(buildCustomPassage(source, "words", 5)).toBe("alpha beta gamma alpha beta");
    expect(buildCustomPassage(source, "time").length).toBeGreaterThanOrEqual(320);
  });
});
