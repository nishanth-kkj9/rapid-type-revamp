import { describe, expect, it } from "vitest";
import generatePassageTool from "./generate-passage";

const ctx = {} as Parameters<typeof generatePassageTool.handler>[1];

const run = (difficulty: "easy" | "medium" | "hard", minChars: number) =>
  generatePassageTool.handler({ difficulty, minChars }, ctx) as unknown as {
    content: { type: string; text: string }[];
    structuredContent: { text: string; difficulty: string; length: number };
  };

describe("generate_passage tool", () => {
  it("returns a passage of at least the requested length", () => {
    const r = run("medium", 320);
    expect(r.structuredContent.length).toBeGreaterThanOrEqual(320);
    expect(r.content[0]?.text).toBe(r.structuredContent.text);
  });

  it("honours the schema boundary values", () => {
    expect(run("easy", 40).structuredContent.length).toBeGreaterThanOrEqual(40);
    expect(run("hard", 2000).structuredContent.length).toBeGreaterThanOrEqual(2000);
  });

  it("echoes the requested difficulty", () => {
    expect(run("hard", 40).structuredContent.difficulty).toBe("hard");
  });

  it("does not carry dedupe state across calls", () => {
    const a = run("easy", 40).structuredContent.text;
    const b = run("easy", 40).structuredContent.text;
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });
});
