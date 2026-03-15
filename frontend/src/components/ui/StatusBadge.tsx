interface StatusBadgeProps {
  text: string
  color?: string
  variant?: 'pill' | 'dot'
}

/** Status badge matching prototype badge2() function. */
export function StatusBadge({ text, color = '#3b82f6', variant = 'pill' }: StatusBadgeProps) {
  if (variant === 'dot') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: color }}
        />
        <span style={{ color }}>{text}</span>
      </span>
    )
  }

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: `${color}22`, color }}
    >
      {text}
    </span>
  )
}
