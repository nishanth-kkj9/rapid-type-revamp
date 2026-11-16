import { CheckCircle2, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  compact?: boolean;
  className?: string;
}

export function PWAInstallButton({ compact = false, className = "" }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled) {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
        <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
        App installed for offline use
      </span>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/25 ${className}`}
    >
      <Download className="size-3.5 text-primary" aria-hidden="true" />
      <span>{compact ? "Install" : "Install App (Offline PWA)"}</span>
    </button>
  );
}
