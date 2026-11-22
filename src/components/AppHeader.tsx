import { OfflineIndicator } from "@/components/OfflineIndicator";
import { getEffectiveDaily, getLocalDateString, type DailyState } from "@/lib/daily";
import type { AppMode } from "@/lib/urlState";

const NAV_ITEMS = [
  { id: "drill", label: "Practice" },
  { id: "learn", label: "Learn" },
  { id: "shooter", label: "Arcade" },
  { id: "stats", label: "Stats" },
  { id: "achievements", label: "Achievements" },
] as const;

interface AppHeaderProps {
  mode: AppMode;
  focusDimmed: boolean;
  daily?: DailyState | null | undefined;
  onModeChange: (mode: AppMode) => void;
  onOpenSettings: () => void;
  onOpenDailyGoalSettings?: (() => void) | undefined;
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
  daily = null,
  onModeChange,
  onOpenSettings,
  onOpenDailyGoalSettings,
}: AppHeaderProps) {
  const effDaily = getEffectiveDaily(daily, getLocalDateString());
  const goalProgressText =
    effDaily.goalType === "minutes"
      ? `${formatGoalMinutes(effDaily.activeSecondsToday)}/${effDaily.goalTarget}m`
      : `${effDaily.runsToday}/${effDaily.goalTarget}`;

  return (
    <header
      className={`border-b border-border pb-3 transition-opacity duration-300 ${
        focusDimmed ? "focus-dimmed" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <h1 className="shrink-0 text-lg font-semibold text-foreground">Typing Trainer</h1>

        <div className="order-2 flex items-center gap-x-4 sm:order-3">
          {mode !== "settings" && onOpenDailyGoalSettings ? (
            <button
              type="button"
              onClick={onOpenDailyGoalSettings}
              aria-label={`Daily goal ${goalProgressText}${effDaily.streak > 0 ? `, ${effDaily.streak} day streak` : ""} — configure in Typing settings`}
              title="Daily goal progress · Click to configure in Typing settings"
              className="inline-flex min-h-11 sm:min-h-9 cursor-pointer items-center whitespace-nowrap font-mono text-[13px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
            >
              {goalProgressText}
              {effDaily.streak > 0 ? ` · ${effDaily.streak}d` : ""}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-pressed={mode === "settings"}
            aria-label="Open unified settings"
            title="Open Settings"
            className={`inline-flex min-h-11 sm:min-h-9 cursor-pointer items-center whitespace-nowrap border-b-2 text-sm font-medium transition-colors ${
              mode === "settings"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Settings
          </button>
        </div>

        <nav
          aria-label="Primary sections"
          className="order-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 sm:order-2 sm:w-auto sm:gap-x-4"
        >
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              aria-pressed={mode === id}
              className={`inline-flex min-h-11 sm:min-h-9 shrink-0 cursor-pointer items-center whitespace-nowrap border-b-2 text-sm font-medium transition-colors ${
                mode === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <OfflineIndicator />
    </header>
  );
}
