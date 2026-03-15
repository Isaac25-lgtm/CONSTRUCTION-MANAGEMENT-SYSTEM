interface CostCardProps {
  label: string
  value: string
  color?: string
}

/** Cost summary card matching prototype costCard() function. */
export function CostCard({ label, value, color = '#3b82f6' }: CostCardProps) {
  return (
    <div className="rounded-[10px] border border-bp-border bg-bp-bg2 p-3">
      <div className="mb-1 text-[11px] text-bp-muted">{label}</div>
      <div
        className="font-mono text-sm font-bold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}
