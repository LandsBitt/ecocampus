/**
 * Exportação de tabelas para CSV.
 *
 * Formato pensado para o Excel em português: separador ";" e BOM UTF-8,
 * senão os acentos chegam quebrados e os números viram texto.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value)
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(';'), ...rows.map((row) => row.map(escapeCell).join(';'))]
  // BOM: o Excel só abre o CSV com acentos certos se o arquivo começar com ele.
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revogar só no próximo tick: o Safari cancela o download se for imediato.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
