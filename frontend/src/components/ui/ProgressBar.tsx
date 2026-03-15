interface ProgressBarProps {
  value: number
  height?: number
  showLabel?: boolean
}

/** Progress bar matching prototype style: bg3 track, colored fill. */
export function ProgressBar({ value, height = 6, showLabel = false }: ProgressBarProps) {
  const color = value >= 70 ? '#22c55e' : value >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 overflow-hidden rounded"
        style={{ background: '#1e293b', height }}
      >
        <div
          className="h-full rounded transition-all"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
      )}
    </div>
  )
}
