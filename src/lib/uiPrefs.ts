/**
 * Persistent micro-preferences for UI features (heatmap metric, smooth caret, theme accent).
 * Follows the proven sanitize, SSR-guarded, quota-safe storage pattern.
 */
export const UI_PREFS_KEY = "ttp:uiprefs:v1";

export type ThemeAccent = "amber" | "emerald" | "cyan" | "violet" | "rose";

export interface UiPrefs {
  heatmapMetric: "misses" | "speed";
  smoothCaret: boolean;
  themeAccent: ThemeAccent;
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  heatmapMetric: "misses",
  smoothCaret: true,
  themeAccent: "amber",
};

const VALID_ACCENTS: ThemeAccent[] = ["amber", "emerald", "cyan", "violet", "rose"];

function sanitize(raw: unknown): UiPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_UI_PREFS };
  const r = raw as Record<string, unknown>;

  const rawMetric = r["heatmapMetric"];
  const heatmapMetric =
    rawMetric === "misses" || rawMetric === "speed" ? rawMetric : DEFAULT_UI_PREFS.heatmapMetric;

  const rawCaret = r["smoothCaret"];
  const smoothCaret = typeof rawCaret === "boolean" ? rawCaret : DEFAULT_UI_PREFS.smoothCaret;

  const rawAccent = r["themeAccent"];
  const themeAccent =
    typeof rawAccent === "string" && VALID_ACCENTS.includes(rawAccent as ThemeAccent)
      ? (rawAccent as ThemeAccent)
      : DEFAULT_UI_PREFS.themeAccent;

  return { heatmapMetric, smoothCaret, themeAccent };
}

export function applyThemeAccent(accent: ThemeAccent): void {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.dataset["accent"] = accent;
  }
}

export function loadUiPrefs(): UiPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_UI_PREFS };
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { ...DEFAULT_UI_PREFS };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export function saveUiPrefs(patch: Partial<UiPrefs>): UiPrefs {
  const current = loadUiPrefs();
  const next: UiPrefs = {
    ...current,
    ...patch,
  };
  if (patch.themeAccent) {
    applyThemeAccent(patch.themeAccent);
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
