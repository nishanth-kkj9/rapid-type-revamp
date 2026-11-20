// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { Profiler } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SHOOTER_SETTINGS } from "@/lib/shooterSettings";
import { WordShooter } from "@/components/WordShooter";

const mockCtx2d = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: (t: string) => ({ width: t.length * 9 }),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  arc: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  setTransform: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: () => ({ addColorStop: vi.fn() }),
  fillStyle: "",
  strokeStyle: "",
  globalAlpha: 1,
  lineWidth: 1,
  font: "",
  textAlign: "left",
} as unknown as CanvasRenderingContext2D;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => mockCtx2d,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

let rafQueue: FrameRequestCallback[] = [];
let rafId = 1;
let nowMs = 1000;
let reducedMotionMatches = false;

beforeEach(() => {
  rafQueue = [];
  rafId = 1;
  nowMs = 1000;
  reducedMotionMatches = false;
  (mockCtx2d.arc as ReturnType<typeof vi.fn>).mockClear();

  vi.spyOn(performance, "now").mockImplementation(() => nowMs);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafQueue.push(cb);
    return rafId++;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    rafQueue = [];
  });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotionMatches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function stepRaf(frames: number, stepMs = 16.6667) {
  for (let i = 0; i < frames; i++) {
    nowMs += stepMs;
    const batch = [...rafQueue];
    rafQueue = [];
    for (const cb of batch) cb(nowMs);
  }
}

describe("useWordShooterGame & WordShooter performance / controls", () => {
  it("runs 10s at 60fps (600 frames) without per-frame React re-renders", () => {
    let commitCount = 0;
    render(
      <Profiler
        id="word-shooter"
        onRender={() => {
          commitCount += 1;
        }}
      >
        <WordShooter
          settings={{ ...DEFAULT_SHOOTER_SETTINGS, practiceMode: true, soundEnabled: false }}
          onOpenSettings={vi.fn()}
        />
      </Profiler>,
    );

    const commitsBeforeStart = commitCount;
    fireEvent.click(screen.getByRole("button", { name: /^Start Game$/i }));

    // Flush initial focus rAF
    act(() => stepRaf(1, 16.6667));
    const commitsRightAfterStart = commitCount;
    expect(commitsRightAfterStart).toBeGreaterThan(commitsBeforeStart);

    // Step 600 frames (~10 seconds at 60fps); state updates occur ONLY on discrete spawns/events
    act(() => stepRaf(600, 16.6667));
    const commitsDuring10s = commitCount - commitsRightAfterStart;

    // Crucial check: far fewer than 600 commits over 10s of 60fps play
    expect(commitsDuring10s).toBeLessThan(20);

    // Step 15 quiet movement frames between spawns: strictly ZERO commits!
    const snapshotBeforeQuiet = commitCount;
    act(() => stepRaf(15, 16.6667));
    expect(commitCount - snapshotBeforeQuiet).toBe(0);
  });

  it("supports Pause button, Esc, F2, tab-hidden auto-pause, and 3-2-1 resume countdown", () => {
    vi.useFakeTimers();
    render(
      <WordShooter
        settings={{ ...DEFAULT_SHOOTER_SETTINGS, soundEnabled: false }}
        onOpenSettings={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Start Game$/i }));
    const pauseBtn = screen.getByRole("button", { name: /Pause game/i });
    expect(pauseBtn).toBeVisible();

    // Pause via button -> click Resume -> 3-2-1 countdown -> playing
    fireEvent.click(pauseBtn);
    expect(screen.getByText(/Click to Resume/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Resume$/i }));
    const countdownCard = () => screen.getByText(/Get Ready/i).parentElement!;
    expect(within(countdownCard()).getByText("3")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(750));
    expect(within(countdownCard()).getByText("2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(750));
    expect(within(countdownCard()).getByText("1")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(750));
    expect(screen.queryByText(/Get Ready/i)).not.toBeInTheDocument();

    // Pause with F2 and resume via Esc
    fireEvent.keyDown(window, { key: "F2" });
    expect(screen.getByText(/Click to Resume/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(within(countdownCard()).getByText("3")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2250));

    // Auto-pause when tab becomes hidden
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText(/Auto-paused when tab switched/i)).toBeInTheDocument();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    vi.useRealTimers();
  });

  it("focuses hidden input on tap target and adjusts field height when visualViewport shrinks for OS keyboard", () => {
    const vvListeners = new Map<string, Set<() => void>>();
    const mockVv = {
      height: 800,
      width: 390,
      addEventListener: (ev: string, fn: () => void) => {
        if (!vvListeners.has(ev)) vvListeners.set(ev, new Set());
        vvListeners.get(ev)!.add(fn);
      },
      removeEventListener: (ev: string, fn: () => void) => {
        vvListeners.get(ev)?.delete(fn);
      },
    };
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: mockVv });

    render(
      <WordShooter
        settings={{ ...DEFAULT_SHOOTER_SETTINGS, soundEnabled: false }}
        onOpenSettings={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Start Game$/i }));
    const input = screen.getByLabelText("Word shooter input");
    fireEvent.blur(input);

    const tapBtn = screen.getByRole("button", { name: /Tap field to focus keyboard/i });
    fireEvent.click(tapBtn);
    expect(document.activeElement).toBe(input);

    // Simulate OS keyboard reducing visualViewport height to 360px
    mockVv.height = 360;
    act(() => {
      vvListeners.get("resize")?.forEach((fn) => fn());
    });

    const field = screen.getByRole("region", { name: /Word shooter game field/i });
    expect(field.style.height).toBe("264px");
  });

  it("disables particle explosions and animations under reduced motion while keeping the game loop active", () => {
    reducedMotionMatches = true;
    const fillTextSpy = vi.fn();
    mockCtx2d.fillText = fillTextSpy;

    render(
      <WordShooter
        settings={{ ...DEFAULT_SHOOTER_SETTINGS, dailyChallenge: true, soundEnabled: false }}
        onOpenSettings={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Start Game$/i }));

    // Determine rendered words from canvas draw calls, destroy one full word, and advance rAF
    const targetLabel = screen.getByText(/Target:/i);
    expect(targetLabel).toBeInTheDocument();

    // Advance loop 10 frames and verify rAF continues drawing frames under reduced motion
    fillTextSpy.mockClear();
    (mockCtx2d.arc as ReturnType<typeof vi.fn>).mockClear();
    act(() => stepRaf(10, 16.6667));
    expect(fillTextSpy).toHaveBeenCalled();

    // Pick the first drawn word (any lowercase word drawn on canvas) and type it out
    const drawnWords = fillTextSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((w) => /^[a-z]{2,}$/.test(w));
    const firstWord = drawnWords[0];
    expect(firstWord).toBeDefined();

    const input = screen.getByLabelText("Word shooter input");
    fireEvent.change(input, { target: { value: firstWord! } });

    // No explosion particles (arc calls only occur for target indicator, not 8-particle burst)
    const arcCalls = (mockCtx2d.arc as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(arcCalls).toBeLessThan(8);
    expect(
      document.querySelector(".shake, .animate-pulse, .animate-bounce, .level-banner"),
    ).toBeNull();
  });

  it("produces the exact same Daily Challenge word sequence for the same date despite differing user history", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const originalFillText = mockCtx2d.fillText;
    const captureDailyWords = (
      dateIso: string,
      missedWords: string[],
      weakKeys: string[],
    ): string[] => {
      vi.setSystemTime(new Date(dateIso));
      const fillTextSpy = vi.fn();
      mockCtx2d.fillText = fillTextSpy;
      render(
        <WordShooter
          settings={{ ...DEFAULT_SHOOTER_SETTINGS, dailyChallenge: true, soundEnabled: false }}
          missedWords={missedWords}
          weakKeys={weakKeys}
          onOpenSettings={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /^Start Game$/i }));
      fillTextSpy.mockClear();
      act(() => stepRaf(240, 16.6667));
      const words = fillTextSpy.mock.calls.map(
        (c) => `${String(c[0])}@${Math.round(Number(c[1]))}`,
      );
      cleanup();
      return words;
    };

    try {
      const runA = captureDailyWords("2026-11-18T10:00:00Z", ["zephyr", "quartz"], ["q", "z"]);
      const runB = captureDailyWords("2026-11-18T22:00:00Z", ["anchor", "breeze"], ["a", "b"]);
      const nextDay = captureDailyWords("2026-11-19T10:00:00Z", ["zephyr", "quartz"], ["q", "z"]);

      expect(runA.length).toBeGreaterThan(0);
      expect(runB).toEqual(runA);
      expect(nextDay).not.toEqual(runA);
    } finally {
      mockCtx2d.fillText = originalFillText;
      vi.useRealTimers();
    }
  });
});
