interface StatItem {
  label: string
  value: string | number
  color?: string
}

interface StatStripProps {
  items: StatItem[]
}

/** Horizontal stat strip for summary rows -- matches prototype EVM/cost summary style. */
export function StatStrip({ items }: StatStripProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md px-3 py-2 text-center"
          style={{ background: '#1e293b' }}
        >
          <div className="text-[9px] text-bp-muted">{item.label}</div>
          <div
            className="font-mono text-xs font-bold"
            style={{ color: item.color || '#e2e8f0' }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
