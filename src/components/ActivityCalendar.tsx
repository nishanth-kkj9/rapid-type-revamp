import { useMemo, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import { getLocalDateString } from "@/lib/daily";
import {
  buildActivityCalendar,
  type ActivityDayCell,
  type ActivityMetric,
} from "@/lib/statsAnalytics";
import type { HistoryEntry } from "@/lib/typingStats";

interface ActivityCalendarProps {
  history: readonly HistoryEntry[];
  todayDate?: string | undefined;
}

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-secondary/80 border-border/60",
  1: "bg-primary/25 border-primary/35",
  2: "bg-primary/50 border-primary/55",
  3: "bg-primary/75 border-primary/80",
  4: "bg-primary border-primary",
};

const ROW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function ActivityCalendar({ history, todayDate }: ActivityCalendarProps) {
  const [metric, setMetric] = useState<ActivityMetric>("runs");
  const [showTextView, setShowTextView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const resolvedToday = todayDate ?? getLocalDateString();
  const calendar = useMemo(
    () => buildActivityCalendar(history, metric, resolvedToday, 26),
    [history, metric, resolvedToday],
  );

  const cellIndexByDate = useMemo(() => {
    const map = new Map<string, number>();
    calendar.flatDays.forEach((cell, idx) => {
      map.set(cell.date, idx);
    });
    return map;
  }, [calendar.flatDays]);

  const activeFocusDate =
    focusedDate && cellIndexByDate.has(focusedDate)
      ? focusedDate
      : (calendar.flatDays[calendar.flatDays.length - 1]?.date ?? null);

  const inspectedCell: ActivityDayCell | null = useMemo(() => {
    const target = selectedDate ?? focusedDate;
    if (!target) return null;
    const idx = cellIndexByDate.get(target);
    return idx !== undefined ? (calendar.flatDays[idx] ?? null) : null;
  }, [selectedDate, focusedDate, cellIndexByDate, calendar.flatDays]);

  const activeDaysDesc = useMemo(
    () => [...calendar.flatDays].filter((d) => d.runs > 0).reverse(),
    [calendar.flatDays],
  );

  const focusDateCell = (date: string | undefined) => {
    if (!date) return;
    setFocusedDate(date);
    cellRefs.current.get(date)?.focus();
  };

  const handleCellKeyDown = (cell: ActivityDayCell, e: React.KeyboardEvent<HTMLButtonElement>) => {
    const idx = cellIndexByDate.get(cell.date);
    if (idx === undefined) return;
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = Math.min(calendar.flatDays.length - 1, idx + 7);
    else if (e.key === "ArrowLeft") nextIdx = Math.max(0, idx - 7);
    else if (e.key === "ArrowDown") nextIdx = Math.min(calendar.flatDays.length - 1, idx + 1);
    else if (e.key === "ArrowUp") nextIdx = Math.max(0, idx - 1);
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = calendar.flatDays.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      focusDateCell(calendar.flatDays[nextIdx]?.date);
    }
  };

  return (
    <section aria-label="Practice activity calendar" className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">26-week activity calendar</h3>
          <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
            {calendar.totalRuns.toLocaleString()} {calendar.totalRuns === 1 ? "run" : "runs"} ·{" "}
            {calendar.totalMinutes} min · {calendar.activeDays} active{" "}
            {calendar.activeDays === 1 ? "day" : "days"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Activity calendar metric"
            className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5"
          >
            {(["runs", "minutes"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
                className={`min-h-8 cursor-pointer rounded-md px-2.5 py-1 text-[13px] font-medium capitalize whitespace-nowrap shrink-0 transition-colors ${
                  metric === m
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-pressed={showTextView}
            onClick={() => setShowTextView((v) => !v)}
            className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1 text-[13px] font-medium text-foreground whitespace-nowrap shrink-0 transition-colors hover:bg-muted"
          >
            <Table2 className="size-3.5 text-primary" aria-hidden="true" />
            {showTextView ? "Calendar grid" : "Text summary"}
          </button>
        </div>
      </div>

      {showTextView ? (
        <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-border bg-card">
          {activeDaysDesc.length === 0 ? (
            <p className="p-4 text-[13px] text-muted-foreground">
              No practice activity recorded in the last 26 weeks.
            </p>
          ) : (
            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">
                Active practice days over the last 26 weeks ({calendar.startDate} to{" "}
                {calendar.endDate})
              </caption>
              <thead className="sticky top-0 bg-secondary text-foreground">
                <tr>
                  <th scope="col" className="border-b border-border px-3 py-2">
                    Date
                  </th>
                  <th scope="col" className="border-b border-border px-3 py-2 text-right">
                    Runs
                  </th>
                  <th scope="col" className="border-b border-border px-3 py-2 text-right">
                    Minutes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 tabular-nums">
                {activeDaysDesc.map((day) => (
                  <tr key={day.date} className="hover:bg-secondary/30">
                    <th scope="row" className="px-3 py-1.5 font-semibold text-foreground">
                      {day.date}
                    </th>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">{day.runs}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">{day.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="inline-flex flex-col gap-1.5">
            <div className="flex items-end gap-1 pl-10 text-[13px] leading-none text-muted-foreground">
              {calendar.weeks.map((_, colIdx) => {
                const label = calendar.monthLabels.find((m) => m.col === colIdx)?.label ?? "";
                return (
                  <span key={colIdx} className="relative w-3.5 shrink-0 text-left">
                    {label ? <span className="whitespace-nowrap">{label}</span> : null}
                  </span>
                );
              })}
            </div>

            <div
              role="grid"
              aria-label="Practice activity calendar over the last 26 weeks"
              className="flex gap-1"
            >
              <div
                aria-hidden="true"
                className="mr-1 grid w-8 shrink-0 grid-rows-7 gap-1 text-[13px] leading-none text-muted-foreground"
              >
                {ROW_LABELS.map((label, idx) => (
                  <span key={idx} className="flex h-3.5 items-center">
                    {label}
                  </span>
                ))}
              </div>

              {calendar.weeks.map((week, colIdx) => (
                <div key={colIdx} role="row" className="grid grid-rows-7 gap-1">
                  {week.map((cell) => {
                    if (cell.isFuture) {
                      return (
                        <div
                          key={cell.date}
                          aria-hidden="true"
                          className="size-3.5 rounded-[3px] opacity-0"
                        />
                      );
                    }
                    const isSelected = selectedDate === cell.date;
                    const isTabTarget = activeFocusDate === cell.date;
                    const ariaText = `${cell.date}: ${cell.runs} ${
                      cell.runs === 1 ? "run" : "runs"
                    }, ${cell.minutes} minutes`;
                    return (
                      <button
                        key={cell.date}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cell.date, el);
                          else cellRefs.current.delete(cell.date);
                        }}
                        type="button"
                        role="gridcell"
                        tabIndex={isTabTarget ? 0 : -1}
                        aria-label={ariaText}
                        aria-pressed={isSelected}
                        data-calendar-date={cell.date}
                        onFocus={() => setFocusedDate(cell.date)}
                        onClick={() =>
                          setSelectedDate((curr) => (curr === cell.date ? null : cell.date))
                        }
                        onKeyDown={(e) => handleCellKeyDown(cell, e)}
                        className={`size-3.5 cursor-pointer rounded-[3px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card ${
                          LEVEL_CLASSES[cell.level]
                        } ${isSelected ? "ring-2 ring-foreground" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[13px]">
        <div role="status" aria-live="polite" className="tabular-nums text-muted-foreground">
          {inspectedCell ? (
            <span>
              <strong className="text-foreground">{inspectedCell.date}</strong> ·{" "}
              {inspectedCell.runs} {inspectedCell.runs === 1 ? "run" : "runs"} ·{" "}
              {inspectedCell.minutes} min active
            </span>
          ) : (
            <span>
              {calendar.startDate} to {calendar.endDate} · Use arrow keys or click a day to inspect
            </span>
          )}
        </div>

        <div
          aria-hidden="true"
          className="flex items-center gap-1 text-[13px] text-muted-foreground"
        >
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              className={`inline-block size-3 rounded-[2px] border ${LEVEL_CLASSES[lvl]}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
