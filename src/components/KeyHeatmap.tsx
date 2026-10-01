import { aggregateKeyMistakes, heatLevel } from "@/lib/heatmap";
import { KEYBOARD_ROWS, KEY_WIDTHS } from "@/lib/keyboardLayout";

interface Props {
  mistakes: Record<string, number>;
  className?: string;
}

/** Static class map so Tailwind can see every literal. */
const LEVEL_CLASS: Record<number, string> = {
  1: "bg-destructive/15",
  2: "bg-destructive/30",
  3: "bg-destructive/55 text-white",
  4: "bg-destructive/80 text-white",
};

/** Lifetime error heatmap over the physical layout. Decorative: the
 *  accessible representation is the ProblemKeys chip strip rendered above it. */
export function KeyHeatmap({ mistakes, className = "" }: Props) {
  const counts = aggregateKeyMistakes(mistakes);
  const max = Math.max(0, ...Object.values(counts));

  return (
    <div
      className={`panel select-none space-y-1 p-2 sm:space-y-1.5 sm:p-4 ${className}`}
      aria-hidden="true"
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 sm:gap-1.5">
          {row.map((k) => {
            const n = counts[k] ?? 0;
            const level = heatLevel(n, max);
            const cls = LEVEL_CLASS[level] ?? "";
            return (
              <div
                key={`${rowIndex}-${k}`}
                title={n > 0 ? `${k}: ${n} all-time misses` : undefined}
                className={`keycap flex h-8 min-w-0 items-center justify-center px-0.5 font-mono text-[10px] uppercase sm:h-11 sm:px-1 sm:text-xs ${
                  KEY_WIDTHS[k] ?? "flex-1"
                } ${cls}`}
              >
                <span className="truncate">{k === "Space" ? "" : k}</span>
                {n > 0 ? (
                  <span className="ml-0.5 shrink-0 text-[8px] font-bold sm:text-[9px]">{n}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
