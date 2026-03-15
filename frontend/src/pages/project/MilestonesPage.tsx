import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { PageHeader, DataTable, StatusBadge, LoadingState, EmptyState, ActionButton, Modal, SectionCard } from '../../components/ui'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useBaselines, useCreateBaseline, type MilestoneData, type BaselineData } from '../../hooks/useSchedule'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

const msColors: Record<string, string> = {
  pending: '#f59e0b', achieved: '#22c55e', missed: '#ef4444',
}

export function MilestonesPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: milestones, isLoading } = useMilestones(projectId)
  const { data: baselines } = useBaselines(projectId)
  const { canEditSchedule } = useProjectPermissions(projectId)
  const [showAdd, setShowAdd] = useState(false)
  const createBaseline = useCreateBaseline(pid)
  const deleteMilestone = useDeleteMilestone(pid)
  const updateMilestone = useUpdateMilestone(pid)
  const { showToast } = useUIStore()

  if (isLoading) return <LoadingState rows={4} />

  const list = milestones || []

  const columns = [
    { key: 'idx', header: '#', width: '40px', render: (_: MilestoneData, i: number) => <span className="text-xs text-bp-muted">{i + 1}</span> },
    { key: 'icon', header: '', width: '30px', render: (m: MilestoneData) => <span>{m.status === 'achieved' ? '✅' : '🏁'}</span> },
    { key: 'name', header: 'Milestone', render: (m: MilestoneData) => <span className="font-medium text-bp-text">{m.name}</span> },
    { key: 'task', header: 'Linked Task', render: (m: MilestoneData) => <span className="font-mono text-xs text-bp-muted">{m.linked_task_code || '-'}</span> },
    { key: 'target', header: 'Target Date', render: (m: MilestoneData) => <span className="text-xs text-bp-muted">{m.target_date || '-'}</span> },
    { key: 'status', header: 'Status', render: (m: MilestoneData) => {
      if (!canEditSchedule) return <StatusBadge text={m.status_display} color={msColors[m.status] || '#94a3b8'} />
      return (
        <select
          value={m.status}
          onChange={(e) => updateMilestone.mutate({ id: m.id, data: { status: e.target.value } })}
          className="!w-auto !py-0.5 !px-1 !text-[11px]"
        >
          <option value="pending">Pending</option>
          <option value="achieved">Achieved</option>
          <option value="missed">Missed</option>
        </select>
      )
    }},
    ...(canEditSchedule ? [{
      key: 'actions', header: '', width: '40px',
      render: (m: MilestoneData) => (
        <button
          onClick={() => { if (confirm(`Delete milestone "${m.name}"?`)) deleteMilestone.mutate(m.id) }}
          className="cursor-pointer border-none bg-transparent text-bp-danger text-sm"
        >✕</button>
      ),
    }] : []),
  ]

  return (
    <div>
      <PageHeader title="Milestones" icon="🏁" count={list.length}>
        {canEditSchedule && (
          <>
            <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ Add Milestone</ActionButton>
            <ActionButton
              variant="blue" size="sm"
              onClick={async () => {
                await createBaseline.mutateAsync(`Baseline v${(baselines?.length || 0) + 1}`)
                showToast('Baseline saved!', 'success')
              }}
              disabled={createBaseline.isPending}
            >
              📸 Save Baseline
            </ActionButton>
          </>
        )}
      </PageHeader>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No milestones" />
      ) : (
        <EmptyState icon="🏁" title="No milestones" description="Milestones will appear when the schedule is initialized." />
      )}

      {/* Baselines section */}
      {baselines && baselines.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold text-bp-text">📸 Schedule Baselines</h3>
          <div className="grid gap-2">
            {baselines.map((bl: BaselineData) => (
              <SectionCard key={bl.id} padding="compact">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <span className="text-sm font-medium text-bp-text">{bl.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-bp-muted">v{bl.version}</span>
                    {bl.is_active && <StatusBadge text="Active" color="#22c55e" />}
                  </div>
                  <span className="text-[10px] text-bp-muted">
                    {bl.snapshot_count} tasks &bull; {new Date(bl.created_at).toLocaleDateString()}
                  </span>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}

      {/* Add milestone modal */}
      {showAdd && <AddMilestoneModal projectId={pid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddMilestoneModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const createMs = useCreateMilestone(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Add Milestone" width={400}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Milestone Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Foundation Complete" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Target Date</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <ActionButton
          variant="green" className="!w-full !mt-1"
          onClick={async () => {
            if (!name.trim()) { showToast('Name required', 'warning'); return }
            await createMs.mutateAsync({ name, target_date: targetDate || undefined })
            showToast('Milestone added', 'success')
            onClose()
          }}
          disabled={createMs.isPending}
        >
          {createMs.isPending ? 'Adding...' : 'Add Milestone'}
        </ActionButton>
      </div>
    </Modal>
  )
}
