import { useCallback, useEffect, useRef, useState } from "react";
import {
  playBreachSound,
  playExplosionSound,
  playGameOverSound,
  playLaserSound,
} from "@/lib/arcadeAudio";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useShooterFeedback(soundEnabled: boolean) {
  const [reducedMotion, setReducedMotion] = useState<boolean>(getPrefersReducedMotion);
  const [localMuteOverride, setLocalMuteOverride] = useState<boolean | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const soundMuted = localMuteOverride ?? !soundEnabled;
  const soundMutedRef = useRef(soundMuted);
  soundMutedRef.current = soundMuted;

  useEffect(() => {
    setLocalMuteOverride(null);
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const announce = useCallback((message: string) => setLiveAnnouncement(message), []);
  const playLaser = useCallback(() => playLaserSound(soundMutedRef.current), []);
  const playExplosion = useCallback(() => playExplosionSound(soundMutedRef.current), []);
  const playBreach = useCallback(() => playBreachSound(soundMutedRef.current), []);
  const playGameOver = useCallback(() => playGameOverSound(soundMutedRef.current), []);

  return {
    reducedMotion,
    soundMuted,
    setLocalMuteOverride,
    liveAnnouncement,
    announce,
    playLaser,
    playExplosion,
    playBreach,
    playGameOver,
  };
}
