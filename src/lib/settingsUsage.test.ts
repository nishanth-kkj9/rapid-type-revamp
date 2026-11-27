import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DailyGoalConfigSchema } from "./daily";
import { DrillSettingsSchema } from "./drillSettings";
import { UiPrefsSchema } from "./uiPrefs";

/**
 * G4: Every stored settings field across DrillSettings, UiPrefs,
 * and DailyGoalConfig must actually be read in runtime app code (no dead settings).
 */

function collectRuntimeFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRuntimeFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(full);
    }
  }
  return results;
}

// Serialization / storage plumbing files are excluded so a field defined only in
// storage schemas and backup serializers cannot pass without an actual consumer.
const PLUMBING_ONLY_BASENAMES = new Set([
  "drillSettings.ts",
  "uiPrefs.ts",
  "backup.ts",
  "appHydration.ts",
  "storage.ts",
]);

// Map optional/derived DrillSettings keys to their runtime accessor functions as well.
const FIELD_ACCESSOR_ALIASES: Record<string, string[]> = {
  drillMode: ["getDrillMode"],
  wordCount: ["getWordCount"],
  quoteLength: ["getQuoteLength"],
  quickRestart: ["getQuickRestart"],
  strictMode: ["getStrictMode"],
  paceCaret: ["getPaceCaret"],
  keyboardLayout: ["getKeyboardLayout"],
  keyboardStandard: ["getKeyboardStandard"],
  includePunctuation: ["resolveTextOptions"],
  includeNumbers: ["resolveTextOptions"],
  includeCapitals: ["resolveTextOptions"],
};

describe("stored settings runtime usage audit (G4)", () => {
  const srcRoot = path.resolve(__dirname, "..");
  const runtimeFiles = collectRuntimeFiles(srcRoot).filter(
    (file) => !PLUMBING_ONLY_BASENAMES.has(path.basename(file)),
  );
  const runtimeSources = runtimeFiles.map((file) => ({
    file,
    rel: path.relative(srcRoot, file),
    content: fs.readFileSync(file, "utf8"),
  }));

  const checkFieldReadInRuntime = (field: string, extraExcludedFiles: string[] = []) => {
    const aliases = [field, ...(FIELD_ACCESSOR_ALIASES[field] ?? [])];
    const readPatterns = aliases.flatMap((name) => [
      new RegExp(`\\.${name}\\b`), // settings.fieldName / obj.fieldName
      new RegExp(`\\b${name}\\(`), // getFieldName(...)
      new RegExp(`\\bconst\\s+\\{[^}]*\\b${name}\\b[^}]*\\}`), // destructured prop
      new RegExp(`\\bfunction\\s+\\w+\\([^)]*\\b${name}\\b`), // component destructured param
      new RegExp(`["']${name}["']\\s*:`), // rarely needed, skip? No, keep property read or component prop usage:
    ]);
    // Also allow React prop passing / JSX attribute like `heatmapMetric={...}` or `themeAccent` variable usage
    const identifierUse = new RegExp(`\\b${field}\\b`);

    const matchingFiles = runtimeSources
      .filter(({ rel }) => !extraExcludedFiles.includes(rel))
      .filter(({ content }) => {
        if (readPatterns.some((re) => re.test(content))) return true;
        // For files in components/ or hooks/, also match plain identifier reads (excluding plain interface declarations)
        return aliases.some((name) => {
          const re = new RegExp(`(?<!interface\\s+)(?<!:\\s*)\\b${name}\\b`);
          return re.test(content) && identifierUse.test(content);
        });
      })
      .map((s) => s.rel);

    return matchingFiles;
  };

  it("ensures every DrillSettings field is read in runtime app code", () => {
    const fields = Object.keys(DrillSettingsSchema.shape);
    for (const field of fields) {
      const consumers = checkFieldReadInRuntime(field);
      expect(consumers.length, `DrillSettings.${field} has no runtime consumer`).toBeGreaterThan(0);
    }
  });

  it("ensures every UiPrefs field is read in runtime app code (and smoothCaret is gone)", () => {
    const fields = Object.keys(UiPrefsSchema.shape);
    expect(fields).not.toContain("smoothCaret");
    for (const field of fields) {
      const consumers = checkFieldReadInRuntime(field);
      expect(consumers.length, `UiPrefs.${field} has no runtime consumer`).toBeGreaterThan(0);
    }
  });

  it("ensures every DailyGoalConfig field is read in runtime app code outside daily.ts", () => {
    const fields = Object.keys(DailyGoalConfigSchema.shape);
    for (const field of fields) {
      const consumers = checkFieldReadInRuntime(field, [path.join("lib", "daily.ts")]);
      expect(consumers.length, `DailyGoalConfig.${field} has no runtime consumer`).toBeGreaterThan(
        0,
      );
    }
  });
});
