import { getKeyboardLayout, getKeyboardStandard, type DrillSettings } from "@/lib/drillSettings";
import { KEYBOARD_LAYOUTS, KEYBOARD_STANDARDS } from "@/lib/keyboardLayout";

interface SettingsKeyboardSectionProps {
  drillSettings: DrillSettings;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
}

export function SettingsKeyboardSection({
  drillSettings,
  onUpdateDrill,
}: SettingsKeyboardSectionProps) {
  const layout = getKeyboardLayout(drillSettings);
  const standard = getKeyboardStandard(drillSettings);

  return (
    <section
      aria-labelledby="settings-keyboard-heading"
      className="space-y-5 border-t border-border pt-6"
    >
      <h3 id="settings-keyboard-heading" className="text-base font-semibold text-foreground">
        Keyboard
      </h3>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">On-screen keyboard</div>
          <div className="text-[13px] text-muted-foreground">
            Highlights upcoming keys, modifiers, and errors below the passage
          </div>
        </div>
        <button
          type="button"
          aria-pressed={drillSettings.showKeyboard}
          aria-label={`On-screen keyboard: ${drillSettings.showKeyboard ? "Visible" : "Hidden"}`}
          onClick={() => onUpdateDrill({ showKeyboard: !drillSettings.showKeyboard })}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            drillSettings.showKeyboard
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {drillSettings.showKeyboard ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="space-y-2.5 border-t border-border/60 pt-4">
        <div className="text-sm font-medium text-foreground">Keyboard layout</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {KEYBOARD_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={layout === l.id}
              onClick={() => onUpdateDrill({ keyboardLayout: l.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                layout === l.id
                  ? "border-primary bg-primary/15 font-semibold text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border/60 pt-4">
        <div className="text-sm font-medium text-foreground">Physical standard</div>
        <div className="grid grid-cols-2 gap-2">
          {KEYBOARD_STANDARDS.map((std) => (
            <button
              key={std.id}
              type="button"
              aria-pressed={standard === std.id}
              onClick={() => onUpdateDrill({ keyboardStandard: std.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                standard === std.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {std.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
