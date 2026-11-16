import { Contrast, Crosshair, Moon, Sliders, Sun, Timer, Trophy } from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { ThemeAccentPicker } from "@/components/ThemeAccentPicker";
import type { ThemeAccent } from "@/lib/uiPrefs";
import { getNextTheme, THEME_LABELS, type Theme } from "@/lib/useTheme";
import { drillModeKey, getDrillMode, type DrillSettings } from "@/lib/drillSettings";
import type { ShooterSettings } from "@/lib/shooterSettings";
import { formatModeLabel } from "@/lib/typingStats";
import type { AppMode } from "@/lib/urlState";
import { ACHIEVEMENTS } from "@/lib/achievements";

interface AppHeaderProps {
  mode: AppMode;
  focusDimmed: boolean;
  theme: Theme;
  accent: ThemeAccent;
  drillSettings: DrillSettings;
  shooterSettings: ShooterSettings;
  unlockedAchievementsCount?: number;
  onModeChange: (mode: AppMode) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSelectAccent: (accent: ThemeAccent) => void;
  onRestartDrill: () => void;
}

export function AppHeader({
  mode,
  focusDimmed,
  theme,
  accent,
  drillSettings,
  shooterSettings,
  unlockedAchievementsCount = 0,
  onModeChange,
  onOpenSettings,
  onToggleTheme,
  onSelectAccent,
  onRestartDrill,
}: AppHeaderProps) {
  const drillMode = getDrillMode(drillSettings);
  const activeModeLabel = formatModeLabel(drillModeKey(drillSettings));
  const nextThemeLabel = THEME_LABELS[getNextTheme(theme)];

  return (
    <>
      <header
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 transition-opacity duration-300 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 ${
          focusDimmed ? "focus-dimmed" : ""
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-mono text-xl font-bold tracking-tight sm:text-3xl">
              Typing<span className="text-primary">Trainer</span>Pro
            </h1>
            <OfflineIndicator />
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {mode === "drill"
              ? "Timed drills with live WPM, accuracy and a keyboard that shows your next key."
              : mode === "shooter"
                ? "Word Shooter arcade mode: defend your ship by typing falling words."
                : mode === "settings"
                  ? "Configure typing rules, content, layouts, sound, appearance, and browser data."
                  : "Track speed, accuracy, streaks, key mastery, and arcade milestones."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PWAInstallButton compact className="hidden sm:inline-flex" />
          <ThemeAccentPicker accent={accent} onSelectAccent={onSelectAccent} />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-pressed={mode === "settings"}
            aria-label="Open unified settings"
            title="Open Settings"
            className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              mode === "settings"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary hover:bg-muted"
            }`}
          >
            <Sliders
              className={`size-4 ${mode === "settings" ? "text-primary-foreground" : "text-primary"}`}
            />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${nextThemeLabel} theme (current: ${THEME_LABELS[theme]})`}
            title={`Theme: ${THEME_LABELS[theme]} · Click for ${nextThemeLabel}`}
            className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary p-2 transition-colors hover:bg-muted"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : theme === "light" ? (
              <Contrast className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
          {mode === "drill" ? (
            <button
              type="button"
              onClick={onRestartDrill}
              className="min-h-10 cursor-pointer rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:px-4"
            >
              Restart{" "}
              <span className="ml-1 hidden font-mono text-xs text-muted-foreground sm:inline">
                Esc
              </span>
            </button>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Primary sections"
        className={`mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 transition-opacity duration-300 ${
          focusDimmed ? "focus-dimmed" : ""
        }`}
      >
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => onModeChange("drill")}
            aria-pressed={mode === "drill"}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
              mode === "drill"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Timer className="size-3.5" />
            Timed Drill
          </button>
          <button
            type="button"
            onClick={() => onModeChange("shooter")}
            aria-pressed={mode === "shooter"}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
              mode === "shooter"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crosshair className="size-3.5" />
            Word Shooter
          </button>
          <button
            type="button"
            onClick={() => onModeChange("achievements")}
            aria-pressed={mode === "achievements"}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
              mode === "achievements"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="size-3.5" />
            Achievements
            <span className="font-mono text-xs opacity-90 tabular-nums">
              {unlockedAchievementsCount}/{ACHIEVEMENTS.length}
            </span>
          </button>
        </div>

        {mode === "drill" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
              <span>
                Mode: <strong className="text-foreground">{activeModeLabel}</strong>
              </span>
              {drillMode !== "quote" ? (
                <>
                  <span>·</span>
                  <span>
                    Diff:{" "}
                    <strong className="capitalize text-foreground">
                      {drillSettings.difficulty}
                    </strong>
                  </span>
                </>
              ) : null}
              <span>·</span>
              <span>
                Target: <strong className="text-primary">{drillSettings.targetWpm} WPM</strong>
              </span>
            </div>
          </div>
        ) : mode === "shooter" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
              <span>
                Diff:{" "}
                <strong className="capitalize text-foreground">{shooterSettings.difficulty}</strong>
              </span>
              <span>·</span>
              <span>
                Speed:{" "}
                <strong className="text-primary">
                  {shooterSettings.speedMultiplier.toFixed(2)}x
                </strong>
              </span>
              <span>·</span>
              <span>
                Lives:{" "}
                <strong className="text-destructive">{shooterSettings.startingLives} ❤</strong>
              </span>
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}
