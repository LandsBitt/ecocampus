export function getCurrentMonth(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export function previousMonth(value: string, offset = 1): string {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 - offset, 1))
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${m}`
}

export function formatMonthLabel(value: string): string {
  if (!value) return '-'
  const [year, month] = value.split('-')
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'
  ]
  const idx = Math.max(0, Math.min(11, parseInt(month, 10) - 1))
  return `${months[idx]}/${year.slice(2)}`
}
