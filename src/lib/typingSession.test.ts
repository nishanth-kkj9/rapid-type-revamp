import { describe, expect, it } from "vitest";
import {
  createInitialSessionState,
  extractCompletedCleanWords,
  selectSessionStats,
  typingSessionReducer,
} from "./typingSession";

describe("typingSessionReducer", () => {
  it("transitions idle -> running -> finished and records keystroke-level accuracy & mistakes across backspace", () => {
    let state = createInitialSessionState({
      text: "abcd",
      drillMode: "words",
      durationSec: 30,
    });
    expect(state.status).toBe("idle");

    // Type 'a' (correct), 'b' (correct), 'd' (incorrect for expected 'c')
    state = typingSessionReducer(state, { type: "KEY", value: "a", nowMs: 1000 });
    expect(state.status).toBe("running");
    state = typingSessionReducer(state, { type: "KEY", value: "b", nowMs: 1200 });
    state = typingSessionReducer(state, { type: "KEY", value: "d", nowMs: 1400 });

    expect(state.typed).toBe("abd");
    expect(state.keystrokesCorrect).toBe(2);
    expect(state.keystrokesIncorrect).toBe(1);
    expect(state.mistakes["c"]).toBe(1);

    // Backspace 'd' -> mistake on 'c' and keystroke counts must remain preserved
    state = typingSessionReducer(state, { type: "BACKSPACE" });
    expect(state.typed).toBe("ab");
    expect(state.keystrokesCorrect).toBe(2);
    expect(state.keystrokesIncorrect).toBe(1);
    expect(state.mistakes["c"]).toBe(1);

    // Tick at 2000ms (1s elapsed) while typed === "ab"
    state = typingSessionReducer(state, { type: "TICK", nowMs: 2000 });
    expect(state.samples).toEqual([2]);

    // Finish by typing 'c' and 'd' correctly at 2500ms (1.5s elapsed)
    state = typingSessionReducer(state, { type: "KEY", value: "c", nowMs: 2250 });
    state = typingSessionReducer(state, { type: "KEY", value: "d", nowMs: 2500 });
    expect(state.status).toBe("finished");
    expect(state.typed).toBe("abcd");
    expect(state.keystrokesCorrect).toBe(4);
    expect(state.keystrokesIncorrect).toBe(1);
    expect(state.mistakes["c"]).toBe(1);

    const stats = selectSessionStats(state);
    expect(stats.accuracy).toBe(80);
    expect(stats.incorrect).toBe(1);
    expect(stats.uncorrectedErrors).toBe(0);
    // Final partial second recorded cleanly (1s sample + 1.5s final tail)
    expect(state.samples).toEqual([2, 4]);
  });

  it("keeps monotonic progress samples even when user backspaces", () => {
    let state = createInitialSessionState({
      text: "hello world typing",
      drillMode: "time",
      durationSec: 15,
    });
    state = typingSessionReducer(state, { type: "START", nowMs: 0 });
    state = typingSessionReducer(state, { type: "KEY", value: "h", nowMs: 200 });
    state = typingSessionReducer(state, { type: "KEY", value: "e", nowMs: 400 });
    state = typingSessionReducer(state, { type: "KEY", value: "l", nowMs: 600 });
    state = typingSessionReducer(state, { type: "KEY", value: "l", nowMs: 800 });
    state = typingSessionReducer(state, { type: "TICK", nowMs: 1000 });
    expect(state.samples).toEqual([4]);

    // Backspace twice and tick at 2000ms: sample must remain monotonic (>= 4)
    state = typingSessionReducer(state, { type: "BACKSPACE", count: 2 });
    expect(state.typed).toBe("he");
    state = typingSessionReducer(state, { type: "TICK", nowMs: 2000 });
    expect(state.samples).toEqual([4, 4]);
  });

  it("handles 15s time-mode auto-finish, passage append, and RESTART", () => {
    const longText = "word ".repeat(20).trim();
    let state = createInitialSessionState({
      text: longText,
      drillMode: "time",
      durationSec: 15,
    });

    state = typingSessionReducer(state, { type: "START", nowMs: 1000 });
    state = typingSessionReducer(state, {
      type: "KEY",
      value: "word",
      nowMs: 1200,
      appendText: "extra words here",
    });
    expect(state.text).toBe(longText);

    // Tick past 15s -> auto-finish with 15 samples
    state = typingSessionReducer(state, { type: "TICK", nowMs: 16050 });
    expect(state.status).toBe("finished");
    expect(state.elapsedMs).toBe(15000);
    expect(state.samples).toHaveLength(15);

    // RESTART returns cleanly to idle
    state = typingSessionReducer(state, {
      type: "RESTART",
      text: "fresh text",
      drillMode: "quote",
      durationSec: 30,
      quoteAuthor: "Ada Lovelace",
    });
    expect(state.status).toBe("idle");
    expect(state.text).toBe("fresh text");
    expect(state.quoteAuthor).toBe("Ada Lovelace");
    expect(state.typed).toBe("");
    expect(state.samples).toEqual([]);
  });

  it("supports explicit FINISH and multi-word BACKSPACE", () => {
    let state = createInitialSessionState({
      text: "quick brown fox",
      drillMode: "words",
      durationSec: 30,
    });
    state = typingSessionReducer(state, { type: "KEY", value: "q", nowMs: 0 });
    state = typingSessionReducer(state, { type: "KEY", value: "u", nowMs: 100 });
    state = typingSessionReducer(state, { type: "KEY", value: "i", nowMs: 200 });
    state = typingSessionReducer(state, { type: "BACKSPACE", count: 2 });
    expect(state.typed).toBe("q");
    state = typingSessionReducer(state, { type: "FINISH", nowMs: 1500 });
    expect(state.status).toBe("finished");
    expect(state.elapsedMs).toBe(1500);
  });

  it("records bigram mistakes and extracts cleanly typed completed words", () => {
    let state = createInitialSessionState({
      text: "the quick fox",
      drillMode: "words",
      durationSec: 30,
    });
    // Type "the " cleanly, then miss 'u' in "quick" (bigram "qu")
    for (const ch of "the ") {
      state = typingSessionReducer(state, { type: "KEY", value: ch, nowMs: 100 });
    }
    state = typingSessionReducer(state, { type: "KEY", value: "q", nowMs: 200 });
    state = typingSessionReducer(state, { type: "KEY", value: "x", nowMs: 300 }); // wrong for 'u'
    expect(state.bigramMistakes["qu"]).toBe(1);
    expect(state.missedWords).toContain("quick");

    state = typingSessionReducer(state, { type: "BACKSPACE" });
    for (const ch of "uick fox") {
      state = typingSessionReducer(state, { type: "KEY", value: ch, nowMs: 400 });
    }
    const clean = extractCompletedCleanWords(state.text, state.typed, state.missedWords);
    expect(clean).toEqual(["the", "fox"]);
    expect(clean).not.toContain("quick");
  });

  it("tracks errorSeconds timestamps and per-word slowest/most-missed summaries", async () => {
    const { computeRunWordSummary } = await import("./typingSession");
    let state = createInitialSessionState({
      text: "fast sluggish",
      drillMode: "words",
      durationSec: 30,
    });
    // "fast": 0ms -> 200ms (~240 WPM)
    state = typingSessionReducer(state, { type: "KEY", value: "f", nowMs: 1000 });
    state = typingSessionReducer(state, { type: "KEY", value: "a", nowMs: 1060 });
    state = typingSessionReducer(state, { type: "KEY", value: "s", nowMs: 1120 });
    state = typingSessionReducer(state, { type: "KEY", value: "t", nowMs: 1200 });
    state = typingSessionReducer(state, { type: "KEY", value: " ", nowMs: 1300 });

    // "sluggish": slower + 1 mistake at t=2.0s
    state = typingSessionReducer(state, { type: "KEY", value: "s", nowMs: 2000 });
    state = typingSessionReducer(state, { type: "KEY", value: "x", nowMs: 3000 }); // error at 2.0s elapsed
    state = typingSessionReducer(state, { type: "BACKSPACE" });
    state = typingSessionReducer(state, { type: "KEY", value: "l", nowMs: 3100 });
    for (const [idx, ch] of Array.from("uggish").entries()) {
      state = typingSessionReducer(state, { type: "KEY", value: ch, nowMs: 3300 + idx * 150 });
    }

    expect(state.errorSeconds).toEqual([2]);
    const summary = computeRunWordSummary(state.wordTimings, state.wordMistakeCounts);
    expect(summary.mostMissedWords).toEqual([{ word: "sluggish", errors: 1 }]);
    expect(summary.slowestWords[0]?.word).toBe("sluggish");
    expect(summary.slowestWords[0]!.wpm).toBeLessThan(summary.slowestWords[1]!.wpm);
  });

  it("caps idle pauses in activeTypingMs so AFK breaks do not inflate active daily minutes", async () => {
    const { ACTIVE_INPUT_GAP_CAP_MS } = await import("./typingSession");
    let state = createInitialSessionState({
      text: "hello",
      drillMode: "words",
      durationSec: 30,
    });
    state = typingSessionReducer(state, { type: "KEY", value: "h", nowMs: 1000 });
    state = typingSessionReducer(state, { type: "KEY", value: "e", nowMs: 1200 });
    // User walks away for 45 seconds before typing 'l'
    state = typingSessionReducer(state, { type: "KEY", value: "l", nowMs: 46200 });
    state = typingSessionReducer(state, { type: "KEY", value: "l", nowMs: 46400 });
    state = typingSessionReducer(state, { type: "KEY", value: "o", nowMs: 46600 });

    // Active typing time = initial(200ms) + 200ms + capped(2000ms) + 200ms + 200ms = 2800ms (not 45600ms)
    expect(state.activeTypingMs).toBe(200 + 200 + ACTIVE_INPUT_GAP_CAP_MS + 200 + 200);
  });
});
