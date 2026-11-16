import { z } from "zod";
import type { Storage } from "./storage";

/**
 * Persistent micro-preferences for UI features (heatmap metric, theme accent, dyslexia font).
 */
export const UI_PREFS_KEY = "ttp:uiprefs:v1";

export type ThemeAccent = "amber" | "emerald" | "cyan" | "violet" | "rose";

export interface UiPrefs {
  heatmapMetric: "misses" | "speed";
  themeAccent: ThemeAccent;
  dyslexiaFont: boolean;
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  heatmapMetric: "misses",
  themeAccent: "amber",
  dyslexiaFont: false,
};

export const UiPrefsSchema = z.object({
  heatmapMetric: z.enum(["misses", "speed"]).optional(),
  themeAccent: z.enum(["amber", "emerald", "cyan", "violet", "rose"]).optional(),
  dyslexiaFont: z.boolean().optional(),
});

export function sanitizeUiPrefs(raw: unknown): UiPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_UI_PREFS };
  const r = raw as Record<string, unknown>;

  const metricCheck = z.enum(["misses", "speed"]).safeParse(r["heatmapMetric"]);
  const accentCheck = z
    .enum(["amber", "emerald", "cyan", "violet", "rose"])
    .safeParse(r["themeAccent"]);

  return {
    heatmapMetric: metricCheck.success ? metricCheck.data : DEFAULT_UI_PREFS.heatmapMetric,
    themeAccent: accentCheck.success ? accentCheck.data : DEFAULT_UI_PREFS.themeAccent,
    dyslexiaFont:
      typeof r["dyslexiaFont"] === "boolean" ? r["dyslexiaFont"] : DEFAULT_UI_PREFS.dyslexiaFont,
  };
}

export function applyThemeAccent(accent: ThemeAccent): void {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.dataset["accent"] = accent;
  }
}

export function applyDyslexiaFont(enabled: boolean): void {
  if (typeof document !== "undefined" && document.documentElement) {
    if (enabled) {
      document.documentElement.dataset["font"] = "opendyslexic";
    } else {
      delete document.documentElement.dataset["font"];
    }
  }
}

export function loadUiPrefs(): UiPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_UI_PREFS };
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { ...DEFAULT_UI_PREFS };
    return sanitizeUiPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export function saveUiPrefs(patch: Partial<UiPrefs>): UiPrefs {
  const current = loadUiPrefs();
  const next: UiPrefs = sanitizeUiPrefs({
    ...current,
    ...patch,
  });
  if (patch.themeAccent) {
    applyThemeAccent(next.themeAccent);
  }
  if (typeof patch.dyslexiaFont === "boolean") {
    applyDyslexiaFont(next.dyslexiaFont);
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(UI_PREFS_KEY, JSON.stringify(next));
    } catch {
      // quota-safe silent fallback
    }
  }
  return next;
}

export function clearUiPrefs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(UI_PREFS_KEY);
  } catch {
    // ignore
  }
}

export async function loadUiPrefsFromStorage(storage: Storage): Promise<UiPrefs> {
  try {
    const raw = await storage.get(UI_PREFS_KEY);
    if (raw === null) return { ...DEFAULT_UI_PREFS };
    return sanitizeUiPrefs(raw);
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export async function saveUiPrefsToStorage(
  storage: Storage,
  patch: Partial<UiPrefs>,
): Promise<UiPrefs> {
  const current = await loadUiPrefsFromStorage(storage);
  const next = sanitizeUiPrefs({ ...current, ...patch });
  if (patch.themeAccent) {
    applyThemeAccent(next.themeAccent);
  }
  if (typeof patch.dyslexiaFont === "boolean") {
    applyDyslexiaFont(next.dyslexiaFont);
  }
  try {
    await storage.set(UI_PREFS_KEY, next);
  } catch {
    // safe fallback
  }
  return next;
}
