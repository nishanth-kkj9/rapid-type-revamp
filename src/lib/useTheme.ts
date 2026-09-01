import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const THEME_KEY = "ttp:theme:v1";

export function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // storage unavailable; theme still applies for the session
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
