import type { ReactNode } from 'react'

interface FilterBarProps {
  children: ReactNode
}

/** Horizontal filter/action bar for page controls. */
export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {children}
    </div>
  )
}

interface FilterChipProps {
  label: string
  active?: boolean
  count?: number
  onClick: () => void
}

export function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-center transition-colors"
      style={{
        background: active ? 'var(--bp-accent-soft)' : 'var(--bp-surface)',
        borderColor: active ? 'var(--bp-accent)' : 'var(--bp-border)',
        color: active ? 'var(--bp-accent)' : 'var(--bp-text)',
      }}
    >
      {count !== undefined && (
        <div className="text-sm font-bold">{count}</div>
      )}
      <div className="text-[9px]">{label}</div>
    </button>
  )
}
