import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  accent: { bg: '#f59e0b', color: '#0f172a' },
  blue: { bg: '#3b82f6', color: '#ffffff' },
  green: { bg: '#22c55e', color: '#ffffff' },
  red: { bg: '#ef4444', color: '#ffffff' },
  orange: { bg: '#f97316', color: '#ffffff' },
  ghost: { bg: 'transparent', color: '#94a3b8' },
} as const

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: 'sm' | 'md'
  children: ReactNode
}

/** Action button matching prototype sB() function. */
export function ActionButton({
  variant = 'accent',
  size = 'md',
  children,
  className = '',
  ...props
}: ActionButtonProps) {
  const v = variants[variant]
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-4 py-2 text-[13px]'

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md border-none font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${className}`}
      style={{ background: v.bg, color: v.color }}
      {...props}
    >
      {children}
    </button>
  )
}
