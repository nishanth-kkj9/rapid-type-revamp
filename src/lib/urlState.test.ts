// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_DRILL_SETTINGS } from "./drillSettings";
import { syncSeoMetadata } from "./seo";
import { buildUrlSearch, parseUrlState } from "./urlState";

describe("urlState & seo", () => {
  it("parses valid mode, settings tab, and drill parameters while ignoring invalid values", () => {
    expect(parseUrlState("?mode=learn")).toEqual({ mode: "learn" });
    expect(parseUrlState("?mode=shooter")).toEqual({ mode: "shooter" });
    expect(parseUrlState("?mode=stats")).toEqual({ mode: "stats" });
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
    expect(parseUrlState("?mode=drill&test=time&duration=45")).toEqual({
      mode: "drill",
      drillMode: "time",
      duration: 45,
    });
    expect(parseUrlState("?mode=drill&test=words&words=75")).toEqual({
      mode: "drill",
      drillMode: "words",
      wordCount: 75,
    });
    expect(
      parseUrlState("?mode=invalid&tab=nope&test=bogus&duration=12&words=3&diff=extreme"),
    ).toEqual({});
  });

  it("builds canonical query strings for each mode", () => {
    expect(buildUrlSearch("learn", DEFAULT_DRILL_SETTINGS)).toBe("?mode=learn");
    expect(buildUrlSearch("shooter", DEFAULT_DRILL_SETTINGS)).toBe("?mode=shooter");
    expect(buildUrlSearch("stats", DEFAULT_DRILL_SETTINGS)).toBe("?mode=stats");
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

  it("updates document.title and meta description when switching to stats mode", () => {
    document.head.innerHTML = `
      <meta name="description" content="" />
      <meta property="og:title" content="" />
      <meta property="og:description" content="" />
      <link rel="canonical" href="" />
    `;
    syncSeoMetadata("stats");
    expect(document.title).toContain("Stats & Progress");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toContain(
      "26-week practice calendar",
    );

    syncSeoMetadata("learn");
    expect(document.title).toContain("Learn Touch Typing");
  });
});
