import {
  Award,
  Calendar,
  Crosshair,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Sliders,
} from "lucide-react";
import type { ShooterSettings } from "@/lib/shooterSettings";
import type { PauseReason, ShooterPhase } from "@/hooks/useWordShooterGame";

interface WordShooterOverlaysProps {
  phase: ShooterPhase;
  pauseReason: PauseReason;
  resumeCountdown: number | null;
  settings: ShooterSettings;
  best: number;
  score: number;
  hits: number;
  hitRate: number;
  typingAccuracy: number;
  maxStreak: number;
  strayKeys: number;
  durationSec: number;
  isNewRecord: boolean;
  onStart: () => void;
  onResume: () => void;
  onOpenSettings: () => void;
  onUpdateSettings?: ((patch: Partial<ShooterSettings>) => void) | undefined;
}

export function WordShooterOverlays({
  phase,
  pauseReason,
  resumeCountdown,
  settings,
  best,
  score,
  hits,
  hitRate,
  typingAccuracy,
  maxStreak,
  strayKeys,
  durationSec,
  isNewRecord,
  onStart,
  onResume,
  onOpenSettings,
  onUpdateSettings,
}: WordShooterOverlaysProps) {
  if (phase === "idle") {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-card/92 px-4 py-4 text-center backdrop-blur-sm sm:gap-4 sm:px-6">
        <div className="hidden size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
          <Crosshair className="size-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Word Shooter</h2>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground sm:text-sm">
            Type falling words to fire. Build 5x &amp; 10x streaks to earn Slow-Time and Shields.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-muted-foreground sm:gap-2">
          <span className="rounded-md border border-border bg-secondary px-2 py-1">
            <strong className="capitalize text-primary">{settings.difficulty}</strong>
          </span>
          <span className="rounded-md border border-border bg-secondary px-2 py-1">
            Speed:{" "}
            <strong className="font-mono tabular-nums text-primary">
              {settings.speedMultiplier.toFixed(2)}x
            </strong>
          </span>
          <span className="rounded-md border border-border bg-secondary px-2 py-1">
            {settings.practiceMode ? (
              <strong className="text-accent">Practice (No lives)</strong>
            ) : (
              <>
                Lives:{" "}
                <strong className="font-mono tabular-nums text-destructive">
                  {settings.startingLives} ❤
                </strong>
              </>
            )}
          </span>
        </div>

        {onUpdateSettings ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              aria-pressed={settings.practiceMode}
              onClick={() => onUpdateSettings({ practiceMode: !settings.practiceMode })}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                settings.practiceMode
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-secondary/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <InfinityIcon className="size-3.5" />
              Practice Mode
            </button>
            <button
              type="button"
              aria-pressed={settings.dailyChallenge}
              onClick={() => onUpdateSettings({ dailyChallenge: !settings.dailyChallenge })}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                settings.dailyChallenge
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="size-3.5" />
              Daily Challenge
            </button>
          </div>
        ) : null}

        {best > 0 && (
          <p className="text-[13px] text-muted-foreground">
            Best score:{" "}
            <span className="font-mono font-bold tabular-nums text-primary">
              {best.toLocaleString()}
            </span>{" "}
            pts
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-6 sm:py-2.5"
          >
            Start Game
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:py-2.5"
          >
            <Sliders className="size-4 text-primary" />
            Settings
          </button>
        </div>
      </div>
    );
  }

  if (phase === "paused") {
    const reasonText =
      pauseReason === "hidden"
        ? "Auto-paused when tab switched"
        : pauseReason === "blur"
          ? "Auto-paused after window lost focus"
          : "Game paused";

    return (
      <div
        onClick={onResume}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onResume();
          }
        }}
        className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-3 bg-card/88 px-6 text-center backdrop-blur-sm"
      >
        <h2 className="text-xl font-semibold text-foreground">Click to Resume</h2>
        <p className="text-[13px] text-muted-foreground">
          {reasonText} · 3-2-1 countdown on resume
        </p>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onResume}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Play className="size-4" />
            Resume
          </button>
          <button
            type="button"
            onClick={onStart}
            className="cursor-pointer rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Restart
          </button>
        </div>
      </div>
    );
  }

  if (phase === "resuming" && resumeCountdown !== null) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/55 backdrop-blur-[2px]">
        <div className="rounded-2xl border border-primary/50 bg-card/95 px-8 py-4 text-center">
          <div className="text-[13px] font-medium text-muted-foreground">Get ready</div>
          <div className="font-mono text-5xl font-extrabold tabular-nums text-primary">
            {resumeCountdown}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-card/95 px-4 py-4 text-center backdrop-blur-sm sm:gap-4 sm:px-6">
        <div className="hidden size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive sm:flex">
          <Award className="size-7" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-destructive">
            {settings.practiceMode ? "Practice Complete" : "Shield Depleted!"}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Score:{" "}
            <strong className="font-mono tabular-nums text-foreground">
              {score.toLocaleString()}
            </strong>{" "}
            · Words: <strong className="font-mono tabular-nums text-foreground">{hits}</strong> ·
            Acc:{" "}
            <strong className="font-mono tabular-nums text-foreground">{typingAccuracy}%</strong> ·
            Hit rate: <strong className="font-mono tabular-nums text-foreground">{hitRate}%</strong>
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Max streak:{" "}
            <strong className="font-mono tabular-nums text-foreground">{maxStreak}x</strong> · Time:{" "}
            <strong className="font-mono tabular-nums text-foreground">{durationSec}s</strong>
            {strayKeys > 0 ? (
              <>
                {" "}
                · Stray keys:{" "}
                <strong className="font-mono tabular-nums text-foreground">{strayKeys}</strong>
              </>
            ) : null}
          </p>
        </div>

        {isNewRecord && !settings.practiceMode ? (
          <div className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1 text-[13px] font-bold text-accent">
            New high score: <span className="font-mono tabular-nums">{score.toLocaleString()}</span>{" "}
            pts!
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-6 sm:py-2.5"
          >
            <RotateCcw className="size-4" />
            Play Again
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:py-2.5"
          >
            <Sliders className="size-4" />
            Settings
          </button>
        </div>
      </div>
    );
  }

  return null;
}
