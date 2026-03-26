import { useState, type ReactNode } from 'react'
import { getSectionInfo } from '../../lib/sectionInfo'

interface PageHeaderProps {
  title: string
  count?: number
  icon?: string
  children?: ReactNode
  infoText?: string
}

export function PageHeader({ title, count, icon, children, infoText }: PageHeaderProps) {
  const [showInfo, setShowInfo] = useState(false)
  const resolvedInfo = infoText ?? getSectionInfo(title)

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h2 className="m-0 text-lg font-bold text-bp-text">
            {title}
            {count !== undefined && (
              <span className="ml-1 text-bp-muted font-normal">({count})</span>
            )}
          </h2>
          {resolvedInfo && (
            <button
              type="button"
              aria-label={`About ${title}`}
              aria-expanded={showInfo}
              onClick={() => setShowInfo((current) => !current)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#3b82f666] bg-[#3b82f622] text-xs font-bold text-[#3b82f6] transition-colors hover:bg-[#3b82f633]"
            >
              i
            </button>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>

      {resolvedInfo && showInfo && (
        <div className="mt-3 rounded-lg border border-[#f59e0b55] bg-[#f59e0b14] px-4 py-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f59e0b]">
            Section Info
          </div>
          <div className="text-sm leading-relaxed text-bp-text">{resolvedInfo}</div>
        </div>
      )}
    </div>
  )
}
