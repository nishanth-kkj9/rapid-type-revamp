import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <p role="status" aria-live="polite" className="mt-1 text-[13px] text-muted-foreground">
      Offline mode — data saved locally
    </p>
  );
}
