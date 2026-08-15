import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  /** Cumulative correct-character counts sampled once per second. */
  samples: number[];
}

export function WpmChart({ samples }: Props) {
  if (samples.length < 2) return null;

  const data = samples.map((value, i) => {
    const delta = i === 0 ? value : value - (samples[i - 1] ?? 0);
    return { second: i + 1, wpm: Math.max(0, Math.round((delta / 5) * 60)) };
  });

  return (
    <div className="h-24 w-full max-w-md">
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
            formatter={(v: number) => [`${v} wpm`, "speed"]}
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
