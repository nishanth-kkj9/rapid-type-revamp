import { Contrast, Eye, Palette, Smartphone, Type } from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { ThemeAccentPicker } from "@/components/ThemeAccentPicker";
import type { ThemeAccent } from "@/lib/uiPrefs";
import { THEME_LABELS, THEMES, type Theme } from "@/lib/useTheme";

const THEME_DESCRIPTIONS: Record<Theme, string> = {
  dark: "Warm charcoal studio palette calibrated for long practice sessions.",
  light: "Crisp daylight paper palette (>= 4.5:1 contrast).",
  "high-contrast": "Pure black and white high-contrast palette (>= 7:1 contrast).",
};

interface SettingsAppearanceTabProps {
  theme: Theme;
  accent: ThemeAccent;
  dyslexiaFont: boolean;
  onSelectTheme: (theme: Theme) => void;
  onSelectAccent: (accent: ThemeAccent) => void;
  onToggleDyslexiaFont: (enabled: boolean) => void;
}

export function SettingsAppearanceTab({
  theme,
  accent,
  dyslexiaFont,
  onSelectTheme,
  onSelectAccent,
  onToggleDyslexiaFont,
}: SettingsAppearanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Contrast className="size-3.5 text-primary" />
            Color Theme
          </h3>
          <span className="font-mono text-xs font-semibold text-primary">
            {THEME_LABELS[theme]}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectTheme(t)}
                className={`flex min-h-14 cursor-pointer flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {t === "high-contrast" ? <Eye className="size-3.5 text-primary" /> : null}
                  {THEME_LABELS[t]}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{THEME_DESCRIPTIONS[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Palette className="size-3.5 text-primary" />
            Accent Color
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Highlights the active caret, next keycap, progress bars, and primary buttons
          </div>
        </div>
        <ThemeAccentPicker accent={accent} onSelectAccent={onSelectAccent} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Type className="size-3.5 text-primary" />
            Dyslexia-Friendly Font (OpenDyslexic)
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Self-hosted locally — switches passages and labels to OpenDyslexic with wider spacing
            and zero external network requests
          </div>
        </div>
        <button
          type="button"
          aria-pressed={dyslexiaFont}
          onClick={() => onToggleDyslexiaFont(!dyslexiaFont)}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            dyslexiaFont
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {dyslexiaFont ? "Enabled" : "Off"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Smartphone className="size-3.5 text-primary" />
            Offline App Install (PWA)
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Self-hosted fonts and service worker caching keep drills, audio, and Word Shooter
            running offline
          </div>
        </div>
        <PWAInstallButton />
      </div>
    </div>
  );
}
