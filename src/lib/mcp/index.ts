import { defineMcp, type ToolDefinition } from "@lovable.dev/mcp-js";
import generatePassageTool from "./tools/generate-passage";
import analyzeTypingTool from "./tools/analyze-typing";

export default defineMcp({
  name: "typing-pro",
  title: "Typing Pro",
  version: "0.1.0",
  instructions:
    "Tools for Typing Pro. Use `generate_passage` to create a practice passage, and `analyze_typing` to score a typing attempt against a passage (WPM, accuracy, consistency, problem keys).",
  // exactOptionalPropertyTypes rejects the SDK's optional outputSchema field.
  tools: [generatePassageTool, analyzeTypingTool] as unknown as ToolDefinition<never>[],
});
