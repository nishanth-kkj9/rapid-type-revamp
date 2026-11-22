// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

afterEach(cleanup);

describe("AppHeader", () => {
  it("renders 5 nav buttons with no svg icons and keeps the Settings aria-label", () => {
    render(
      <AppHeader
        mode="drill"
        focusDimmed={false}
        onModeChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenDailyGoalSettings={vi.fn()}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Primary sections" });
    const navButtons = within(nav).getAllByRole("button");
    expect(navButtons.map((btn) => btn.textContent)).toEqual([
      "Practice",
      "Learn",
      "Arcade",
      "Stats",
      "Achievements",
    ]);
    expect(nav.querySelectorAll("svg")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Open unified settings" })).toBeInTheDocument();
  });
});
