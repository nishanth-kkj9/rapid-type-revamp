import { ACHIEVEMENTS } from "./achievements";
import type { AppMode } from "./urlState";

const MODE_TITLES: Record<AppMode, string> = {
  drill: "Typing Trainer Pro — Local-First Typing Speed & Accuracy Drills",
  learn: "Learn Touch Typing — Typing Trainer Pro",
  shooter: "Word Shooter Arcade — Typing Trainer Pro",
  stats: "Stats & Progress — Typing Trainer Pro",
  achievements: "Achievements & Milestones — Typing Trainer Pro",
  settings: "Settings & Privacy — Typing Trainer Pro",
};

const MODE_DESCRIPTIONS: Record<AppMode, string> = {
  drill:
    "Practice typing speed and accuracy offline with timed drills, word quotas, real quotes, live keystroke metrics, and adaptive weak-key exercises.",
  learn:
    "Step-by-step touch typing lessons starting with six core letters, unlocking the full alphabet locally as speed and accuracy hit your target.",
  shooter:
    "Defend your ship in Word Shooter arcade mode by typing falling words accurately, building streaks, and clearing boss waves.",
  stats:
    "Inspect typing speed trends, personal bests, per-key accuracy heatmaps, 26-week practice calendar, daily goals, and full run history stored locally.",
  achievements: `Track ${ACHIEVEMENTS.length} typing and arcade achievements, personal best WPM milestones, and active daily practice streaks stored in your browser.`,
  settings:
    "Customize typing modes, keyboard layouts, sound effects, high-contrast and OpenDyslexic accessibility themes, and manage local browser data.",
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
