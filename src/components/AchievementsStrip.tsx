import { Award, Crown, Crosshair, Flame, Rocket, Target, Trophy, Zap } from "lucide-react";
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

interface Props {
  unlocked: AchievementState["unlocked"];
  className?: string;
}

/** Collapsed-by-default collection grid (native <details>, zero JS state). */
export function AchievementsStrip({ unlocked, className = "" }: Props) {
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <details className={`panel p-3 text-sm ${className}`}>
      <summary className="cursor-pointer list-none font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Achievements — {count}/{ACHIEVEMENTS.length} unlocked
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked[a.id];
          const Icon = ICONS[a.id] ?? Trophy;
          return (
            <div
              key={a.id}
              className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                got ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40 opacity-60"
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
                      {got.slice(0, 10)}
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
    </details>
  );
}
