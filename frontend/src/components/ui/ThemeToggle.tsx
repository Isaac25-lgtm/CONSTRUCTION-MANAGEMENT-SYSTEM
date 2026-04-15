import { useUIStore } from '../../stores/uiStore'

interface ThemeToggleProps {
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useUIStore()
  const textSize = compact ? 'text-[11px]' : 'text-xs'
  const padding = compact ? 'px-3 py-1' : 'px-3.5 py-1.5'

  return (
    <div className="inline-flex items-center rounded-full border border-bp-border bg-bp-surface p-1 shadow-[var(--bp-shadow-toggle)]">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`rounded-full ${padding} ${textSize} font-semibold transition-colors ${
          theme === 'light'
            ? 'bg-bp-accent text-[var(--bp-accent-contrast)]'
            : 'text-bp-muted hover:text-bp-text'
        }`}
        aria-pressed={theme === 'light'}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`rounded-full ${padding} ${textSize} font-semibold transition-colors ${
          theme === 'dark'
            ? 'bg-bp-accent text-[var(--bp-accent-contrast)]'
            : 'text-bp-muted hover:text-bp-text'
        }`}
        aria-pressed={theme === 'dark'}
      >
        Dark
      </button>
    </div>
  )
}
