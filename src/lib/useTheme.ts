import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { appStorage, type Storage } from "./storage";

export type Theme = "dark" | "light" | "high-contrast";

export const THEMES: readonly Theme[] = ["dark", "light", "high-contrast"];

export const THEME_COLORS: Record<Theme, string> = {
  dark: "#1c1917",
  light: "#f8f7f4",
  "high-contrast": "#000000",
};

export const THEME_LABELS: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  "high-contrast": "High Contrast",
};

export const THEME_KEY = "ttp:theme:v1";
export const ThemeSchema = z.enum(["dark", "light", "high-contrast"]);

export function getPreferredSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    if (window.matchMedia?.("(prefers-contrast: more)").matches) {
      return "high-contrast";
    }
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    // ignore
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("high-contrast", theme === "high-contrast");
  root.dataset["theme"] = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLORS[theme]);
  }
}

export async function loadThemeFromStorage(storage: Storage): Promise<Theme> {
  try {
    const raw = await storage.get(THEME_KEY);
    const parsed = ThemeSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch {
    // fallback
  }
  return getPreferredSystemTheme();
}

export async function saveThemeToStorage(storage: Storage, theme: Theme): Promise<void> {
  try {
    await storage.set(THEME_KEY, theme);
  } catch {
    // safe fallback
  }
}

export function getNextTheme(current: Theme): Theme {
  const idx = THEMES.indexOf(current);
  return THEMES[(idx + 1) % THEMES.length] ?? "dark";
}

export function useTheme(initialTheme?: Theme) {
  const [theme, setTheme] = useState<Theme>(() => initialTheme ?? getPreferredSystemTheme());

  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
      applyTheme(initialTheme);
      return;
    }
    let cancelled = false;
    void loadThemeFromStorage(appStorage).then((loaded) => {
      if (cancelled) return;
      setTheme(loaded);
      applyTheme(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [initialTheme]);

  const selectTheme = useCallback((next: Theme) => {
    setTheme(next);
    applyTheme(next);
    void saveThemeToStorage(appStorage, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = getNextTheme(prev);
      applyTheme(next);
      void saveThemeToStorage(appStorage, next);
      return next;
    });
  }, []);

  return { theme, selectTheme, toggleTheme };
}
