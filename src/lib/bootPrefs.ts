import type { Theme } from "./useTheme";

export const BOOT_PREFS_KEY = "ttp:boot:v1";

export interface BootPrefs {
  theme: Theme;
  dyslexiaFont: boolean;
}

const VALID_THEMES = new Set<string>(["dark", "light", "high-contrast"]);

function getLocalStorageSafe(): globalThis.Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readBootPrefs(): Partial<BootPrefs> | null {
  const local = getLocalStorageSafe();
  if (!local) return null;
  try {
    const raw = local.getItem(BOOT_PREFS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const out: Partial<BootPrefs> = {};
    if (typeof record["theme"] === "string" && VALID_THEMES.has(record["theme"])) {
      out.theme = record["theme"] as Theme;
    }
    if (typeof record["dyslexiaFont"] === "boolean") {
      out.dyslexiaFont = record["dyslexiaFont"];
    }
    return out;
  } catch {
    return null;
  }
}

export function writeBootPrefs(patch: Partial<BootPrefs>): void {
  const local = getLocalStorageSafe();
  if (!local) return;
  try {
    const current = readBootPrefs() ?? {};
    const next: Partial<BootPrefs> = { ...current };
    if (patch.theme && VALID_THEMES.has(patch.theme)) {
      next.theme = patch.theme;
    }
    if (typeof patch.dyslexiaFont === "boolean") {
      next.dyslexiaFont = patch.dyslexiaFont;
    }
    local.setItem(BOOT_PREFS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota/privacy mode errors
  }
}

export function removeBootPrefs(): void {
  const local = getLocalStorageSafe();
  if (!local) return;
  try {
    local.removeItem(BOOT_PREFS_KEY);
  } catch {
    // ignore
  }
}
