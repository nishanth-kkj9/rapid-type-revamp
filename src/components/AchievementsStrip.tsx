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
import { motion, AnimatePresence } from "framer-motion";
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
  defaultOpen?: boolean;
}

/** Expandable achievements collection with Framer Motion layout transition. */
export function AchievementsStrip({ unlocked, className = "", defaultOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
      className={`panel p-3 text-sm ${className}`}
    >
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
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="achievements-content"
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              transition: {
                height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.25, delay: 0.05 },
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              transition: {
                height: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
