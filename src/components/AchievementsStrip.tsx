import { useState } from "react";
import {
  Award,
  ChevronDown,
  Crown,
  Crosshair,
  Flame,
  Rocket,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { ACHIEVEMENTS, type AchievementState } from "@/lib/achievements";

const ICONS: Record<string, typeof Zap> = {
  "first-run": Rocket,
  "speed-40": Zap,
  "speed-60": Zap,
  "speed-80": Zap,
  "speed-100": Zap,
  flawless: Target,
  "streak-7": Flame,
  "focus-5": Crosshair,
  "shooter-level-5": Award,
  "boss-slayer": Crown,
};

function formatUnlockDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
  } catch {
    // fallback
  }
  return iso.slice(0, 10);
}

interface Props {
  unlocked: AchievementState["unlocked"];
  className?: string;
  defaultOpen?: boolean;
}

/** Expandable achievements collection with pure CSS transition (no eager framer-motion dependency). */
export function AchievementsStrip({ unlocked, className = "", defaultOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <div className={`panel p-3 text-sm transition-all ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer select-none items-center justify-between text-left font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2 truncate">
          <Trophy className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            Achievements — {count}/{ACHIEVEMENTS.length} unlocked
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] normal-case tracking-normal">
          <span className="font-semibold text-primary">
            {Math.round((count / ACHIEVEMENTS.length) * 100)}%
          </span>
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = unlocked[a.id];
              const Icon = ICONS[a.id] ?? Trophy;
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                    got
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-secondary/40 opacity-60"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 size-4 shrink-0 ${got ? "text-primary" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">
                      {a.title}
                      {got ? (
                        <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">
                          {formatUnlockDate(got)}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] leading-snug text-muted-foreground">
                      {a.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
