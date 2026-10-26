import { describe, expect, it } from 'vitest'

import { toCsv } from './export'

const BOM = '﻿'

describe('toCsv (Excel em português)', () => {
  it('começa com BOM, separa por ";" e quebra linha com CRLF', () => {
    const csv = toCsv(['Campus', 'Água (m³)'], [['Juta', 100]])
    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv.slice(1)).toBe('Campus;Água (m³)\r\nJuta;100')
  })

  it('número usa vírgula decimal, para o Excel ler como número', () => {
    expect(toCsv(['x'], [[1234.56]]).slice(1)).toBe('x\r\n1234,56')
  })

  it('nulo e indefinido viram célula vazia, nunca "null" nem 0', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]]).slice(1)).toBe('a;b\r\n;')
  })

  it('texto com ";", aspas ou quebra de linha vai entre aspas', () => {
    const csv = toCsv(['t'], [['a;b'], ['diz "oi"'], ['linha\nnova']]).slice(1)
    expect(csv).toBe('t\r\n"a;b"\r\n"diz ""oi"""\r\n"linha\nnova"')
  })
})
