import { describe, expect, it } from "vitest";
import analyzeTyping from "./analyze-typing";

type Structured = {
  correct: number;
  incorrect: number;
  accuracy: number;
  typed: number;
  wpm: number;
  problemKeys: { key: string; count: number }[];
};

const ctx = {} as Parameters<typeof analyzeTyping.handler>[1];

const run = (target: string, typed: string, elapsedSeconds: number) =>
  analyzeTyping.handler(
    { target, typed, elapsedSeconds, perSecondCorrect: undefined },
    ctx,
  ) as unknown as {
    content: { type: string; text: string }[];
    structuredContent: Structured;
  };

describe("analyze_typing tool", () => {
  it("reports zero errors for a perfect match", () => {
    const r = run("hello world", "hello world", 10);
    expect(r.structuredContent.incorrect).toBe(0);
    expect(r.structuredContent.correct).toBe(11);
    expect(r.structuredContent.accuracy).toBe(100);
    expect(r.structuredContent.problemKeys).toHaveLength(0);
    expect(r.content[0]?.text).toContain("100% accuracy");
  });

  it("reports every character wrong and ranks problem keys", () => {
    const r = run("aaab", "xxxx", 10);
    expect(r.structuredContent.correct).toBe(0);
    expect(r.structuredContent.incorrect).toBe(4);
    expect(r.structuredContent.accuracy).toBe(0);
    expect(r.structuredContent.problemKeys[0]).toEqual({ key: "a", count: 3 });
  });

  it("counts overtyping past the end of the target as errors", () => {
    const r = run("ab", "abcd", 10);
    expect(r.structuredContent.correct).toBe(2);
    expect(r.structuredContent.incorrect).toBe(2);
  });

  it("accepts the schema boundary values", () => {
    const target = "a".repeat(20000);
    const r = run(target, target, 3600);
    expect(r.structuredContent.correct).toBe(20000);
    const empty = run("abc", "", 0.001);
    expect(empty.structuredContent.typed).toBe(0);
  });
});
