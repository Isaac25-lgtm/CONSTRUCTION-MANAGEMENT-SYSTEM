/**
 * API client for BuildPro backend.
 *
 * Uses Axios with session-based auth (cookies) and CSRF protection.
 * On first load, calls /api/v1/auth/csrf/ to seed the csrftoken cookie.
 * All mutating requests (POST/PUT/PATCH/DELETE) include X-CSRFToken header.
 */
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Include CSRF token from cookie on mutating requests
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
    const csrfToken = getCookie('csrftoken')
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken
    }
  }
  return config
})

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null
  return null
}

/**
 * Bootstrap CSRF cookie from the backend.
 *
 * Called once on app init (in main.tsx) so the csrftoken cookie
 * is available before any POST/PUT/PATCH/DELETE request.
 */
export async function bootstrapCsrf(): Promise<void> {
  try {
    await api.get('/auth/csrf/')
  } catch {
    // Backend may not be running yet -- safe to ignore during dev
  }
}
