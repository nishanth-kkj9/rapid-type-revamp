import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShooterSettings } from "@/lib/shooterSettings";
import { DEFAULT_SHOOTER_SETTINGS } from "@/lib/shooterSettings";
import type { Difficulty } from "@/lib/sentenceGenerator";
import { Volume2, VolumeX, RotateCcw, Zap, Heart, Gauge } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ShooterSettings;
  onSaveSettings: (settings: ShooterSettings) => void;
}

const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  desc: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    desc: "Short 3–5 letter words, casual pace. Great for warming up.",
  },
  {
    id: "medium",
    label: "Medium",
    desc: "Everyday vocabulary and varied word lengths. Balanced challenge.",
  },
  {
    id: "hard",
    label: "Hard",
    desc: "Advanced multi-syllable words and complex patterns for high dexterity.",
  },
];

const SPEED_PRESETS = [
  { label: "Relaxed", value: 0.75 },
  { label: "Normal", value: 1.0 },
  { label: "Fast", value: 1.35 },
  { label: "Hyper", value: 1.75 },
];

const LIVES_PRESETS = [
  { label: "1 (Hardcore)", value: 1 },
  { label: "3 (Classic)", value: 3 },
  { label: "5 (Standard)", value: 5 },
  { label: "10 (Practice)", value: 10 },
];

export function ShooterSettingsDialog({ open, onOpenChange, settings, onSaveSettings }: Props) {
  const update = <K extends keyof ShooterSettings>(key: K, value: ShooterSettings[K]) => {
    onSaveSettings({ ...settings, [key]: value });
  };

  const resetDefaults = () => {
    onSaveSettings({ ...DEFAULT_SHOOTER_SETTINGS });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-border bg-card p-6 text-foreground">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-mono text-xl font-bold">
                Word Shooter Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tune your difficulty, falling speed, starting lives, and arcade audio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {/* Difficulty Setting */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Difficulty
              </label>
              <span className="font-mono text-xs font-semibold capitalize text-primary">
                {settings.difficulty}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => {
                const active = settings.difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => update("difficulty", d.id)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono text-sm font-bold capitalize">{d.label}</span>
                    <span className="mt-1 text-[11px] leading-tight opacity-80">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed Setting */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Gauge className="size-3.5" />
                Falling Speed
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {settings.speedMultiplier.toFixed(2)}x
              </span>
            </div>

            {/* Speed Presets */}
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {SPEED_PRESETS.map((p) => {
                const active = Math.abs(settings.speedMultiplier - p.value) < 0.04;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => update("speedMultiplier", p.value)}
                    className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-foreground font-semibold"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                    <span className="block font-mono text-[10px] opacity-75">{p.value}x</span>
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground">0.5x</span>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={settings.speedMultiplier}
                onChange={(e) => update("speedMultiplier", parseFloat(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                aria-label="Speed multiplier slider"
              />
              <span className="font-mono text-[11px] text-muted-foreground">2.5x</span>
            </div>
          </div>

          {/* Lives Setting */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Heart className="size-3.5 text-destructive" />
                Starting Lives
              </label>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-destructive">
                <span>{settings.startingLives}</span>
                <span className="text-sm">{"❤".repeat(Math.min(5, settings.startingLives))}</span>
                {settings.startingLives > 5 ? (
                  <span className="text-[10px]">+{settings.startingLives - 5}</span>
                ) : null}
              </div>
            </div>

            {/* Lives Presets */}
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {LIVES_PRESETS.map((p) => {
                const active = settings.startingLives === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => update("startingLives", p.value)}
                    className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                      active
                        ? "border-destructive/80 bg-destructive/15 text-foreground font-semibold ring-1 ring-destructive/50"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Lives Slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground">1</span>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.startingLives}
                onChange={(e) => update("startingLives", parseInt(e.target.value, 10))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-destructive"
                aria-label="Starting lives slider"
              />
              <span className="font-mono text-[11px] text-muted-foreground">10</span>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                {settings.soundEnabled ? (
                  <Volume2 className="size-4 text-accent" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold">Sound Effects</div>
                <div className="text-[11px] text-muted-foreground">
                  Synthesized 8-bit laser zaps and explosion audio
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => update("soundEnabled", !settings.soundEnabled)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                settings.soundEnabled
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {settings.soundEnabled ? "Enabled" : "Muted"}
            </button>
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
