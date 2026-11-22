import {
  BarChart3,
  Contrast,
  Crosshair,
  Flame,
  GraduationCap,
  Moon,
  Sliders,
  Sun,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { getNextTheme, THEME_LABELS, type Theme } from "@/lib/useTheme";
import { QUICK_RESTART_LABELS, getQuickRestart, type DrillSettings } from "@/lib/drillSettings";
import type { ShooterSettings } from "@/lib/shooterSettings";
import type { AppMode } from "@/lib/urlState";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getEffectiveDaily, getLocalDateString, type DailyState } from "@/lib/daily";

const NAV_ITEMS = [
  { id: "drill", label: "Practice", Icon: Timer },
  { id: "learn", label: "Learn", Icon: GraduationCap },
  { id: "shooter", label: "Arcade", Icon: Crosshair },
  { id: "stats", label: "Stats", Icon: BarChart3 },
  { id: "achievements", label: "Achievements", Icon: Trophy },
] as const;

interface AppHeaderProps {
  mode: AppMode;
  focusDimmed: boolean;
  theme: Theme;
  drillSettings: DrillSettings;
  shooterSettings: ShooterSettings;
  daily?: DailyState | null | undefined;
  unlockedAchievementsCount?: number;
  learnUnlockedCount?: number | undefined;
  learnTargetWpm?: number | undefined;
  onModeChange: (mode: AppMode) => void;
  onOpenSettings: () => void;
  onOpenDailyGoalSettings?: (() => void) | undefined;
  onToggleTheme: () => void;
  onRestartDrill: () => void;
}

function formatGoalMinutes(activeSeconds: number): string {
  const mins = activeSeconds / 60;
  if (mins >= 10 || Math.abs(mins - Math.round(mins)) < 0.05) {
    return `${Math.round(mins)}`;
  }
  return mins.toFixed(1);
}

export function AppHeader({
  mode,
  focusDimmed,
  theme,
  drillSettings,
  shooterSettings,
  daily = null,
  unlockedAchievementsCount = 0,
  learnUnlockedCount = 6,
  learnTargetWpm = 35,
  onModeChange,
  onOpenSettings,
  onOpenDailyGoalSettings,
  onToggleTheme,
  onRestartDrill,
}: AppHeaderProps) {
  const quickRestart = getQuickRestart(drillSettings);
  const nextThemeLabel = THEME_LABELS[getNextTheme(theme)];
  const effDaily = getEffectiveDaily(daily, getLocalDateString());
  const goalProgressText =
    effDaily.goalType === "minutes"
      ? `${formatGoalMinutes(effDaily.activeSecondsToday)}/${effDaily.goalTarget}m`
      : `${effDaily.runsToday}/${effDaily.goalTarget}`;

  return (
    <>
      <header
        className={`flex flex-wrap items-center justify-between gap-3 transition-opacity duration-300 sm:items-end sm:gap-4 ${
          focusDimmed ? "focus-dimmed" : ""
        }`}
      >
        <div className="min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-mono text-xl font-bold tracking-tight sm:text-3xl">
              Typing<span className="text-primary">Trainer</span>Pro
            </h1>
            <OfflineIndicator />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton compact className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-pressed={mode === "settings"}
            aria-label="Open unified settings"
            title="Open Settings"
            className={`flex min-h-11 min-w-11 sm:min-h-10 sm:min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
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
            className="flex min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary p-2 transition-colors hover:bg-muted"
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
              className="min-h-11 sm:min-h-10 cursor-pointer rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:px-4"
            >
              Restart
              {quickRestart !== "off" ? (
                <span className="ml-1 hidden font-mono text-xs text-muted-foreground sm:inline">
                  {QUICK_RESTART_LABELS[quickRestart]}
                </span>
              ) : null}
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
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              aria-pressed={mode === id}
              className={`flex min-h-11 sm:min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
                mode === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
              {id === "achievements" ? (
                <span className="font-mono text-xs tabular-nums">
                  {unlockedAchievementsCount}/{ACHIEVEMENTS.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode !== "settings" && onOpenDailyGoalSettings ? (
            <button
              type="button"
              onClick={onOpenDailyGoalSettings}
              aria-label={`Daily goal ${goalProgressText}${effDaily.streak > 0 ? `, ${effDaily.streak} day streak` : ""} — configure in Typing settings`}
              title="Daily goal progress · Click to configure in Typing settings"
              className={`flex min-h-11 sm:min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors hover:bg-secondary ${
                effDaily.goalMetToday
                  ? "border-accent/50 bg-accent/15 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target
                className={`size-3.5 shrink-0 ${effDaily.goalMetToday ? "text-accent" : "text-primary"}`}
              />
              <span className="font-semibold text-foreground">{goalProgressText}</span>
              {effDaily.streak > 0 ? (
                <>
                  <span aria-hidden="true" className="text-border">
                    ·
                  </span>
                  <span className="flex items-center gap-0.5 font-semibold text-primary">
                    <Flame className="size-3 fill-primary/20" />
                    {effDaily.streak}d
                  </span>
                </>
              ) : null}
            </button>
          ) : null}

          {mode === "shooter" ? (
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
          ) : mode === "learn" ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground tabular-nums">
              <span>
                Unlocked: <strong className="text-primary">{learnUnlockedCount}/26</strong>
              </span>
              <span>·</span>
              <span>
                Target: <strong className="text-foreground">{learnTargetWpm} WPM</strong>
              </span>
            </div>
          ) : null}
        </div>
      </nav>
    </>
  );
}
