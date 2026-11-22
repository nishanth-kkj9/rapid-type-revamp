// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BOOT_PREFS_KEY, readBootPrefs } from "./bootPrefs";
import { THEME_COLORS, applyTheme, getNextTheme, useTheme } from "./useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.head.innerHTML = '<meta name="theme-color" content="#1c1917" />';
  });

  it("applies dark, light, and high-contrast classes and synchronizes theme-color meta tag", () => {
    applyTheme("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("high-contrast")).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      THEME_COLORS.light,
    );

    applyTheme("high-contrast");
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      THEME_COLORS["high-contrast"],
    );

    applyTheme("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.classList.contains("high-contrast")).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      THEME_COLORS.dark,
    );
  });

  it("cycles cleanly through dark -> light -> high-contrast -> dark", () => {
    expect(getNextTheme("dark")).toBe("light");
    expect(getNextTheme("light")).toBe("high-contrast");
    expect(getNextTheme("high-contrast")).toBe("dark");
  });

  it("mirrors selectTheme and toggleTheme synchronously to ttp:boot:v1", () => {
    const { result } = renderHook(() => useTheme("dark"));
    act(() => {
      result.current.selectTheme("light");
    });
    expect(window.localStorage.getItem(BOOT_PREFS_KEY)).toBeTruthy();
    expect(readBootPrefs()?.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });
    expect(readBootPrefs()?.theme).toBe("high-contrast");
  });

  it("reads legacy ttp:boot:v1 payload containing accent without error", () => {
    window.localStorage.setItem(
      BOOT_PREFS_KEY,
      JSON.stringify({ theme: "light", accent: "violet", dyslexiaFont: true }),
    );
    expect(readBootPrefs()).toEqual({ theme: "light", dyslexiaFont: true });
  });
});
