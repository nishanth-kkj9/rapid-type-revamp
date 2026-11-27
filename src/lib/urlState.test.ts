// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_DRILL_SETTINGS } from "./drillSettings";
import { syncSeoMetadata } from "./seo";
import { buildUrlSearch, parseUrlState } from "./urlState";

describe("urlState & seo", () => {
  it("parses valid mode, settings tab, and drill parameters while ignoring invalid values", () => {
    expect(parseUrlState("?mode=learn")).toEqual({ mode: "learn" });
    expect(parseUrlState("?mode=stats")).toEqual({ mode: "stats" });
    expect(parseUrlState("?mode=settings&tab=appearance")).toEqual({
      mode: "settings",
    });
    expect(parseUrlState("?mode=drill&test=words&words=50&list=1000")).toEqual({
      mode: "drill",
      drillMode: "words",
      wordCount: 50,
      wordList: "1000",
    });
    expect(parseUrlState("?mode=drill&test=words&words=50&diff=hard")).toEqual({
      mode: "drill",
      drillMode: "words",
      wordCount: 50,
      wordList: "1000",
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
      parseUrlState("?mode=invalid&tab=nope&test=bogus&duration=12&words=3&diff=extreme&list=99"),
    ).toEqual({});
    expect(parseUrlState("?mode=shooter&tab=game")).toEqual({});
    expect(parseUrlState("?mode=achievements")).toEqual({});
  });

  it("builds canonical query strings for each mode", () => {
    expect(buildUrlSearch("learn", DEFAULT_DRILL_SETTINGS)).toBe("?mode=learn");
    expect(buildUrlSearch("stats", DEFAULT_DRILL_SETTINGS)).toBe("?mode=stats");
    expect(buildUrlSearch("settings", DEFAULT_DRILL_SETTINGS)).toBe("?mode=settings");
    expect(
      buildUrlSearch("drill", {
        ...DEFAULT_DRILL_SETTINGS,
        drillMode: "time",
        duration: 15,
        wordList: "200",
      }),
    ).toBe("?mode=drill&test=time&duration=15&list=200");
    expect(
      buildUrlSearch("drill", {
        ...DEFAULT_DRILL_SETTINGS,
        drillMode: "words",
        wordCount: 25,
        wordList: "1000",
      }),
    ).toBe("?mode=drill&test=words&words=25&list=1000");
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
