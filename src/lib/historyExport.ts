import { exportAllAppDataFromStorage } from "./backup";
import type { Storage } from "./storage";
import type { HistoryEntry } from "./typingStats";

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  "id",
  "date_iso",
  "mode",
  "difficulty",
  "wpm",
  "raw_wpm",
  "adjusted_wpm",
  "accuracy",
  "consistency",
  "correct",
  "incorrect",
  "uncorrected_errors",
  "typed",
  "elapsed_sec",
  "strict",
  "repeated",
  "score",
  "words_destroyed",
  "level",
] as const;

/** Build RFC-4180 CSV string with one header row plus one row per run entry. */
export function buildHistoryCsv(entries: readonly HistoryEntry[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];
  for (const h of entries) {
    const dateIso = Number.isFinite(h.date) ? new Date(h.date).toISOString() : "";
    const row = [
      h.id,
      dateIso,
      h.mode,
      h.difficulty,
      h.wpm,
      h.rawWpm,
      h.adjustedWpm,
      h.accuracy,
      h.consistency,
      h.correct,
      h.incorrect,
      h.uncorrectedErrors ?? "",
      h.typed,
      Math.round(h.elapsed * 10) / 10,
      h.strict ?? "",
      h.repeated ? "true" : "",
      h.score ?? "",
      h.wordsDestroyed ?? "",
      h.level ?? "",
    ].map(escapeCsvCell);
    rows.push(row.join(","));
  }
  return rows.join("\n");
}

export function downloadHistoryCsv(entries: readonly HistoryEntry[]): void {
  const dateStr = new Date().toISOString().split("T")[0];
  triggerDownload(
    `typing-trainer-pro-history-${dateStr}.csv`,
    buildHistoryCsv(entries),
    "text/csv;charset=utf-8",
  );
}

export async function downloadFullBackupJson(storage: Storage): Promise<void> {
  const payload = await exportAllAppDataFromStorage(storage);
  const dateStr = new Date().toISOString().split("T")[0];
  triggerDownload(
    `typing-trainer-pro-backup-${dateStr}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}
