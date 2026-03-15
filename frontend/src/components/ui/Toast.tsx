import { useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'

const colors = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
  warning: '#f97316',
}

/** Toast notification matching prototype show() function. */
export function Toast() {
  const { toast, clearToast } = useUIStore()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 2500)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  const color = colors[toast.type]

  return (
    <div
      className="fixed bottom-6 right-6 z-[300] rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg"
      style={{
        background: '#111827',
        borderColor: color,
        color,
      }}
    >
      {toast.message}
    </div>
  )
}
