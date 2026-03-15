import type { ReactNode } from 'react'

interface SectionCardProps {
  children: ReactNode
  className?: string
  accentLeft?: string
  padding?: 'normal' | 'compact' | 'none'
}

/** Card panel matching prototype sC style: bg2 background, border, rounded. */
export function SectionCard({
  children,
  className = '',
  accentLeft,
  padding = 'normal',
}: SectionCardProps) {
  const pad = padding === 'compact' ? 'p-3' : padding === 'none' ? '' : 'p-4'
  return (
    <div
      className={`rounded-[10px] border border-bp-border bg-bp-bg2 ${pad} ${className}`}
      style={accentLeft ? { borderLeft: `4px solid ${accentLeft}` } : undefined}
    >
      {children}
    </div>
  )
}
