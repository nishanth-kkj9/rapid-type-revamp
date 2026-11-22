import { Calendar, Gauge, Heart, Infinity as InfinityIcon, Keyboard } from "lucide-react";
import type { Difficulty } from "@/lib/sentenceGenerator";
import type { ShooterSettings } from "@/lib/shooterSettings";

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: "easy", label: "Easy", desc: "Short 3–6 letter words at a casual descent rate." },
  {
    id: "medium",
    label: "Medium",
    desc: "Everyday 4+ letter words (short filler words filtered).",
  },
  { id: "hard", label: "Hard", desc: "Longer 5–13 letter words and multi-target boss waves." },
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
  { label: "10 (Relaxed)", value: 10 },
];

interface SettingsGameTabProps {
  shooterSettings: ShooterSettings;
  onUpdateShooter: (patch: Partial<ShooterSettings>) => void;
}

export function SettingsGameTab({ shooterSettings, onUpdateShooter }: SettingsGameTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Word Shooter Difficulty
          </h3>
          <span className="font-mono text-xs font-semibold capitalize text-primary">
            {shooterSettings.difficulty}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => {
            const active = shooterSettings.difficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdateShooter({ difficulty: d.id })}
                className={`flex min-h-14 cursor-pointer flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="font-mono text-sm font-bold capitalize">{d.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">{d.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="settings-shooter-speed"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <Gauge className="size-3.5 text-primary" />
            Falling Speed Multiplier
          </label>
          <span className="font-mono text-xs font-bold text-primary">
            {shooterSettings.speedMultiplier.toFixed(2)}x
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SPEED_PRESETS.map((p) => {
            const active = Math.abs(shooterSettings.speedMultiplier - p.value) < 0.04;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdateShooter({ speedMultiplier: p.value })}
                className={`min-h-11 cursor-pointer rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
                <span className="block font-mono text-xs">{p.value}x</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">0.5x</span>
          <input
            id="settings-shooter-speed"
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={shooterSettings.speedMultiplier}
            onChange={(e) => onUpdateShooter({ speedMultiplier: parseFloat(e.target.value) })}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
          />
          <span className="font-mono text-xs text-muted-foreground">2.5x</span>
        </div>
      </div>

      <div
        className={`space-y-3 border-t border-border/60 pt-5 ${
          shooterSettings.practiceMode ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor="settings-shooter-lives"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <Heart className="size-3.5 text-destructive" />
            Starting Lives {shooterSettings.practiceMode ? "(Unlimited in Practice)" : ""}
          </label>
          <span className="font-mono text-xs font-bold text-destructive">
            {shooterSettings.startingLives} ❤
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LIVES_PRESETS.map((p) => {
            const active = shooterSettings.startingLives === p.value;
            return (
              <button
                key={p.value}
                type="button"
                disabled={shooterSettings.practiceMode}
                aria-pressed={active}
                onClick={() => onUpdateShooter({ startingLives: p.value })}
                className={`min-h-10 cursor-pointer rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                  active
                    ? "border-destructive/80 bg-destructive/15 font-semibold text-foreground ring-1 ring-destructive/50"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">1</span>
          <input
            id="settings-shooter-lives"
            type="range"
            min="1"
            max="10"
            step="1"
            disabled={shooterSettings.practiceMode}
            value={shooterSettings.startingLives}
            onChange={(e) => onUpdateShooter({ startingLives: parseInt(e.target.value, 10) })}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-destructive"
          />
          <span className="font-mono text-xs text-muted-foreground">10</span>
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <InfinityIcon className="size-3.5 text-accent" />
              Practice Mode (No Breaches Lost)
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Practice endlessly without losing lives; scores count cleanly without leaderboard lock
            </div>
          </div>
          <button
            type="button"
            aria-pressed={shooterSettings.practiceMode}
            onClick={() => onUpdateShooter({ practiceMode: !shooterSettings.practiceMode })}
            className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              shooterSettings.practiceMode
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {shooterSettings.practiceMode ? "Active" : "Off"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Calendar className="size-3.5 text-primary" />
              Daily Seeded Challenge
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Deterministic wave sequence seeded from today&apos;s local calendar date
            </div>
          </div>
          <button
            type="button"
            aria-pressed={shooterSettings.dailyChallenge}
            onClick={() => onUpdateShooter({ dailyChallenge: !shooterSettings.dailyChallenge })}
            className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              shooterSettings.dailyChallenge
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {shooterSettings.dailyChallenge ? "Daily Seed" : "Random"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Keyboard className="size-3.5 text-primary" />
              Arcade On-Screen Keyboard
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Display the virtual keyboard highlighting the locked target word&apos;s next character
            </div>
          </div>
          <button
            type="button"
            aria-pressed={shooterSettings.showKeyboard}
            onClick={() => onUpdateShooter({ showKeyboard: !shooterSettings.showKeyboard })}
            className={`min-h-10 shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              shooterSettings.showKeyboard
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {shooterSettings.showKeyboard ? "Visible" : "Hidden"}
          </button>
        </div>
      </div>
    </div>
  );
}
