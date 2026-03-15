import { useParams } from 'react-router-dom'
import { PageHeader, SectionCard, LoadingState } from '../../components/ui'
import { useSCurveData } from '../../hooks/useSchedule'

/**
 * S-Curve -- cumulative planned vs actual progress.
 *
 * Custom SVG chart showing planned (blue) and actual (orange dashed)
 * progress curves over project duration.
 */

export function SCurvePage() {
  const { projectId } = useParams()
  const { data, isLoading } = useSCurveData(projectId)

  if (isLoading) return <LoadingState rows={3} />
  if (!data || data.planned.length === 0) {
    return (
      <div>
        <PageHeader title="S-Curve" icon="📈" />
        <SectionCard>
          <div className="py-10 text-center text-bp-muted">No schedule data to display.</div>
        </SectionCard>
      </div>
    )
  }

  const W = 800
  const H = 350
  const PAD = { top: 20, right: 30, bottom: 40, left: 50 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxDay = data.project_duration || 1
  const xScale = (day: number) => PAD.left + (day / maxDay) * chartW
  const yScale = (val: number) => PAD.top + chartH - (val / 100) * chartH

  const toPath = (points: Array<{ day: number; value: number }>) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.day).toFixed(1)},${yScale(p.value).toFixed(1)}`)
      .join(' ')

  return (
    <div>
      <PageHeader title="S-Curve" icon="📈">
        <span className="text-xs text-bp-muted">{data.project_duration} day duration</span>
      </PageHeader>

      <SectionCard>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-5 rounded" style={{ background: '#3b82f6' }} />
            <span className="text-[11px] text-bp-muted">Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-5 rounded" style={{ background: '#f97316', borderTop: '2px dashed #f97316' }} />
            <span className="text-[11px] text-bp-muted">Actual</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)} stroke="#334155" strokeWidth={0.5} />
              <text x={PAD.left - 8} y={yScale(v) + 3} fill="#94a3b8" fontSize={9} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <text
              key={frac}
              x={xScale(maxDay * frac)}
              y={H - 10}
              fill="#94a3b8"
              fontSize={9}
              textAnchor="middle"
            >
              Day {Math.round(maxDay * frac)}
            </text>
          ))}

          {/* Planned curve (blue solid) */}
          <path d={toPath(data.planned)} fill="none" stroke="#3b82f6" strokeWidth={2} />

          {/* Actual curve (orange dashed) */}
          <path d={toPath(data.actual)} fill="none" stroke="#f97316" strokeWidth={2} strokeDasharray="6,3" />

          {/* Axis lines */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth={1} />
          <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth={1} />
        </svg>
      </SectionCard>
    </div>
  )
}
