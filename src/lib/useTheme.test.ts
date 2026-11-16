// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_COLORS, applyTheme, getNextTheme } from "./useTheme";

describe("useTheme", () => {
  beforeEach(() => {
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
});
