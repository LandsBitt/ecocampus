import { describe, expect, it } from 'vitest'

import {
  descreverFator,
  formatDelta,
  formatEmissao,
  formatMedida,
  formatMedidaInline,
  formatNumber,
  UNIDADES,
  variacao
} from './formatters'

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

describe('números em português', () => {
  it('vírgula decimal e ponto de milhar', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5')
    expect(formatNumber(45.3, 1)).toBe('45,3')
    expect(formatNumber(null)).toBe('—')
  })

  it('variação com sinal explícito; ausente vira traço', () => {
    expect(formatDelta(12)).toBe('+12,0%')
    expect(formatDelta(-8.44)).toBe('-8,4%')
    expect(formatDelta(0)).toBe('0,0%')
    expect(formatDelta(null)).toBe('—')
  })
})

describe('pegada de carbono (R.2)', () => {
  it('kg até 1 tonelada; acima disso, toneladas', () => {
    expect(formatEmissao(461)).toBe('461 kg CO₂')
    expect(formatEmissao(2183.2)).toBe('2,18 t CO₂')
  })

  it('sem fator não vira zero', () => {
    expect(formatEmissao(null)).toBe('—')
  })

  it('o fator sai com o ano e a marca de provisório', () => {
    expect(descreverFator({ fator: 0.0461, anoDoFator: 2025, provisorio: true })).toBe(
      '0,0461 tCO₂/MWh (fator de 2025, provisório)'
    )
    expect(descreverFator({ fator: 0.0545, anoDoFator: 2024, provisorio: false })).toBe(
      '0,0545 tCO₂/MWh (fator de 2024)'
    )
  })
})
