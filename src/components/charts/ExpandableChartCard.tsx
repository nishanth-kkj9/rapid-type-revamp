import { useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface ExpandableChartCardProps {
  title: string;
  subtitle?: string;
  expandedSubtitle?: string;
  badge?: string;
  headerRight?: ReactNode;
  icon?: ReactNode;
  accent?: "primary" | "accent";
  statsGrid?: (isExpanded: boolean) => ReactNode;
  children: (isExpanded: boolean) => ReactNode;
  footer?: (isExpanded: boolean) => ReactNode;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  expandAriaLabel?: string;
  collapseAriaLabel?: string;
}

export function ExpandableChartCard({
  title,
  subtitle = "Click anywhere on chart to expand full dimensions",
  expandedSubtitle = "Full Analytics & Real-Time Velocity Graph",
  badge,
  headerRight,
  icon,
  accent = "primary",
  statsGrid,
  children,
  footer,
  isEmpty = false,
  emptyState,
  className = "",
  defaultOpen = false,
  expandAriaLabel = "Expand progress chart",
  collapseAriaLabel = "Collapse progress chart",
}: ExpandableChartCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  const badgeClass =
    accent === "accent" ? "bg-accent/20 text-accent" : "bg-primary/15 text-primary";

  const hoverBorderClass =
    accent === "accent" ? "hover:border-accent/40" : "hover:border-primary/40";

  const renderCardBody = (expanded: boolean) => (
    <>
      <div
        className={`flex select-none items-center justify-between gap-2 border-b border-border/60 pb-3 ${
          expanded ? "pr-8" : ""
        }`}
      >
        <div
          onClick={(e) => {
            if (isEmpty) return;
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className={`flex flex-1 items-center gap-2.5 truncate ${isEmpty ? "" : "cursor-pointer"}`}
        >
          {icon}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                {title}
              </span>
              {badge ? (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${badgeClass}`}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {expanded ? expandedSubtitle : subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {headerRight}
          {!isEmpty ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              aria-label={expanded ? collapseAriaLabel : expandAriaLabel}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              {expanded ? (
                <Minimize2
                  className={`size-4 ${accent === "accent" ? "text-accent" : "text-primary"}`}
                />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {statsGrid ? statsGrid(expanded) : null}

      <div
        onClick={() => {
          if (!expanded && !isEmpty) setIsExpanded(true);
        }}
        className={`mt-3 rounded-xl border border-border/80 bg-background/60 p-2 transition-all sm:p-4 ${
          expanded
            ? "h-[340px] sm:h-[440px] md:h-[500px]"
            : isEmpty
              ? "flex h-32 items-center justify-center"
              : "h-44 cursor-pointer hover:border-primary/50 sm:h-52"
        }`}
      >
        {isEmpty && emptyState ? emptyState : children(expanded)}
      </div>

      {footer ? footer(expanded) : null}
    </>
  );

  return (
    <>
      <div
        onClick={(e) => {
          if (isEmpty) return;
          const target = e.target as HTMLElement;
          if (target.closest("button") || target.closest("a")) return;
          setIsExpanded(true);
        }}
        className={`panel p-3 text-sm transition-colors ${
          isEmpty ? "" : `cursor-pointer ${hoverBorderClass}`
        } ${className}`}
      >
        {renderCardBody(false)}
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent
          className={`flex max-h-[90vh] w-[95vw] max-w-5xl flex-col justify-between overflow-y-auto rounded-2xl border bg-card/98 p-4 shadow-2xl backdrop-blur-xl sm:p-6 md:p-8 ${
            accent === "accent"
              ? "border-accent/50 ring-1 ring-accent/20"
              : "border-primary/50 ring-1 ring-primary/20"
          }`}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{expandedSubtitle}</DialogDescription>
          {renderCardBody(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
