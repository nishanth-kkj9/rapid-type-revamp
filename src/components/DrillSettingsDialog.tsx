import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DrillSettings, CaretStyle, DrillSound } from "@/lib/drillSettings";
import { DEFAULT_DRILL_SETTINGS } from "@/lib/drillSettings";
import type { Difficulty } from "@/lib/sentenceGenerator";
import { Volume2, VolumeX, RotateCcw, Timer, Target, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DrillSettings;
  onSaveSettings: (settings: DrillSettings) => void;
}

const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  desc: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    desc: "Common words, predictable phrasing, gentle rhythm. Great for building confidence.",
  },
  {
    id: "medium",
    label: "Medium",
    desc: "Real-world prose with varied punctuation and capitalization.",
  },
  {
    id: "hard",
    label: "Hard",
    desc: "Complex syntax, advanced vocabulary, numbers, and technical terms.",
  },
];

const DURATIONS = [
  { label: "15s Sprint", value: 15 },
  { label: "30s Standard", value: 30 },
  { label: "60s Endurance", value: 60 },
  { label: "120s Marathon", value: 120 },
];

const CARET_STYLES: { id: CaretStyle; label: string; preview: string }[] = [
  { id: "smooth", label: "Smooth Pulse", preview: "▌" },
  { id: "block", label: "Block", preview: "█" },
  { id: "bar", label: "Thin Bar", preview: "|" },
  { id: "underline", label: "Underline", preview: "_" },
];

const SOUND_OPTIONS: { id: DrillSound; label: string; desc: string }[] = [
  { id: "click", label: "Mechanical Click", desc: "Crisp tactile sound on each character" },
  { id: "beep", label: "Soft Beep", desc: "Subtle mellow chime on keystroke" },
  { id: "off", label: "Silent (Muted)", desc: "Quiet typing experience" },
];

const TARGET_WPM_PRESETS = [40, 60, 80, 100, 120];

export function DrillSettingsDialog({ open, onOpenChange, settings, onSaveSettings }: Props) {
  const [draft, setDraft] = useState<DrillSettings>(settings);

  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  const update = <K extends keyof DrillSettings>(key: K, value: DrillSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetDefaults = () => {
    setDraft({ ...DEFAULT_DRILL_SETTINGS });
  };

  const handleApplyAndClose = () => {
    onSaveSettings(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-border bg-card p-6 text-foreground">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Timer className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-mono text-xl font-bold">
                Timed Drill Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Customize duration, passage difficulty, cursor appearance, and typing audio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {/* Difficulty Setting */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Passage Difficulty
              </label>
              <span className="font-mono text-xs font-semibold capitalize text-primary">
                {draft.difficulty}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => {
                const active = draft.difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => update("difficulty", d.id)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
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

          {/* Duration Setting */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Timer className="size-3.5" />
                Default Test Duration
              </label>
              <span className="font-mono text-xs font-bold text-accent-foreground bg-accent/20 px-2 py-0.5 rounded">
                {draft.duration}s
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DURATIONS.map((d) => {
                const active = draft.duration === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => update("duration", d.value)}
                    className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-accent bg-accent text-accent-foreground font-semibold"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target WPM Goal */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-primary" />
                Target WPM Goal
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {draft.targetWpm} WPM
              </span>
            </div>

            <div className="mb-2.5 grid grid-cols-5 gap-1.5">
              {TARGET_WPM_PRESETS.map((wpm) => {
                const active = draft.targetWpm === wpm;
                return (
                  <button
                    key={wpm}
                    type="button"
                    onClick={() => update("targetWpm", wpm)}
                    className={`rounded-lg border px-1.5 py-1 text-center text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {wpm}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground">20</span>
              <input
                type="range"
                min="20"
                max="160"
                step="5"
                value={draft.targetWpm}
                onChange={(e) => update("targetWpm", parseInt(e.target.value, 10))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                aria-label="Target WPM slider"
              />
              <span className="font-mono text-[11px] text-muted-foreground">160</span>
            </div>
          </div>

          {/* Caret Style */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3.5" />
                Cursor / Caret Style
              </label>
              <span className="font-mono text-xs font-semibold text-primary capitalize">
                {draft.caretStyle}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CARET_STYLES.map((c) => {
                const active = draft.caretStyle === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => update("caretStyle", c.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-primary/15 text-foreground font-semibold ring-1 ring-primary"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono text-primary font-bold">{c.preview}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Feedback */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {draft.sound === "off" ? (
                  <VolumeX className="size-3.5" />
                ) : (
                  <Volume2 className="size-3.5 text-accent" />
                )}
                Typing Audio Feedback
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SOUND_OPTIONS.map((s) => {
                const active = draft.sound === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => update("sound", s.id)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      active
                        ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold">{s.label}</span>
                    <span className="mt-0.5 text-[10px] opacity-75">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live WPM Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
            <div>
              <div className="text-xs font-semibold">Live WPM & Accuracy Counter</div>
              <div className="text-[11px] text-muted-foreground">
                Display realtime speed metrics above the passage during active typing
              </div>
            </div>
            <button
              type="button"
              onClick={() => update("showLiveWpm", !draft.showLiveWpm)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                draft.showLiveWpm
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {draft.showLiveWpm ? "Visible" : "Hidden"}
            </button>
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleApplyAndClose}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
          >
            Apply Settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
