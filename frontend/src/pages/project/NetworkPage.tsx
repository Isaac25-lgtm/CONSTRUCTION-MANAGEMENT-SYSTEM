import { useParams } from 'react-router-dom'
import { PageHeader, SectionCard, LoadingState } from '../../components/ui'
import { useNetworkData } from '../../hooks/useSchedule'

/**
 * Network Diagram -- AON with real nodes and edges from /api/v1/scheduling/{id}/network/.
 *
 * Nodes show ES|DUR|EF top, task name center, LS|SLACK|LF bottom.
 * Edges rendered as SVG lines between connected nodes.
 */

export function NetworkPage() {
  const { projectId } = useParams()
  const { data, isLoading } = useNetworkData(projectId)

  if (isLoading) return <LoadingState rows={4} />

  const nodes = data?.nodes || []
  const edges = data?.edges || []

  // Build a code->index lookup for positioning
  const codeIndex: Record<string, number> = {}
  nodes.forEach((n, i) => { codeIndex[n.code] = i })

  // Layout: arrange nodes in a grid (max 5 per row)
  const COLS = 5
  const NODE_W = 160
  const NODE_H = 100
  const GAP_X = 30
  const GAP_Y = 30

  const getPos = (idx: number) => ({
    x: (idx % COLS) * (NODE_W + GAP_X) + 20,
    y: Math.floor(idx / COLS) * (NODE_H + GAP_Y) + 20,
  })

  const totalW = COLS * (NODE_W + GAP_X) + 40
  const totalH = (Math.ceil(nodes.length / COLS)) * (NODE_H + GAP_Y) + 40

  return (
    <div>
      <PageHeader title="Network Diagram" icon="🔗">
        <span className="text-xs text-bp-muted">{nodes.length} activities, {edges.length} dependencies</span>
      </PageHeader>

      <SectionCard padding="none">
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 600 }}>
          <svg width={totalW} height={totalH} style={{ minWidth: totalW }}>
            {/* Edges */}
            {edges.map((e, i) => {
              const fromIdx = codeIndex[e.from]
              const toIdx = codeIndex[e.to]
              if (fromIdx === undefined || toIdx === undefined) return null
              const from = getPos(fromIdx)
              const to = getPos(toIdx)
              const isCrit = nodes[fromIdx]?.is_critical && nodes[toIdx]?.is_critical
              return (
                <line
                  key={i}
                  x1={from.x + NODE_W}
                  y1={from.y + NODE_H / 2}
                  x2={to.x}
                  y2={to.y + NODE_H / 2}
                  stroke={isCrit ? '#ef4444' : '#475569'}
                  strokeWidth={isCrit ? 2 : 1}
                  markerEnd="url(#arrow)"
                />
              )
            })}
            {/* Arrow marker */}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#475569" />
              </marker>
            </defs>

            {/* Nodes */}
            {nodes.map((n, i) => {
              const pos = getPos(i)
              const border = n.is_critical ? '#ef4444' : '#334155'
              const bg = n.is_critical ? 'rgba(239,68,68,0.08)' : '#111827'

              return (
                <g key={n.id}>
                  <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} rx={8}
                    fill={bg} stroke={border} strokeWidth={2} />
                  {/* Top: ES | DUR | EF */}
                  <text x={pos.x + 20} y={pos.y + 16} fill="#94a3b8" fontSize={10} fontFamily="monospace">{n.es}</text>
                  <text x={pos.x + NODE_W / 2} y={pos.y + 16} fill="#f59e0b" fontSize={11} fontFamily="monospace" textAnchor="middle" fontWeight="bold">{n.duration}</text>
                  <text x={pos.x + NODE_W - 20} y={pos.y + 16} fill="#94a3b8" fontSize={10} fontFamily="monospace" textAnchor="end">{n.ef}</text>
                  {/* Middle: code + name */}
                  <text x={pos.x + NODE_W / 2} y={pos.y + 38} fill="#94a3b8" fontSize={8} textAnchor="middle" fontFamily="monospace">{n.code}</text>
                  <text x={pos.x + NODE_W / 2} y={pos.y + 54} fill={n.is_critical ? '#ef4444' : '#e2e8f0'} fontSize={10} textAnchor="middle" fontWeight="600">
                    {n.name.length > 18 ? n.name.slice(0, 18) + '...' : n.name}
                  </text>
                  {/* Bottom: LS | SLACK | LF */}
                  <text x={pos.x + 20} y={pos.y + 76} fill="#94a3b8" fontSize={10} fontFamily="monospace">{n.ls}</text>
                  <text x={pos.x + NODE_W / 2} y={pos.y + 76} fill={n.slack === 0 ? '#ef4444' : '#22c55e'} fontSize={11} fontFamily="monospace" textAnchor="middle" fontWeight="bold">{n.slack}</text>
                  <text x={pos.x + NODE_W - 20} y={pos.y + 76} fill="#94a3b8" fontSize={10} fontFamily="monospace" textAnchor="end">{n.lf}</text>
                  {/* Row labels */}
                  <text x={pos.x + NODE_W / 2} y={pos.y + 92} fill="#64748b" fontSize={7} textAnchor="middle">ES|DUR|EF    LS|SLK|LF</text>
                </g>
              )
            })}
          </svg>
        </div>
      </SectionCard>
    </div>
  )
}
