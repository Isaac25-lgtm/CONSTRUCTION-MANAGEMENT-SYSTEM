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
        background: active ? 'rgba(245,158,11,0.13)' : '#1e293b',
        borderColor: active ? '#f59e0b' : '#334155',
        color: active ? '#f59e0b' : '#e2e8f0',
      }}
    >
      {count !== undefined && (
        <div className="text-sm font-bold">{count}</div>
      )}
      <div className="text-[9px]">{label}</div>
    </button>
  )
}
