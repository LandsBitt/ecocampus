import type { IndicadorCampus } from '@/lib/types'

/** Indicador de um campus com nota; sobrescreva o que o teste precisar. */
export function indicador(overrides: Partial<IndicadorCampus> = {}): IndicadorCampus {
  return {
    campusId: 1,
    nome: 'Campus A',
    populacao: 1000,
    areaConstruidaM2: 10000,
    situacao: 'ok',
    motivoForaDoRanking: null,
    temDados: true,
    demonstracao: false,
    totalAgua: 400,
    totalLuz: 8000,
    consumoAguaPerCapita: 0.4,
    consumoLuzPorM2: 0.8,
    consumoLuzPerCapita: 8,
    referenciaAguaPerCapita: 0.5,
    referenciaLuzPorM2: 1,
    ecoScore: 70,
    ecoScoreAgua: 70,
    ecoScoreLuz: 70,
    classificacao: 'Ecológico',
    ...overrides
  }
}

/** Campus sem nota: sem lançamento, sem cadastro ou fora do ranking. */
export function semNota(
  situacao: 'sem_dados' | 'sem_cadastro' | 'em_revisao',
  overrides: Partial<IndicadorCampus> = {}
): IndicadorCampus {
  return indicador({
    situacao,
    temDados: situacao !== 'sem_dados',
    totalAgua: 0,
    totalLuz: 0,
    consumoAguaPerCapita: null,
    consumoLuzPorM2: null,
    consumoLuzPerCapita: null,
    ecoScore: null,
    ecoScoreAgua: null,
    ecoScoreLuz: null,
    classificacao: null,
    ...overrides
  })
}
