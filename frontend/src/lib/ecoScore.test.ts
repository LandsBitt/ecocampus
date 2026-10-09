import { describe, expect, it } from 'vitest'

import { classifyScore, comNota, motivoSemNota, notaMedia, ordenarRanking } from './ecoScore'

describe('classifyScore', () => {
  // As mesmas fronteiras do backend (app/core/eco_score.py).
  it.each([
    [100, 'Ecológico'],
    [70, 'Ecológico'],
    [69.99, 'Na média'],
    [50, 'Na média'],
    [40, 'Na média'],
    [39.99, 'Crítico'],
    [0, 'Crítico']
  ])('nota %s → %s', (nota, faixa) => {
    expect(classifyScore(nota)).toBe(faixa)
  })
})

describe('campi sem nota', () => {
  const itens = [
    { id: 'sem', ecoScore: null },
    { id: 'b', ecoScore: 30 },
    { id: 'a', ecoScore: 70 }
  ]

  it('a média ignora quem não tem nota', () => {
    expect(notaMedia(itens)).toBe(50)
  })

  it('sem nenhuma nota a média é nula, nunca 0 nem 100', () => {
    expect(notaMedia([{ ecoScore: null }, { ecoScore: null }])).toBeNull()
    expect(notaMedia([])).toBeNull()
  })

  it('o ranking põe quem não tem nota no fim', () => {
    expect(ordenarRanking(itens).map((i) => i.id)).toEqual(['a', 'b', 'sem'])
    expect(comNota(itens).map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('explica por que não há nota', () => {
    expect(motivoSemNota({ situacao: 'ok', motivoForaDoRanking: null })).toBeNull()
    expect(motivoSemNota({ situacao: 'sem_dados', motivoForaDoRanking: null })?.label).toBe('Sem dados')
    expect(motivoSemNota({ situacao: 'sem_cadastro', motivoForaDoRanking: null })?.label).toBe('Sem cadastro')
    const revisao = motivoSemNota({ situacao: 'em_revisao', motivoForaDoRanking: 'Pontos em revisão' })
    expect(revisao?.label).toBe('Em revisão')
    expect(revisao?.meaning).toContain('Pontos em revisão')
  })
})
