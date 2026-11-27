import type { AppMode } from "./urlState";

const MODE_TITLES: Record<AppMode, string> = {
  drill: "Typing Trainer",
  learn: "Learn Touch Typing — Typing Trainer",
  stats: "Stats & Progress — Typing Trainer",
  settings: "Settings — Typing Trainer",
};

const MODE_DESCRIPTIONS: Record<AppMode, string> = {
  drill:
    "Typing practice with timed and word-count tests and an adaptive Learn mode. Works offline.",
  learn:
    "Step-by-step touch typing lessons starting with six letters and unlocking the alphabet as speed and accuracy hit your target.",
  stats:
    "Typing speed trends, personal bests, per-key accuracy heatmap, 26-week practice calendar, daily goals, and run history.",
  settings:
    "Typing behavior, keyboard layouts, color themes, OpenDyslexic font, and local backup controls.",
};

/** Synchronize document title, description, canonical link, and absolute OpenGraph image/URL meta tags. */
export function syncSeoMetadata(mode: AppMode): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const title = MODE_TITLES[mode] ?? MODE_TITLES.drill;
  const description = MODE_DESCRIPTIONS[mode] ?? MODE_DESCRIPTIONS.drill;
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${window.location.pathname}${mode === "drill" ? "" : `?mode=${mode}`}`;
  const absoluteImageUrl = `${origin}/og-image.png`;

  document.title = title;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute("content", content);
  };

  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[property="og:image"]', absoluteImageUrl);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  setMeta('meta[name="twitter:image"]', absoluteImageUrl);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute("href", canonicalUrl);
  }
}
