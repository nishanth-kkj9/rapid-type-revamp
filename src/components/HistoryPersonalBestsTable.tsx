import type { PersonalBestRow } from "@/lib/typingStats";

interface HistoryPersonalBestsTableProps {
  rows: PersonalBestRow[];
}

export function HistoryPersonalBestsTable({ rows }: HistoryPersonalBestsTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
      <div className="border-b border-border/60 px-3.5 py-2 text-sm font-medium text-muted-foreground">
        Personal bests by test type
      </div>
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border/50 text-[13px] text-muted-foreground">
          <tr>
            <th className="px-3.5 py-2">Test Type</th>
            <th className="px-3.5 py-2">Difficulty</th>
            <th className="px-3.5 py-2 text-right">Best WPM</th>
            <th className="px-3.5 py-2 text-right">Best Accuracy</th>
            <th className="px-3.5 py-2 text-right">Runs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-secondary/30">
              <td className="px-3.5 py-2 font-semibold text-foreground">{row.modeLabel}</td>
              <td className="px-3.5 py-2 capitalize text-muted-foreground">{row.difficulty}</td>
              <td className="px-3.5 py-2 text-right font-mono font-bold tabular-nums text-primary">
                {row.bestWpm.toFixed(0)}
              </td>
              <td className="px-3.5 py-2 text-right font-mono tabular-nums text-foreground">
                {row.bestAccuracy.toFixed(1)}%
              </td>
              <td className="px-3.5 py-2 text-right font-mono tabular-nums text-muted-foreground">
                {row.runs}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
