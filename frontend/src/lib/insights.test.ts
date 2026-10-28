import { describe, expect, it } from 'vitest'

import { buildInsights } from './insights'
import type { AlertaPico } from './types'

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

  describe('picos (R.4)', () => {
    const pico = (campusId: number, nome: string, razao: number, extra: Partial<AlertaPico> = {}): AlertaPico => ({
      campusId,
      nome,
      medida: 'luz',
      situacao: 'pico',
      atual: razao * 1000,
      media: 1000,
      mesesNaMedia: 12,
      razao,
      demonstracao: false,
      ...extra
    })
    const atual = { agua: 100, luz: 5000 }

    it('cada pico vira um aviso no topo, com o campus e quanto ficou acima', () => {
      const insights = buildInsights({ ...base, atual, picos: [pico(2, 'Campus B', 1.45)] })
      expect(insights[0]).toEqual({
        id: 'pico-2-luz',
        tone: 'warning',
        text: 'Pico de energia em Campus B: o consumo do mês ficou 45,0% acima da média dos últimos 12 meses.'
      })
    })

    it('para o campus, não repete o nome', () => {
      const [primeiro] = buildInsights({ ...base, escopo: 'campus', atual, picos: [pico(2, 'Campus B', 1.5)] })
      expect(primeiro.text).toBe('Pico de energia: o consumo do mês ficou 50,0% acima da média dos últimos 12 meses.')
    })

    it('normal e histórico insuficiente não viram aviso', () => {
      const insights = buildInsights({
        ...base,
        atual,
        picos: [
          pico(1, 'Campus A', 1.1, { situacao: 'normal' }),
          pico(2, 'Campus B', 0, { situacao: 'historico_insuficiente', razao: null, media: null })
        ]
      })
      expect(insights.some((i) => i.id.startsWith('pico'))).toBe(false)
    })

    it('mais de três picos viram uma frase só', () => {
      const picos = [1, 2, 3, 4].map((id) => pico(id, `Campus ${id}`, 1.5))
      const insights = buildInsights({ ...base, atual, picos })
      expect(insights.filter((i) => i.id.startsWith('pico'))).toHaveLength(1)
      expect(insights[0].text).toMatch(/^4 consumos ficaram bem acima/)
    })
  })
})
