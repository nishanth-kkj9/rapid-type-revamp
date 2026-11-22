import {
  ArrowLeft,
  BookOpen,
  Crosshair,
  Database,
  Keyboard,
  Palette,
  RotateCcw,
  Timer,
  Volume2,
} from "lucide-react";
import type { AchievementState } from "@/lib/achievements";
import type { BackupImportResult } from "@/lib/backup";
import type { CustomTextEntry } from "@/lib/customTexts";
import type { DailyGoalConfig, DailyState } from "@/lib/daily";
import { DEFAULT_DRILL_SETTINGS, type DrillSettings } from "@/lib/drillSettings";
import { DEFAULT_SHOOTER_SETTINGS, type ShooterSettings } from "@/lib/shooterSettings";
import type { HistoryEntry } from "@/lib/typingStats";
import type { SettingsTabId } from "@/lib/urlState";
import type { Theme } from "@/lib/useTheme";
import { SettingsAppearanceTab } from "@/components/settings/SettingsAppearanceTab";
import { SettingsContentTab } from "@/components/settings/SettingsContentTab";
import { SettingsDataPrivacyTab } from "@/components/settings/SettingsDataPrivacyTab";
import { SettingsGameTab } from "@/components/settings/SettingsGameTab";
import { SettingsKeyboardTab } from "@/components/settings/SettingsKeyboardTab";
import { SettingsSoundTab } from "@/components/settings/SettingsSoundTab";
import { SettingsTypingTab } from "@/components/settings/SettingsTypingTab";

const SETTINGS_TABS: { id: SettingsTabId; label: string; icon: typeof Timer }[] = [
  { id: "typing", label: "Typing", icon: Timer },
  { id: "content", label: "Practice content", icon: BookOpen },
  { id: "keyboard", label: "Keyboard", icon: Keyboard },
  { id: "sound", label: "Sound", icon: Volume2 },
  { id: "game", label: "Game", icon: Crosshair },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data & privacy", icon: Database },
];

interface SettingsPageProps {
  activeTab: SettingsTabId;
  drillSettings: DrillSettings;
  shooterSettings: ShooterSettings;
  daily: DailyState | null;
  theme: Theme;
  dyslexiaFont: boolean;
  customTexts: CustomTextEntry[];
  history: HistoryEntry[];
  achState: AchievementState;
  storedMissedWordsCount: number;
  onSelectTab: (tab: SettingsTabId) => void;
  onBack: () => void;
  onUpdateDrill: (patch: Partial<DrillSettings>) => void;
  onSaveDrill: (next: DrillSettings) => void;
  onUpdateShooter: (patch: Partial<ShooterSettings>) => void;
  onSaveShooter: (next: ShooterSettings) => void;
  onUpdateDailyGoal: (config: DailyGoalConfig) => void;
  onSelectTheme: (theme: Theme) => void;
  onToggleDyslexiaFont: (enabled: boolean) => void;
  onOpenCustomText: () => void;
  onImportBackup: (rawJson: string) => Promise<BackupImportResult>;
  onDeleteAllData: () => Promise<void>;
}

export function SettingsPage({
  activeTab,
  drillSettings,
  shooterSettings,
  daily,
  theme,
  dyslexiaFont,
  customTexts,
  history,
  achState,
  storedMissedWordsCount,
  onSelectTab,
  onBack,
  onUpdateDrill,
  onSaveDrill,
  onUpdateShooter,
  onSaveShooter,
  onUpdateDailyGoal,
  onSelectTheme,
  onToggleDyslexiaFont,
  onOpenCustomText,
  onImportBackup,
  onDeleteAllData,
}: SettingsPageProps) {
  const handleResetTabDefaults = () => {
    if (activeTab === "game") {
      onSaveShooter({ ...DEFAULT_SHOOTER_SETTINGS });
    } else if (activeTab === "appearance") {
      onSelectTheme("dark");
      onToggleDyslexiaFont(false);
    } else {
      onSaveDrill({ ...DEFAULT_DRILL_SETTINGS });
    }
  };

  return (
    <section aria-label="Settings and privacy" className="panel mt-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            All preferences apply immediately and save locally in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== "data" ? (
            <button
              type="button"
              onClick={handleResetTabDefaults}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset defaults
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="size-3.5" />
            Done
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Settings categories"
        className="mt-4 flex flex-wrap gap-1.5 border-b border-border/60 pb-4"
      >
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`settings-panel-${activeTab}`}
        aria-labelledby={`settings-tab-${activeTab}`}
        className="mt-5"
      >
        {activeTab === "typing" ? (
          <SettingsTypingTab
            drillSettings={drillSettings}
            daily={daily}
            onUpdateDrill={onUpdateDrill}
            onUpdateDailyGoal={onUpdateDailyGoal}
          />
        ) : activeTab === "content" ? (
          <SettingsContentTab
            drillSettings={drillSettings}
            customTexts={customTexts}
            onUpdateDrill={onUpdateDrill}
            onOpenCustomText={onOpenCustomText}
          />
        ) : activeTab === "keyboard" ? (
          <SettingsKeyboardTab drillSettings={drillSettings} onUpdateDrill={onUpdateDrill} />
        ) : activeTab === "sound" ? (
          <SettingsSoundTab
            drillSettings={drillSettings}
            shooterSettings={shooterSettings}
            onUpdateDrill={onUpdateDrill}
            onUpdateShooter={onUpdateShooter}
          />
        ) : activeTab === "game" ? (
          <SettingsGameTab shooterSettings={shooterSettings} onUpdateShooter={onUpdateShooter} />
        ) : activeTab === "appearance" ? (
          <SettingsAppearanceTab
            theme={theme}
            dyslexiaFont={dyslexiaFont}
            onSelectTheme={onSelectTheme}
            onToggleDyslexiaFont={onToggleDyslexiaFont}
          />
        ) : (
          <SettingsDataPrivacyTab
            history={history}
            customTexts={customTexts}
            achState={achState}
            storedMissedWordsCount={storedMissedWordsCount}
            onImportBackup={onImportBackup}
            onDeleteAllData={onDeleteAllData}
          />
        )}
      </div>
    </section>
  );
}
