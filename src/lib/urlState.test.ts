import { describe, expect, it } from "vitest";
import { DEFAULT_DRILL_SETTINGS } from "./drillSettings";
import { buildUrlSearch, parseUrlState } from "./urlState";

describe("urlState", () => {
  it("parses valid mode, settings tab, and drill parameters while ignoring invalid values", () => {
    expect(parseUrlState("?mode=shooter")).toEqual({ mode: "shooter" });
    expect(parseUrlState("?mode=achievements")).toEqual({ mode: "achievements" });
    expect(parseUrlState("?mode=settings&tab=appearance")).toEqual({
      mode: "settings",
      settingsTab: "appearance",
    });
    expect(parseUrlState("?mode=drill&test=words&words=50&diff=hard")).toEqual({
      mode: "drill",
      drillMode: "words",
      wordCount: 50,
      difficulty: "hard",
    });
    expect(parseUrlState("?mode=invalid&tab=nope&test=bogus&duration=999&diff=extreme")).toEqual(
      {},
    );
  });

  it("builds canonical query strings for each mode", () => {
    expect(buildUrlSearch("shooter", DEFAULT_DRILL_SETTINGS)).toBe("?mode=shooter");
    expect(buildUrlSearch("achievements", DEFAULT_DRILL_SETTINGS)).toBe("?mode=achievements");
    expect(buildUrlSearch("settings", DEFAULT_DRILL_SETTINGS, "typing")).toBe("?mode=settings");
    expect(buildUrlSearch("settings", DEFAULT_DRILL_SETTINGS, "data")).toBe(
      "?mode=settings&tab=data",
    );
    expect(
      buildUrlSearch("drill", {
        ...DEFAULT_DRILL_SETTINGS,
        drillMode: "time",
        duration: 15,
        difficulty: "easy",
      }),
    ).toBe("?mode=drill&test=time&duration=15&diff=easy");
    expect(
      buildUrlSearch("drill", {
        ...DEFAULT_DRILL_SETTINGS,
        drillMode: "words",
        wordCount: 25,
        difficulty: "hard",
      }),
    ).toBe("?mode=drill&test=words&words=25&diff=hard");
    expect(
      buildUrlSearch("drill", {
        ...DEFAULT_DRILL_SETTINGS,
        drillMode: "quote",
        quoteLength: "long",
      }),
    ).toBe("?mode=drill&test=quote&quote=long");
  });
});
