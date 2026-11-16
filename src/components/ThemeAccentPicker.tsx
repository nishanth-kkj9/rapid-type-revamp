import { type ThemeAccent } from "@/lib/uiPrefs";
import { Palette } from "lucide-react";

const ACCENTS: { id: ThemeAccent; label: string; bg: string }[] = [
  { id: "amber", label: "Amber Gold", bg: "bg-[#f59e0b]" },
  { id: "emerald", label: "Matrix Emerald", bg: "bg-[#10b981]" },
  { id: "cyan", label: "Ocean Cyan", bg: "bg-[#06b6d4]" },
  { id: "violet", label: "Cyberpunk Violet", bg: "bg-[#a855f7]" },
  { id: "rose", label: "Ember Rose", bg: "bg-[#f43f5e]" },
];

interface Props {
  accent: ThemeAccent;
  onSelectAccent: (next: ThemeAccent) => void;
  className?: string;
}

export function ThemeAccentPicker({ accent, onSelectAccent, className = "" }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme accent color"
      className={`flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/50 px-2 py-1 ${className}`}
    >
      <Palette className="mr-0.5 size-3.5 text-muted-foreground" aria-hidden="true" />
      <div className="flex items-center gap-0.5">
        {ACCENTS.map((item) => {
          const active = accent === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Accent color ${item.label}`}
              title={`Accent: ${item.label}`}
              onClick={() => onSelectAccent(item.id)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
            >
              <span
                aria-hidden="true"
                className={`size-4 rounded-full ${item.bg} ${
                  active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-75"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
