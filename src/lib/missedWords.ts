export const MISSED_WORDS_KEY = "ttp:missed-words:v1";
export const MAX_MISSED_WORDS = 40;

export function sanitizeMissedWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed.length === 0 || trimmed.length > 24) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    clean.push(trimmed);
    if (clean.length >= MAX_MISSED_WORDS) break;
  }
  return clean;
}

export function loadMissedWords(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(MISSED_WORDS_KEY);
    if (!raw) return [];
    return sanitizeMissedWords(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveMissedWords(words: string[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const clean = sanitizeMissedWords(words);
    window.localStorage.setItem(MISSED_WORDS_KEY, JSON.stringify(clean));
  } catch {
    // storage disabled or quota exceeded
  }
}

export function mergeMissedWords(existing: string[], fresh: string[]): string[] {
  return sanitizeMissedWords([...fresh, ...existing]);
}

export function clearMissedWords(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(MISSED_WORDS_KEY);
  } catch {
    // storage disabled
  }
}
