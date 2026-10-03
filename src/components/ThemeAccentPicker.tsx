import { useEffect, useState } from "react";
import {
  type ThemeAccent,
  DEFAULT_UI_PREFS,
  applyThemeAccent,
  loadUiPrefs,
  saveUiPrefs,
} from "@/lib/uiPrefs";
import { Palette } from "lucide-react";

const ACCENTS: { id: ThemeAccent; label: string; bg: string }[] = [
  { id: "amber", label: "Amber Gold", bg: "bg-[#f59e0b]" },
  { id: "emerald", label: "Matrix Emerald", bg: "bg-[#10b981]" },
  { id: "cyan", label: "Ocean Cyan", bg: "bg-[#06b6d4]" },
  { id: "violet", label: "Cyberpunk Violet", bg: "bg-[#a855f7]" },
  { id: "rose", label: "Ember Rose", bg: "bg-[#f43f5e]" },
];

export function ThemeAccentPicker({ className = "" }: { className?: string }) {
  const [accent, setAccent] = useState<ThemeAccent>(DEFAULT_UI_PREFS.themeAccent);

  useEffect(() => {
    const stored = loadUiPrefs().themeAccent;
    setAccent(stored);
    applyThemeAccent(stored);
  }, []);

  const selectAccent = (next: ThemeAccent) => {
    setAccent(next);
    applyThemeAccent(next);
    saveUiPrefs({ themeAccent: next });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme accent color"
      suppressHydrationWarning
      className={`flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/50 px-2 py-1 ${className}`}
    >
      <Palette className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <div className="flex items-center gap-1" suppressHydrationWarning>
        {ACCENTS.map((item) => {
          const active = accent === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              suppressHydrationWarning
              title={`Accent: ${item.label}`}
              onClick={() => selectAccent(item.id)}
              className={`size-4 rounded-full transition-transform hover:scale-110 cursor-pointer ${
                item.bg
              } ${
                active
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110"
                  : "opacity-60 hover:opacity-100"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
