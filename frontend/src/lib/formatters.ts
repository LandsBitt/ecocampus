const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const EMPTY = '—'

function isBlank(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value)
}

export function formatNumber(value: number | null | undefined, digits?: number): string {
  if (isBlank(value)) return EMPTY
  if (digits !== undefined) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(Number(value))
  }
  return numberFormatter.format(Number(value))
}

export function formatInteger(value: number | null | undefined): string {
  if (isBlank(value)) return EMPTY
  return integerFormatter.format(Number(value))
}

export function formatCurrency(value: number | null | undefined): string {
  if (isBlank(value)) return EMPTY
  return currencyFormatter.format(Number(value))
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (isBlank(value)) return EMPTY
  return `${formatNumber(value, fractionDigits)}%`
}

/** Ex.: "-8,4%" com sinal explícito — usado em indicadores de variação. */
export function formatDelta(value: number | null | undefined, fractionDigits = 1): string {
  if (isBlank(value)) return EMPTY
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, fractionDigits)}%`
}

/** Emissão em kg CO₂; acima de 1 t passa a toneladas para não virar um número enorme. */
export function formatEmissao(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—'
  return kg >= 1000 ? `${formatNumber(kg / 1000, 2)} t CO₂` : `${formatNumber(kg, 0)} kg CO₂`
}

/** "0,0461 tCO₂/MWh (fator de 2025, provisório)" */
export function descreverFator(f: { fator: number; anoDoFator: number; provisorio: boolean }): string {
  return `${formatNumber(f.fator, 4)} tCO₂/MWh (fator de ${f.anoDoFator}${f.provisorio ? ', provisório' : ''})`
}

export type Medida = 'agua' | 'luz'

export const UNIDADES: Record<Medida, { curta: string; longa: string; nome: string }> = {
  agua: { curta: 'm³', longa: 'metros cúbicos', nome: 'Água' },
  luz: { curta: 'kWh', longa: 'quilowatt-hora', nome: 'Energia' }
}

/**
 * Formata uma medida com a unidade certa e escala legível.
 * Energia acima de 10.000 kWh vira MWh — 184,2 MWh lê melhor que 184.200 kWh.
 */
export function formatMedida(
  value: number | null | undefined,
  tipo: Medida
): { value: string; unit: string } {
  if (isBlank(value)) return { value: EMPTY, unit: UNIDADES[tipo].curta }
  const n = Number(value)
  if (tipo === 'luz' && Math.abs(n) >= 10_000) {
    return { value: formatNumber(n / 1000, 1), unit: 'MWh' }
  }
  if (tipo === 'agua' && Math.abs(n) >= 1_000_000) {
    return { value: formatNumber(n / 1000, 1), unit: 'mil m³' }
  }
  return { value: formatNumber(n, Math.abs(n) < 100 ? 1 : 0), unit: UNIDADES[tipo].curta }
}

/** Versão em texto corrido: "12.480 m³". */
/**
 * A mesma escolha de unidade e casas de `formatMedida`, mas como número:
 * é o que o mostrador animado (NumberFlow) precisa para rolar até o valor.
 */
export function medidaNumerica(
  value: number | null | undefined,
  tipo: Medida
): { n: number; casas: number; unit: string } | null {
  if (isBlank(value)) return null
  const n = Number(value)
  if (tipo === 'luz' && Math.abs(n) >= 10_000) return { n: n / 1000, casas: 1, unit: 'MWh' }
  if (tipo === 'agua' && Math.abs(n) >= 1_000_000) return { n: n / 1000, casas: 1, unit: 'mil m³' }
  return { n, casas: Math.abs(n) < 100 ? 1 : 0, unit: UNIDADES[tipo].curta }
}

export function formatMedidaInline(value: number | null | undefined, tipo: Medida): string {
  const { value: v, unit } = formatMedida(value, tipo)
  return v === EMPTY ? EMPTY : `${v} ${unit}`
}

/** Traduz m³ de água em litros por dia por pessoa — número que qualquer um entende. */
export function litrosPorDiaPorPessoa(m3Mes: number, dias = 30): string {
  const litros = (m3Mes * 1000) / dias
  return `${formatInteger(litros)} L/dia`
}

/** Variação percentual entre dois períodos. Retorna null quando não há base. */
export function variacao(atual: number, anterior: number | null | undefined): number | null {
  if (isBlank(anterior) || anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

