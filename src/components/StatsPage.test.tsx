// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsPage } from "./StatsPage";
import type { HistoryEntry } from "@/lib/typingStats";

afterEach(() => {
  cleanup();
});

const mkRun = (idx: number, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: `run-${idx}`,
  date: Date.now() - idx * 60_000,
  difficulty: idx % 2 === 0 ? "medium" : "easy",
  mode: "30s",
  wpm: 60 + (idx % 30),
  rawWpm: 66 + (idx % 30),
  adjustedWpm: 58 + (idx % 30),
  accuracy: 95,
  correct: 150,
  incorrect: 5,
  typed: 155,
  elapsed: 30,
  consistency: 88,
  ...over,
});

describe("StatsPage", () => {
  it("renders inviting empty state with Start a run CTA when history has 0 runs", async () => {
    const user = userEvent.setup();
    const onStartRun = vi.fn();
    render(
      <StatsPage
        history={[]}
        historyReady={true}
        daily={null}
        allTimeKeys={{}}
        allTimeSpeed={{}}
        layout="qwerty"
        standard="ansi"
        onClearHistory={vi.fn()}
        onImportHistory={vi.fn()}
        onDeleteRun={vi.fn()}
        onRestoreRun={vi.fn()}
        onOpenGoalSettings={vi.fn()}
        onStartRun={onStartRun}
      />,
    );

    expect(screen.getByLabelText("Daily goal progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Empty statistics state")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Start a run/i }));
    expect(onStartRun).toHaveBeenCalledTimes(1);
  });

  it("renders summary tiles, Arcade personal bests, calendar, heatmap, progress chart, and history without duplicate import/delete-all controls", () => {
    const history = [
      ...Array.from({ length: 4 }, (_, i) => mkRun(i)),
      mkRun(4, {
        id: "shooter-pb-1",
        mode: "shooter",
        score: 3450,
        level: 7,
        maxStreak: 19,
        bossesDefeated: 2,
        elapsed: 30,
      }),
    ];
    render(
      <StatsPage
        history={history}
        historyReady={true}
        daily={null}
        allTimeKeys={{ e: 4, a: 2 }}
        allTimeSpeed={{ e: [450, 3], a: [320, 2] }}
        layout="qwerty"
        standard="ansi"
        onClearHistory={vi.fn()}
        onImportHistory={vi.fn()}
        onDeleteRun={vi.fn()}
        onRestoreRun={vi.fn()}
        onOpenGoalSettings={vi.fn()}
        onStartRun={vi.fn()}
      />,
    );

    const summary = screen.getByLabelText("Summary statistics");
    expect(within(summary).getByText("5")).toBeInTheDocument();
    expect(within(summary).getByText("2m 30s")).toBeInTheDocument();

    const arcadeSection = screen.getByLabelText("Arcade personal bests");
    expect(within(arcadeSection).getByText("3,450")).toBeInTheDocument();
    expect(within(arcadeSection).getByText("Lvl 7")).toBeInTheDocument();
    expect(within(arcadeSection).getByText("19x")).toBeInTheDocument();
    expect(within(arcadeSection).getByText("2")).toBeInTheDocument();

    expect(screen.getByLabelText("Practice activity calendar")).toBeInTheDocument();
    expect(screen.getByLabelText("Lifetime keyboard heatmap")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download history as CSV/i })).toBeInTheDocument();

    // Must NOT contain duplicate backup/import or delete-all controls
    expect(screen.queryByRole("button", { name: /Import/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete all my data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Export Full Backup/i })).not.toBeInTheDocument();
  });

  it("handles 2,000 imported runs smoothly with paginated history and downsampled progress chart", async () => {
    const user = userEvent.setup();
    const bigHistory = Array.from({ length: 2000 }, (_, i) => mkRun(i));

    const start = performance.now();
    render(
      <StatsPage
        history={bigHistory}
        historyReady={true}
        daily={null}
        allTimeKeys={{ e: 20 }}
        allTimeSpeed={{}}
        layout="qwerty"
        standard="ansi"
        onClearHistory={vi.fn()}
        onImportHistory={vi.fn()}
        onDeleteRun={vi.fn()}
        onRestoreRun={vi.fn()}
        onOpenGoalSettings={vi.fn()}
        onStartRun={vi.fn()}
      />,
    );
    const renderMs = performance.now() - start;
    expect(renderMs).toBeLessThan(2000);

    expect(screen.getByText(/Run Log \(1–12 of 2000\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Run Log \(13–24 of 2000\)/i)).toBeInTheDocument();

    // Chart data points should be downsampled (<= 120) rather than rendering 2,000 SVG point nodes
    const svgPoints = document.querySelectorAll('svg[role="img"] circle[role="button"]');
    expect(svgPoints.length).toBeLessThanOrEqual(120);
  });

  it("keeps full backup export, import, and delete-all handlers scoped exclusively to SettingsDataPrivacyTab", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const checkNoImport = (relPath: string, forbidden: RegExp[]) => {
      const content = fs.readFileSync(path.join(srcDir, relPath), "utf8");
      for (const rx of forbidden) {
        expect(content, `${relPath} should not match ${rx}`).not.toMatch(rx);
      }
    };

    const forbiddenDirect = [
      /downloadFullBackupJson/,
      /DeleteAllDataDialog/,
      /HistoryImportDialog/,
      /importFullBackupFromStorage/,
      /exportAllAppDataFromStorage/,
    ];
    for (const file of [
      "App.tsx",
      "components/CommandPalette.tsx",
      "components/HistoryActionsBar.tsx",
      "components/HistoryPanel.tsx",
      "components/StatsPage.tsx",
    ]) {
      checkNoImport(file, forbiddenDirect);
    }

    // History/Stats/CommandPalette must not even accept backup import/export props
    for (const file of [
      "components/CommandPalette.tsx",
      "components/HistoryActionsBar.tsx",
      "components/HistoryPanel.tsx",
      "components/StatsPage.tsx",
    ]) {
      checkNoImport(file, [/importFullBackup/, /onExportAllData/, /onDeleteAllData/]);
    }

    const settingsTab = fs.readFileSync(
      path.join(srcDir, "components/settings/SettingsDataPrivacyTab.tsx"),
      "utf8",
    );
    expect(settingsTab).toMatch(/downloadFullBackupJson/);
    expect(settingsTab).toMatch(/DeleteAllDataDialog/);
  });
});
