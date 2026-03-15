/**
 * Shared TypeScript types for BuildPro.
 *
 * Value/label pairs match backend model choices exactly.
 */

export const PROJECT_TYPES = [
  { value: 'residential', label: 'Residential House Construction' },
  { value: 'commercial', label: 'Commercial Building' },
  { value: 'road', label: 'Road Construction' },
  { value: 'bridge', label: 'Bridge Construction' },
  { value: 'water_treatment', label: 'Water Treatment Plant' },
  { value: 'dam', label: 'Dam Construction' },
  { value: 'school', label: 'School Building' },
  { value: 'hospital', label: 'Hospital Construction' },
  { value: 'custom', label: 'Custom Project' },
] as const

export const CONTRACT_TYPES = [
  { value: 'lump_sum', label: 'Lump Sum Contract' },
  { value: 'admeasure', label: 'Admeasure / Re-measurement Contract' },
  { value: 'cost_plus', label: 'Cost Plus Contract' },
  { value: 'design_build', label: 'Design & Build Contract' },
  { value: 'management', label: 'Management Contract' },
  { value: 'turnkey', label: 'Turnkey Contract' },
  { value: 'bot', label: 'BOT (Build-Operate-Transfer)' },
  { value: 'other', label: 'Other' },
] as const

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning', color: '#3b82f6' },
  { value: 'active', label: 'Active', color: '#f59e0b' },
  { value: 'on_hold', label: 'On Hold', color: '#f97316' },
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
] as const

export const PROJECT_ROLES = [
  { value: 'manager', label: 'Project Manager' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'qs', label: 'Quantity Surveyor' },
  { value: 'supervisor', label: 'Site Supervisor' },
  { value: 'viewer', label: 'Viewer' },
] as const

export interface PaginatedResponse<T> {
  next: string | null
  previous: string | null
  results: T[]
}
