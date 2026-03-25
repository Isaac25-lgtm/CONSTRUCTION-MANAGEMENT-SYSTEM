import type { AIWorkspaceIntelligence } from '../hooks/useAI'

interface AIWorkspaceGeneratedOutput {
  executiveBrief?: string
  reportDraft?: string
  copilotAnswer?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(value)
}

function renderChartRows(items: Array<{ label: string; value: number; color: string }>) {
  if (!items.length) {
    return '<p class="muted">No chart data available.</p>'
  }
  const max = Math.max(...items.map((item) => item.value), 1)
  return items
    .map((item) => {
      const width = Math.max(6, (item.value / max) * 100)
      return `
        <div class="chart-row">
          <div class="chart-meta">
            <span>${escapeHtml(item.label)}</span>
            <strong>${formatNumber(item.value)}</strong>
          </div>
          <div class="chart-track">
            <div class="chart-fill" style="width:${width}%;background:${item.color}"></div>
          </div>
        </div>
      `
    })
    .join('')
}

export function buildAIWorkspaceHtmlReport(
  intelligence: AIWorkspaceIntelligence,
  generated: AIWorkspaceGeneratedOutput,
) {
  const outputBlocks = [
    generated.executiveBrief
      ? `<section><h2>Executive Brief</h2><pre>${escapeHtml(generated.executiveBrief)}</pre></section>`
      : '',
    generated.reportDraft
      ? `<section><h2>AI Report Draft</h2><pre>${escapeHtml(generated.reportDraft)}</pre></section>`
      : '',
    generated.copilotAnswer
      ? `<section><h2>Latest Copilot Answer</h2><pre>${escapeHtml(generated.copilotAnswer)}</pre></section>`
      : '',
  ].filter(Boolean)

  const budgetChart = intelligence.charts.budget_categories
    .map((item) => {
      const max = Math.max(...intelligence.charts.budget_categories.map((entry) => entry.budget), 1)
      const budgetWidth = Math.max(4, (item.budget / max) * 100)
      const actualWidth = Math.max(4, (item.actual / max) * 100)
      return `
        <div class="chart-row">
          <div class="chart-meta">
            <span>${escapeHtml(item.label)}</span>
            <strong>UGX ${formatNumber(item.actual)} / ${formatNumber(item.budget)}</strong>
          </div>
          <div class="chart-track dual">
            <div class="chart-fill budget" style="width:${budgetWidth}%"></div>
            <div class="chart-fill actual" style="width:${actualWidth}%"></div>
          </div>
        </div>
      `
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(intelligence.project.name)} - BuildPro AI Workspace</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f3f7fb; color: #102033; }
    .page { max-width: 1100px; margin: 0 auto; padding: 32px; }
    .hero { background: linear-gradient(135deg, #09203f 0%, #1f4b73 45%, #f59e0b 130%); color: white; padding: 28px; border-radius: 20px; }
    .hero p { margin: 8px 0 0; line-height: 1.5; }
    .grid { display: grid; gap: 16px; margin-top: 20px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card, section { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .metric { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .muted { color: #5b6b7e; }
    h1, h2, h3 { margin: 0; }
    h2 { margin-bottom: 12px; font-size: 18px; }
    pre { white-space: pre-wrap; line-height: 1.55; font-family: Arial, sans-serif; margin: 0; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 0 0 8px; }
    .health { display: inline-block; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; margin-top: 12px; background: rgba(255,255,255,0.16); }
    .chart-row { margin-bottom: 12px; }
    .chart-meta { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin-bottom: 6px; }
    .chart-track { height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; position: relative; }
    .chart-track.dual { height: 14px; }
    .chart-fill { height: 100%; border-radius: 999px; }
    .chart-fill.budget { background: rgba(59,130,246,0.35); position: absolute; left: 0; top: 0; }
    .chart-fill.actual { background: #f97316; position: absolute; left: 0; top: 0; opacity: 0.92; }
    .actions li strong { text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; margin-right: 6px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1>${escapeHtml(intelligence.project.name)} AI Workspace Report</h1>
      <p>${escapeHtml(intelligence.narrative.headline)}</p>
      <div class="health">${escapeHtml(intelligence.health.overall.label)}</div>
    </div>

    <div class="grid">
      ${intelligence.highlights.map((item) => `
        <div class="card">
          <div class="muted">${escapeHtml(item.label)}</div>
          <div class="metric">${escapeHtml(item.value)}</div>
          <div class="muted">${escapeHtml(item.detail)}</div>
        </div>
      `).join('')}
    </div>

    <div class="grid">
      <section>
        <h2>Progress Distribution</h2>
        ${renderChartRows(intelligence.charts.progress_distribution)}
      </section>
      <section>
        <h2>EVM Indices</h2>
        ${renderChartRows(intelligence.charts.evm_indices.map((item) => ({
          label: `${item.label} vs ${item.target.toFixed(2)} target`,
          value: Math.round(item.value * 100),
          color: item.color,
        })))}
      </section>
    </div>

    <div class="grid">
      <section>
        <h2>Budget Categories</h2>
        ${budgetChart || '<p class="muted">No budget data available.</p>'}
      </section>
      <section>
        <h2>Risk Mix</h2>
        ${renderChartRows(intelligence.charts.risk_mix)}
      </section>
    </div>

    <div class="grid">
      <section class="actions">
        <h2>Recommended Actions</h2>
        <ul>
          ${intelligence.recommended_actions.map((item) => `
            <li><strong>${escapeHtml(item.priority)}</strong>${escapeHtml(item.title)}. ${escapeHtml(item.detail)}</li>
          `).join('')}
        </ul>
      </section>
      <section>
        <h2>Suggested Questions</h2>
        <ul>
          ${intelligence.suggested_questions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>
    </div>

    ${outputBlocks.join('')}
  </div>
</body>
</html>`
}
