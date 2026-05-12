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

export const classificacaoStyles: Record<
  Classificacao,
  { label: string; bg: string; text: string; ring: string }
> = {
  Ecológico: {
    label: 'Ecológico',
    bg: 'bg-success/15',
    text: 'text-success',
    ring: 'ring-success/30'
  },
  Atenção: {
    label: 'Atenção',
    bg: 'bg-warning/15',
    text: 'text-warning',
    ring: 'ring-warning/30'
  },
  Crítico: {
    label: 'Crítico',
    bg: 'bg-destructive/15',
    text: 'text-destructive',
    ring: 'ring-destructive/30'
  }
}
