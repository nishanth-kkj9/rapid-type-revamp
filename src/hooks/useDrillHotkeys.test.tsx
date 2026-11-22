// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useRef } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuickRestartKey } from "@/lib/drillSettings";
import { useDrillHotkeys } from "./useDrillHotkeys";

function Harness(p: {
  quickRestart: QuickRestartKey;
  typedLength: number;
  finished?: boolean;
  onRestart: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const armed = useDrillHotkeys({
    inputRef,
    againRef,
    finished: Boolean(p.finished),
    quickRestart: p.quickRestart,
    typedLength: p.typedLength,
    onRestart: p.onRestart,
  });
  return (
    <>
      <input ref={inputRef} aria-label="input" />
      <button ref={againRef} type="button" />
      {armed ? <span>press again to restart</span> : null}
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDrillHotkeys", () => {
  it("requires two presses within 1s in esc and enter modes when >10 chars typed mid-run", () => {
    vi.useFakeTimers();
    const onRestart = vi.fn();
    const { rerender } = render(
      <Harness quickRestart="esc" typedLength={11} onRestart={onRestart} />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onRestart).not.toHaveBeenCalled();
    expect(screen.getByText("press again to restart")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1001));
    expect(screen.queryByText("press again to restart")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onRestart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onRestart).toHaveBeenCalledTimes(1);

    onRestart.mockClear();
    rerender(<Harness quickRestart="enter" typedLength={15} onRestart={onRestart} />);
    screen.getByLabelText("input").focus();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onRestart).not.toHaveBeenCalled();
    expect(screen.getByText("press again to restart")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("restarts on one press when <=10 chars, finished, or in tab mode", () => {
    const onRestart = vi.fn();
    const { rerender } = render(
      <Harness quickRestart="esc" typedLength={10} onRestart={onRestart} />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    rerender(<Harness quickRestart="esc" typedLength={25} finished onRestart={onRestart} />);
    fireEvent.keyDown(window, { key: "Escape" });
    rerender(<Harness quickRestart="tab" typedLength={25} onRestart={onRestart} />);
    screen.getByLabelText("input").focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(onRestart).toHaveBeenCalledTimes(3);
  });
});
