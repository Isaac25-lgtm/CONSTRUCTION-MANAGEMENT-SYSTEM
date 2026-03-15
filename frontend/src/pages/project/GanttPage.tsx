import { useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader, SectionCard, LoadingState } from '../../components/ui'
import { useGanttData } from '../../hooks/useSchedule'

/**
 * Gantt Chart -- production-quality custom rendering matching prototype.
 *
 * Features:
 * - Days/Weeks/Months/Years zoom
 * - Real calendar dates on headers
 * - Task table with No, Title, Start, End, %, Assignee
 * - Phase color coding
 * - Parent summary bars with bracket styling
 * - Progress fill + percentage text on bars
 * - Assignee labels after bars
 * - Milestone diamonds positioned on timeline
 * - Critical path highlighting
 * - Grid lines with alternating backgrounds
 * - Sticky left panel with horizontal scrolling
 * - Legend
 */

type ScaleType = 'days' | 'weeks' | 'months' | 'years'
const SCALES: ScaleType[] = ['days', 'weeks', 'months', 'years']

const PHASE_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

interface GanttTask {
  id: string
  code: string
  name: string
  phase: string
  start: number
  end: number
  duration: number
  progress: number
  status: string
  is_critical: boolean
  is_parent: boolean
  is_milestone: boolean
  start_date: string | null
  end_date: string | null
  assigned: string
  parent_code: string | null
}

interface GanttMilestone {
  name: string
  day: number | null
  status: string
}

interface GanttRow {
  task: GanttTask
  level: number
  num: string
  phaseCol: string
  isParent: boolean
  isMilestone: boolean
}

export function GanttPage() {
  const { projectId } = useParams()
  const { data, isLoading } = useGanttData(projectId)
  const [scale, setScale] = useState<ScaleType>('days')
  const chartRef = useRef<HTMLDivElement>(null)

  const duration = data?.project_duration || 1
  const projectStart = useMemo(() => data?.project_start ? new Date(data.project_start) : new Date(), [data?.project_start])
  const divisor = scale === 'weeks' ? 7 : scale === 'months' ? 30 : scale === 'years' ? 365 : 1
  const scaledDuration = Math.max(Math.ceil(duration / divisor), 1)

  // Dimensions
  const TABLE_W = 480
  const ROW_H = 34
  const HDR_H = scale === 'weeks' || scale === 'months' ? 52 : 44
  const MIN_COL = scale === 'days' ? 24 : scale === 'weeks' ? 60 : scale === 'months' ? 90 : 120
  const chartWidth = Math.max(700, scaledDuration * MIN_COL)
  const colW = chartWidth / Math.max(scaledDuration, 1)

  // Timeline labels
  type TimeLabel = { pos: number; label: string; sub: string; month?: string }
  const timeLabels: TimeLabel[] = useMemo(() => {
    const labels: TimeLabel[] = []
    if (scale === 'days') {
      const step = Math.max(1, Math.floor(scaledDuration / 25))
      for (let i = 0; i <= scaledDuration; i += step) {
        const d = addDays(projectStart, i)
        labels.push({ pos: i, label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, sub: String(d.getFullYear()) })
      }
    } else if (scale === 'weeks') {
      for (let i = 0; i <= scaledDuration; i++) {
        const d = addDays(projectStart, i * 7)
        const dEnd = addDays(projectStart, i * 7 + 6)
        labels.push({
          pos: i,
          label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
          sub: `${dEnd.getDate()} ${MONTHS[dEnd.getMonth()]}`,
          month: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        })
      }
    } else if (scale === 'months') {
      for (let i = 0; i <= scaledDuration; i++) {
        const d = addDays(projectStart, i * 30)
        labels.push({ pos: i, label: MONTHS[d.getMonth()], sub: String(d.getFullYear()) })
      }
    } else {
      for (let i = 0; i <= scaledDuration; i++) {
        const d = addDays(projectStart, i * 365)
        labels.push({ pos: i, label: String(d.getFullYear()), sub: '' })
      }
    }
    return labels
  }, [scale, scaledDuration, projectStart])

  const rows = useMemo<GanttRow[]>(() => {
    if (!data?.tasks) return []
    const tasks = data.tasks as GanttTask[]
    const milestones = (data.milestones || []) as GanttMilestone[]

    // Group by phase, assign colors
    const phaseMap = new Map<string, number>()
    let phaseIdx = 0
    const result: GanttRow[] = []
    let taskNum = 0

    tasks.forEach((t) => {
      if (!phaseMap.has(t.phase)) {
        phaseMap.set(t.phase, phaseIdx++)
      }
      const pIdx = phaseMap.get(t.phase) || 0
      const phaseCol = PHASE_COLORS[pIdx % PHASE_COLORS.length]
      const level = t.parent_code ? 1 : 0

      if (!t.parent_code) taskNum++
      const num = t.parent_code ? '' : String(taskNum)

      result.push({ task: t, level, num, phaseCol, isParent: t.is_parent, isMilestone: false })

      // Attach milestones to their linked tasks
      if (!t.parent_code) {
        milestones
          .filter(m => m.day != null && m.day === t.end)
          .forEach(m => {
            const msTask: GanttTask = {
              id: `ms-${m.name}`, code: '', name: m.name, phase: t.phase,
              start: m.day!, end: m.day!, duration: 0, progress: m.status === 'achieved' ? 100 : 0,
              status: m.status, is_critical: false, is_parent: false, is_milestone: true,
              start_date: null, end_date: null, assigned: '', parent_code: t.code,
            }
            result.push({ task: msTask, level: 1, num: '', phaseCol, isParent: false, isMilestone: true })
          })
      }
    })
    return result
  }, [data])

  if (isLoading) return <LoadingState rows={8} />
  if (!data || !data.tasks || data.tasks.length === 0) {
    return (
      <div>
        <PageHeader title="Gantt Chart" icon="&#128197;" />
        <SectionCard><div className="py-10 text-center text-bp-muted">No tasks to display.</div></SectionCard>
      </div>
    )
  }

  const scaleIdx = SCALES.indexOf(scale)

  return (
    <div>
      <PageHeader title="Gantt Chart" icon="&#128197;">
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            className="px-2 py-0.5 text-xs bg-bp-surface border border-bp-border rounded text-bp-text hover:bg-bp-border"
            onClick={() => { if (scaleIdx > 0) setScale(SCALES[scaleIdx - 1]) }}
            title="Zoom In"
          >+</button>
          <div className="flex gap-0.5 bg-bp-surface rounded-md p-0.5">
            {SCALES.map(s => (
              <button
                key={s}
                className={`px-2.5 py-1 text-[10px] rounded capitalize ${scale === s ? 'bg-bp-accent text-[#0f172a] font-bold' : 'text-bp-muted hover:text-bp-text'}`}
                onClick={() => setScale(s)}
              >{s}</button>
            ))}
          </div>
          <button
            className="px-2 py-0.5 text-xs bg-bp-surface border border-bp-border rounded text-bp-text hover:bg-bp-border"
            onClick={() => { if (scaleIdx < 3) setScale(SCALES[scaleIdx + 1]) }}
            title="Zoom Out"
          >-</button>
          <span className="text-[10px] text-bp-muted ml-2">{duration} days</span>
        </div>
      </PageHeader>

      {/* Legend */}
      <div className="flex gap-4 mb-2 text-[10px] text-bp-muted flex-wrap">
        <span><span className="text-[#3b82f6]">&#9632;</span> Normal</span>
        <span><span className="text-[#ef4444]">&#9632;</span> Critical</span>
        <span><span className="text-[#22c55e]">&#9632;</span> Complete</span>
        <span><span className="text-[#f97316]">&#9632;</span> Delayed</span>
        <span><span className="text-[#f59e0b]">&#9670;</span> Milestone</span>
      </div>

      <SectionCard padding="none">
        <div className="overflow-auto" ref={chartRef} style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="flex" style={{ minWidth: TABLE_W + chartWidth + 40 }}>

            {/* LEFT: Task Table */}
            <div className="flex-shrink-0 sticky left-0 z-[2]" style={{ width: TABLE_W, borderRight: '2px solid #f59e0b', background: '#0f1729' }}>
              {/* Table header */}
              <div
                className="grid items-center border-b-2 border-bp-accent sticky top-0 z-[3] px-1"
                style={{ gridTemplateColumns: '42px 1fr 80px 80px 50px 70px', height: HDR_H, background: '#0f1729' }}
              >
                {['No.', 'Title', 'Start', 'End', '%', 'Assignee'].map(h => (
                  <div key={h} className="text-[10px] font-bold text-bp-accent px-1">{h}</div>
                ))}
              </div>

              {/* Table rows */}
              {rows.map((r, ri) => {
                const t = r.task
                const sd = addDays(projectStart, t.start)
                const ed = addDays(projectStart, t.end)
                return (
                  <div
                    key={ri}
                    className="grid items-center border-b border-bp-border px-1"
                    style={{
                      gridTemplateColumns: '42px 1fr 80px 80px 50px 70px',
                      height: ROW_H,
                      background: ri % 2 === 0 ? '#0f1729' : '#131d33',
                    }}
                  >
                    <div className={`text-[10px] ${r.level === 0 ? 'font-bold text-bp-text' : 'text-bp-muted'}`}>{r.num}</div>
                    <div
                      className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1"
                      style={{ paddingLeft: r.level * 16 }}
                    >
                      {r.level === 0 && !r.isMilestone && (
                        <span style={{ color: r.phaseCol, fontSize: 8 }}>&#9660;</span>
                      )}
                      {r.isMilestone && <span className="text-bp-accent">&#9670; </span>}
                      <span className={`${r.isMilestone ? 'text-bp-accent' : r.level === 0 ? 'font-bold text-bp-text' : 'text-bp-muted'} ${t.is_critical ? '!text-[#ef4444]' : ''}`}>
                        {t.name}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-bp-muted">{r.isMilestone ? '' : fmtDate(sd)}</div>
                    <div className="text-[9px] font-mono text-bp-muted">{r.isMilestone ? '' : fmtDate(ed)}</div>
                    <div className={`text-[10px] font-bold text-center ${t.progress >= 100 ? 'text-[#22c55e]' : t.progress > 0 ? 'text-bp-accent' : 'text-bp-muted'}`}>
                      {t.progress}%
                    </div>
                    <div className="text-[9px] text-bp-muted overflow-hidden text-ellipsis whitespace-nowrap">{t.assigned || ''}</div>
                  </div>
                )
              })}
            </div>

            {/* RIGHT: Chart Area */}
            <div className="flex-1 relative">
              {/* Timeline header */}
              <div className="sticky top-0 z-[1] border-b-2 border-bp-accent overflow-hidden" style={{ height: HDR_H, background: '#0b1120' }}>
                {scale === 'weeks' ? (
                  <div>
                    {/* Month bands */}
                    <div className="relative" style={{ height: 20, borderBottom: '1px solid #1e293b' }}>
                      {(() => {
                        const bands: { label: string; start: number; end: number }[] = []
                        let curMonth: string | null = null
                        let bandStart = 0
                        timeLabels.forEach((lbl, li) => {
                          if (lbl.month !== curMonth) {
                            if (curMonth !== null) bands.push({ label: curMonth, start: bandStart, end: li })
                            curMonth = lbl.month!
                            bandStart = li
                          }
                        })
                        if (curMonth) bands.push({ label: curMonth, start: bandStart, end: timeLabels.length })
                        return bands.map((b, i) => (
                          <div key={i} className="absolute flex items-center justify-center border-r border-bp-border" style={{
                            left: b.start * colW, width: (b.end - b.start) * colW, height: 20,
                            background: i % 2 === 0 ? '#3b82f615' : '#f59e0b10',
                          }}>
                            <span className="text-[10px] font-bold text-bp-accent whitespace-nowrap">{b.label}</span>
                          </div>
                        ))
                      })()}
                    </div>
                    <div className="relative" style={{ height: 30 }}>
                      {timeLabels.map((lbl, li) => (
                        <div key={li} className="absolute flex flex-col items-center justify-center border-r border-bp-border/30" style={{ left: lbl.pos * colW, width: colW, height: 30 }}>
                          <div className="text-[9px] font-semibold text-bp-text leading-tight">{lbl.label}</div>
                          <div className="text-[8px] text-bp-muted leading-tight">{lbl.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : scale === 'months' ? (
                  <div>
                    {/* Year bands */}
                    <div className="relative" style={{ height: 18, borderBottom: '1px solid #1e293b' }}>
                      {(() => {
                        const bands: { label: string; start: number; end: number }[] = []
                        let curYear: string | null = null
                        let bandStart = 0
                        timeLabels.forEach((lbl, li) => {
                          if (lbl.sub !== curYear) {
                            if (curYear !== null) bands.push({ label: curYear, start: bandStart, end: li })
                            curYear = lbl.sub
                            bandStart = li
                          }
                        })
                        if (curYear) bands.push({ label: curYear, start: bandStart, end: timeLabels.length })
                        return bands.map((b, i) => (
                          <div key={i} className="absolute flex items-center justify-center border-r border-bp-border" style={{
                            left: b.start * colW, width: (b.end - b.start) * colW, height: 18,
                            background: i % 2 === 0 ? '#3b82f615' : '#f59e0b10',
                          }}>
                            <span className="text-[11px] font-bold text-bp-accent">{b.label}</span>
                          </div>
                        ))
                      })()}
                    </div>
                    <div className="relative" style={{ height: 32 }}>
                      {timeLabels.map((lbl, li) => (
                        <div key={li} className="absolute flex items-center justify-center border-r border-bp-border/30" style={{
                          left: lbl.pos * colW, width: colW, height: 32,
                          background: li % 2 === 0 ? 'transparent' : '#131d3344',
                        }}>
                          <span className="text-[10px] font-semibold text-bp-text">{lbl.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Days / Years */
                  <div className="relative" style={{ height: HDR_H }}>
                    {timeLabels.map((lbl, li) => (
                      <div key={li} className="absolute bottom-1 text-center" style={{ left: lbl.pos * colW }}>
                        <div className="text-[9px] font-semibold text-bp-text whitespace-nowrap">{lbl.label}</div>
                        {lbl.sub && <div className="text-[8px] text-bp-muted">{lbl.sub}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chart rows */}
              <div className="relative">
                {/* Grid lines */}
                {timeLabels.map((lbl, li) => (
                  <div
                    key={`gl-${li}`}
                    className="absolute top-0"
                    style={{
                      left: lbl.pos * colW,
                      width: scale === 'months' || scale === 'weeks' ? colW : 1,
                      height: rows.length * ROW_H,
                      background: li % 2 === 0 ? 'transparent' : '#1e293b12',
                      borderLeft: '1px solid #1e293b33',
                    }}
                  />
                ))}

                {/* Task bars */}
                {rows.map((r, ri) => {
                  const t = r.task
                  const x = (t.start / divisor) * colW
                  const w = Math.max((t.duration / divisor) * colW, 0)
                  const pw = w * (t.progress / 100)
                  const barTop = ri * ROW_H + 8
                  const barH = ROW_H - 16

                  // Color logic matching prototype
                  const barColor = r.isMilestone
                    ? '#f59e0b'
                    : t.is_critical
                      ? '#ef4444'
                      : t.status === 'completed'
                        ? '#22c55e'
                        : t.status === 'delayed'
                          ? '#f97316'
                          : r.phaseCol

                  // Milestone diamond
                  if (r.isMilestone) {
                    const mx = (t.start / divisor) * colW
                    return (
                      <div key={`r-${ri}`} className="absolute left-0 w-full" style={{ top: ri * ROW_H, height: ROW_H }}>
                        <div
                          className="absolute"
                          style={{
                            left: mx - 6, top: barTop + barH / 2 - 6,
                            width: 12, height: 12,
                            background: t.status === 'achieved' ? '#22c55e' : '#f59e0b',
                            transform: 'rotate(45deg)',
                          }}
                        />
                      </div>
                    )
                  }

                  // Parent/summary bar with bracket triangles
                  if (r.level === 0 && r.isParent) {
                    return (
                      <div key={`r-${ri}`} className="absolute left-0 w-full" style={{ top: ri * ROW_H, height: ROW_H }}>
                        <div className="absolute rounded-sm" style={{ left: x, top: barTop, width: w, height: 6, background: barColor }} />
                        {/* Left bracket triangle */}
                        <div style={{
                          position: 'absolute', left: x, top: barTop + 6,
                          width: 0, height: 0,
                          borderLeft: `5px solid ${barColor}`,
                          borderRight: '5px solid transparent',
                          borderTop: `5px solid ${barColor}`,
                        }} />
                        {/* Right bracket triangle */}
                        <div style={{
                          position: 'absolute', left: x + w - 5, top: barTop + 6,
                          width: 0, height: 0,
                          borderRight: `5px solid ${barColor}`,
                          borderLeft: '5px solid transparent',
                          borderTop: `5px solid ${barColor}`,
                        }} />
                      </div>
                    )
                  }

                  // Normal task bar
                  return (
                    <div key={`r-${ri}`} className="absolute left-0 w-full" style={{ top: ri * ROW_H, height: ROW_H }}>
                      {/* Background bar */}
                      <div className="absolute rounded" style={{ left: x, top: barTop, width: w, height: barH, background: barColor, opacity: 0.2 }} />
                      {/* Progress fill */}
                      <div className="absolute rounded" style={{ left: x, top: barTop, width: Math.max(pw, 0), height: barH, background: barColor, opacity: 0.8 }} />
                      {/* Border */}
                      <div className="absolute rounded box-border" style={{ left: x, top: barTop, width: w, height: barH, border: `1px solid ${barColor}` }} />
                      {/* Progress text */}
                      {w > 35 && (
                        <div className="absolute flex items-center justify-center text-white text-[9px] font-bold" style={{ left: x, top: barTop, width: w, height: barH }}>
                          {t.progress}%
                        </div>
                      )}
                      {/* Assignee label */}
                      {t.assigned && (
                        <div className="absolute text-[9px] text-bp-muted whitespace-nowrap" style={{ left: x + w + 6, top: barTop + 2 }}>
                          {t.assigned}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
