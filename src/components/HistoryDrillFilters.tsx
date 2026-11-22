export const TEST_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "15s", label: "15s" },
  { id: "30s", label: "30s" },
  { id: "60s", label: "60s" },
  { id: "120s", label: "120s" },
  { id: "10w", label: "10 words" },
  { id: "25w", label: "25 words" },
  { id: "50w", label: "50 words" },
  { id: "100w", label: "100 words" },
  { id: "quote", label: "Quote" },
  { id: "learn", label: "Learn" },
] as const;

export const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;
export const DATE_RANGES = [
  { id: "all", label: "All time", days: null },
  { id: "7d", label: "7d", days: 7 },
  { id: "30d", label: "30d", days: 30 },
  { id: "90d", label: "90d", days: 90 },
] as const;

export type TestTypeFilter = (typeof TEST_TYPE_FILTERS)[number]["id"];
export type DifficultyFilter = (typeof DIFFICULTIES)[number];
export type DateRangeFilter = (typeof DATE_RANGES)[number]["id"];

interface HistoryDrillFiltersProps {
  testType: TestTypeFilter;
  difficulty: DifficultyFilter;
  dateRange: DateRangeFilter;
  onTestTypeChange: (val: TestTypeFilter) => void;
  onDifficultyChange: (val: DifficultyFilter) => void;
  onDateRangeChange: (val: DateRangeFilter) => void;
}

export function HistoryDrillFilters({
  testType,
  difficulty,
  dateRange,
  onTestTypeChange,
  onDifficultyChange,
  onDateRangeChange,
}: HistoryDrillFiltersProps) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-border/50 pb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-medium text-muted-foreground">Type:</span>
        {TEST_TYPE_FILTERS.map((t) => {
          const active = testType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => onTestTypeChange(t.id)}
              className={`cursor-pointer rounded-md px-2 py-0.5 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] font-medium text-muted-foreground">Diff:</span>
          {DIFFICULTIES.map((diff) => {
            const active = difficulty === diff;
            return (
              <button
                key={diff}
                type="button"
                aria-pressed={active}
                onClick={() => onDifficultyChange(diff)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-[13px] font-medium capitalize transition-colors ${
                  active
                    ? "bg-foreground font-semibold text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {diff}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] font-medium text-muted-foreground">Range:</span>
          {DATE_RANGES.map((r) => {
            const active = dateRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={active}
                onClick={() => onDateRangeChange(r.id)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
