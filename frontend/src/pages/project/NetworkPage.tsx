import { useParams } from 'react-router-dom'
import { PageHeader, SectionCard, LoadingState } from '../../components/ui'
import { useNetworkData, type NetworkNode } from '../../hooks/useSchedule'

/**
 * Network Diagram -- AON with dependency-depth layout matching the prototype.
 *
 * Prototype algorithm (buildpro.html lines 1645-1662):
 * - Uses ALL tasks (parent + child)
 * - Dependency-depth layout: gl(id) recursively computes level from predecessors
 * - Node sizing: nW=160, nH=70, gX=200, gY=100, pX=80, pY=60
 * - Node text: top = "CODE: name" (14 chars), middle = "ES | DUR | EF", bottom = "LS | SLACK | LF"
 * - Critical node: fill=#7f1d1d, stroke=#ef4444, strokeWidth=2
 * - Normal node: fill=#1e293b, stroke=#334155, strokeWidth=1
 * - Edge critical when BOTH source and target are critical
 * - Critical edge: stroke=#ef4444, width=2.5; Normal: stroke=#334155, width=1.5
 */

export function NetworkPage() {
  const { projectId } = useParams()
  const { data, isLoading } = useNetworkData(projectId)

  if (isLoading) return <LoadingState rows={4} />

  const nodes = data?.nodes || []
  const edges = data?.edges || []

  if (nodes.length === 0) {
    return (
      <div>
        <PageHeader title="Network Diagram" icon="network">
          <span className="text-xs text-bp-muted">0 activities</span>
        </PageHeader>
        <SectionCard>
          <div className="text-center text-sm text-bp-muted py-12">
            No tasks to display. Add tasks to the schedule to see the network diagram.
          </div>
        </SectionCard>
      </div>
    )
  }

  // Build code->node lookup and predecessor map from edges
  const codeMap: Record<string, NetworkNode> = {}
  nodes.forEach((n) => { codeMap[n.code] = n })

  const predMap: Record<string, string[]> = {}
  nodes.forEach((n) => { predMap[n.code] = [] })
  edges.forEach((e) => {
    if (predMap[e.to] && codeMap[e.from]) {
      predMap[e.to].push(e.from)
    }
  })

  // Dependency-depth layout: gl(id) from prototype
  const levels: Record<string, number> = {}
  function gl(code: string): number {
    if (levels[code] !== undefined) return levels[code]
    const preds = predMap[code] || []
    if (preds.length === 0) { levels[code] = 0; return 0 }
    const lvl = Math.max(...preds.map(gl)) + 1
    levels[code] = lvl
    return lvl
  }
  nodes.forEach((n) => gl(n.code))

  const maxLevel = Math.max(...Object.values(levels), 0)

  // Group by level
  const byLevel: Record<number, NetworkNode[]> = {}
  nodes.forEach((n) => {
    const lvl = levels[n.code]
    if (!byLevel[lvl]) byLevel[lvl] = []
    byLevel[lvl].push(n)
  })

  // Prototype dimensions
  const nW = 160, nH = 70, gX = 200, gY = 100, pX = 80, pY = 60

  // Position each node
  const pos: Record<string, { x: number; y: number }> = {}
  for (let l = 0; l <= maxLevel; l++) {
    (byLevel[l] || []).forEach((n, i) => {
      pos[n.code] = { x: pX + l * gX, y: pY + i * gY }
    })
  }

  const svgW = pX * 2 + maxLevel * gX + nW
  const maxY = Math.max(...Object.values(pos).map((p) => p.y), 0)
  const svgH = maxY + nH + pY

  // Critical lookup by code
  const critMap: Record<string, boolean> = {}
  nodes.forEach((n) => { critMap[n.code] = n.is_critical })

  return (
    <div>
      <PageHeader title="Network Diagram" icon="network">
        <span className="text-xs text-bp-muted">{nodes.length} activities, {edges.length} dependencies</span>
      </PageHeader>

      <SectionCard padding="none">
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 700 }}>
          <svg width={svgW} height={svgH} style={{ minWidth: 600 }}>
            {/* Arrow marker definitions */}
            <defs>
              <marker id="arrow-crit" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#ef4444" />
              </marker>
              <marker id="arrow-norm" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#334155" />
              </marker>
            </defs>

            {/* Edges -- rendered first so nodes draw on top */}
            {edges.map((e) => {
              const fromPos = pos[e.from]
              const toPos = pos[e.to]
              if (!fromPos || !toPos) return null
              const bothCritical = critMap[e.from] && critMap[e.to]
              return (
                <line
                  key={`${e.from}-${e.to}`}
                  x1={fromPos.x + nW}
                  y1={fromPos.y + nH / 2}
                  x2={toPos.x}
                  y2={toPos.y + nH / 2}
                  stroke={bothCritical ? '#ef4444' : '#334155'}
                  strokeWidth={bothCritical ? 2.5 : 1.5}
                  markerEnd={bothCritical ? 'url(#arrow-crit)' : 'url(#arrow-norm)'}
                />
              )
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const p = pos[n.code]
              if (!p) return null
              const crit = n.is_critical
              const fillColor = crit ? '#7f1d1d' : '#1e293b'
              const strokeColor = crit ? '#ef4444' : '#334155'
              const sw = crit ? 2 : 1
              const textColor = crit ? '#ef4444' : '#93c5fd'

              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`}>
                  {/* Background rect */}
                  <rect
                    width={nW} height={nH} rx={8}
                    fill={fillColor} stroke={strokeColor} strokeWidth={sw}
                  />
                  {/* Top line: CODE: name (truncated to 14 chars) */}
                  <text
                    x={nW / 2} y={14} textAnchor="middle"
                    fill={textColor} fontSize={11} fontWeight={700}
                  >
                    {n.code}: {n.name.slice(0, 14)}
                  </text>
                  {/* Divider */}
                  <line x1={8} y1={24} x2={nW - 8} y2={24} stroke="#334155" strokeWidth={0.5} />
                  {/* Middle: ES | DUR | EF */}
                  <text
                    x={nW / 2} y={40} textAnchor="middle"
                    fill="#e2e8f0" fontSize={10} fontFamily="monospace"
                  >
                    {n.es} | {n.duration} | {n.ef}
                  </text>
                  {/* Bottom: LS | SLACK | LF */}
                  <text
                    x={nW / 2} y={56} textAnchor="middle"
                    fill="#94a3b8" fontSize={10} fontFamily="monospace"
                  >
                    {n.ls} | {n.slack} | {n.lf}
                  </text>
                  {/* Progress bar at bottom if progress > 0 */}
                  {n.progress > 0 && (
                    <>
                      <rect x={8} y={nH - 8} width={nW - 16} height={3} rx={1} fill="#1e293b" />
                      <rect
                        x={8} y={nH - 8}
                        width={Math.max(((nW - 16) * n.progress) / 100, 1)} height={3} rx={1}
                        fill={crit ? '#ef4444' : '#22c55e'}
                      />
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </SectionCard>
    </div>
  )
}
