import { useCallback, useEffect, useState, type RefObject } from "react";
import type { ShooterSettings } from "@/lib/shooterSettings";
import type { PauseReason, ShooterPhase } from "@/hooks/useWordShooterGame";
import { WordShooterOverlays } from "@/components/WordShooterOverlays";

interface WordShooterFieldProps {
  fieldRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  phase: ShooterPhase;
  pauseReason: PauseReason;
  resumeCountdown: number | null;
  reducedMotion: boolean;
  hasDangerEnemy: boolean;
  levelBanner: number | null;
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
  onKey: (char: string) => void;
}

export function WordShooterField({
  fieldRef,
  canvasRef,
  inputRef,
  phase,
  pauseReason,
  resumeCountdown,
  reducedMotion,
  hasDangerEnemy,
  levelBanner,
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
  onKey,
}: WordShooterFieldProps) {
  const [inputFocused, setInputFocused] = useState(false);
  const [viewportMaxHeight, setViewportMaxHeight] = useState<number | null>(null);

  const syncViewportFit = useCallback(() => {
    if (typeof window === "undefined") return;
    const fieldEl = fieldRef.current;
    const vv = window.visualViewport;
    if (!fieldEl || !vv) {
      setViewportMaxHeight((prev) => (prev === null ? prev : null));
      return;
    }

    const keyboardLikelyOpen = vv.height < window.innerHeight * 0.85;
    if (keyboardLikelyOpen && (phase === "playing" || phase === "resuming" || inputFocused)) {
      const nextHeight = Math.max(180, Math.min(440, Math.floor(vv.height - 96)));
      setViewportMaxHeight((prev) => (prev === nextHeight ? prev : nextHeight));
      if (typeof fieldEl.scrollIntoView === "function") {
        fieldEl.scrollIntoView({ block: "nearest" });
      }
    } else {
      setViewportMaxHeight((prev) => (prev === null ? prev : null));
    }
  }, [fieldRef, inputFocused, phase]);

  useEffect(() => {
    syncViewportFit();
    if (typeof window === "undefined") return undefined;
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewportFit);
    vv?.addEventListener("scroll", syncViewportFit);
    window.addEventListener("resize", syncViewportFit);
    return () => {
      vv?.removeEventListener("resize", syncViewportFit);
      vv?.removeEventListener("scroll", syncViewportFit);
      window.removeEventListener("resize", syncViewportFit);
    };
  }, [syncViewportFit]);

  const focusInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (typeof fieldRef.current?.scrollIntoView === "function") {
      fieldRef.current.scrollIntoView({ block: "nearest" });
    }
    syncViewportFit();
  };

  return (
    <div
      ref={fieldRef}
      role="region"
      aria-label="Word shooter game field"
      onClick={() => {
        if (phase === "playing" || phase === "resuming") focusInput();
      }}
      style={viewportMaxHeight !== null ? { height: `${viewportMaxHeight}px` } : undefined}
      className={`relative h-[clamp(220px,38dvh,320px)] w-full touch-manipulation overflow-hidden rounded-2xl border transition-colors sm:h-[440px] ${
        hasDangerEnemy
          ? "border-destructive/60 bg-card shadow-[0_0_20px_rgba(239,68,68,0.15)]"
          : "border-border bg-card/80"
      }`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {levelBanner !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded border border-primary/60 bg-card px-6 py-3">
          <span className="font-mono text-xl font-extrabold uppercase tracking-widest text-primary sm:text-2xl">
            LEVEL {levelBanner}
          </span>
        </div>
      )}

      {phase === "playing" && !inputFocused ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            focusInput();
          }}
          className="absolute bottom-2 left-1/2 z-20 min-h-9 -translate-x-1/2 cursor-pointer rounded-full border border-border bg-card/95 px-3.5 py-1.5 font-mono text-xs font-medium text-foreground shadow-sm hover:bg-secondary"
        >
          Tap field to focus keyboard
        </button>
      ) : null}

      <WordShooterOverlays
        phase={phase}
        pauseReason={pauseReason}
        resumeCountdown={resumeCountdown}
        reducedMotion={reducedMotion}
        settings={settings}
        best={best}
        score={score}
        hits={hits}
        hitRate={hitRate}
        typingAccuracy={typingAccuracy}
        maxStreak={maxStreak}
        strayKeys={strayKeys}
        durationSec={durationSec}
        isNewRecord={isNewRecord}
        onStart={onStart}
        onResume={onResume}
        onOpenSettings={onOpenSettings}
        onUpdateSettings={onUpdateSettings}
      />

      <input
        ref={inputRef}
        type="text"
        name="word_shooter_input"
        id="word_shooter_input"
        inputMode="text"
        enterKeyHint="done"
        data-form-type="other"
        data-lpignore="true"
        data-protonpass-ignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        value=""
        aria-label="Word shooter input"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        onFocus={() => {
          setInputFocused(true);
          if (typeof fieldRef.current?.scrollIntoView === "function") {
            fieldRef.current.scrollIntoView({ block: "nearest" });
          }
          syncViewportFit();
        }}
        onBlur={() => setInputFocused(false)}
        onChange={(e) => {
          const v = e.target.value;
          for (const ch of v) {
            if (/^[a-z'-]$/i.test(ch)) {
              onKey(ch.toLowerCase());
            }
          }
          e.target.value = "";
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-text text-base opacity-0"
      />
    </div>
  );
}
