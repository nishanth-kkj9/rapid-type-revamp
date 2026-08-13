import { defineMcp } from "@lovable.dev/mcp-js";
import generatePassageTool from "./tools/generate-passage";
import analyzeTypingTool from "./tools/analyze-typing";

export default defineMcp({
  name: "typing-pro",
  title: "Typing Pro",
  version: "0.1.0",
  instructions:
    "Tools for Typing Pro, a typing speed trainer. Use `generate_passage` to create practice text at a chosen difficulty, and `analyze_typing` to score a typing attempt (WPM, accuracy, mistakes) by comparing typed text to the target passage.",
  tools: [generatePassageTool, analyzeTypingTool],
});
