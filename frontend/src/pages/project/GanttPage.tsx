import { useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ActionButton, PageHeader, SectionCard, LoadingState, Modal } from '../../components/ui'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import {
  useGanttData, useCreateTask, useUpdateTask, useDeleteTask,
  useRecalculateCPM,
} from '../../hooks/useSchedule'
import { useUIStore } from '../../stores/uiStore'

/**
 * Gantt Chart -- production-quality custom rendering matching prototype.
 *
 * Features:
 * - Days/Weeks/Months/Years zoom
 * - Real calendar dates on headers
 * - Task table with No, Title, Start, End, %, Assignee
 * - Phase color coding, parent summary bars with bracket styling
 * - Progress fill + percentage text on bars
 * - Milestone diamonds, critical path highlighting
 * - Prototype-style bottom-sheet task menu on row click
 * - CSV/Excel/Word/PDF export with permission handling
 */

type ScaleType = 'days' | 'weeks' | 'months' | 'years'
const SCALES: ScaleType[] = ['days', 'weeks', 'months', 'years']

const PHASE_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
]

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

interface GanttTask {
  id: string; code: string; name: string; phase: string
  start: number; end: number; duration: number; progress: number; status: string
  is_critical: boolean; is_parent: boolean; is_milestone: boolean
  start_date: string | null; end_date: string | null; assigned: string; parent_code: string | null
}

interface GanttMilestone { name: string; day: number | null; status: string }

interface GanttRow {
  task: GanttTask; level: number; num: string; phaseCol: string; isParent: boolean; isMilestone: boolean
}

export function GanttPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data, isLoading } = useGanttData(projectId)
  const { canEditSchedule } = useProjectPermissions(projectId)
  const createTask = useCreateTask(pid)
  const updateTask = useUpdateTask(pid)
  const deleteTask = useDeleteTask(pid)
  const recalculate = useRecalculateCPM(pid)
  const { showToast } = useUIStore()

  const [scale, setScale] = useState<ScaleType>('days')
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Task menu state
  const [activeMenu, setActiveMenu] = useState<GanttTask | null>(null)
  const [editTaskOpen, setEditTaskOpen] = useState<GanttTask | null>(null)
  const [editProgress, setEditProgress] = useState(0)
  const [addSiblingFor, setAddSiblingFor] = useState<GanttTask | null>(null)
  const [addChildFor, setAddChildFor] = useState<GanttTask | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<GanttTask | null>(null)
  const [newTask, setNewTask] = useState({ code: '', name: '', duration_days: 5 })

  const duration = data?.project_duration || 1
  const projectStart = useMemo(() => data?.project_start ? new Date(data.project_start) : new Date(), [data?.project_start])
  const divisor = scale === 'weeks' ? 7 : scale === 'months' ? 30 : scale === 'years' ? 365 : 1
  const scaledDuration = Math.max(Math.ceil(duration / divisor), 1)

  const TABLE_W = 480
  const ROW_H = 34
  const HDR_H = scale === 'weeks' || scale === 'months' ? 52 : 44
  const MIN_COL = scale === 'days' ? 24 : scale === 'weeks' ? 60 : scale === 'months' ? 90 : 120
  const chartWidth = Math.max(700, scaledDuration * MIN_COL)
  const colW = chartWidth / Math.max(scaledDuration, 1)

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
        labels.push({ pos: i, label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, sub: `${dEnd.getDate()} ${MONTHS[dEnd.getMonth()]}`, month: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` })
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
    const phaseMap = new Map<string, number>()
    let phaseIdx = 0
    const result: GanttRow[] = []
    tasks.forEach((t) => {
      if (!phaseMap.has(t.phase)) phaseMap.set(t.phase, phaseIdx++)
      const pIdx = phaseMap.get(t.phase) || 0
      const phaseCol = PHASE_COLORS[pIdx % PHASE_COLORS.length]
      const level = t.parent_code ? 1 : 0
      const num = t.code
      result.push({ task: t, level, num, phaseCol, isParent: t.is_parent, isMilestone: false })
      if (!t.parent_code) {
        milestones.filter(m => m.day != null && m.day === t.end).forEach(m => {
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

  /* ---------- Visual Gantt export ---------- */
  /* ---------- Gantt Export — pure HTML generation, no canvas/screenshot ---------- */

  function buildGanttHTML(forExcel = false): string {
    const tasks = data!.tasks as GanttTask[]
    const maxEF = Math.max(...tasks.map(t => t.end), 1)
    const barAreaW = 520
    const barScale = barAreaW / maxEF

    let taskRows = ''
    tasks.forEach((t, i) => {
      const isChild = !!t.parent_code
      const barLeft = Math.round(t.start * barScale)
      const barW = Math.max(Math.round(t.duration * barScale), 3)
      const progW = Math.round(barW * t.progress / 100)
      const color = t.is_critical ? '#ef4444' : t.status === 'completed' ? '#22c55e' : t.status === 'delayed' ? '#f97316' : '#3b82f6'
      const bgRow = i % 2 === 0 ? '#f8fafc' : '#ffffff'
      const critBg = t.is_critical ? 'background:#fef2f2;' : ''
      const nameStyle = isChild ? 'padding-left:20px;font-size:11px;' : 'font-weight:700;font-size:12px;'
      const sd = t.start_date || ''
      const ed = t.end_date || ''

      taskRows += `<tr style="${critBg}background:${bgRow}">
        <td style="font-family:Consolas,monospace;color:${t.is_critical ? '#ef4444' : '#f59e0b'};font-weight:700;font-size:10px;padding:5px 8px;white-space:nowrap">${t.code}</td>
        <td style="${nameStyle}padding:5px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</td>
        <td style="font-family:Consolas,monospace;font-size:9px;color:#475569;padding:5px 6px;white-space:nowrap">${sd}</td>
        <td style="font-family:Consolas,monospace;font-size:9px;color:#475569;padding:5px 6px;white-space:nowrap">${ed}</td>
        <td style="font-size:10px;font-weight:700;text-align:center;color:${t.progress >= 100 ? '#16a34a' : t.progress > 0 ? '#d97706' : '#9ca3af'};padding:5px 4px">${t.progress}%</td>
        <td style="font-size:9px;color:#475569;padding:5px 6px">${t.assigned || ''}</td>
        <td style="padding:5px 6px;width:${barAreaW}px">
          <div style="position:relative;height:16px">
            <div style="position:absolute;left:${barLeft}px;top:0;width:${barW}px;height:16px;background:${color};opacity:0.15;border-radius:3px"></div>
            <div style="position:absolute;left:${barLeft}px;top:0;width:${progW}px;height:16px;background:${color};opacity:0.85;border-radius:3px"></div>
            <div style="position:absolute;left:${barLeft}px;top:0;width:${barW}px;height:16px;border:1.5px solid ${color};border-radius:3px;box-sizing:border-box"></div>
            ${barW > 30 ? `<div style="position:absolute;left:${barLeft}px;top:0;width:${barW}px;height:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:700">${t.progress}%</div>` : ''}
          </div>
        </td>
      </tr>`
    })

    const excelStyle = forExcel
      ? 'td,th{border:1px solid #cbd5e1;padding:5px 8px;font-size:10pt;font-family:Calibri,sans-serif}th{background:#0f172a;color:#f59e0b;font-weight:bold}'
      : ''

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BuildPro Gantt Chart</title>
<style>
@media print{@page{size:A4 landscape;margin:8mm}.no-print{display:none!important}}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Calibri,Arial,sans-serif;padding:20px 24px;background:#fff;color:#1e293b}
h1{font-size:20px;color:#0f172a;border-bottom:3px solid #f59e0b;padding-bottom:8px;margin-bottom:6px}
.meta{color:#64748b;font-size:10px;padding:6px 0 12px;border-left:4px solid #f59e0b;padding-left:10px;margin-bottom:14px;background:#fffbeb}
.legend{display:flex;gap:18px;margin-bottom:12px;font-size:10px;color:#475569}
.legend span{display:inline-flex;align-items:center;gap:5px}
.dot{width:12px;height:12px;border-radius:2px;display:inline-block}
table{width:100%;border-collapse:collapse}
th{background:#0f172a;color:#f59e0b;padding:7px 8px;font-size:10px;text-align:left;font-weight:700;border:1px solid #1e293b}
td{border-bottom:1px solid #e2e8f0;border-right:1px solid #f1f5f9;vertical-align:middle}
.crit td{background:#fef2f2!important}
.foot{margin-top:20px;text-align:center;color:#94a3b8;font-size:9px;border-top:1px solid #e2e8f0;padding-top:10px}
.no-print{display:block;text-align:center;margin-bottom:16px}
.btn{padding:12px 28px;background:#f59e0b;color:#0f172a;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}
${excelStyle}
</style></head><body>
<div class="no-print"><button class="btn" onclick="window.print()">Print / Save as PDF</button></div>
<h1>BuildPro — Gantt Chart</h1>
<div class="meta">Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | Scale: ${scale} | Duration: ${duration} days | Tasks: ${tasks.length}</div>
<div class="legend">
  <span><span class="dot" style="background:#3b82f6"></span> Normal</span>
  <span><span class="dot" style="background:#ef4444"></span> Critical</span>
  <span><span class="dot" style="background:#22c55e"></span> Complete</span>
  <span><span class="dot" style="background:#f97316"></span> Delayed</span>
  <span><span class="dot" style="background:#f59e0b"></span> Milestone</span>
</div>
<table>
<thead><tr><th>ID</th><th>Activity</th><th>Start</th><th>End</th><th>%</th><th>Assignee</th><th style="width:${barAreaW}px">Timeline</th></tr></thead>
<tbody>${taskRows}</tbody>
</table>
<div class="foot">Generated by BuildPro — Construction Project Management System</div>
</body></html>`
  }

  function dlBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.style.display = 'none'
    document.body.appendChild(a); a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
  }

  const handleExport = (format: 'jpg' | 'xlsx' | 'doc' | 'pdf') => {
    setExportingFormat(format)
    try {
      if (format === 'jpg') {
        // Render Gantt as SVG → convert to canvas → download as JPG
        const tasks = data!.tasks as GanttTask[]
        const maxEF = Math.max(...tasks.map(t => t.end), 1)
        const tblW = 360, barW = 500, rowH = 24, hdrH = 30
        const svgW = tblW + barW + 20
        const svgH = hdrH + tasks.length * rowH + 10
        const barScale = barW / maxEF

        let svgRows = ''
        tasks.forEach((t, i) => {
          const y = hdrH + i * rowH
          const bgFill = i % 2 === 0 ? '#f8fafc' : '#ffffff'
          const critBg = t.is_critical ? '#fef2f2' : bgFill
          const color = t.is_critical ? '#ef4444' : t.status === 'completed' ? '#22c55e' : t.status === 'delayed' ? '#f97316' : '#3b82f6'
          const isChild = !!t.parent_code
          const nameX = tblW * 0.12 + (isChild ? 12 : 0)
          const bx = tblW + Math.round(t.start * barScale)
          const bw = Math.max(Math.round(t.duration * barScale), 2)
          const pw = Math.round(bw * t.progress / 100)

          svgRows += `<rect x="0" y="${y}" width="${svgW}" height="${rowH}" fill="${critBg}"/>`
          svgRows += `<text x="8" y="${y + 16}" font-size="9" font-family="monospace" fill="${t.is_critical ? '#ef4444' : '#d97706'}" font-weight="bold">${t.code}</text>`
          svgRows += `<text x="${nameX}" y="${y + 16}" font-size="${isChild ? 9 : 10}" font-family="Calibri,sans-serif" fill="#1e293b" font-weight="${isChild ? 'normal' : 'bold'}">${t.name.length > 28 ? t.name.slice(0, 26) + '…' : t.name}</text>`
          svgRows += `<text x="${tblW * 0.7}" y="${y + 16}" font-size="8" font-family="monospace" fill="#64748b">${t.start_date || ''}</text>`
          svgRows += `<text x="${tblW * 0.85}" y="${y + 16}" font-size="8" font-family="monospace" fill="#64748b">${t.end_date || ''}</text>`
          svgRows += `<text x="${tblW - 8}" y="${y + 16}" font-size="9" font-family="Calibri" fill="${t.progress >= 100 ? '#16a34a' : '#d97706'}" text-anchor="end" font-weight="bold">${t.progress}%</text>`
          // Bar
          svgRows += `<rect x="${bx}" y="${y + 4}" width="${bw}" height="${rowH - 8}" rx="3" fill="${color}" opacity="0.15"/>`
          svgRows += `<rect x="${bx}" y="${y + 4}" width="${pw}" height="${rowH - 8}" rx="3" fill="${color}" opacity="0.85"/>`
          svgRows += `<rect x="${bx}" y="${y + 4}" width="${bw}" height="${rowH - 8}" rx="3" fill="none" stroke="${color}" stroke-width="1"/>`
        })

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
          <rect width="${svgW}" height="${svgH}" fill="#ffffff"/>
          <rect width="${svgW}" height="${hdrH}" fill="#0f172a"/>
          <text x="8" y="19" font-size="10" font-family="Calibri" fill="#f59e0b" font-weight="bold">ID</text>
          <text x="${tblW * 0.12}" y="19" font-size="10" font-family="Calibri" fill="#f59e0b" font-weight="bold">Activity</text>
          <text x="${tblW * 0.7}" y="19" font-size="10" font-family="Calibri" fill="#f59e0b" font-weight="bold">Start</text>
          <text x="${tblW * 0.85}" y="19" font-size="10" font-family="Calibri" fill="#f59e0b" font-weight="bold">End</text>
          <text x="${tblW - 8}" y="19" font-size="10" font-family="Calibri" fill="#f59e0b" font-weight="bold" text-anchor="end">%</text>
          <text x="${tblW + 8}" y="19" font-size="10" font-family="Calibri" fill="#f59e0b" font-weight="bold">Timeline</text>
          <line x1="${tblW}" y1="0" x2="${tblW}" y2="${svgH}" stroke="#e2e8f0" stroke-width="1"/>
          ${svgRows}
        </svg>`

        const canvas = document.createElement('canvas')
        const scale = 2
        canvas.width = svgW * scale
        canvas.height = svgH * scale
        const ctx = canvas.getContext('2d')!
        ctx.scale(scale, scale)
        const img = new Image()
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(url)
          canvas.toBlob((jpgBlob) => {
            if (jpgBlob) dlBlob(jpgBlob, 'BuildPro_Gantt.jpg')
            showToast('JPG downloaded!', 'success')
            setExportingFormat(null)
          }, 'image/jpeg', 0.95)
        }
        img.onerror = () => { showToast('JPG export failed', 'error'); setExportingFormat(null) }
        img.src = url
        return // async — setExportingFormat handled in callbacks
      } else if (format === 'xlsx') {
        const html = buildGanttHTML(true)
        dlBlob(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), 'BuildPro_Gantt.xls')
        showToast('Excel downloaded!', 'success')
      } else if (format === 'doc') {
        const html = buildGanttHTML()
        dlBlob(new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' }), 'BuildPro_Gantt.doc')
        showToast('Word downloaded!', 'success')
      } else {
        const html = buildGanttHTML()
        dlBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'BuildPro_Gantt_Print.html')
        showToast('Open the file and click Print → Save as PDF', 'success')
      }
    } catch {
      showToast('Export failed', 'error')
    }
    setExportingFormat(null)
  }

  function handleDeleteTask(task: GanttTask) {
    deleteTask.mutate(task.id, {
      onSuccess: () => { setConfirmDelete(null); showToast(`Deleted ${task.code}`, 'success') },
    })
  }

  function handleAddRelated(parentTask: GanttTask, isChild: boolean) {
    if (!newTask.code || !newTask.name) { showToast('Code and name required', 'error'); return }
    const parentRecord = parentTask.parent_code
      ? (data!.tasks as GanttTask[]).find(candidate => candidate.code === parentTask.parent_code) || null
      : null
    const payload: Record<string, unknown> = {
      code: newTask.code, name: newTask.name, duration_days: newTask.duration_days,
      ...(isChild ? { parent: parentTask.id } : parentRecord ? { parent: parentRecord.id } : {}),
    }
    createTask.mutate(payload as Parameters<typeof createTask.mutate>[0], {
      onSuccess: () => {
        setAddSiblingFor(null); setAddChildFor(null)
        setNewTask({ code: '', name: '', duration_days: 5 })
        showToast('Task created', 'success')
      },
    })
  }

  return (
    <div>
      <PageHeader title="Gantt Chart" icon="&#128197;">
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom */}
          <button className="px-2 py-0.5 text-xs bg-bp-surface border border-bp-border rounded text-bp-text hover:bg-bp-border"
            onClick={() => { if (scaleIdx > 0) setScale(SCALES[scaleIdx - 1]) }} title="Zoom In">+</button>
          <div className="flex gap-0.5 bg-bp-surface rounded-md p-0.5">
            {SCALES.map(s => (
              <button key={s}
                className={`px-2.5 py-1 text-[10px] rounded capitalize ${scale === s ? 'bg-bp-accent text-[#0f172a] font-bold' : 'text-bp-muted hover:text-bp-text'}`}
                onClick={() => setScale(s)}>{s}</button>
            ))}
          </div>
          <button className="px-2 py-0.5 text-xs bg-bp-surface border border-bp-border rounded text-bp-text hover:bg-bp-border"
            onClick={() => { if (scaleIdx < 3) setScale(SCALES[scaleIdx + 1]) }} title="Zoom Out">−</button>

          {/* Export buttons — instant client-side generation */}
          <div className="ml-auto flex flex-wrap gap-1">
            {(['jpg', 'xlsx', 'doc', 'pdf'] as const).map(format => {
              const labels: Record<string, string> = { jpg: 'JPG', xlsx: 'Excel', doc: 'Word', pdf: 'PDF' }
              return (
                <ActionButton key={format} variant="blue" size="sm"
                  disabled={!!exportingFormat}
                  onClick={() => handleExport(format)}>
                  {exportingFormat === format ? '...' : labels[format]}
                </ActionButton>
              )
            })}
          </div>
        </div>
      </PageHeader>

      <div ref={chartRef}>
      {/* Legend */}
      <div className="flex gap-4 mb-2 text-[10px] text-bp-muted flex-wrap">
        <span><span className="text-[#3b82f6]">&#9632;</span> Normal</span>
        <span><span className="text-[#ef4444]">&#9632;</span> Critical</span>
        <span><span className="text-[#22c55e]">&#9632;</span> Complete</span>
        <span><span className="text-[#f97316]">&#9632;</span> Delayed</span>
        <span><span className="text-[#f59e0b]">&#9670;</span> Milestone</span>
      </div>

      <SectionCard padding="none">
        <div className="overflow-auto" data-gantt-scroll-root="true" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="flex" style={{ minWidth: TABLE_W + chartWidth + 40 }}>

            {/* LEFT: Task Table */}
            <div className="flex-shrink-0 sticky left-0 z-[2]" style={{ width: TABLE_W, borderRight: '2px solid #f59e0b', background: '#0f1729' }}>
              <div className="grid items-center border-b-2 border-bp-accent sticky top-0 z-[3] px-1"
                style={{ gridTemplateColumns: '42px 1fr 80px 80px 50px 70px', height: HDR_H, background: '#0f1729' }}>
                {['No.', 'Title', 'Start', 'End', '%', 'Assignee'].map(h => (
                  <div key={h} className="text-[10px] font-bold text-bp-accent px-1">{h}</div>
                ))}
              </div>
              {rows.map((r, ri) => {
                const t = r.task
                const sd = addDays(projectStart, t.start)
                const ed = addDays(projectStart, t.end)
                return (
                  <div key={ri}
                    className="grid items-center border-b border-bp-border px-1 cursor-pointer hover:bg-white/[0.03]"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      if (!r.isMilestone) setActiveMenu(activeMenu?.id === t.id ? null : t)
                    }}
                    style={{ gridTemplateColumns: '42px 1fr 80px 80px 50px 70px', height: ROW_H, background: ri % 2 === 0 ? '#0f1729' : '#131d33' }}>
                    <div className={`text-[10px] ${r.level === 0 ? 'font-bold text-bp-text' : 'text-bp-muted'}`}>{r.num}</div>
                    <div className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1"
                      style={{ paddingLeft: r.level * 16 }}>
                      {r.level === 0 && !r.isMilestone && <span style={{ color: r.phaseCol, fontSize: 8 }}>&#9660;</span>}
                      {r.isMilestone && <span className="text-bp-accent">&#9670; </span>}
                      <span className={`${r.isMilestone ? 'text-bp-accent' : r.level === 0 ? 'font-bold text-bp-text' : 'text-bp-muted'} ${t.is_critical ? '!text-[#ef4444]' : ''}`}>
                        {t.name}
                      </span>
                      {!r.isMilestone && canEditSchedule && <span className="text-[9px] text-bp-muted opacity-50">▼</span>}
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
                    <div className="relative" style={{ height: 20, borderBottom: '1px solid #1e293b' }}>
                      {(() => {
                        const bands: { label: string; start: number; end: number }[] = []
                        let curMonth: string | null = null; let bandStart = 0
                        timeLabels.forEach((lbl, li) => {
                          if (lbl.month !== curMonth) { if (curMonth !== null) bands.push({ label: curMonth, start: bandStart, end: li }); curMonth = lbl.month!; bandStart = li }
                        })
                        if (curMonth) bands.push({ label: curMonth, start: bandStart, end: timeLabels.length })
                        return bands.map((b, i) => (
                          <div key={i} className="absolute flex items-center justify-center border-r border-bp-border" style={{ left: b.start * colW, width: (b.end - b.start) * colW, height: 20, background: i % 2 === 0 ? '#3b82f615' : '#f59e0b10' }}>
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
                    <div className="relative" style={{ height: 18, borderBottom: '1px solid #1e293b' }}>
                      {(() => {
                        const bands: { label: string; start: number; end: number }[] = []
                        let curYear: string | null = null; let bandStart = 0
                        timeLabels.forEach((lbl, li) => {
                          if (lbl.sub !== curYear) { if (curYear !== null) bands.push({ label: curYear, start: bandStart, end: li }); curYear = lbl.sub; bandStart = li }
                        })
                        if (curYear) bands.push({ label: curYear, start: bandStart, end: timeLabels.length })
                        return bands.map((b, i) => (
                          <div key={i} className="absolute flex items-center justify-center border-r border-bp-border" style={{ left: b.start * colW, width: (b.end - b.start) * colW, height: 18, background: i % 2 === 0 ? '#3b82f615' : '#f59e0b10' }}>
                            <span className="text-[11px] font-bold text-bp-accent">{b.label}</span>
                          </div>
                        ))
                      })()}
                    </div>
                    <div className="relative" style={{ height: 32 }}>
                      {timeLabels.map((lbl, li) => (
                        <div key={li} className="absolute flex items-center justify-center border-r border-bp-border/30" style={{ left: lbl.pos * colW, width: colW, height: 32, background: li % 2 === 0 ? 'transparent' : '#131d3344' }}>
                          <span className="text-[10px] font-semibold text-bp-text">{lbl.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
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
                {timeLabels.map((lbl, li) => (
                  <div key={`gl-${li}`} className="absolute top-0" style={{ left: lbl.pos * colW, width: scale === 'months' || scale === 'weeks' ? colW : 1, height: rows.length * ROW_H, background: li % 2 === 0 ? 'transparent' : '#1e293b12', borderLeft: '1px solid #1e293b33' }} />
                ))}
                {rows.map((r, ri) => {
                  const t = r.task
                  const x = (t.start / divisor) * colW
                  const w = Math.max((t.duration / divisor) * colW, 0)
                  const pw = w * (t.progress / 100)
                  const barTop = ri * ROW_H + 8
                  const barH = ROW_H - 16
                  const barColor = r.isMilestone ? '#f59e0b' : t.is_critical ? '#ef4444' : t.status === 'completed' ? '#22c55e' : t.status === 'delayed' ? '#f97316' : r.phaseCol

                  if (r.isMilestone) {
                    const mx = (t.start / divisor) * colW
                    return (
                      <div key={`r-${ri}`} className="absolute left-0 w-full" style={{ top: ri * ROW_H, height: ROW_H }}>
                        <div className="absolute" style={{ left: mx - 6, top: barTop + barH / 2 - 6, width: 12, height: 12, background: t.status === 'achieved' ? '#22c55e' : '#f59e0b', transform: 'rotate(45deg)' }} />
                      </div>
                    )
                  }
                  if (r.level === 0 && r.isParent) {
                    return (
                      <div key={`r-${ri}`} className="absolute left-0 w-full" style={{ top: ri * ROW_H, height: ROW_H }}>
                        <div className="absolute rounded-sm" style={{ left: x, top: barTop, width: w, height: 6, background: barColor }} />
                        <div style={{ position: 'absolute', left: x, top: barTop + 6, width: 0, height: 0, borderLeft: `5px solid ${barColor}`, borderRight: '5px solid transparent', borderTop: `5px solid ${barColor}` }} />
                        <div style={{ position: 'absolute', left: x + w - 5, top: barTop + 6, width: 0, height: 0, borderRight: `5px solid ${barColor}`, borderLeft: '5px solid transparent', borderTop: `5px solid ${barColor}` }} />
                      </div>
                    )
                  }
                  return (
                    <div key={`r-${ri}`} className="absolute left-0 w-full" style={{ top: ri * ROW_H, height: ROW_H }}>
                      <div className="absolute rounded" style={{ left: x, top: barTop, width: w, height: barH, background: barColor, opacity: 0.2 }} />
                      <div className="absolute rounded" style={{ left: x, top: barTop, width: Math.max(pw, 0), height: barH, background: barColor, opacity: 0.8 }} />
                      <div className="absolute rounded box-border" style={{ left: x, top: barTop, width: w, height: barH, border: `1px solid ${barColor}` }} />
                      {w > 35 && <div className="absolute flex items-center justify-center text-white text-[9px] font-bold" style={{ left: x, top: barTop, width: w, height: barH }}>{t.progress}%</div>}
                      {t.assigned && <div className="absolute text-[9px] text-bp-muted whitespace-nowrap" style={{ left: x + w + 6, top: barTop + 2 }}>{t.assigned}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
      </div>

      {/* ---- Prototype-style bottom-sheet task menu ---- */}
      {activeMenu && canEditSchedule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={() => setActiveMenu(null)}>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111827', border: '1px solid #334155', borderRadius: '16px 16px 0 0', padding: '16px 20px 24px', maxWidth: 420, margin: '0 auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: '#334155', borderRadius: 2, margin: '0 auto 12px' }} />
            <div className="mb-3 text-center text-xs text-bp-muted">{activeMenu.name}</div>
            {[
              { label: 'Edit Task', color: '#3b82f6', action: () => { setEditTaskOpen(activeMenu); setEditProgress(activeMenu.progress); setActiveMenu(null) } },
              { label: 'Add Sibling Task', color: '#22c55e', action: () => { setAddSiblingFor(activeMenu); setNewTask({ code: '', name: '', duration_days: 5 }); setActiveMenu(null) } },
              { label: 'Add Child Task', color: '#f59e0b', action: () => { setAddChildFor(activeMenu); setNewTask({ code: '', name: '', duration_days: 5 }); setActiveMenu(null) } },
              { label: 'Remove Task', color: '#ef4444', action: () => { setConfirmDelete(activeMenu); setActiveMenu(null) } },
            ].map(opt => (
              <button key={opt.label} onClick={opt.action} style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', borderTop: '1px solid #334155', color: opt.color, fontSize: 15, textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                {opt.label}
              </button>
            ))}
            <button onClick={() => setActiveMenu(null)} style={{ display: 'block', width: '100%', padding: '14px 16px', marginTop: 8, background: '#1e293b', border: 'none', borderRadius: 10, color: '#94a3b8', fontSize: 15, textAlign: 'center', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- Edit Task Modal ---- */}
      {editTaskOpen && (
        <Modal open={!!editTaskOpen} title="Edit Task" onClose={() => setEditTaskOpen(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name</label>
              <input type="text" defaultValue={editTaskOpen.name}
                onBlur={e => { if (e.target.value !== editTaskOpen.name) updateTask.mutate({ taskId: editTaskOpen.id, data: { name: e.target.value } }) }}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
                <input type="number" defaultValue={editTaskOpen.duration}
                  onBlur={e => { const v = parseInt(e.target.value) || 0; if (v !== editTaskOpen.duration) updateTask.mutate({ taskId: editTaskOpen.id, data: { duration_days: v } }) }}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Resource</label>
                <input type="text" defaultValue={editTaskOpen.assigned}
                  onBlur={e => { if (e.target.value !== editTaskOpen.assigned) updateTask.mutate({ taskId: editTaskOpen.id, data: { resource: e.target.value } }) }}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Progress</label>
                <input type="range" min={0} max={100} step={5} value={editProgress}
                  onChange={e => { const v = parseInt(e.target.value); setEditProgress(v); updateTask.mutate({ taskId: editTaskOpen.id, data: { progress: v } }) }}
                  style={{ width: '100%', accentColor: '#f59e0b' }} />
                <div className="text-center text-xs font-bold text-bp-accent">{editProgress}%</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Status</label>
                <select defaultValue={editTaskOpen.status}
                  onChange={e => updateTask.mutate({ taskId: editTaskOpen.id, data: { status: e.target.value } })}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="blue" onClick={async () => { await recalculate.mutateAsync(); setEditTaskOpen(null); showToast('Task updated & CPM recalculated', 'success') }}>
                Save & Recalculate
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => setEditTaskOpen(null)}>Close</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Add Sibling Modal ---- */}
      {addSiblingFor && (
        <Modal open={!!addSiblingFor} title={`Add Sibling Task after: ${addSiblingFor.name}`} onClose={() => setAddSiblingFor(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">ID *</label>
                <input type="text" value={newTask.code} onChange={e => setNewTask(p => ({ ...p, code: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name *</label>
                <input type="text" value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
              <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="ghost" onClick={() => setAddSiblingFor(null)}>Cancel</ActionButton>
              <ActionButton variant="green" onClick={() => handleAddRelated(addSiblingFor, false)}>Add Task</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Add Child Modal ---- */}
      {addChildFor && (
        <Modal open={!!addChildFor} title={`Add Child Task under: ${addChildFor.name}`} onClose={() => setAddChildFor(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">ID *</label>
                <input type="text" value={newTask.code} onChange={e => setNewTask(p => ({ ...p, code: e.target.value }))}
                  placeholder={`${addChildFor.code}a`}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name *</label>
                <input type="text" value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
              <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="ghost" onClick={() => setAddChildFor(null)}>Cancel</ActionButton>
              <ActionButton variant="green" onClick={() => handleAddRelated(addChildFor, true)}>Add Task</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Delete Confirmation ---- */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} title="Delete Task" onClose={() => setConfirmDelete(null)}>
          <p className="mb-4 text-sm text-bp-text">Delete task <strong>{confirmDelete.code}: {confirmDelete.name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</ActionButton>
            <ActionButton variant="red" onClick={() => handleDeleteTask(confirmDelete)} disabled={deleteTask.isPending}>
              {deleteTask.isPending ? 'Deleting...' : 'Delete'}
            </ActionButton>
          </div>
        </Modal>
      )}
    </div>
  )
}
