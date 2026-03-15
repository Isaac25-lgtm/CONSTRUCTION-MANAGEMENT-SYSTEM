/**
 * Hook to check project-level permissions for the current user.
 *
 * Uses the user_permissions array returned by the project detail endpoint.
 * The backend is the source of truth -- this hook just adapts UI visibility.
 */
import { useProject } from './useProjects'
import { useAuth } from './useAuth'

export function useProjectPermissions(projectId: string | undefined) {
  const { user } = useAuth()
  const { data: project } = useProject(projectId)

  const hasProjectPerm = (perm: string): boolean => {
    if (!user || !project) return false
    if (user.is_admin) return true
    return project.user_permissions.includes(perm)
  }

  return {
    project,
    userRole: project?.user_role ?? null,
    hasProjectPerm,
    canEditProject: hasProjectPerm('project.edit'),
    canManageMembers: hasProjectPerm('project.manage_members'),
    canEditSchedule: hasProjectPerm('schedule.edit'),
    canEditBudget: hasProjectPerm('budget.edit'),
    canEditFieldOps: hasProjectPerm('field_ops.edit'),
    canEditRisks: hasProjectPerm('risks.edit'),
    canEditRFIs: hasProjectPerm('rfis.edit'),
    canEditChanges: hasProjectPerm('changes.edit'),
    canEditProcurement: hasProjectPerm('procurement.edit'),
    canEditLabour: hasProjectPerm('labour.edit'),
    canEditComms: hasProjectPerm('comms.edit'),
    canSendChat: hasProjectPerm('comms.send'),
    canViewDocuments: hasProjectPerm('documents.view'),
    canUploadDocuments: hasProjectPerm('documents.upload'),
    canDeleteDocuments: hasProjectPerm('documents.delete'),
    canUploadDocs: hasProjectPerm('documents.upload'),
    canExportReports: hasProjectPerm('reports.export'),
    canUseAI: hasProjectPerm('ai.use'),
    canViewAIHistory: hasProjectPerm('ai.history'),
  }
}
