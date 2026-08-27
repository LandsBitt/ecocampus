import { formatDelta, formatMedidaInline, variacao } from './formatters'
import { formatMonthLong } from './date'
import type { IndicadorCampus } from './types'

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'warning'

export interface Insight {
  id: string
  tone: InsightTone
  /** Frase curta e direta, em português comum. Sem jargão de indicador. */
  text: string
}

interface ResumoValores {
  agua: number
  luz: number
  total: number
}

/**
 * Traduz os números do mês em frases que qualquer pessoa entende.
 *
 * A tela mostra os valores; estas frases dizem o que eles significam.
 * É o que separa um painel "de dados" de um painel que informa.
 */
export function buildInsights(params: {
  mes: string
  atual: ResumoValores | null
  anterior?: ResumoValores | null
  indicadores?: IndicadorCampus[]
  escopo: 'universidade' | 'campus'
}): Insight[] {
  const { mes, atual, anterior, indicadores = [], escopo } = params
  if (!atual) return []

  const insights: Insight[] = []
  const sujeito = escopo === 'universidade' ? 'A universidade' : 'O campus'

  const semDados = atual.total === 0
  if (semDados) {
    return [
      {
        id: 'sem-dados',
        tone: 'neutral',
        text: `Ainda não há consumo registrado para ${formatMonthLong(mes)}. Registre em Lançamentos ou importe a planilha da concessionária.`
      }
    ]
  }

  // 1. Movimento em relação ao mês anterior — o dado que mais interessa.
  const deltaTotal = variacao(atual.total, anterior?.total)
  if (deltaTotal !== null) {
    if (Math.abs(deltaTotal) < 0.5) {
      insights.push({
        id: 'total',
        tone: 'neutral',
        text: `${sujeito} manteve o consumo praticamente igual ao mês anterior.`
      })
    } else if (deltaTotal < 0) {
      insights.push({
        id: 'total',
        tone: 'positive',
        text: `${sujeito} consumiu ${formatDelta(Math.abs(deltaTotal)).replace('+', '')} a menos que no mês anterior.`
      })
    } else {
      insights.push({
        id: 'total',
        tone: 'negative',
        text: `${sujeito} consumiu ${formatDelta(deltaTotal).replace('+', '')} a mais que no mês anterior.`
      })
    }
  }

  // 2. Qual das duas medidas puxou a variação.
  const deltaAgua = variacao(atual.agua, anterior?.agua)
  const deltaLuz = variacao(atual.luz, anterior?.luz)
  if (deltaAgua !== null && deltaLuz !== null) {
    const piorAgua = deltaAgua > deltaLuz
    const pior = piorAgua ? deltaAgua : deltaLuz
    const nome = piorAgua ? 'a água' : 'a energia'
    if (pior > 2) {
      insights.push({
        id: 'driver',
        tone: 'negative',
        text: `A alta veio principalmente de ${nome} (${formatDelta(pior)} no mês).`
      })
    } else if (pior < -2) {
      insights.push({
        id: 'driver',
        tone: 'positive',
        text: `A queda foi puxada por ${piorAgua ? 'a energia' : 'a água'} e ${nome} também caiu (${formatDelta(pior)}).`
      })
    }
  }

  // 3. Volume do mês, em unidade legível.
  insights.push({
    id: 'volume',
    tone: 'neutral',
    text: `No total: ${formatMedidaInline(atual.agua, 'agua')} de água e ${formatMedidaInline(atual.luz, 'luz')} de energia.`
  })

  // 4. Destaques do ranking (só faz sentido comparando campi).
  if (escopo === 'universidade' && indicadores.length > 1) {
    const ordenado = [...indicadores].sort((a, b) => b.ecoScore - a.ecoScore)
    const melhor = ordenado[0]
    const pior = ordenado[ordenado.length - 1]
    if (melhor && pior && melhor.campusId !== pior.campusId) {
      insights.push({
        id: 'ranking',
        tone: 'positive',
        text: `${melhor.nome} teve o melhor desempenho do mês; ${pior.nome} é quem mais precisa de atenção.`
      })
    }

    const semDemografia = indicadores.filter((i) => !i.normalizado)
    if (semDemografia.length > 0) {
      insights.push({
        id: 'sem-demografia',
        tone: 'warning',
        text:
          semDemografia.length === 1
            ? `${semDemografia[0].nome} ainda não tem população e área cadastradas, então sua nota não é comparável às demais.`
            : `${semDemografia.length} campi ainda não têm população e área cadastradas, então suas notas não são comparáveis às demais.`
      })
    }
  }

  return insights
}
