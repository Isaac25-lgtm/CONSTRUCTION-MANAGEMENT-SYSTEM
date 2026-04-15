export type ThemeMode = 'dark' | 'light'

export const DEFAULT_THEME: ThemeMode = 'dark'
export const THEME_STORAGE_KEY = 'buildpro-theme'

export function resolveThemeMode(value: string | null | undefined): ThemeMode {
  return value === 'light' ? 'light' : 'dark'
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  return resolveThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function persistTheme(theme: ThemeMode) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }

  applyTheme(theme)
}

export function initializeTheme(): ThemeMode {
  const theme = getStoredTheme()
  applyTheme(theme)
  return theme
}
