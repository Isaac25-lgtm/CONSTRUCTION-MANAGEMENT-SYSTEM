import { useParams } from 'react-router-dom'
import {
  PageHeader, DataTable, ActionButton, LoadingState, EmptyState,
} from '../../components/ui'
import {
  useRecycleBin,
  useRestoreRisk, useRestoreRFI, useRestoreChangeOrder,
  useRestorePunchItem, useRestoreDailyLog, useRestoreSafetyIncident, useRestoreQualityCheck,
  type RecycleBinItem,
} from '../../hooks/useFieldOps'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

export function RecycleBinPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: items, isLoading } = useRecycleBin(projectId)
  const { canEditProject } = useProjectPermissions(projectId)
  const { showToast } = useUIStore()

  // All restore mutations called unconditionally (hooks rule)
  const restoreRisk = useRestoreRisk(pid)
  const restoreRFI = useRestoreRFI(pid)
  const restoreCO = useRestoreChangeOrder(pid)
  const restorePunch = useRestorePunchItem(pid)
  const restoreDailyLog = useRestoreDailyLog(pid)
  const restoreSafety = useRestoreSafetyIncident(pid)
  const restoreQuality = useRestoreQualityCheck(pid)

  const restoreMutations: Record<string, typeof restoreRisk> = {
    risk: restoreRisk,
    rfi: restoreRFI,
    change_order: restoreCO,
    punch_item: restorePunch,
    daily_log: restoreDailyLog,
    safety_incident: restoreSafety,
    quality_check: restoreQuality,
  }

  if (isLoading) return <LoadingState rows={5} />

  const list = items || []

  const handleRestore = async (item: RecycleBinItem) => {
    const mutation = restoreMutations[item.type]
    if (!mutation) {
      showToast(`Cannot restore type: ${item.type}`, 'error')
      return
    }
    try {
      await mutation.mutateAsync(item.id)
      showToast(`${item.type_label} restored`, 'success')
    } catch {
      showToast('Restore failed', 'error')
    }
  }

  const columns = [
    { key: 'type', header: 'Type', render: (i: RecycleBinItem) => <span className="text-xs font-semibold text-bp-accent">{i.type_label}</span> },
    { key: 'title', header: 'Title', render: (i: RecycleBinItem) => <span className="text-bp-text">{i.title}</span> },
    { key: 'deleted_at', header: 'Deleted', render: (i: RecycleBinItem) => <span className="text-[10px] text-bp-muted">{i.deleted_at ? new Date(i.deleted_at).toLocaleDateString() : '-'}</span> },
    { key: 'deleted_by', header: 'By', render: (i: RecycleBinItem) => <span className="text-xs text-bp-muted">{i.deleted_by_name || '-'}</span> },
    ...(canEditProject ? [{
      key: 'restore', header: '', width: '80px',
      render: (i: RecycleBinItem) => (
        <ActionButton variant="green" size="sm" onClick={() => handleRestore(i)}>
          Restore
        </ActionButton>
      ),
    }] : []),
  ]

  return (
    <div>
      <PageHeader title="Recycle Bin" icon="🗑️" count={list.length} />
      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No deleted items" />
      ) : (
        <EmptyState icon="🗑️" title="Recycle bin is empty" description="Deleted field operation records will appear here for recovery." />
      )}
    </div>
  )
}
