// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ActivityCalendar } from "./ActivityCalendar";
import type { HistoryEntry } from "@/lib/typingStats";

afterEach(() => {
  cleanup();
});

const mkEntry = (id: string, date: number, elapsed = 60): HistoryEntry => ({
  id,
  date,
  difficulty: "medium",
  mode: "30s",
  wpm: 68,
  rawWpm: 72,
  adjustedWpm: 65,
  accuracy: 96,
  correct: 150,
  incorrect: 4,
  typed: 154,
  elapsed,
  consistency: 88,
});

describe("ActivityCalendar", () => {
  it("renders exact history counts for fixture dates, supports keyboard arrow navigation, screen reader status, and text table view", async () => {
    const user = userEvent.setup();
    const today = "2026-04-15";
    const history: HistoryEntry[] = [
      mkEntry("r1", new Date(2026, 3, 15, 8, 0, 0).getTime(), 90),
      mkEntry("r2", new Date(2026, 3, 15, 19, 0, 0).getTime(), 30),
      mkEntry("r3", new Date(2026, 3, 14, 12, 0, 0).getTime(), 120),
    ];

    render(<ActivityCalendar history={history} todayDate={today} />);

    expect(screen.getByText(/3 runs · 4 min · 2 active days/i)).toBeInTheDocument();

    const apr15Btn = screen.getByRole("gridcell", { name: /2026-04-15: 2 runs, 2 minutes/i });
    const apr14Btn = screen.getByRole("gridcell", { name: /2026-04-14: 1 run, 2 minutes/i });
    expect(apr15Btn).toHaveAttribute("tabindex", "0");
    expect(apr14Btn).toHaveAttribute("tabindex", "-1");

    apr15Btn.focus();
    fireEvent.focus(apr15Btn);
    expect(apr15Btn).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(/2026-04-15 · 2 runs · 2 min active/i);

    await user.keyboard("{ArrowUp}");
    expect(apr14Btn).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(/2026-04-14 · 1 run · 2 min active/i);

    // Switch metric to Minutes
    await user.click(screen.getByRole("button", { name: /^minutes$/i }));
    expect(screen.getByRole("button", { name: /^minutes$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Toggle accessible text summary table
    await user.click(screen.getByRole("button", { name: /Text summary/i }));
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "2026-04-15" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "2026-04-14" })).toBeInTheDocument();
  });
});
