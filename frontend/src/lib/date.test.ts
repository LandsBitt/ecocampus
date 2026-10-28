import { describe, expect, it } from 'vitest'

import {
  formatMonthLabel,
  formatMonthLong,
  formatMonthShort,
  isValidMonth,
  previousMonth,
  shiftMonth
} from './date'

describe('meses AAAA-MM', () => {
  it('valida o formato da API, recusando mês 13 e 00', () => {
    expect(isValidMonth('2026-01')).toBe(true)
    expect(isValidMonth('2026-12')).toBe(true)
    expect(isValidMonth('2026-13')).toBe(false)
    expect(isValidMonth('2026-00')).toBe(false)
    expect(isValidMonth('2026-1')).toBe(false)
    expect(isValidMonth(null)).toBe(false)
  })

  it('desloca atravessando a virada do ano', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-03', -14)).toBe('2025-01')
    expect(previousMonth('2026-01')).toBe('2025-12')
  })

  it('rótulos em português', () => {
    expect(formatMonthShort('2026-08')).toBe('ago/26')
    expect(formatMonthLabel('2026-08')).toBe('ago/2026')
    expect(formatMonthLong('2026-03')).toBe('março de 2026')
  })

  it('mês inválido vira traço, nunca "undefined"', () => {
    expect(formatMonthLabel('2026-13')).toBe('—')
    expect(formatMonthLong('')).toBe('—')
    expect(formatMonthShort('abc')).toBe('—')
  })
})
