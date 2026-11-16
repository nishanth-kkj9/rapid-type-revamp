import type { PersonalBestRow } from "@/lib/typingStats";

interface HistoryPersonalBestsTableProps {
  rows: PersonalBestRow[];
}

export function HistoryPersonalBestsTable({ rows }: HistoryPersonalBestsTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
      <div className="border-b border-border/60 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Personal Bests by Test Type
      </div>
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3.5 py-2">Test Type</th>
            <th className="px-3.5 py-2">Difficulty</th>
            <th className="px-3.5 py-2 text-right">Best WPM</th>
            <th className="px-3.5 py-2 text-right">Best Accuracy</th>
            <th className="px-3.5 py-2 text-right">Runs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono tabular-nums">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-secondary/30">
              <td className="px-3.5 py-2 font-semibold text-foreground">{row.modeLabel}</td>
              <td className="px-3.5 py-2 capitalize text-muted-foreground">{row.difficulty}</td>
              <td className="px-3.5 py-2 text-right font-bold text-primary">
                {row.bestWpm.toFixed(0)}
              </td>
              <td className="px-3.5 py-2 text-right text-foreground">
                {row.bestAccuracy.toFixed(1)}%
              </td>
              <td className="px-3.5 py-2 text-right text-muted-foreground">{row.runs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
