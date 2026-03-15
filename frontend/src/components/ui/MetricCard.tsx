interface MetricCardProps {
  icon: string
  value: string | number
  label: string
  color?: string
}

/** KPI card matching prototype kpiCard() function. */
export function MetricCard({ icon, value, label, color = '#3b82f6' }: MetricCardProps) {
  return (
    <div className="rounded-[10px] border border-bp-border bg-bp-bg2 p-3 text-center">
      <div className="mb-1 text-lg">{icon}</div>
      <div
        className="font-mono text-xl font-bold"
        style={{ color }}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-bp-muted">{label}</div>
    </div>
  )
}
