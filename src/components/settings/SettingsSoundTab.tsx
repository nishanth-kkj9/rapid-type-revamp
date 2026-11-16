import { Volume2, VolumeX } from "lucide-react";
import type { DrillSettings, DrillSound } from "@/lib/drillSettings";
import type { ShooterSettings } from "@/lib/shooterSettings";

const SOUND_OPTIONS: { id: DrillSound; label: string; desc: string }[] = [
  { id: "click", label: "Mechanical Click", desc: "Crisp synthesized tactile click per character" },
  { id: "beep", label: "Soft Beep", desc: "Mellow pitch feedback on keystroke" },
  { id: "off", label: "Silent (Muted)", desc: "No audio feedback during typing drills" },
];

interface SettingsSoundTabProps {
  drillSettings: DrillSettings;
  shooterSettings: ShooterSettings;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
  onUpdateShooter: (patch: Partial<ShooterSettings>) => void;
}

export function SettingsSoundTab({
  drillSettings,
  shooterSettings,
  onUpdateDrill,
  onUpdateShooter,
}: SettingsSoundTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {drillSettings.sound === "off" ? (
              <VolumeX className="size-3.5" />
            ) : (
              <Volume2 className="size-3.5 text-primary" />
            )}
            Drill Keystroke Audio
          </h3>
          <span className="font-mono text-xs capitalize text-primary">{drillSettings.sound}</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SOUND_OPTIONS.map((opt) => {
            const active = drillSettings.sound === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdateDrill({ sound: opt.id })}
                className={`flex min-h-14 cursor-pointer flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="text-xs font-semibold">{opt.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
        <div>
          <div className="text-xs font-semibold text-foreground">Word Shooter Sound Effects</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Locally synthesized Web Audio API laser zaps, shield alerts, and boss wave chimes
          </div>
        </div>
        <button
          type="button"
          aria-pressed={shooterSettings.soundEnabled}
          onClick={() => onUpdateShooter({ soundEnabled: !shooterSettings.soundEnabled })}
          className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            shooterSettings.soundEnabled
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {shooterSettings.soundEnabled ? "Enabled" : "Muted"}
        </button>
      </div>
    </div>
  );
}
