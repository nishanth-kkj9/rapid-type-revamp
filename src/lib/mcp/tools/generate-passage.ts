import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generatePassage } from "@/lib/sentenceGenerator";

export default defineTool({
  name: "generate_passage",
  title: "Generate typing passage",
  description:
    "Generate a practice typing passage at easy, medium or hard difficulty, of roughly the requested length in characters.",
  inputSchema: {
    difficulty: z
      .enum(["easy", "medium", "hard"])
      .default("medium")
      .describe("Vocabulary and punctuation complexity of the passage."),
    minChars: z
      .number()
      .int()
      .min(40)
      .max(2000)
      .default(320)
      .describe("Minimum number of characters in the passage."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: ({ difficulty, minChars }) => {
    const text = generatePassage(difficulty, minChars);
    return {
      content: [{ type: "text", text }],
      structuredContent: { text, difficulty, length: text.length },
    };
  },
});
