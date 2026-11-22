import { Keyboard } from "lucide-react";
import {
  getKeyboardLayout,
  getKeyboardStandard,
  getShowFingerZones,
  type DrillSettings,
} from "@/lib/drillSettings";
import { KEYBOARD_LAYOUTS, KEYBOARD_STANDARDS } from "@/lib/keyboardLayout";

interface SettingsKeyboardTabProps {
  drillSettings: DrillSettings;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
}

export function SettingsKeyboardTab({ drillSettings, onUpdateDrill }: SettingsKeyboardTabProps) {
  const layout = getKeyboardLayout(drillSettings);
  const standard = getKeyboardStandard(drillSettings);
  const showFingerZones = getShowFingerZones(drillSettings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Keyboard className="size-3.5 text-primary" />
            On-screen keyboard (drills)
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            Highlights the upcoming character key, Shift/AltGr modifiers, pressed keys, and error
            flashes below the passage
          </div>
        </div>
        <button
          type="button"
          aria-pressed={drillSettings.showKeyboard}
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

      <div className="space-y-2.5 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Keyboard layout</h3>
          <span className="text-[13px] font-semibold text-primary">{layout.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {KEYBOARD_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={layout === l.id}
              onClick={() => onUpdateDrill({ keyboardLayout: l.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
                layout === l.id
                  ? "border-primary bg-primary/15 font-semibold text-foreground ring-1 ring-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Applies to the live key guide, heatmap visualization, and next-finger announcements across
          both Drills and Word Shooter.
        </p>
      </div>

      <div className="space-y-2.5 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Physical standard</h3>
          <span className="text-[13px] font-semibold text-primary">{standard.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {KEYBOARD_STANDARDS.map((std) => (
            <button
              key={std.id}
              type="button"
              aria-pressed={standard === std.id}
              onClick={() => onUpdateDrill({ keyboardStandard: std.id })}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                standard === std.id
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {std.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="text-[13px] font-semibold text-foreground">
            Finger-zone borders &amp; home-row anchors
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            Displays color-coded top borders for each finger zone and tactile anchor bars under home
            index keys (F &amp; J in QWERTY)
          </div>
        </div>
        <button
          type="button"
          aria-pressed={showFingerZones}
          onClick={() => onUpdateDrill({ showFingerZones: !showFingerZones })}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            showFingerZones
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {showFingerZones ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
