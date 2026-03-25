export function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string, type = 'text/plain;charset=utf-8') {
  triggerDownload(new Blob([content], { type }), filename)
}
