/** Render AI markdown text as styled HTML — handles **bold**, headings, lists, line breaks */
export function renderAIMarkdown(text: string): string {
  const html = text
    // Escape HTML entities
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers: ### → h4, ## → h3, # → h2
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;color:#f59e0b;margin:14px 0 6px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#e2e8f0;margin:16px 0 8px;border-bottom:1px solid #334155;padding-bottom:4px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:#f59e0b;margin:16px 0 8px;border-bottom:2px solid #f59e0b;padding-bottom:6px">$1</h2>')
    // Bold: **text** → <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9;font-weight:700">$1</strong>')
    // Italic: *text* → <em>
    .replace(/\*(.+?)\*/g, '<em style="color:#cbd5e1">$1</em>')
    // Bullet lists: - item or * item
    .replace(/^[\-\*] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
    // Numbered lists: 1. item
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;list-style-type:decimal">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="margin:8px 0;padding-left:18px;list-style-type:disc">$1</ul>')
    // Horizontal rule: ---
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #334155;margin:12px 0"/>')
    // Line breaks: double newline → paragraph break, single → <br>
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br/>')

  return '<p style="margin:8px 0">' + html + '</p>'
}
