export interface IndicadorCampus {
  campusId: number
  nome: string
  populacao: number
  areaConstruidaM2: number
  total: number
  totalAgua: number
  totalLuz: number
  consumoAguaPerCapita: number | null
  consumoLuzPorM2: number | null
  ecoScore: number
  ecoScoreAgua: number | null
  ecoScoreLuz: number | null
  normalizado: boolean
  classificacao: 'Ecológico' | 'Atenção' | 'Crítico'
}

export interface PizzaItem {
  campusId: number
  nome: string
  total: number
}
