const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
]

const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
]

/** Mês corrente no formato aceito pela API (YYYY-MM). */
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function isValidMonth(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/** Desloca um mês YYYY-MM por N posições (negativo volta no tempo). */
export function shiftMonth(value: string, offset: number): string {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function previousMonth(value: string, offset = 1): string {
  return shiftMonth(value, -offset)
}

/** Ex.: "ago/26" — para eixos de gráfico onde o espaço é curto. */
export function formatMonthShort(value: string): string {
  if (!isValidMonth(value)) return '—'
  const [year, month] = value.split('-')
  return `${MONTHS_SHORT[Number(month) - 1]}/${year.slice(2)}`
}

/** Ex.: "ago/2026" — rótulo padrão de período na interface. */
export function formatMonthLabel(value: string): string {
  if (!isValidMonth(value)) return '—'
  const [year, month] = value.split('-')
  return `${MONTHS_SHORT[Number(month) - 1]}/${year}`
}

/** Ex.: "agosto de 2026" — para frases em texto corrido. */
export function formatMonthLong(value: string): string {
  if (!isValidMonth(value)) return '—'
  const [year, month] = value.split('-')
  return `${MONTHS_LONG[Number(month) - 1]} de ${year}`
}

/** Os N meses terminando em `endMonth`, do mais antigo para o mais recente. */
