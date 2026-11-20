// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_DRILL_SETTINGS } from "@/lib/drillSettings";
import { applyLearnLessonUpdate, LETTER_ORDER, type LearnState } from "@/lib/learn";
import { KEYBOARD_LAYOUTS, KEYBOARD_STANDARDS } from "@/lib/keyboardLayout";
import { LearnScreen } from "./LearnScreen";
import { Keyboard } from "./Keyboard";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
});

afterEach(() => {
  cleanup();
});

describe("Keyboard Learn overlay across all layouts and ANSI/ISO", () => {
  it("dims locked letters, keeps unlocked normal, and marks focus key across all 5 layouts and both standards", () => {
    const unlocked = new Set(["e", "t", "a", "o", "i", "n"]);
    const locked = new Set(LETTER_ORDER.filter((ch) => !unlocked.has(ch)));

    for (const layout of KEYBOARD_LAYOUTS) {
      for (const standard of KEYBOARD_STANDARDS) {
        const { container, unmount } = render(
          <Keyboard
            nextChar="n"
            errorFlash={false}
            layout={layout.id}
            standard={standard.id}
            lockedKeys={locked}
            focusKey="n"
          />,
        );

        const lockedCaps = container.querySelectorAll('.keycap[data-learn="locked"]');
        const focusCaps = container.querySelectorAll('.keycap[data-learn="focus"]');
        // 26 - 6 = 20 locked letter keys (all alpha keys exist on all 5 layouts)
        expect(lockedCaps.length).toBe(20);
        expect(focusCaps.length).toBe(1);
        unmount();
      }
    }
  });
});

describe("LearnScreen", () => {
  it("renders 6 initial unlocked keys, target WPM slider, unlock status, and commits lessons cleanly", async () => {
    const user = userEvent.setup({ delay: null });
    const preMastered: LearnState = {
      unlocked: ["e", "t", "a", "o", "i", "n"],
      perKey: {
        e: { emaMs: 220, hits: 40, errors: 0, recentAcc: 1 },
        t: { emaMs: 220, hits: 40, errors: 0, recentAcc: 1 },
        a: { emaMs: 220, hits: 40, errors: 0, recentAcc: 1 },
        o: { emaMs: 220, hits: 40, errors: 0, recentAcc: 1 },
        i: { emaMs: 220, hits: 40, errors: 0, recentAcc: 1 },
        n: { emaMs: 220, hits: 25, errors: 0, recentAcc: 1 },
      },
      targetWpm: 35,
      lessons: 2,
      updatedAt: 1000,
    };

    const onTargetWpmChange = vi.fn();
    const committedEntries: string[] = [];

    const onCommitLesson = vi.fn((payload) => {
      committedEntries.push(payload.entry.mode);
      // Force deterministic hit/speed sufficiency so completing one lesson unlocks 's'
      const boostedHits = { ...payload.keyHits, n: Math.max(payload.keyHits.n ?? 0, 10) };
      const boostedSpeed = { ...payload.keySpeed, n: [2000, 10] as [number, number] };
      return applyLearnLessonUpdate(preMastered, {
        keyHits: boostedHits,
        keySpeed: boostedSpeed,
        mistakes: payload.mistakes,
        now: 2000,
      });
    });

    const { container } = render(
      <LearnScreen
        learnState={preMastered}
        drillSettings={DEFAULT_DRILL_SETTINGS}
        onTargetWpmChange={onTargetWpmChange}
        onCommitLesson={onCommitLesson}
      />,
    );

    expect(screen.getByTestId("learn-unlocked-count")).toHaveTextContent("6/26 letters");
    expect(screen.getByTestId("learn-unlock-status")).toHaveTextContent(
      /Unlock\s+s\s+when all keys reach\s+35 WPM\s+and\s+94% accuracy/i,
    );

    const slider = screen.getByLabelText("Target WPM");
    fireEvent.change(slider, { target: { value: "45" } });
    expect(onTargetWpmChange).toHaveBeenCalledWith(45);

    const lockedCaps = container.querySelectorAll('.keycap[data-learn="locked"]');
    expect(lockedCaps.length).toBe(20);

    // Complete the whole Learn lesson passage by typing it cleanly
    const passage = Array.from(container.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
    expect(passage).toMatch(/^[etaoin ]+$/);

    const input = screen.getByLabelText("Typing input");
    await user.click(input);
    await user.type(input, passage);

    const results = await screen.findByTestId("learn-results");
    expect(results).toBeInTheDocument();
    expect(committedEntries).toEqual(["learn"]);
    expect(screen.getByTestId("learn-unlock-celebration")).toHaveTextContent(
      /New letter unlocked:\s*s/i,
    );
    expect(within(results).getByRole("button", { name: /Next lesson/i })).toBeInTheDocument();
    expect(within(results).getByRole("button", { name: /Repeat/i })).toBeInTheDocument();
  }, 15_000);
});
