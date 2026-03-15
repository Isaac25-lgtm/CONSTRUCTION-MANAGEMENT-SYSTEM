import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { PageHeader, SectionCard, ActionButton, Modal, LoadingState, EmptyState } from '../../components/ui'
import { useDailyLogs, useCreateDailyLog, type DailyLogData } from '../../hooks/useFieldOps'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

export function DailyLogsPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: logs, isLoading } = useDailyLogs(projectId)
  const { canEditFieldOps } = useProjectPermissions(projectId)
  const [showAdd, setShowAdd] = useState(false)

  if (isLoading) return <LoadingState rows={4} />

  const list = logs || []

  return (
    <div>
      <PageHeader title="Daily Logs" icon="📓" count={list.length}>
        {canEditFieldOps && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ New Log</ActionButton>
        )}
      </PageHeader>

      {list.length > 0 ? (
        <div className="grid gap-3">
          {list.map((log: DailyLogData) => (
            <SectionCard key={log.id} padding="compact">
              <div className="px-2 py-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-bp-accent">{log.log_date}</span>
                  {log.author_name && <span className="text-[10px] text-bp-muted">by {log.author_name}</span>}
                </div>
                <div className="grid gap-1.5 text-xs">
                  {log.weather && (
                    <div><span className="font-semibold text-bp-muted">Weather:</span> <span className="text-bp-text">{log.weather}</span></div>
                  )}
                  {log.workforce && (
                    <div><span className="font-semibold text-bp-muted">Workforce:</span> <span className="text-bp-text">{log.workforce}</span></div>
                  )}
                  {log.work_performed && (
                    <div><span className="font-semibold text-bp-muted">Work Performed:</span> <span className="text-bp-text whitespace-pre-line">{log.work_performed}</span></div>
                  )}
                  {log.delays && (
                    <div><span className="font-semibold text-bp-danger">Delays:</span> <span className="text-bp-text">{log.delays}</span></div>
                  )}
                  {log.materials_notes && (
                    <div><span className="font-semibold text-bp-muted">Materials:</span> <span className="text-bp-text">{log.materials_notes}</span></div>
                  )}
                  {log.visitors && (
                    <div><span className="font-semibold text-bp-muted">Visitors:</span> <span className="text-bp-text">{log.visitors}</span></div>
                  )}
                  {log.incidents && (
                    <div><span className="font-semibold text-bp-danger">Incidents:</span> <span className="text-bp-text">{log.incidents}</span></div>
                  )}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      ) : (
        <EmptyState icon="📓" title="No daily logs" description="Record daily site activities, weather, and workforce data." />
      )}

      {showAdd && <AddDailyLogModal projectId={pid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddDailyLogModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [weather, setWeather] = useState('')
  const [workforce, setWorkforce] = useState('')
  const [workPerformed, setWorkPerformed] = useState('')
  const [delays, setDelays] = useState('')
  const [materialsNotes, setMaterialsNotes] = useState('')
  const [visitors, setVisitors] = useState('')
  const [incidents, setIncidents] = useState('')
  const create = useCreateDailyLog(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="New Daily Log" width={500}>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date *</label>
            <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Weather</label>
            <input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="e.g. Sunny, 28C" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Workforce</label>
          <input value={workforce} onChange={(e) => setWorkforce(e.target.value)} placeholder="e.g. 15 workers, 2 supervisors" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Work Performed *</label>
          <textarea value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} placeholder="Describe today's work activities..." rows={3} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Delays</label>
          <input value={delays} onChange={(e) => setDelays(e.target.value)} placeholder="Any delays encountered" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Materials Notes</label>
          <input value={materialsNotes} onChange={(e) => setMaterialsNotes(e.target.value)} placeholder="Materials delivered/used" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Visitors</label>
            <input value={visitors} onChange={(e) => setVisitors(e.target.value)} placeholder="Site visitors" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Incidents</label>
            <input value={incidents} onChange={(e) => setIncidents(e.target.value)} placeholder="Any incidents" />
          </div>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!logDate || !workPerformed) { showToast('Date and work performed required', 'warning'); return }
          await create.mutateAsync({ log_date: logDate, weather, workforce, work_performed: workPerformed, delays, materials_notes: materialsNotes, visitors, incidents })
          showToast('Daily log recorded', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Log'}</ActionButton>
      </div>
    </Modal>
  )
}
