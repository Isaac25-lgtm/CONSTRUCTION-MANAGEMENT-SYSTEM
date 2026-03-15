import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}

/** Modal shell matching the prototype's dark overlay + surface panel. */
export function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl border border-bp-border bg-bp-bg2 p-6 shadow-2xl"
        style={{ width, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-bp-text">{title}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded border-none bg-transparent px-2 py-1 text-bp-muted transition-colors hover:text-bp-text"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
