import type { Classificacao, IndicadorCampus, Situacao } from './types'

export const ECO_CONFIG = {
  ecoThreshold: 70,
  attentionThreshold: 40
} as const

export function classifyScore(score: number): Classificacao {
  if (score >= ECO_CONFIG.ecoThreshold) return 'Ecológico'
  if (score >= ECO_CONFIG.attentionThreshold) return 'Na média'
  return 'Crítico'
}

type BadgeVariant = 'success' | 'warning' | 'destructive'
/** Semáforo: verde Ecológico, amarelo Na média, vermelho Crítico (sempre com a palavra junto). */
export type ScoreTone = 'success' | 'warning' | 'destructive'

interface ClassificacaoStyle {
  label: string
  /** Frase curta que traduz a faixa para quem não conhece o indicador. */
  meaning: string
  badge: BadgeVariant
  tone: ScoreTone
  text: string
  bg: string
  border: string
}

export const classificacaoStyles: Record<Classificacao, ClassificacaoStyle> = {
  Ecológico: {
    label: 'Ecológico',
    meaning: 'Consome bem menos que a referência da universidade.',
    badge: 'success',
    tone: 'success',
    text: 'text-success',
    bg: 'bg-success-soft',
    border: 'border-success/25'
  },
  'Na média': {
    label: 'Na média',
    meaning: 'Consome perto da referência da universidade.',
    badge: 'warning',
    tone: 'warning',
    text: 'text-warning',
    bg: 'bg-warning-soft',
    border: 'border-warning/25'
  },
  Crítico: {
    label: 'Crítico',
    meaning: 'Consome bem acima da referência da universidade.',
    badge: 'destructive',
    tone: 'destructive',
    text: 'text-destructive',
    bg: 'bg-destructive-soft',
    border: 'border-destructive/25'
  }
}

/** Classes de preenchimento por tom — fonte única para barras e medidores. */
export const toneFill: Record<ScoreTone, { bg: string; stroke: string }> = {
  success: { bg: 'bg-success', stroke: 'stroke-success' },
  warning: { bg: 'bg-warning', stroke: 'stroke-warning' },
  destructive: { bg: 'bg-destructive', stroke: 'stroke-destructive' }
}

export function styleForScore(score: number): ClassificacaoStyle {
  return classificacaoStyles[classifyScore(score)]
}

/** Por que um campus não tem nota. Só as situações diferentes de `ok` aparecem na tela. */
export const situacaoInfo: Record<Exclude<Situacao, 'ok'>, { label: string; meaning: string }> = {
  sem_dados: {
    label: 'Sem dados',
    meaning: 'Nenhum lançamento de água ou energia neste mês, então não há nota.'
  },
  sem_cadastro: {
    label: 'Sem cadastro',
    meaning: 'Falta a população ou a área construída. Sem os dois números o campus não entra no ranking.'
  },
  em_revisao: {
    label: 'Em revisão',
    meaning: 'Fora do ranking por enquanto. O consumo continua contando no total da universidade.'
  }
}

/** Texto que explica a ausência de nota de um campus; `null` quando ele tem nota. */
export function motivoSemNota(item: Pick<IndicadorCampus, 'situacao' | 'motivoForaDoRanking'>) {
  if (item.situacao === 'ok') return null
  const info = situacaoInfo[item.situacao]
  return {
    label: info.label,
    meaning: item.situacao === 'em_revisao' && item.motivoForaDoRanking
      ? `${info.meaning} Motivo: ${item.motivoForaDoRanking}`
      : info.meaning
  }
}

/** Campi que têm nota, do melhor para o pior. */
export function comNota<T extends { ecoScore: number | null }>(itens: T[]): (T & { ecoScore: number })[] {
  return itens
    .filter((item): item is T & { ecoScore: number } => item.ecoScore !== null)
    .sort((a, b) => b.ecoScore - a.ecoScore)
}

/** Ranking completo: com nota primeiro (do melhor para o pior), sem nota no fim. */
export function ordenarRanking<T extends { ecoScore: number | null }>(itens: T[]): T[] {
  return [...comNota(itens), ...itens.filter((item) => item.ecoScore === null)]
}

/** Média das notas dos campi que têm nota; `null` se nenhum tem. */
export function notaMedia(itens: { ecoScore: number | null }[]): number | null {
  const notas = comNota(itens)
  if (notas.length === 0) return null
  return notas.reduce((soma, item) => soma + item.ecoScore, 0) / notas.length
}

/**
 * Sinal de tendência para consumo: cair é bom.
 * `null` quando não há mês anterior para comparar.
 */
export function consumoTrend(deltaPercent: number | null): {
  direction: 'up' | 'down' | 'flat'
  tone: 'success' | 'destructive' | 'muted'
  /** Frase pronta para leitura, sem jargão. */
  reading: string
} | null {
  if (deltaPercent === null) return null
  if (Math.abs(deltaPercent) < 0.5) {
    return { direction: 'flat', tone: 'muted', reading: 'praticamente estável' }
  }
  if (deltaPercent < 0) {
    return { direction: 'down', tone: 'success', reading: 'consumiu menos' }
  }
  return { direction: 'up', tone: 'destructive', reading: 'consumiu mais' }
}
