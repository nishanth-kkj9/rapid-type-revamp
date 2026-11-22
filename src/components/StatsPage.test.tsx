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
  it("renders empty state with one button and valid h2 heading when history has 0 runs", async () => {
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

    expect(screen.getByRole("heading", { level: 2, name: "Stats" })).toBeInTheDocument();
    expect(screen.queryAllByRole("heading").map((h) => h.tagName)).toEqual(["H2"]);
    const empty = screen.getByLabelText("Empty statistics state");
    expect(empty).toHaveTextContent("No runs yet. Finish one to see your trends.");
    const buttons = within(empty).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]!);
    expect(onStartRun).toHaveBeenCalledTimes(1);
  });

  it("renders compact summary row without icons, sections in order, conditional Arcade block, and h2->h3 headings", () => {
    const drillRuns = Array.from({ length: 4 }, (_, i) => mkRun(i));
    const shooterRun = mkRun(4, {
      id: "shooter-pb-1",
      mode: "shooter",
      score: 3450,
      level: 7,
      maxStreak: 19,
      bossesDefeated: 2,
      elapsed: 30,
    });
    const baseProps = {
      historyReady: true,
      daily: null,
      allTimeKeys: { e: 4, a: 2 },
      allTimeSpeed: { e: [450, 3] as [number, number], a: [320, 2] as [number, number] },
      layout: "qwerty" as const,
      standard: "ansi" as const,
      onClearHistory: vi.fn(),
      onImportHistory: vi.fn(),
      onDeleteRun: vi.fn(),
      onRestoreRun: vi.fn(),
      onOpenGoalSettings: vi.fn(),
      onStartRun: vi.fn(),
    };

    const { rerender } = render(<StatsPage history={drillRuns} {...baseProps} />);
    expect(screen.queryByLabelText("Arcade personal bests")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("heading").map((h) => h.tagName)).toEqual([
      "H2",
      "H3",
      "H3",
      "H3",
      "H3",
    ]);

    rerender(<StatsPage history={[...drillRuns, shooterRun]} {...baseProps} />);
    const summary = screen.getByLabelText("Summary statistics");
    expect(summary.querySelectorAll("svg")).toHaveLength(0);
    expect(within(summary).getByText("5")).toBeInTheDocument();
    expect(within(summary).getByText("2m 30s")).toBeInTheDocument();
    expect(within(summary).getByText(/Avg accuracy \(last 20\)/i)).toBeInTheDocument();

    const arcadeSection = screen.getByLabelText("Arcade personal bests");
    expect(within(arcadeSection).getByText("3,450")).toBeInTheDocument();
    expect(within(arcadeSection).getByText("Lvl 7")).toBeInTheDocument();

    const chart = screen.getByLabelText("WPM over time");
    const calendar = screen.getByLabelText("Practice activity calendar");
    const heatmap = screen.getByLabelText("Lifetime keyboard heatmap");
    const historySec = screen.getByLabelText("Run history and progress");
    expect(chart.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      calendar.compareDocumentPosition(heatmap) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      heatmap.compareDocumentPosition(historySec) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.queryAllByRole("heading").map((h) => h.tagName)).toEqual([
      "H2",
      "H3",
      "H3",
      "H3",
      "H3",
      "H3",
    ]);
    expect(screen.getByRole("button", { name: /Download history as CSV/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Import/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete all my data/i })).not.toBeInTheDocument();
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
