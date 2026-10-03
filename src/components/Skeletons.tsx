export function ChartSkeleton() {
  return (
    <div className="panel flex h-48 flex-col justify-end gap-2 p-4" aria-hidden="true">
      <div className="flex h-full items-end gap-1.5">
        {[40, 65, 52, 80, 58, 90, 70, 62, 85, 75, 60, 88].map((h, i) => (
          <div key={i} className="skeleton w-full" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel space-y-3 p-4" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}
