import { useState } from "react";
import { ArrowRight, ChevronDown, Trophy } from "lucide-react";
import {
  ACHIEVEMENTS,
  getAllAchievementsProgress,
  type AchievementState,
} from "@/lib/achievements";

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
  counters?: AchievementState["counters"] | undefined;
  className?: string;
  defaultOpen?: boolean;
  onOpenAchievements?: (() => void) | undefined;
}

/** Expandable achievements preview with progress bars and link to full Achievements page. */
export function AchievementsStrip({
  unlocked,
  counters = {},
  className = "",
  defaultOpen = false,
  onOpenAchievements,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const progressList = getAllAchievementsProgress({ unlocked, counters });
  const unlockedItems = progressList.filter((p) => p.unlockedAt !== null);
  const nextLocked = progressList
    .filter((p) => p.unlockedAt === null)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);
  const previewItems = [...unlockedItems.slice(-4).reverse(), ...nextLocked].slice(0, 6);
  const count = unlockedItems.length;

  return (
    <div className={`panel p-3 text-sm transition-all ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 cursor-pointer select-none items-center justify-between text-left font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="flex items-center gap-2 truncate">
            <Trophy className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">
              Achievements — {count}/{ACHIEVEMENTS.length} unlocked
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] normal-case tracking-normal">
            <span className="font-semibold tabular-nums text-primary">
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

        {onOpenAchievements ? (
          <button
            type="button"
            onClick={onOpenAchievements}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 whitespace-nowrap"
          >
            <span>All</span>
            <ArrowRight className="size-3" />
          </button>
        ) : null}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            {previewItems.map((item) => {
              const got = item.unlockedAt;
              return (
                <div
                  key={item.def.id}
                  className={`flex flex-col justify-between rounded-lg border p-2.5 transition-colors ${
                    got ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>{item.def.title}</span>
                      {got ? (
                        <span className="font-mono text-[10px] font-normal text-muted-foreground">
                          {formatUnlockDate(got)}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-normal tabular-nums text-muted-foreground">
                          {item.percent}%
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {item.def.description}
                    </div>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full ${got ? "bg-accent" : "bg-primary"}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {onOpenAchievements ? (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={onOpenAchievements}
                className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Open Achievements Page ({ACHIEVEMENTS.length})</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
