import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1 text-[13px] font-medium text-foreground"
    >
      <WifiOff className="size-3.5 text-primary" aria-hidden="true" />
      <span>Offline mode — data saved locally</span>
    </div>
  );
}
