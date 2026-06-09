export function saveBlob(blob, filename) {
  if (typeof window === 'undefined') return
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function saveExport(blob, baseName) {
  const date = new Date().toISOString().slice(0, 10)
  saveBlob(blob, `${baseName}_${date}.xlsx`)
}
