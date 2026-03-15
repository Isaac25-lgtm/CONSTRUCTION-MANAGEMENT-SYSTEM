import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  count?: number
  icon?: string
  children?: ReactNode
}

export function PageHeader({ title, count, icon, children }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h2 className="m-0 text-lg font-bold text-bp-text">
          {title}
          {count !== undefined && (
            <span className="ml-1 text-bp-muted font-normal">({count})</span>
          )}
        </h2>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
