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

export async function renderResultCardPng(input: ResultShareInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 840;
  canvas.height = 440;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { stats, modeKey, difficulty, dateMs = Date.now(), isRecord = false } = input;
  const modeLabel = formatModeLabel(modeKey);
  const dateLabel = new Date(dateMs).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Clean dark slate background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#0b1220");
  grad.addColorStop(1, "#111c2e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle inner frame
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Header brand
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("TYPING TRAINER PRO", 48, 66);

  // Date top-right
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748b";
  ctx.font = "500 15px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(dateLabel, canvas.width - 48, 66);
  ctx.textAlign = "left";

  // Hero WPM
  ctx.fillStyle = "#f59e0b";
  ctx.font = "700 108px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(`${Math.round(stats.wpm)}`, 46, 200);

  const wpmWidth = ctx.measureText(`${Math.round(stats.wpm)}`).width;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 28px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("WPM", 56 + wpmWidth, 200);

  if (isRecord) {
    ctx.fillStyle = "#34d399";
    ctx.font = "700 14px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText("NEW PERSONAL BEST", 56 + wpmWidth, 148);
  }

  // Test meta line
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 20px ui-sans-serif, system-ui, sans-serif";
  const metaLine = modeKey === "quote" ? modeLabel : `${modeLabel} · ${difficulty.toUpperCase()}`;
  ctx.fillText(metaLine, 48, 250);

  // Divider
  ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 286);
  ctx.lineTo(canvas.width - 48, 286);
  ctx.stroke();

  // Metrics strip
  const metrics = [
    { label: "ACCURACY", value: `${stats.accuracy.toFixed(1)}%` },
    { label: "RAW WPM", value: `${Math.round(stats.rawWpm)}` },
    { label: "CONSISTENCY", value: `${Math.round(stats.consistency)}%` },
    { label: "ELAPSED", value: `${Math.round(stats.elapsed)}s` },
  ];

  const colW = (canvas.width - 96) / metrics.length;
  metrics.forEach((m, idx) => {
    const x = 48 + idx * colW;
    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(m.label, x, 328);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 32px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(m.value, x, 368);
  });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function downloadResultCardImage(input: ResultShareInput): Promise<boolean> {
  const blob = await renderResultCardPng(input);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date(input.dateMs ?? Date.now()).toISOString().split("T")[0];
  a.href = url;
  a.download = `typing-result-${Math.round(input.stats.wpm)}wpm-${dateStr}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
