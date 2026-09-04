import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { computeStats, toDeltas } from "@/lib/typingStats";

export default defineTool({
  name: "analyze_typing",
  title: "Analyze a typing attempt",
  description:
    "Compare typed text against the target passage and return WPM, raw WPM, net WPM, accuracy, consistency and the most-missed keys.",
  inputSchema: {
    target: z.string().min(1).max(20000).describe("The passage that should have been typed."),
    typed: z.string().max(20000).describe("What the typist actually entered."),
    elapsedSeconds: z
      .number()
      .positive()
      .max(3600)
      .describe("How long the attempt took, in seconds."),
    perSecondCorrect: z
      .array(z.number().int().min(0))
      .max(3600)
      .optional()
      .describe("Optional cumulative correct-character counts sampled once per second."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: ({ target, typed, elapsedSeconds, perSecondCorrect }) => {
    let correct = 0;
    let incorrect = 0;
    const mistakes: Record<string, number> = {};
    for (let i = 0; i < typed.length; i++) {
      const expected = target[i];
      if (expected === undefined) {
        incorrect++;
        continue;
      }
      if (typed[i] === expected) correct++;
      else {
        incorrect++;
        mistakes[expected] = (mistakes[expected] ?? 0) + 1;
      }
    }

    const stats = computeStats(
      correct,
      incorrect,
      elapsedSeconds * 1000,
      toDeltas(perSecondCorrect ?? []),
    );
    const problemKeys = Object.entries(mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, count]) => ({ key, count }));

    const summary =
      `${stats.wpm} WPM (raw ${stats.rawWpm}, net ${stats.adjustedWpm}), ` +
      `${stats.accuracy}% accuracy, consistency ${stats.consistency}%, ` +
      `${stats.correct} correct / ${stats.incorrect} errors.` +
      (problemKeys.length
        ? ` Problem keys: ${problemKeys.map((p) => `"${p.key}" x${p.count}`).join(", ")}.`
        : "");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { ...stats, problemKeys },
    };
  },
});
