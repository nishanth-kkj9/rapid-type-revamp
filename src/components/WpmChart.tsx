import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  /** Cumulative correct-character counts sampled once per second. */
  samples: number[];
  ghost?: number[] | undefined;
}

export function WpmChart({ samples, ghost }: Props) {
  if (samples.length < 2) return null;

  const hasGhost = Boolean(ghost && ghost.length >= 2);
  const len = hasGhost ? Math.min(samples.length, ghost!.length) : samples.length;

  const data = Array.from({ length: len }, (_, i) => {
    const curVal = samples[i] ?? 0;
    const curPrev = i === 0 ? 0 : (samples[i - 1] ?? 0);
    const delta = curVal - curPrev;
    const wpm = Math.max(0, Math.round((delta / 5) * 60));

    let ghostWpm: number | undefined;
    if (hasGhost) {
      const gVal = ghost![i] ?? 0;
      const gPrev = i === 0 ? 0 : (ghost![i - 1] ?? 0);
      const gDelta = gVal - gPrev;
      ghostWpm = Math.max(0, Math.round((gDelta / 5) * 60));
    }

    return {
      second: i + 1,
      wpm,
      ...(ghostWpm !== undefined ? { ghostWpm } : {}),
    };
  });

  return (
    <div className="w-full max-w-md">
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="second"
              tick={{ fontSize: 10 }}
              stroke="var(--color-muted-foreground)"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={28}
              tick={{ fontSize: 10 }}
              stroke="var(--color-muted-foreground)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => [
                `${v} wpm`,
                name === "ghostWpm" ? "Personal best" : "Current",
              ]}
              labelFormatter={(l) => `${l}s`}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {hasGhost && (
              <Line
                type="monotone"
                dataKey="ghostWpm"
                stroke="var(--color-muted-foreground)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {hasGhost && (
        <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-primary" /> Current
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 border-b-2 border-dashed border-muted-foreground" />{" "}
            Personal best
          </span>
        </div>
      )}
    </div>
  );
}
