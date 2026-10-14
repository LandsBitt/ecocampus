import { describe, expect, it } from 'vitest'

import { buildInsights } from './insights'

const base = { mes: '2026-02', escopo: 'universidade' as const }

function textos(atual: { agua: number; luz: number }, anterior?: { agua: number; luz: number }) {
  return buildInsights({ ...base, atual, anterior }).map((i) => i.text)
}

describe('buildInsights', () => {
  it('compara cada medida com o mês anterior em frase própria (SPEC 1.7)', () => {
    const frases = textos({ agua: 110, luz: 9000 }, { agua: 100, luz: 10000 })
    expect(frases).toContain('A universidade consumiu 10,0% mais água que no mês anterior.')
    expect(frases).toContain('A universidade consumiu 10,0% menos energia que no mês anterior.')
  })

  it('não junta água e energia numa variação única', () => {
    // Somadas, 1.100 m³ + 10.000 kWh daria uma "variação total" sem sentido.
    const insights = buildInsights({ ...base, atual: { agua: 1100, luz: 10000 }, anterior: { agua: 1000, luz: 10000 } })
    expect(insights.map((i) => i.id)).not.toContain('total')
    expect(insights.find((i) => i.id === 'luz')?.text).toBe(
      'A universidade manteve o consumo de energia praticamente igual ao mês anterior.'
    )
    expect(insights.find((i) => i.id === 'agua')?.tone).toBe('negative')
  })

  it('sem base no mês anterior, não fala em variação daquela medida', () => {
    const insights = buildInsights({ ...base, atual: { agua: 100, luz: 5000 }, anterior: { agua: 0, luz: 4000 } })
    expect(insights.find((i) => i.id === 'agua')).toBeUndefined()
    expect(insights.find((i) => i.id === 'luz')?.tone).toBe('negative')
  })

  it('o volume do mês traz cada medida na própria unidade', () => {
    expect(textos({ agua: 1240, luz: 18500 })).toContain('No mês: 1.240 m³ de água e 18,5 MWh de energia.')
  })

  it('mês sem consumo de nenhuma medida mostra só o aviso de sem dados', () => {
    const insights = buildInsights({ ...base, atual: { agua: 0, luz: 0 } })
    expect(insights.map((i) => i.id)).toEqual(['sem-dados'])
  })

  it('só energia no mês ainda conta como mês com dados', () => {
    const insights = buildInsights({ ...base, atual: { agua: 0, luz: 500 } })
    expect(insights.map((i) => i.id)).toContain('volume')
  })
})
