import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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
  subtitle = "Click to expand chart downward",
  expandedSubtitle = "Expanded Analytics & Velocity Graph",
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
  const regionId = useId();

  const badgeClass =
    accent === "accent" ? "bg-accent/20 text-accent" : "bg-primary/15 text-primary";

  const hoverBorderClass =
    accent === "accent" ? "hover:border-accent/40" : "hover:border-primary/40";

  const toggle = () => setIsExpanded((prev) => !prev);

  return (
    <div className={`panel p-3 text-sm transition-colors ${hoverBorderClass} ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        aria-controls={regionId}
        className="group flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border-b border-border/60 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
              {isExpanded ? expandedSubtitle : subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {headerRight}
          <span
            className={`flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-colors group-hover:bg-secondary group-hover:text-foreground ${
              isExpanded
                ? accent === "accent"
                  ? "border-accent/40 text-accent"
                  : "border-primary/40 text-primary"
                : ""
            }`}
          >
            <span className="sr-only">{isExpanded ? collapseAriaLabel : expandAriaLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className={`chart-expand-transition size-4 transition-transform duration-300 ease-out ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </span>
        </div>
      </button>

      {statsGrid ? statsGrid(isExpanded) : null}

      <div
        id={regionId}
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        className={`chart-expand-transition mt-3 overflow-hidden rounded-xl border border-border/80 bg-background/60 p-2 transition-[height,border-color] duration-300 ease-out sm:p-4 ${
          isEmpty
            ? isExpanded
              ? "flex h-52 items-center justify-center sm:h-64"
              : "flex h-32 cursor-pointer items-center justify-center hover:border-primary/40"
            : isExpanded
              ? "h-[340px] sm:h-[440px] md:h-[500px]"
              : `h-44 cursor-pointer sm:h-52 ${accent === "accent" ? "hover:border-accent/50" : "hover:border-primary/50"}`
        }`}
      >
        {isEmpty && emptyState ? emptyState : children(isExpanded)}
      </div>

      {footer ? footer(isExpanded) : null}
    </div>
  );
}
