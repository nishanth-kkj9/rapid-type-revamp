import { useState } from "react";
import { Keyboard, Sparkles, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveOnboardedToStorage } from "@/lib/appHydration";
import { KEYBOARD_LAYOUTS, type KeyboardLayoutId } from "@/lib/keyboardLayout";
import type { Difficulty } from "@/lib/sentenceGenerator";
import { appStorage } from "@/lib/storage";

export const ONBOARDED_KEY = "ttp:onboarded:v1";

export interface OnboardingChoices {
  difficulty: Difficulty;
  targetWpm: number;
  keyboardLayout: KeyboardLayoutId;
  runPlacementTest: boolean;
}

type SpeedPreset = {
  id: "beginner" | "intermediate" | "fast" | "placement";
  label: string;
  sublabel: string;
  difficulty: Difficulty;
  suggestedGoal: number;
};

const SPEED_PRESETS: SpeedPreset[] = [
  {
    id: "beginner",
    label: "Beginner",
    sublabel: "~30 WPM · Easy words",
    difficulty: "easy",
    suggestedGoal: 45,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    sublabel: "~55 WPM · Everyday mix",
    difficulty: "medium",
    suggestedGoal: 75,
  },
  {
    id: "fast",
    label: "Fast",
    sublabel: "80+ WPM · Complex text",
    difficulty: "hard",
    suggestedGoal: 100,
  },
  {
    id: "placement",
    label: "Not sure",
    sublabel: "Run 15s placement drill",
    difficulty: "medium",
    suggestedGoal: 60,
  },
];

const GOAL_PRESETS = [40, 60, 80, 100, 120];

interface Props {
  ready: boolean;
  alreadyOnboarded: boolean;
  initialLayout?: KeyboardLayoutId | undefined;
  onStart: (choices: OnboardingChoices) => void;
}

export function Onboarding({ ready, alreadyOnboarded, initialLayout = "qwerty", onStart }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [levelId, setLevelId] = useState<SpeedPreset["id"]>("intermediate");
  const [goalWpm, setGoalWpm] = useState<number>(75);
  const [layout, setLayout] = useState<KeyboardLayoutId>(initialLayout);

  const open = ready && !alreadyOnboarded && !dismissed;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDismissed(true);
      void saveOnboardedToStorage(appStorage, true);
    }
  };

  const handleSelectPreset = (preset: SpeedPreset) => {
    setLevelId(preset.id);
    setGoalWpm(preset.suggestedGoal);
  };

  const handleComplete = () => {
    const chosen = SPEED_PRESETS.find((p) => p.id === levelId) ?? SPEED_PRESETS[1]!;
    setDismissed(true);
    void saveOnboardedToStorage(appStorage, true);
    onStart({
      difficulty: chosen.difficulty,
      targetWpm: goalWpm,
      keyboardLayout: layout,
      runPlacementTest: chosen.id === "placement",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-lg overflow-y-auto border-border bg-card p-6 text-foreground">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="font-mono text-2xl font-bold">
            Welcome to Typing<span className="text-primary">Trainer</span>Pro
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            Tailor your starting drill in seconds. Everything stays in your browser — no account, no
            tracking, zero external font CDNs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              1. Current typing pace
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SPEED_PRESETS.map((preset) => {
                const active = levelId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex min-h-12 cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/12 text-foreground ring-1 ring-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold text-foreground">{preset.label}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">{preset.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-primary" />
                2. Target WPM goal
              </span>
              <span className="font-mono text-xs font-bold text-primary">{goalWpm} WPM</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {GOAL_PRESETS.map((wpm) => {
                const active = goalWpm === wpm;
                return (
                  <button
                    key={wpm}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGoalWpm(wpm)}
                    className={`min-h-10 cursor-pointer rounded-lg border px-2 py-1.5 font-mono text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {wpm}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Keyboard className="size-3.5 text-primary" />
              3. Keyboard layout
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {KEYBOARD_LAYOUTS.map((item) => {
                const active = layout === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLayout(item.id)}
                    className={`min-h-10 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent font-semibold text-accent-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="min-h-10 cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Skip setup
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="min-h-10 cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {levelId === "placement" ? "Start 15s placement test" : "Start practicing"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Onboarding;
