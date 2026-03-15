import type { ReactNode } from 'react'

interface PanelLayoutProps {
  sidebar: ReactNode
  sidebarWidth?: number
  children: ReactNode
}

/** Two-column panel layout for hub-style pages (Communications, Documents, etc.). */
export function PanelLayout({ sidebar, sidebarWidth = 260, children }: PanelLayoutProps) {
  return (
    <div className="flex gap-4 rounded-[10px] border border-bp-border bg-bp-bg2 overflow-hidden" style={{ minHeight: 500 }}>
      <div
        className="flex-shrink-0 overflow-y-auto border-r border-bp-border"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
