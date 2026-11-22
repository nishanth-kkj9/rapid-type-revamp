import { formatModeLabel, type RunStats } from "./typingStats";

export interface ResultShareInput {
  stats: RunStats;
  modeKey: string;
  difficulty: string;
  dateMs?: number | undefined;
  isRecord?: boolean | undefined;
  quoteAuthor?: string | null | undefined;
}

export function formatResultShareText({
  stats,
  modeKey,
  difficulty,
  dateMs = Date.now(),
  isRecord = false,
  quoteAuthor,
}: ResultShareInput): string {
  const modeLabel = formatModeLabel(modeKey);
  const dateLabel = new Date(dateMs).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const modeMeta = modeKey === "quote" ? modeLabel : `${modeLabel} · ${difficulty}`;
  const pbTag = isRecord ? " [PB]" : "";
  const authorTag = quoteAuthor ? ` · ${quoteAuthor}` : "";

  return [
    `Typing Trainer Pro — ${Math.round(stats.wpm)} WPM${pbTag}`,
    `${stats.accuracy.toFixed(1)}% acc`,
    `${Math.round(stats.rawWpm)} raw`,
    `${Math.round(stats.consistency)}% consistency`,
    `${modeMeta}${authorTag}`,
    dateLabel,
  ].join(" · ");
}

export async function copyResultText(input: ResultShareInput): Promise<boolean> {
  const text = formatResultShareText(input);
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
