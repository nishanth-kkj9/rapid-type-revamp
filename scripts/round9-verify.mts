/**
 * Round-9 verification for rapid-type-revamp
 * SECTION A — verifies PATCH 1-4 (settings-button consolidation) as implemented.
 * SECTION B — verifies the round-9 hardening fixes (F1/F2/F3).
 * Run from repo root: npx tsx scripts/round9-verify.mts
 * (or: REPO_PATH=/path/to/repo npx tsx scripts/round9-verify.mts)
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

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

const REPO = process.env.REPO_PATH || ".";
const idx = readFileSync(`${REPO}/src/routes/index.tsx`, "utf8");
const ws = readFileSync(`${REPO}/src/components/WordShooter.tsx`, "utf8");
const palette = readFileSync(`${REPO}/src/components/CommandPalette.tsx`, "utf8");
const daily = readFileSync(`${REPO}/src/lib/daily.ts`, "utf8");
const drill = readFileSync(`${REPO}/src/lib/drillSettings.ts`, "utf8");

console.log("=== SECTION A: PATCH 1-4 — settings-button consolidation (current state) ===");

check("PATCH 1: no 'Configure' button beside drill summary chips", () => {
  assert.ok(!idx.includes(">Configure<"), "Configure label must be gone");
  assert.ok(!/Configure\s*<\/span>/.test(idx), "no Configure span variant either");
});

check("PATCH 3: shooter settings reachable from exactly the expected sites", () => {
  assert.ok(!idx.includes(">Configure<"), "Configure label must be gone");
  const openers = idx.match(/setShooterSettingsOpen\(true\)/g) ?? [];
  // current: header + WordShooter prop + palette specific = 3
  assert.ok(
    openers.length === 3 || openers.length === 4,
    `expected 3-4 shooter openers, got ${openers.length}`,
  );
});

check("PATCH 2: no duplicate 'Drill Settings' chip-row button", () => {
  assert.ok(!idx.includes("Drill Settings</span>"), "chip-row Drill Settings button must be gone");
  const drillOpeners = idx.match(/setDrillSettingsOpen\(true\)/g) ?? [];
  // current: header + palette specific = 2
  assert.ok(
    drillOpeners.length === 2 || drillOpeners.length === 3,
    `expected 2-3 drill openers, got ${drillOpeners.length}`,
  );
});

check("PATCH 4: no icon-only 'Arcade settings' button in WordShooter status bar", () => {
  assert.ok(!ws.includes("Arcade settings"), "aria-label 'Arcade settings' must be gone");
  // status bar keeps mute + (pause) + restart only
  const bar = ws.slice(ws.indexOf("Top Status Bar"), ws.indexOf("Main Canvas Arena"));
  assert.ok(!bar.includes("onOpenSettings"), "status bar must not open settings");
  assert.ok(bar.includes("Mute audio") || bar.includes("soundMuted"), "mute control intact");
  assert.ok(bar.includes("Restart"), "restart control intact");
});

check("Header Settings = single persistent entry, mode-aware, accessible", () => {
  assert.ok(
    /aria-label=\{`...\` Settings`\}/.test(idx) || /aria-label=\{\`[^\`]*Settings\`\}/.test(idx),
    "mode-aware aria-label present",
  );
  assert.ok(idx.includes('<Sliders className="size-4 text-primary" />'), "header icon present");
  assert.ok(
    idx.includes('<span className="hidden sm:inline">Settings</span>'),
    "header label present",
  );
});

check("Shooter contextual overlay Settings preserved (idle + game-over)", () => {
  const idleIdx = ws.indexOf('phase === "idle" ?');
  const overIdx = ws.indexOf('phase === "over" ?');
  assert.ok(idleIdx > -1 && overIdx > idleIdx, "overlay blocks found in order");
  const idle = ws.slice(idleIdx, ws.indexOf('phase === "paused" ?', idleIdx));
  const over = ws.slice(overIdx, ws.indexOf("{/* Hidden Input", overIdx));
  assert.ok(idle.includes("onOpenSettings"), "idle overlay opens settings");
  assert.ok(over.includes("onOpenSettings"), "game-over overlay opens settings");
  // status-bar range (before idle overlay) must NOT contain onOpenSettings
  const bar = ws.slice(ws.indexOf("Top Status Bar"), idleIdx);
  assert.ok(!bar.includes("onOpenSettings"), "status bar has no settings trigger");
});

check("Command palette: exactly 2 explicit settings commands", () => {
  assert.ok(palette.includes("Timed Drill Settings"));
  assert.ok(palette.includes("Word Shooter Settings"));
  const items = palette.match(/CommandItem\s+value="[^"]*settings[^"]*"/g) ?? [];
  assert.equal(items.length, 2, `expected exactly 2 settings CommandItems, got ${items.length}`);
});

check("Both dialogs remain wired with single open state each", () => {
  assert.ok(/<DrillSettingsDialog\s+open=\{drillSettingsOpen\}/.test(idx.replace(/\s+/g, " ")));
  assert.ok(/<ShooterSettingsDialog\s+open=\{shooterSettingsOpen\}/.test(idx.replace(/\s+/g, " ")));
});

console.log("=== SECTION B: round-9 hardening (passes after patches applied) ===");

check("F1: DAILY_GOAL consumed inside daily.ts streak logic (no literal 3)", () => {
  assert.ok(daily.includes("state.runsToday >= DAILY_GOAL"), "recordRunToday streak threshold");
  assert.ok(!/runsToday >= 3\b/.test(daily), `literal threshold must be gone`);
  const literals = (daily.match(/>= 3\b/g) ?? []).length;
  assert.equal(literals, 0, `expected 0 '>= 3' literals, got ${literals}`);
});

check("F2: dead onOpenSettings fallback removed from CommandPalette", () => {
  assert.ok(!palette.includes("onOpenSettings"), "palette must not carry the dead generic opener");
  assert.ok(idx.includes("onOpenDrillSettings={() => setDrillSettingsOpen(true)}"));
  assert.ok(idx.includes("onOpenShooterSettings={() => setShooterSettingsOpen(true)}"));
  assert.ok(
    !/onOpenSettings=\{\(\) => \{\s*\n\s*if \(mode === "drill"\)/.test(idx),
    "index.tsx generic palette wiring removed",
  );
});

check("F3: targetWpm load clamp aligned with slider UI [20,160]", () => {
  assert.ok(
    /Math\.min\(160, Math\.max\(20, Math\.round\(parsed\.targetWpm\)\)\)/.test(drill),
    "clamp must be [20,160]",
  );
  assert.ok(!drill.includes("Math.min(200"), "old 200 ceiling must be gone");
});

check("Regression: round-8 core wiring still intact", () => {
  assert.ok(ws.includes("activeElapsedRef.current += dt;"));
  assert.ok(ws.includes("e.word === w || e.word[0] === w[0]"), "boss collision filter");
  assert.ok(daily.includes("export const DAILY_GOAL = 3;"));
  assert.ok(idx.includes("shown.wpm >= drillSettings.targetWpm"));
  assert.ok(idx.includes("h.mode === `${duration}s` || h.mode === String(duration)"));
});

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("FAILED:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
