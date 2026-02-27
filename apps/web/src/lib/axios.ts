import axios from 'axios'
import { handleSessionExpired } from './session'

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
const normalizedV1 = rawApiUrl.replace(/\/api\/v1$/i, '/api')
const API_URL = normalizedV1.endsWith('/api') ? normalizedV1 : `${normalizedV1}/api`

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  if (!match) return null
  return decodeURIComponent(match.slice(prefix.length))
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For httpOnly cookies
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const selectedOrgId = localStorage.getItem('selected_org_id')
  if (selectedOrgId) {
    config.headers['X-Organization-ID'] = selectedOrgId
  }

  const csrfToken = getCookieValue('csrf_token')
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized without a hard page navigation.
      handleSessionExpired()
    }
    return Promise.reject(error)
  }
)

export default api
