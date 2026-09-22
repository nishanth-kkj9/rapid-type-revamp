// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  daysBetween,
  getEffectiveDaily,
  recordRunToday,
  loadDaily,
  DAILY_STORAGE_KEY,
} from "./daily";

describe("daily goal and streak tracking", () => {
  it("initializes state on the first run ever", () => {
    const next = recordRunToday(null, "2026-09-20");
    expect(next).toEqual({
      lastDate: "2026-09-20",
      streak: 0,
      runsToday: 1,
    });
  });

  it("handles same-day accumulation without altering streak", () => {
    const s1 = { lastDate: "2026-09-20", streak: 3, runsToday: 1 };
    const s2 = recordRunToday(s1, "2026-09-20");
    expect(s2).toEqual({
      lastDate: "2026-09-20",
      streak: 3,
      runsToday: 2,
    });

    const s3 = recordRunToday(s2, "2026-09-20");
    expect(s3).toEqual({
      lastDate: "2026-09-20",
      streak: 3,
      runsToday: 3,
    });
  });

  it("increments streak on consecutive day when previous day had >= 3 runs", () => {
    const yesterdaySuccess = { lastDate: "2026-09-20", streak: 3, runsToday: 3 };
    const today = recordRunToday(yesterdaySuccess, "2026-09-21");
    expect(today).toEqual({
      lastDate: "2026-09-21",
      streak: 4,
      runsToday: 1,
    });
  });

  it("resets streak to 0 on consecutive day when previous day had < 3 runs", () => {
    const yesterdayFailed = { lastDate: "2026-09-20", streak: 5, runsToday: 2 };
    const today = recordRunToday(yesterdayFailed, "2026-09-21");
    expect(today).toEqual({
      lastDate: "2026-09-21",
      streak: 0,
      runsToday: 1,
    });
  });

  it("resets streak to 0 after a missed day / date gap", () => {
    const olderSuccess = { lastDate: "2026-09-18", streak: 10, runsToday: 5 };
    const today = recordRunToday(olderSuccess, "2026-09-21");
    expect(today).toEqual({
      lastDate: "2026-09-21",
      streak: 0,
      runsToday: 1,
    });
  });

  it("calculates day differences accurately across months", () => {
    expect(daysBetween("2026-08-31", "2026-09-01")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetween("2026-09-20", "2026-09-20")).toBe(0);
    expect(daysBetween("2026-09-15", "2026-09-20")).toBe(5);
  });

  it("provides effective daily status for display prior to runs on a new day", () => {
    const yesterdaySuccess = { lastDate: "2026-09-20", streak: 2, runsToday: 3 };
    // On 2026-09-21 before any run, effective streak includes completed yesterday
    const effective = getEffectiveDaily(yesterdaySuccess, "2026-09-21");
    expect(effective).toEqual({
      streak: 3,
      runsToday: 0,
    });

    const gap = { lastDate: "2026-09-15", streak: 4, runsToday: 3 };
    expect(getEffectiveDaily(gap, "2026-09-21")).toEqual({
      streak: 0,
      runsToday: 0,
    });
  });

  it("handles corrupted or NaN storage payloads safely in loadDaily", () => {
    localStorage.setItem(
      DAILY_STORAGE_KEY,
      JSON.stringify({ lastDate: "2026-09-21", streak: null, runsToday: 1 }),
    );
    expect(loadDaily()).toBeNull();

    localStorage.setItem(
      DAILY_STORAGE_KEY,
      '{"lastDate":"2026-09-21","streak":null,"runsToday":null}',
    );
    expect(loadDaily()).toBeNull();
  });

  it("rejects fractional, negative, and malformed-date payloads", () => {
    localStorage.setItem(DAILY_STORAGE_KEY, '{"lastDate":"2026-09-21","streak":2.5,"runsToday":1}');
    expect(loadDaily()).toBeNull();

    localStorage.setItem(DAILY_STORAGE_KEY, '{"lastDate":"2026-09-21","streak":-3,"runsToday":1}');
    expect(loadDaily()).toBeNull();

    localStorage.setItem(DAILY_STORAGE_KEY, '{"lastDate":"not-a-date","streak":2,"runsToday":1}');
    expect(loadDaily()).toBeNull();
  });
});
