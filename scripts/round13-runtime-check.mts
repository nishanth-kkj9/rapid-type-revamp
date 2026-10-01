/**
 * Round-13 runtime verification script for rapid-type-revamp.
 * Empirical verification of Keyboard Heatmap, Mastery Achievements,
 * SSR safety, boundary conditions, and layout geometry.
 *
 * Run from repo root: npx tsx scripts/round13-runtime-check.mts
 */
import { strict as assert } from "node:assert";
import {
  ACHIEVEMENTS,
  clearAchievements,
  EMPTY_ACHIEVEMENTS,
  evaluateAchievements,
  loadAchievements,
  saveAchievements,
  type RunContext,
} from "../src/lib/achievements.ts";
import { aggregateKeyMistakes, heatLevel } from "../src/lib/heatmap.ts";
import { KEY_WIDTHS, KEYBOARD_ROWS, keyFor } from "../src/lib/keyboardLayout.ts";
import { getLevel, isBossLevel } from "../src/lib/shooterEngine.ts";

let pass = 0;
let fail = 0;
const fails: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    fails.push(name);
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  }
}

console.log("=== Round 13: Empirical Runtime QA & Module Invariant Checks ===");

// 1. Purity proof
const warmPrev = {
  unlocked: { "speed-40": "2026-09-01T00:00:00.000Z" },
  counters: { focusRuns: 4 },
};
const warmPrevSnapshot = JSON.stringify(warmPrev);
const richContext: RunContext = {
  mode: "drill",
  wpm: 105,
  accuracy: 100,
  typed: 80,
  streak: 7,
  focused: true,
};

const warmResult = evaluateAchievements(richContext, warmPrev);

check("1. Purity: evaluateAchievements does not mutate prev (snapshot check)", () => {
  assert.equal(JSON.stringify(warmPrev), warmPrevSnapshot);
});

check("2. Purity: evaluated state is a new object reference", () => {
  assert.notEqual(warmResult.state, warmPrev);
});

check("3. Purity: existing unlock timestamps preserved", () => {
  assert.equal(warmResult.state.unlocked["speed-40"], "2026-09-01T00:00:00.000Z");
});

check("4. Purity: no duplicate grant of already-unlocked achievement", () => {
  assert.ok(!warmResult.newlyUnlocked.some((a) => a.id === "speed-40"));
});

check("5. Warm-prev newly-unlocked order matches expectation", () => {
  const ids = warmResult.newlyUnlocked.map((a) => a.id);
  assert.deepEqual(ids, [
    "speed-60",
    "speed-80",
    "speed-100",
    "flawless",
    "streak-7",
    "focus-5",
    "first-run",
  ]);
});

check("6. Warm-prev focusRuns counter advances 4 -> 5 and unlocks focus-5", () => {
  assert.equal(warmResult.state.counters["focusRuns"], 5);
  assert.ok(warmResult.state.unlocked["focus-5"]);
});

// 2. Fresh-prev order proof
const freshResult = evaluateAchievements(richContext, EMPTY_ACHIEVEMENTS);

check("7. Fresh-prev newly-unlocked order matches expectation", () => {
  const ids = freshResult.newlyUnlocked.map((a) => a.id);
  assert.deepEqual(ids, [
    "speed-40",
    "speed-60",
    "speed-80",
    "speed-100",
    "flawless",
    "streak-7",
    "first-run",
  ]);
});

check("8. Fresh-prev focusRuns becomes 1 and focus-5 is withheld", () => {
  assert.equal(freshResult.state.counters["focusRuns"], 1);
  assert.equal(freshResult.state.unlocked["focus-5"], undefined);
});

// 3. SSR guards in real node environment
check("9. SSR guard: loadAchievements() returns empty state in node", () => {
  const loaded = loadAchievements();
  assert.deepEqual(loaded, EMPTY_ACHIEVEMENTS);
});

check("10. SSR guard: saveAchievements() executes safely without throwing", () => {
  assert.doesNotThrow(() => saveAchievements(freshResult.state));
});

check("11. SSR guard: clearAchievements() executes safely without throwing", () => {
  assert.doesNotThrow(() => clearAchievements());
});

// 4. Boundary matrix
check("12. Boundary: wpm 39.9 does not grant speed-40", () => {
  const res = evaluateAchievements({ mode: "drill", wpm: 39.9, accuracy: 80 }, EMPTY_ACHIEVEMENTS);
  assert.equal(res.state.unlocked["speed-40"], undefined);
});

check("13. Boundary: wpm 40 grants speed-40", () => {
  const res = evaluateAchievements({ mode: "drill", wpm: 40, accuracy: 80 }, EMPTY_ACHIEVEMENTS);
  assert.ok(res.state.unlocked["speed-40"]);
});

check("14. Boundary: accuracy 100.5 clamps and grants flawless", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: 100.5, typed: 60 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.ok(res.state.unlocked["flawless"]);
});

check("15. Boundary: accuracy NaN does not grant flawless", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: Number.NaN, typed: 60 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.equal(res.state.unlocked["flawless"], undefined);
});

check("16. Boundary: drill typed 49 at 100% accuracy does not grant flawless", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: 100, typed: 49 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.equal(res.state.unlocked["flawless"], undefined);
});

check("17. Boundary: drill typed 50 at 100% accuracy grants flawless", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: 100, typed: 50 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.ok(res.state.unlocked["flawless"]);
});

check("18. Boundary: streak 6 does not grant streak-7", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: 80, streak: 6 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.equal(res.state.unlocked["streak-7"], undefined);
});

check("19. Boundary: streak 7 grants streak-7", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: 80, streak: 7 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.ok(res.state.unlocked["streak-7"]);
});

check("20. Boundary: shooter wordsDestroyed 9 does not grant flawless", () => {
  const res = evaluateAchievements(
    { mode: "shooter", wpm: 20, accuracy: 100, wordsDestroyed: 9 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.equal(res.state.unlocked["flawless"], undefined);
});

check("21. Boundary: shooter wordsDestroyed 10 grants flawless", () => {
  const res = evaluateAchievements(
    { mode: "shooter", wpm: 20, accuracy: 100, wordsDestroyed: 10 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.ok(res.state.unlocked["flawless"]);
});

check("22. Boundary: drill mode with level 8 grants no shooter-specific badges", () => {
  const res = evaluateAchievements(
    { mode: "drill", wpm: 20, accuracy: 80, level: 8 },
    EMPTY_ACHIEVEMENTS,
  );
  assert.equal(res.state.unlocked["shooter-level-5"], undefined);
  assert.equal(res.state.unlocked["boss-slayer"], undefined);
});

// 5. Idempotency + counter semantics
const ctxA: RunContext = { mode: "drill", wpm: 65, accuracy: 92, focused: true };
const run1 = evaluateAchievements(ctxA, EMPTY_ACHIEVEMENTS);
const run2 = evaluateAchievements(ctxA, run1.state);

check("23. Idempotency: re-evaluating identical context yields empty newlyUnlocked", () => {
  assert.equal(run2.newlyUnlocked.length, 0);
});

check("24. Idempotency: unlocked badge count remains stable across runs", () => {
  assert.equal(Object.keys(run2.state.unlocked).length, Object.keys(run1.state.unlocked).length);
});

check("25. Counter semantics: focusRuns advances per run (1 -> 2)", () => {
  assert.equal(run1.state.counters["focusRuns"], 1);
  assert.equal(run2.state.counters["focusRuns"], 2);
});

// 6. Heatmap aggregation
check("26. Heatmap aggregation: shifted and uppercase mapped to base key", () => {
  const mapped = aggregateKeyMistakes({ "?": 2, "/": 1, A: 3, a: 1 });
  assert.deepEqual(mapped, { "/": 3, a: 4 });
});

check("27. Heatmap aggregation: space mapped to Space", () => {
  const mapped = aggregateKeyMistakes({ " ": 5 });
  assert.deepEqual(mapped, { Space: 5 });
});

check("28. Heatmap aggregation: invalid/non-integer/zero/negative entries dropped", () => {
  const mapped = aggregateKeyMistakes({
    ab: 10,
    x: 0,
    y: -5,
    z: 2.5,
    k: 3,
  });
  assert.deepEqual(mapped, { k: 3 });
});

// 7. Quartile matrix
check("29. Quartile matrix: thresholds <= 0.25 (1), <= 0.50 (2), <= 0.75 (3), > 0.75 (4)", () => {
  assert.equal(heatLevel(2, 10), 1);
  assert.equal(heatLevel(2.5, 10), 1);
  assert.equal(heatLevel(5, 10), 2);
  assert.equal(heatLevel(7.5, 10), 3);
  assert.equal(heatLevel(8, 10), 4);
  assert.equal(heatLevel(10, 10), 4);
});

check("30. Quartile matrix: non-positive or NaN guards return 0", () => {
  assert.equal(heatLevel(0, 10), 0);
  assert.equal(heatLevel(-1, 10), 0);
  assert.equal(heatLevel(5, 0), 0);
  assert.equal(heatLevel(Number.NaN, 10), 0);
});

// 8. Layout geometry
check("31. Layout geometry: KEYBOARD_ROWS has exactly 5 physical rows", () => {
  assert.equal(KEYBOARD_ROWS.length, 5);
});

check("32. Layout geometry: all keys in KEY_WIDTHS exist in KEYBOARD_ROWS", () => {
  const allKeys = new Set(KEYBOARD_ROWS.flat());
  for (const k of Object.keys(KEY_WIDTHS)) {
    assert.ok(allKeys.has(k), `Missing key width key: ${k}`);
  }
});

check("33. Layout geometry: all 21 shifted characters map correctly with shift: true", () => {
  const chars = [
    "~",
    "!",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    "_",
    "+",
    "{",
    "}",
    "|",
    ":",
    '"',
    "<",
    ">",
    "?",
  ];
  assert.equal(chars.length, 21);
  for (const ch of chars) {
    const res = keyFor(ch);
    assert.ok(res.key !== null, `No key for ${ch}`);
    assert.equal(res.shift, true, `Expected shift: true for ${ch}`);
  }
});

check("34. Layout geometry: keyFor handles uppercase, space, standard, and null", () => {
  assert.deepEqual(keyFor("H"), { key: "h", shift: true });
  assert.deepEqual(keyFor(" "), { key: "Space", shift: false });
  assert.deepEqual(keyFor("e"), { key: "e", shift: false });
  assert.deepEqual(keyFor(null), { key: null, shift: false });
});

// 9. Boss semantics from the real engine
check(
  "35. Boss semantics: getLevel(1599)=4, getLevel(1600)=5 (Ace), getLevel(2000)=6 (Boss Slayer)",
  () => {
    assert.equal(getLevel(1599), 4);
    assert.equal(getLevel(1600), 5);
    assert.equal(isBossLevel(5), true);
    assert.equal(getLevel(2000), 6);
    assert.equal(isBossLevel(6), false);
    assert.equal(ACHIEVEMENTS.length, 10);
  },
);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("FAILED:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
