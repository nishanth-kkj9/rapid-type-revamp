import type { BackupImportResult } from "@/lib/backup";
import type { CustomTextEntry } from "@/lib/customTexts";
import type { DailyGoalConfig, DailyState } from "@/lib/daily";
import { DEFAULT_DRILL_SETTINGS, type DrillSettings } from "@/lib/drillSettings";
import type { HistoryEntry } from "@/lib/typingStats";
import type { Theme } from "@/lib/useTheme";
import { SettingsAppearanceSection } from "@/components/settings/SettingsAppearanceSection";
import { SettingsDataSection } from "@/components/settings/SettingsDataSection";
import { SettingsKeyboardSection } from "@/components/settings/SettingsKeyboardSection";
import { SettingsTypingSection } from "@/components/settings/SettingsTypingSection";

interface SettingsPageProps {
  drillSettings: DrillSettings;
  daily: DailyState | null;
  theme: Theme;
  dyslexiaFont: boolean;
  customTexts: CustomTextEntry[];
  history: HistoryEntry[];
  storedMissedWordsCount: number;
  onBack: () => void;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
  onSaveDrill: (next: DrillSettings) => void;
  onUpdateDailyGoal: (config: DailyGoalConfig) => void;
  onSelectTheme: (theme: Theme) => void;
  onToggleDyslexiaFont: (enabled: boolean) => void;
  onImportBackup: (rawJson: string) => Promise<BackupImportResult>;
  onDeleteAllData: () => Promise<void>;
}

export function SettingsPage({
  drillSettings,
  daily,
  theme,
  dyslexiaFont,
  customTexts,
  history,
  storedMissedWordsCount,
  onBack,
  onUpdateDrill,
  onSaveDrill,
  onUpdateDailyGoal,
  onSelectTheme,
  onToggleDyslexiaFont,
  onImportBackup,
  onDeleteAllData,
}: SettingsPageProps) {
  const handleResetDefaults = () => {
    onSaveDrill({ ...DEFAULT_DRILL_SETTINGS });
    onSelectTheme("dark");
    onToggleDyslexiaFont(false);
  };

  return (
    <section aria-label="Settings and privacy" className="panel mt-6 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Changes save locally in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-secondary px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>

      <SettingsTypingSection
        drillSettings={drillSettings}
        daily={daily}
        onUpdateDrill={onUpdateDrill}
        onUpdateDailyGoal={onUpdateDailyGoal}
      />

      <SettingsKeyboardSection drillSettings={drillSettings} onUpdateDrill={onUpdateDrill} />

      <SettingsAppearanceSection
        theme={theme}
        dyslexiaFont={dyslexiaFont}
        onSelectTheme={onSelectTheme}
        onToggleDyslexiaFont={onToggleDyslexiaFont}
      />

      <SettingsDataSection
        history={history}
        customTexts={customTexts}
        storedMissedWordsCount={storedMissedWordsCount}
        onImportBackup={onImportBackup}
        onDeleteAllData={onDeleteAllData}
      />
    </section>
  );
}
