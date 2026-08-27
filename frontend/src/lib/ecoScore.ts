import type { Classificacao } from './types'

export const ECO_CONFIG = {
  ecoThreshold: 70,
  attentionThreshold: 40
} as const

export function classifyScore(score: number): Classificacao {
  if (score >= ECO_CONFIG.ecoThreshold) return 'Ecológico'
  if (score >= ECO_CONFIG.attentionThreshold) return 'Atenção'
  return 'Crítico'
}

type BadgeVariant = 'success' | 'warning' | 'destructive'
type ProgressTone = 'success' | 'warning' | 'destructive'

interface ClassificacaoStyle {
  label: string
  /** Frase curta que traduz a faixa para quem não conhece o indicador. */
  meaning: string
  badge: BadgeVariant
  tone: ProgressTone
  text: string
  bg: string
  border: string
}

export const classificacaoStyles: Record<Classificacao, ClassificacaoStyle> = {
  Ecológico: {
    label: 'Ecológico',
    meaning: 'Consome menos que a média da universidade.',
    badge: 'success',
    tone: 'success',
    text: 'text-success',
    bg: 'bg-success-soft',
    border: 'border-success/25'
  },
  Atenção: {
    label: 'Atenção',
    meaning: 'Está próximo da média — dá para melhorar.',
    badge: 'warning',
    tone: 'warning',
    text: 'text-warning',
    bg: 'bg-warning-soft',
    border: 'border-warning/25'
  },
  Crítico: {
    label: 'Crítico',
    meaning: 'Consome bem acima da média da universidade.',
    badge: 'destructive',
    tone: 'destructive',
    text: 'text-destructive',
    bg: 'bg-destructive-soft',
    border: 'border-destructive/25'
  }
}

export function styleForScore(score: number): ClassificacaoStyle {
  return classificacaoStyles[classifyScore(score)]
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
