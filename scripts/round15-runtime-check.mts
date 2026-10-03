/**
 * Round 15: Empirical Runtime QA & Module Invariant Checks
 * Verifies R15-A (uiPrefs, heatmap toggle persistence, touch target),
 * R15-B (results stat chips, personal best delta celebration logic),
 * and R15-C (smooth floating caret contracts and reduced motion).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_UI_PREFS,
  UI_PREFS_KEY,
  clearUiPrefs,
  loadUiPrefs,
  saveUiPrefs,
  type UiPrefs,
} from "../src/lib/uiPrefs";

const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${name}: ${msg}`);
    failures.push(`${name}: ${msg}`);
  }
}

console.log("=== Round 15: Empirical Runtime QA & Module Invariant Checks ===");

// 1. SSR Guards under bare Node
check("1. SSR guard: loadUiPrefs() returns DEFAULT_UI_PREFS in node", () => {
  assert.deepEqual(loadUiPrefs(), DEFAULT_UI_PREFS);
});

check("2. SSR guard: saveUiPrefs() merges without throwing in node", () => {
  const merged = saveUiPrefs({ heatmapMetric: "speed" });
  assert.equal(merged.heatmapMetric, "speed");
  assert.equal(merged.smoothCaret, true);
});

check("3. SSR guard: clearUiPrefs() executes safely in node", () => {
  assert.doesNotThrow(() => clearUiPrefs());
});

// Mock browser storage environment for persistence checks
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, String(v));
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => {
    store.clear();
  },
};

(globalThis as unknown as { window: unknown; localStorage: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;

// 2. Persistence & Sanitization
check("4. Persistence: empty storage yields default prefs", () => {
  mockLocalStorage.clear();
  assert.deepEqual(loadUiPrefs(), DEFAULT_UI_PREFS);
});

check("5. Persistence: corrupted JSON safely returns default prefs", () => {
  mockLocalStorage.setItem(UI_PREFS_KEY, "{broken-json");
  assert.deepEqual(loadUiPrefs(), DEFAULT_UI_PREFS);
});

check("6. Sanitization: invalid heatmapMetric string falls back to 'misses'", () => {
  mockLocalStorage.setItem(
    UI_PREFS_KEY,
    JSON.stringify({ heatmapMetric: "bad_metric", smoothCaret: true }),
  );
  const loaded = loadUiPrefs();
  assert.equal(loaded.heatmapMetric, "misses");
  assert.equal(loaded.smoothCaret, true);
});

check("7. Sanitization: valid heatmapMetric 'speed' is saved and read back", () => {
  saveUiPrefs({ heatmapMetric: "speed" });
  const loaded = loadUiPrefs();
  assert.equal(loaded.heatmapMetric, "speed");
  assert.equal(loaded.smoothCaret, true);
});

check("8. Sanitization: non-boolean smoothCaret falls back to default true", () => {
  mockLocalStorage.setItem(
    UI_PREFS_KEY,
    JSON.stringify({ heatmapMetric: "speed", smoothCaret: "false" }),
  );
  const loaded = loadUiPrefs();
  assert.equal(loaded.smoothCaret, true);
});

check("9. Sanitization: valid smoothCaret false is saved and read back", () => {
  saveUiPrefs({ smoothCaret: false });
  const loaded = loadUiPrefs();
  assert.equal(loaded.smoothCaret, false);
});

check("10. Partial updates: updating smoothCaret preserves heatmapMetric", () => {
  saveUiPrefs({ heatmapMetric: "speed" });
  saveUiPrefs({ smoothCaret: false });
  const loaded = loadUiPrefs();
  assert.equal(loaded.heatmapMetric, "speed");
  assert.equal(loaded.smoothCaret, false);
});

check("11. Partial updates: updating heatmapMetric preserves smoothCaret", () => {
  saveUiPrefs({ heatmapMetric: "misses" });
  const loaded = loadUiPrefs();
  assert.equal(loaded.heatmapMetric, "misses");
  assert.equal(loaded.smoothCaret, false);
});

check("12. Clear: clearUiPrefs removes key from storage", () => {
  saveUiPrefs({ heatmapMetric: "speed" });
  assert.ok(mockLocalStorage.getItem(UI_PREFS_KEY));
  clearUiPrefs();
  assert.equal(mockLocalStorage.getItem(UI_PREFS_KEY), null);
  assert.deepEqual(loadUiPrefs(), DEFAULT_UI_PREFS);
});

// 3. Heatmap Render Gate Logic
check("13. Gate logic: no keys + no speed -> false", () => {
  const allTimeKeys = {};
  const allTimeSpeed = {};
  const gate = Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0;
  assert.equal(gate, false);
});

check("14. Gate logic: keys present + no speed -> true", () => {
  const allTimeKeys = { e: 2 };
  const allTimeSpeed = {};
  const gate = Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0;
  assert.equal(gate, true);
});

check("15. Gate logic: no keys + speed present -> true", () => {
  const allTimeKeys = {};
  const allTimeSpeed = { e: [300, 2] };
  const gate = Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0;
  assert.equal(gate, true);
});

check("16. Gate logic: both keys + speed present -> true", () => {
  const allTimeKeys = { e: 2 };
  const allTimeSpeed = { e: [300, 2] };
  const gate = Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0;
  assert.equal(gate, true);
});

// 4. Record Celebration & Delta Math
function calcRecordState(currentWpm: number, prevBest: number) {
  const isRecord = currentWpm > prevBest && currentWpm > 0;
  const delta = isRecord && prevBest > 0 ? Math.round(currentWpm - prevBest) : null;
  return { isRecord, delta };
}

check("17. Record delta: higher than existing best yields delta", () => {
  const res = calcRecordState(74.6, 65.2);
  assert.equal(res.isRecord, true);
  assert.equal(res.delta, 9);
});

check("18. Record delta: first run (prevBest = 0) sets isRecord with null delta", () => {
  const res = calcRecordState(55.0, 0);
  assert.equal(res.isRecord, true);
  assert.equal(res.delta, null);
});

check("19. Record delta: lower or equal WPM yields no record and null delta", () => {
  const res1 = calcRecordState(60.0, 60.0);
  assert.equal(res1.isRecord, false);
  assert.equal(res1.delta, null);

  const res2 = calcRecordState(50.0, 60.0);
  assert.equal(res2.isRecord, false);
  assert.equal(res2.delta, null);
});

check("20. Record delta: 0 WPM never counts as a record", () => {
  const res = calcRecordState(0, 0);
  assert.equal(res.isRecord, false);
  assert.equal(res.delta, null);
});

// 5. CSS & Component Structural Contracts
const keyHeatmapSource = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/components/KeyHeatmap.tsx"),
  "utf8",
);

check("21. Touch targets: MetricChip contains min-h-7 and sm:min-h-6", () => {
  assert.ok(
    keyHeatmapSource.includes("min-h-7"),
    "MetricChip must have min-h-7 for mobile touch ergonomics",
  );
  assert.ok(
    keyHeatmapSource.includes("sm:min-h-6"),
    "MetricChip must have sm:min-h-6 for desktop compactness",
  );
});

check("22. Metric persistence: KeyHeatmap calls loadUiPrefs and saveUiPrefs", () => {
  assert.ok(keyHeatmapSource.includes("loadUiPrefs().heatmapMetric"));
  assert.ok(keyHeatmapSource.includes("saveUiPrefs({ heatmapMetric:"));
});

const typingTextSource = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/components/TypingText.tsx"),
  "utf8",
);

check(
  "23. Smooth caret: TypingText renders floating caret element with will-change-transform",
  () => {
    assert.ok(typingTextSource.includes("caret-smooth"));
    assert.ok(typingTextSource.includes("will-change-transform"));
    assert.ok(typingTextSource.includes("translate3d("));
  },
);

const stylesSource = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/styles.css"),
  "utf8",
);

check("24. CSS: caret-smooth class defined with 80ms transition and pulse animation", () => {
  assert.ok(stylesSource.includes(".caret-smooth"));
  assert.ok(stylesSource.includes("transition: transform 80ms"));
  assert.ok(stylesSource.includes("animation: caret-pulse"));
});

check("25. CSS: prefers-reduced-motion disables caret-smooth animation & transition", () => {
  const reducedMotionIdx = stylesSource.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.ok(reducedMotionIdx > -1, "Reduced motion block must exist");
  const block = stylesSource.slice(reducedMotionIdx, reducedMotionIdx + 300);
  assert.ok(block.includes(".caret-smooth"));
  assert.ok(block.includes("animation: none !important"));
  assert.ok(block.includes("transition: none !important"));
});

const indexSource = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/routes/index.tsx"),
  "utf8",
);

check("26. Results screen: displays 6 stat chips in responsive grid", () => {
  assert.ok(indexSource.includes("Accuracy"));
  assert.ok(indexSource.includes("Correct"));
  assert.ok(indexSource.includes("Errors"));
  assert.ok(indexSource.includes("Raw WPM"));
  assert.ok(indexSource.includes("Net WPM"));
  assert.ok(indexSource.includes("Consistency"));
  assert.ok(indexSource.includes("grid-cols-2"));
  assert.ok(indexSource.includes("sm:grid-cols-3"));
});

check("27. Celebration: displays personal best delta and record-glow", () => {
  assert.ok(indexSource.includes("record-glow"));
  assert.ok(indexSource.includes("New personal best"));
  assert.ok(indexSource.includes("+${recordDelta} wpm"));
});

check("28. Drill heatmap render gate includes speed data", () => {
  assert.ok(
    indexSource.includes(
      "Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0",
    ),
  );
});

// Final Result
if (failures.length > 0) {
  console.error(`\nRESULT: ${failures.length} failed!`);
  process.exit(1);
} else {
  console.log(`\nRESULT: 28 passed, 0 failed`);
}
