import { z } from "./zodSetup";
import type { Storage } from "./storage";

/**
 * Persistent micro-preferences for UI features (heatmap metric, dyslexia font).
 */
export const UI_PREFS_KEY = "ttp:uiprefs:v1";

export interface UiPrefs {
  heatmapMetric: "misses" | "speed";
  dyslexiaFont: boolean;
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  heatmapMetric: "misses",
  dyslexiaFont: false,
};

export const UiPrefsSchema = z.object({
  heatmapMetric: z.enum(["misses", "speed"]).optional(),
  dyslexiaFont: z.boolean().optional(),
});

export function sanitizeUiPrefs(raw: unknown): UiPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_UI_PREFS };
  const r = raw as Record<string, unknown>;

  const metricCheck = z.enum(["misses", "speed"]).safeParse(r["heatmapMetric"]);

  return {
    heatmapMetric: metricCheck.success ? metricCheck.data : DEFAULT_UI_PREFS.heatmapMetric,
    dyslexiaFont:
      typeof r["dyslexiaFont"] === "boolean" ? r["dyslexiaFont"] : DEFAULT_UI_PREFS.dyslexiaFont,
  };
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
