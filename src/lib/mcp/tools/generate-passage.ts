import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generatePassage } from "@/lib/sentenceGenerator";

export default defineTool({
  name: "generate_passage",
  title: "Generate typing passage",
  description:
    "Generate a typing practice passage at an easy, medium, or hard difficulty level.",
  inputSchema: {
    difficulty: z
      .enum(["easy", "medium", "hard"])
      .default("medium")
      .describe("Difficulty of the vocabulary and sentence structure."),
    minChars: z
      .number()
      .int()
      .min(40)
      .max(2000)
      .default(220)
      .describe("Approximate minimum number of characters in the passage."),
  },
  outputSchema: {
    difficulty: z.string(),
    text: z.string(),
    length: z.number(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: ({ difficulty, minChars }) => {
    const text = generatePassage(difficulty, minChars);
    return {
      content: [{ type: "text", text }],
      structuredContent: { difficulty, text, length: text.length },
    };
  },
});
