import { z } from "./zodSetup";
import type { Storage } from "./storage";

export const CUSTOM_TEXTS_KEY = "ttp:custom-texts:v1";
export const MAX_CUSTOM_TEXT_CHARS = 5000;
export const MAX_CUSTOM_TEXT_LISTS = 30;

export interface CustomTextEntry {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface NormalizeResult {
  text: string;
  warnings: string[];
  hadReplacements: boolean;
  truncated: boolean;
}

export const CustomTextEntrySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  text: z.string().min(1).max(MAX_CUSTOM_TEXT_CHARS),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

export const CustomTextListSchema = z.array(CustomTextEntrySchema);

const CHAR_REPLACEMENTS: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u2032": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\u2033": '"',
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2026": "...",
  "\u00A0": " ",
  "\u2002": " ",
  "\u2003": " ",
  "\u2009": " ",
  "\u202F": " ",
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\uFEFF": "",
  "\u00B7": "*",
  "\u2022": "-",
  "\u00D7": "x",
  "\u00F7": "/",
};

export function normalizeCustomText(raw: string): NormalizeResult {
  let replacedNonAscii = false;
  let strippedUnsupported = false;

  // Replace curly quotes, long dashes, ellipsis, and special spaces first
  let working = "";
  for (const ch of raw) {
    const mapped = CHAR_REPLACEMENTS[ch];
    if (mapped !== undefined) {
      working += mapped;
      replacedNonAscii = true;
    } else {
      working += ch;
    }
  }

  // Fold Latin accents to ASCII letters
  const folded = working.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (folded !== working) {
    replacedNonAscii = true;
  }

  // Keep printable ASCII (0x20..0x7E) and convert newlines/tabs to spaces
  let asciiOnly = "";
  for (const ch of folded.replace(/[\r\n\t]+/g, " ")) {
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) {
      asciiOnly += ch;
    } else {
      strippedUnsupported = true;
    }
  }

  const collapsed = asciiOnly.replace(/\s+/g, " ").trim();
  const truncated = collapsed.length > MAX_CUSTOM_TEXT_CHARS;
  const finalText = truncated ? collapsed.slice(0, MAX_CUSTOM_TEXT_CHARS).trim() : collapsed;

  const warnings: string[] = [];
  if (replacedNonAscii) {
    warnings.push("Curly quotes, dashes, or accented characters were converted to standard ASCII.");
  }
  if (strippedUnsupported) {
    warnings.push("Unsupported non-ASCII symbols were removed so every character is typeable.");
  }
  if (truncated) {
    warnings.push(
      `Text exceeded ${MAX_CUSTOM_TEXT_CHARS.toLocaleString()} characters and was trimmed.`,
    );
  }

  return {
    text: finalText,
    warnings,
    hadReplacements: replacedNonAscii || strippedUnsupported,
    truncated,
  };
}

export function sanitizeCustomTexts(raw: unknown): CustomTextEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomTextEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = CustomTextEntrySchema.safeParse(item);
    if (!parsed.success) continue;
    if (seen.has(parsed.data.id)) continue;
    const normalized = normalizeCustomText(parsed.data.text);
    if (!normalized.text) continue;
    seen.add(parsed.data.id);
    out.push({
      ...parsed.data,
      name: parsed.data.name.trim() || "Custom List",
      text: normalized.text,
    });
    if (out.length >= MAX_CUSTOM_TEXT_LISTS) break;
  }
  return out;
}

export async function loadCustomTextsFromStorage(storage: Storage): Promise<CustomTextEntry[]> {
  try {
    const raw = await storage.get(CUSTOM_TEXTS_KEY);
    if (raw === null) return [];
    return sanitizeCustomTexts(raw);
  } catch {
    return [];
  }
}

export async function saveCustomTextsToStorage(
  storage: Storage,
  entries: CustomTextEntry[],
): Promise<CustomTextEntry[]> {
  const clean = sanitizeCustomTexts(entries);
  try {
    await storage.set(CUSTOM_TEXTS_KEY, clean);
  } catch {
    // non-fatal
  }
  return clean;
}

export function buildCustomPassage(
  text: string,
  mode: "time" | "words" | "quote",
  wordCount = 25,
): string {
  const clean = normalizeCustomText(text).text;
  if (!clean) return "";
  if (mode === "quote") return clean;

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  if (mode === "words") {
    const out: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      out.push(tokens[i % tokens.length]!);
    }
    return out.join(" ");
  }

  // Time mode: return at least ~320 chars wrapping cleanly if short
  let out = clean;
  while (out.length < 320) {
    out = `${out} ${clean}`;
  }
  return out;
}
