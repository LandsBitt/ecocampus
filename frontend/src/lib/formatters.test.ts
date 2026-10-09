import { describe, expect, it } from 'vitest'

import { formatMedida, formatMedidaInline, UNIDADES, variacao } from './formatters'

describe('unidades', () => {
  it('água é sempre m³ e energia é sempre kWh', () => {
    expect(UNIDADES.agua.curta).toBe('m³')
    expect(UNIDADES.luz.curta).toBe('kWh')
    expect(formatMedida(694, 'agua').unit).toBe('m³')
    expect(formatMedida(950, 'luz').unit).toBe('kWh')
  })

  it('energia grande vira MWh, mantendo o valor', () => {
    expect(formatMedida(18500, 'luz')).toEqual({ value: '18,5', unit: 'MWh' })
  })

  it('valor ausente não vira zero', () => {
    expect(formatMedidaInline(null, 'agua')).toBe('—')
  })
})

describe('variacao', () => {
  it('calcula a variação percentual', () => {
    expect(variacao(110, 100)).toBeCloseTo(10)
    expect(variacao(90, 100)).toBeCloseTo(-10)
  })

  it('sem base de comparação devolve nulo', () => {
    expect(variacao(100, 0)).toBeNull()
    expect(variacao(100, null)).toBeNull()
  })
})
