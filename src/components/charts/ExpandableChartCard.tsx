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
        className="group flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{title}</span>
              {badge ? (
                <span className={`rounded px-1.5 py-0.5 text-[13px] font-semibold ${badgeClass}`}>
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[13px] text-muted-foreground">
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

      <div
        id={regionId}
        role="region"
        aria-hidden={!isExpanded}
        inert={!isExpanded ? true : undefined}
        className={`chart-expand-transition grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 border-t border-border/60 pt-3">
            {statsGrid ? statsGrid(isExpanded) : null}

            <div
              className={`chart-expand-transition mt-3 overflow-hidden rounded-xl border border-border/80 bg-background/60 transition-[height,opacity,border-color] duration-300 ease-out ${
                isEmpty
                  ? isExpanded
                    ? "flex h-52 items-center justify-center p-2 opacity-100 sm:h-64 sm:p-4"
                    : "flex h-0 items-center justify-center border-transparent p-0 opacity-0"
                  : isExpanded
                    ? "h-[340px] p-2 opacity-100 sm:h-[440px] sm:p-4 md:h-[500px]"
                    : "h-0 border-transparent p-0 opacity-0"
              }`}
            >
              {isEmpty && emptyState ? emptyState : children(isExpanded)}
            </div>

            {footer ? footer(isExpanded) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
