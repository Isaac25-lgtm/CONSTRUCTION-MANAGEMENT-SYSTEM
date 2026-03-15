/**
 * Field operations choice constants -- must match backend model choices exactly.
 *
 * Source of truth: backend/apps/risks/models.py, rfis/models.py,
 * changes/models.py, field_ops/models.py
 */

// --- Risks ---
export const RISK_LIKELIHOOD = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
] as const

export const RISK_IMPACT = RISK_LIKELIHOOD // same set

export const RISK_STATUS = [
  { value: 'open', label: 'Open' }, { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' }, { value: 'accepted', label: 'Accepted' },
] as const

export const RISK_CATEGORY = [
  { value: 'technical', label: 'Technical' }, { value: 'financial', label: 'Financial' },
  { value: 'schedule', label: 'Schedule' }, { value: 'safety', label: 'Safety' },
  { value: 'environmental', label: 'Environmental' }, { value: 'legal', label: 'Legal/Contractual' },
  { value: 'resource', label: 'Resource' }, { value: 'external', label: 'External' },
  { value: 'other', label: 'Other' },
] as const

// --- RFIs ---
export const RFI_STATUS = [
  { value: 'open', label: 'Open' }, { value: 'responded', label: 'Responded' },
  { value: 'closed', label: 'Closed' },
] as const

export const RFI_PRIORITY = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
] as const

// --- Change Orders ---
export const CO_STATUS = [
  { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  { value: 'implemented', label: 'Implemented' },
] as const

export const CO_CATEGORY = [
  { value: 'scope', label: 'Scope Change' }, { value: 'design', label: 'Design Change' },
  { value: 'site', label: 'Site Condition' }, { value: 'client', label: 'Client Request' },
  { value: 'regulatory', label: 'Regulatory' }, { value: 'other', label: 'Other' },
] as const

// --- Punch List ---
export const PUNCH_STATUS = [
  { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
] as const

export const PUNCH_PRIORITY = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
] as const

// --- Safety ---
export const SAFETY_TYPE = [
  { value: 'injury', label: 'Injury' }, { value: 'near_miss', label: 'Near Miss' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'environmental', label: 'Environmental' }, { value: 'fire', label: 'Fire' },
  { value: 'other', label: 'Other' },
] as const

export const SAFETY_SEVERITY = [
  { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderate' },
  { value: 'serious', label: 'Serious' }, { value: 'critical', label: 'Critical' },
] as const

export const SAFETY_STATUS = [
  { value: 'open', label: 'Open' }, { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
] as const

// --- Quality ---
export const QUALITY_RESULT = [
  { value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' },
  { value: 'conditional', label: 'Conditional' }, { value: 'pending', label: 'Pending' },
] as const

export const QUALITY_CATEGORY = [
  { value: 'concrete', label: 'Concrete Test' }, { value: 'steel', label: 'Steel Inspection' },
  { value: 'soil', label: 'Soil Test' }, { value: 'survey', label: 'Survey Check' },
  { value: 'visual', label: 'Visual Inspection' }, { value: 'dimensional', label: 'Dimensional Check' },
  { value: 'material', label: 'Material Test' }, { value: 'other', label: 'Other' },
] as const

// --- Shared color maps ---
export const riskScoreColor = (score: number) =>
  score >= 9 ? '#ef4444' : score >= 5 ? '#f97316' : '#22c55e'

export const statusColor = (status: string) => {
  const map: Record<string, string> = {
    open: '#f59e0b', mitigated: '#3b82f6', closed: '#22c55e', accepted: '#94a3b8',
    responded: '#3b82f6', draft: '#94a3b8', submitted: '#f59e0b', approved: '#22c55e',
    rejected: '#ef4444', implemented: '#22c55e',
    pending: '#f59e0b', in_progress: '#3b82f6', completed: '#22c55e',
    investigating: '#f97316', resolved: '#22c55e',
    pass: '#22c55e', fail: '#ef4444', conditional: '#f97316',
  }
  return map[status] || '#94a3b8'
}
