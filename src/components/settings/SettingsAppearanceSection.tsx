import { THEME_LABELS, THEMES, type Theme } from "@/lib/useTheme";

interface SettingsAppearanceSectionProps {
  theme: Theme;
  dyslexiaFont: boolean;
  onSelectTheme: (theme: Theme) => void;
  onToggleDyslexiaFont: (enabled: boolean) => void;
}

export function SettingsAppearanceSection({
  theme,
  dyslexiaFont,
  onSelectTheme,
  onToggleDyslexiaFont,
}: SettingsAppearanceSectionProps) {
  return (
    <section
      aria-labelledby="settings-appearance-heading"
      className="space-y-5 border-t border-border pt-6"
    >
      <h3 id="settings-appearance-heading" className="text-base font-semibold text-foreground">
        Appearance
      </h3>

      <div className="space-y-2.5">
        <div className="text-sm font-medium text-foreground">Color theme</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectTheme(t)}
                className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {THEME_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <div className="text-sm font-medium text-foreground">
            Dyslexia-friendly font (OpenDyslexic)
          </div>
          <div className="text-[13px] text-muted-foreground">
            OpenDyslexic font with wider letter spacing
          </div>
        </div>
        <button
          type="button"
          aria-pressed={dyslexiaFont}
          aria-label={`Dyslexia-friendly font: ${dyslexiaFont ? "Enabled" : "Off"}`}
          onClick={() => onToggleDyslexiaFont(!dyslexiaFont)}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            dyslexiaFont
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {dyslexiaFont ? "Enabled" : "Off"}
        </button>
      </div>
    </section>
  );
}
