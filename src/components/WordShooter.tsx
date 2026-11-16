import { Clock, Pause, Play, RotateCcw, Shield, Square, Volume2, VolumeX } from "lucide-react";
import type { ShooterSettings } from "@/lib/shooterSettings";
import type { ShooterRunSummary } from "@/lib/typingStats";
import { useWordShooterGame } from "@/hooks/useWordShooterGame";
import { WordShooterField } from "@/components/WordShooterField";

interface WordShooterProps {
  settings: ShooterSettings;
  missedWords?: string[] | undefined;
  weakKeys?: string[] | undefined;
  initialBest?: number | undefined;
  onOpenSettings: () => void;
  onUpdateSettings?: ((patch: Partial<ShooterSettings>) => void) | undefined;
  onActiveTargetCharChange?: ((char: string | null) => void) | undefined;
  onCharPressed?: ((char: string) => void) | undefined;
  onRunComplete?: ((s: ShooterRunSummary) => void) | undefined;
  onWrongKey?: ((expectedChar: string) => void) | undefined;
  onStart?: (() => void) | undefined;
}

export function WordShooter({
  settings,
  missedWords = [],
  weakKeys = [],
  initialBest = 0,
  onOpenSettings,
  onUpdateSettings,
  onActiveTargetCharChange,
  onCharPressed,
  onRunComplete,
  onWrongKey,
  onStart,
}: WordShooterProps) {
  const game = useWordShooterGame({
    settings,
    missedWords,
    weakKeys,
    initialBest,
    onActiveTargetCharChange,
    onCharPressed,
    onRunComplete,
    onWrongKey,
    onStart,
  });

  const isPlayingOrPaused =
    game.phase === "playing" || game.phase === "paused" || game.phase === "resuming";

  return (
    <section className="panel mt-3 p-2.5 sm:p-5">
      <div aria-live="polite" className="sr-only">
        {game.liveAnnouncement}
      </div>

      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:mb-3 sm:gap-3 sm:text-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-lg font-bold text-primary sm:text-2xl">
              {game.score}
            </span>
            <span className="text-[11px] text-muted-foreground">pts</span>
          </div>

          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs font-bold uppercase text-foreground">
            Lvl {game.level}
          </span>

          {settings.practiceMode ? (
            <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
              Practice
            </span>
          ) : (
            <div className="flex items-center gap-1 text-destructive">
              <span className="font-mono font-bold">{game.lives}</span>
              <span className="text-sm">{"❤".repeat(Math.max(0, Math.min(5, game.lives)))}</span>
              {game.lives > 5 ? (
                <span className="font-mono text-xs font-semibold">+{game.lives - 5}</span>
              ) : null}
            </div>
          )}

          {game.streak >= 3 ? (
            <span
              className={`${
                game.reducedMotion ? "" : "animate-pulse "
              }font-mono text-xs font-semibold text-accent`}
            >
              {game.streak}x
            </span>
          ) : null}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={game.phase !== "playing" || game.slowCharges <= 0}
              onClick={game.activateSlowTime}
              title="Activate Slow-Time (Tab or 1)"
              className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                game.slowTimeActive
                  ? "border-accent bg-accent/20 text-accent"
                  : game.slowCharges > 0
                    ? "cursor-pointer border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                    : "border-border bg-secondary/40 text-muted-foreground opacity-50"
              }`}
            >
              <Clock className="size-3" />
              <span>{game.slowTimeActive ? "SLOW" : `×${game.slowCharges}`}</span>
            </button>

            <span
              title="Shields auto-absorb a breach"
              className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                game.shieldCharges > 0
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border bg-secondary/40 text-muted-foreground opacity-50"
              }`}
            >
              <Shield className="size-3" />
              <span>×{game.shieldCharges}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden font-mono text-xs text-muted-foreground md:block">
            Hit: <span className="font-semibold text-foreground">{game.hitRate}%</span> · Acc:{" "}
            <span className="font-semibold text-foreground">{game.typingAccuracy}%</span>
          </div>

          <button
            type="button"
            onClick={() => game.setLocalMuteOverride(!game.soundMuted)}
            className="cursor-pointer rounded-lg border border-border bg-secondary p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={game.soundMuted ? "Unmute audio" : "Mute audio"}
          >
            {game.soundMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4 text-accent" />
            )}
          </button>

          {isPlayingOrPaused ? (
            <button
              type="button"
              onClick={game.togglePause}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-2.5"
            >
              {game.phase === "paused" ? (
                <>
                  <Play className="size-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="size-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>
          ) : null}

          {settings.practiceMode && isPlayingOrPaused ? (
            <button
              type="button"
              onClick={game.finishRun}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-accent/40 bg-accent/15 px-2 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
            >
              <Square className="size-3" />
              <span>End</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={game.start}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-2.5"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      <WordShooterField
        fieldRef={game.fieldRef}
        canvasRef={game.canvasRef}
        inputRef={game.inputRef}
        phase={game.phase}
        pauseReason={game.pauseReason}
        resumeCountdown={game.resumeCountdown}
        reducedMotion={game.reducedMotion}
        hasDangerEnemy={game.hasDangerEnemy}
        levelBanner={game.levelBanner}
        settings={settings}
        best={game.best}
        score={game.score}
        hits={game.hits}
        hitRate={game.hitRate}
        typingAccuracy={game.typingAccuracy}
        maxStreak={game.maxStreak}
        strayKeys={game.strayKeys}
        durationSec={game.durationSecDisplay}
        isNewRecord={game.isNewRecord}
        onStart={game.start}
        onResume={game.beginResume}
        onOpenSettings={onOpenSettings}
        onUpdateSettings={onUpdateSettings}
        onKey={game.handleKey}
      />

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="hidden sm:block">
          Type falling letters ·{" "}
          <kbd className="rounded border border-border bg-secondary px-1 font-mono">Tab/1</kbd>{" "}
          Slow-Time ·{" "}
          <kbd className="rounded border border-border bg-secondary px-1 font-mono">F2/Esc</kbd>{" "}
          Pause
        </p>
        <p className="font-mono text-[11px] sm:hidden">
          Hit: <strong className="text-foreground">{game.hitRate}%</strong> · Acc:{" "}
          <strong className="text-foreground">{game.typingAccuracy}%</strong>
        </p>
        <span className="font-mono text-[11px]">
          Target:{" "}
          {game.targetWord !== null ? (
            <span className="font-semibold text-primary">{game.targetWord}</span>
          ) : (
            "auto-locking"
          )}
        </span>
      </div>
    </section>
  );
}
