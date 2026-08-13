import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { computeStats } from "@/lib/typingStats";

export default defineTool({
  name: "analyze_typing",
  title: "Analyze a typing run",
  description:
    "Compare typed text against the target passage and return WPM, raw WPM, accuracy and error details for the run.",
  inputSchema: {
    target: z.string().min(1).describe("The passage that was meant to be typed."),
    typed: z.string().describe("The text the user actually typed."),
    seconds: z
      .number()
      .positive()
      .max(3600)
      .describe("How long the run took, in seconds."),
  },
  outputSchema: {
    wpm: z.number(),
    rawWpm: z.number(),
    accuracy: z.number(),
    correct: z.number(),
    incorrect: z.number(),
    typed: z.number(),
    elapsed: z.number(),
    consistency: z.number(),
    mistakes: z.array(
      z.object({ index: z.number(), expected: z.string(), got: z.string() }),
    ),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: ({ target, typed, seconds }) => {
    let correct = 0;
    let incorrect = 0;
    const mistakes: { index: number; expected: string; got: string }[] = [];
    for (let i = 0; i < typed.length; i++) {
      const expected = target[i] ?? "";
      if (typed[i] === expected) {
        correct++;
      } else {
        incorrect++;
        if (mistakes.length < 25) {
          mistakes.push({ index: i, expected, got: typed[i] ?? "" });
        }
      }
    }

    const stats = computeStats(correct, incorrect, seconds * 1000);
    const summary =
      `${stats.wpm} WPM (${stats.rawWpm} raw) at ${stats.accuracy}% accuracy — ` +
      `${correct} correct, ${incorrect} incorrect over ${seconds}s.`;

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { ...stats, mistakes },
    };
  },
});
