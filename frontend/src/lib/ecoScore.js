export const ECO_CONFIG = {
  ecoThreshold: 70,
  attentionThreshold: 40
}

export function classifyScore(score) {
  if (score >= ECO_CONFIG.ecoThreshold) return 'Ecológico'
  if (score >= ECO_CONFIG.attentionThreshold) return 'Atenção'
  return 'Crítico'
}