import { describe, expect, it } from "vitest";
import { aggregateKeyMistakes, heatLevel } from "./heatmap";

describe("heatmap", () => {
  it("maps shifted and uppercase chars onto their base key", () => {
    expect(aggregateKeyMistakes({ "?": 2, "/": 1, A: 3, a: 1 })).toEqual({ "/": 3, a: 4 });
  });

  it("maps space, keeps valid unknown chars, drops invalid entries", () => {
    const out = aggregateKeyMistakes({ " ": 2, ab: 5, é: 1, x: 0, y: -1, z: 1.5 });
    expect(out).toEqual({ Space: 2, é: 1 });
  });

  it("returns empty for empty input", () => {
    expect(aggregateKeyMistakes({})).toEqual({});
  });

  it("heatLevel follows quartile thresholds and clamps", () => {
    const cases: [number, number, 0 | 1 | 2 | 3 | 4][] = [
      [0, 10, 0],
      [1, 10, 1],
      [2.5, 10, 1],
      [2.6, 10, 2],
      [5, 10, 2],
      [5.1, 10, 3],
      [7.5, 10, 3],
      [7.6, 10, 4],
      [10, 10, 4],
      [12, 10, 4],
      [5, 0, 0],
      [Number.NaN, 10, 0],
    ];
    for (const [count, max, expected] of cases) {
      expect(heatLevel(count, max)).toBe(expected);
    }
  });
});
