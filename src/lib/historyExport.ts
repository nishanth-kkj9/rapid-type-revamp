import { exportAllAppDataFromStorage } from "./backup";
import type { Storage } from "./storage";
import type { HistoryEntry } from "./typingStats";

function triggerJsonDownload(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadHistoryJson(mode: "drill" | "shooter", entries: HistoryEntry[]): void {
  const dateStr = new Date().toISOString().split("T")[0];
  triggerJsonDownload(`${mode}-history-${dateStr}.json`, {
    schemaVersion: 1,
    exportedAt: Date.now(),
    mode,
    entries,
  });
}

export async function downloadFullBackupJson(storage: Storage): Promise<void> {
  const payload = await exportAllAppDataFromStorage(storage);
  const dateStr = new Date().toISOString().split("T")[0];
  triggerJsonDownload(`typing-trainer-pro-backup-${dateStr}.json`, payload);
}
