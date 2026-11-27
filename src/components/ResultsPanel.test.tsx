// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultsPanel, type DrillResultData } from "./ResultsPanel";

afterEach(() => cleanup());

function makeResult(overrides: Partial<DrillResultData> = {}): DrillResultData {
  return {
    stats: {
      wpm: 72,
      rawWpm: 76,
      adjustedWpm: 70,
      accuracy: 96,
      consistency: 88,
      correct: 180,
      incorrect: 7,
      typed: 187,
      elapsed: 30,
    },
    isRecord: false,
    recordDelta: null,
    targetWpm: 60,
    insight: { headline: "Steady pace.", tone: "coach", action: "practice-weak-keys" },
    effectiveMissedWordsCount: 0,
    weakKeys3: [],
    slowKeys3: [],
    quickRestart: "esc",
    samples: [],
    errorSeconds: [],
    elapsedSec: 30,
    ghostSamples: undefined,
    mistakes: {},
    slowestWords: [],
    mostMissedWords: [],
    allTimeKeys: {},
    allTimeSpeed: {},
    drillMode: "time",
    modeKey: "30s",
    difficulty: "medium",
    quoteAuthor: null,
    keyboardLayout: "qwerty",
    keyboardStandard: "ansi",
    ...overrides,
  };
}

function renderPanel(overrides: Partial<DrillResultData> = {}) {
  return render(
    <ResultsPanel
      resultsRef={createRef()}
      againRef={createRef()}
      result={makeResult(overrides)}
      onRestart={vi.fn()}
      onRepeatSameText={vi.fn()}
      onPracticeWeakKeys={vi.fn()}
      onPracticeSlowKeys={vi.fn()}
      onPracticeMissedWords={vi.fn()}
    />,
  );
}

describe("ResultsPanel", () => {
  it("shows Go again as sole filled button, removes insight button and Download PNG, and keeps screen-reader status", () => {
    renderPanel({
      effectiveMissedWordsCount: 3,
      weakKeys3: ["e", "r"],
      slowKeys3: ["q", "z"],
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Run finished: 72 WPM/i);
    expect(screen.queryByRole("button", { name: /Download PNG/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Fix it now/i })).not.toBeInTheDocument();
    expect(screen.getByText("Steady pace.")).toBeInTheDocument();

    const actions = screen.getByTestId("results-actions");
    const buttons = within(actions).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons.filter((b) => b.className.includes("bg-primary"))).toHaveLength(1);
    expect(within(actions).getByRole("button", { name: /Go again/i })).toHaveClass("bg-primary");
    expect(within(actions).getByRole("button", { name: /Repeat this text/i })).toBeInTheDocument();
    expect(
      within(actions).getByRole("button", { name: "Practice missed words (3)" }),
    ).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Copy result/i })).toBeInTheDocument();
    expect(within(actions).queryByRole("button", { name: /weak keys/i })).not.toBeInTheDocument();
    expect(within(actions).queryByRole("button", { name: /slow keys/i })).not.toBeInTheDocument();
  });

  it("falls back to Practice weak keys (e, r) when no missed words, then slow keys, then none", () => {
    const { rerender } = render(
      <ResultsPanel
        resultsRef={createRef()}
        againRef={createRef()}
        result={makeResult({ weakKeys3: ["e", "r"], slowKeys3: ["q", "z"] })}
        onRestart={vi.fn()}
        onRepeatSameText={vi.fn()}
        onPracticeWeakKeys={vi.fn()}
        onPracticeSlowKeys={vi.fn()}
        onPracticeMissedWords={vi.fn()}
      />,
    );

    const actions = screen.getByTestId("results-actions");
    expect(within(actions).getAllByRole("button")).toHaveLength(4);
    expect(
      within(actions).getByRole("button", { name: "Practice weak keys (e, r)" }),
    ).toBeInTheDocument();
    expect(within(actions).queryByRole("button", { name: /slow keys/i })).not.toBeInTheDocument();

    rerender(
      <ResultsPanel
        resultsRef={createRef()}
        againRef={createRef()}
        result={makeResult({ slowKeys3: ["q", "z"] })}
        onRestart={vi.fn()}
        onRepeatSameText={vi.fn()}
        onPracticeWeakKeys={vi.fn()}
        onPracticeSlowKeys={vi.fn()}
        onPracticeMissedWords={vi.fn()}
      />,
    );
    expect(within(actions).getAllByRole("button")).toHaveLength(4);
    expect(
      within(actions).getByRole("button", { name: "Practice slow keys (q, z)" }),
    ).toBeInTheDocument();

    rerender(
      <ResultsPanel
        resultsRef={createRef()}
        againRef={createRef()}
        result={makeResult()}
        onRestart={vi.fn()}
        onRepeatSameText={vi.fn()}
        onPracticeWeakKeys={vi.fn()}
        onPracticeSlowKeys={vi.fn()}
        onPracticeMissedWords={vi.fn()}
      />,
    );
    expect(within(actions).getAllByRole("button")).toHaveLength(3);
  });
});
