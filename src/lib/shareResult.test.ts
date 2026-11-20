// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { formatResultShareText, renderResultCardPng } from "./shareResult";

describe("formatResultShareText", () => {
  const stats = {
    wpm: 78.4,
    rawWpm: 82.1,
    adjustedWpm: 76,
    accuracy: 97.4,
    correct: 250,
    incorrect: 6,
    typed: 256,
    elapsed: 30,
    consistency: 89.2,
  };

  it("formats time/words drill summaries clearly", () => {
    const text = formatResultShareText({
      stats,
      modeKey: "25w",
      difficulty: "medium",
      dateMs: Date.UTC(2026, 10, 15, 12, 0, 0),
      isRecord: true,
    });
    expect(text).toContain("78 WPM [PB]");
    expect(text).toContain("97.4% acc");
    expect(text).toContain("82 raw");
    expect(text).toContain("89% consistency");
    expect(text).toContain("25 words · medium");
  });

  it("formats quote summaries cleanly with author attribution", () => {
    const text = formatResultShareText({
      stats,
      modeKey: "quote",
      difficulty: "medium",
      dateMs: Date.UTC(2026, 10, 15, 12, 0, 0),
      quoteAuthor: "Ada Lovelace",
    });
    expect(text).toContain("Quote · Ada Lovelace");
    expect(text).not.toContain("[PB]");
  });

  it("loads Space Grotesk & JetBrains Mono via document.fonts before drawing the PNG card", async () => {
    const fontsUsed: string[] = [];
    const loadMock = vi.fn().mockResolvedValue([]);

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        load: loadMock,
        ready: Promise.resolve(),
      },
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        let currentFont = "";
        const fakeCtx = {
          createLinearGradient: () => ({ addColorStop: vi.fn() }),
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          fillText: vi.fn(() => {
            fontsUsed.push(currentFont);
          }),
          measureText: () => ({ width: 120 }),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          set font(v: string) {
            currentFont = v;
          },
          get font() {
            return currentFont;
          },
          fillStyle: "",
          strokeStyle: "",
          lineWidth: 1,
          textAlign: "left",
        };
        return {
          width: 0,
          height: 0,
          getContext: () => fakeCtx,
          toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" })),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    const blob = await renderResultCardPng({
      stats,
      modeKey: "30s",
      difficulty: "medium",
      isRecord: true,
    });

    expect(blob).not.toBeNull();
    expect(loadMock).toHaveBeenCalledWith(expect.stringContaining("Space Grotesk"));
    expect(loadMock).toHaveBeenCalledWith(expect.stringContaining("JetBrains Mono"));
    expect(fontsUsed.some((f) => f.includes("Space Grotesk"))).toBe(true);
    expect(fontsUsed.some((f) => f.includes("JetBrains Mono"))).toBe(true);

    vi.restoreAllMocks();
  });
});
