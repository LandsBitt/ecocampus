import { formatDelta, formatMedidaInline, variacao } from './formatters'
import { formatMonthLong } from './date'
import { comNota } from './ecoScore'
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
  /** Contas importadas só com R$, sem consumo físico: ficam fora dos números. */
  pontosSemConsumo?: number
}): Insight[] {
  const { mes, atual, anterior, indicadores = [], escopo, pontosSemConsumo = 0 } = params
  if (!atual) return []

  const insights: Insight[] = []
  const avisoSemConsumo: Insight[] =
    pontosSemConsumo > 0
      ? [
          {
            id: 'sem-consumo',
            tone: 'warning',
            text:
              pontosSemConsumo === 1
                ? '1 ponto de medição foi importado sem consumo neste mês e não entra nos números abaixo.'
                : `${pontosSemConsumo} pontos de medição foram importados sem consumo neste mês e não entram nos números abaixo.`
          }
        ]
      : []
  const sujeito = escopo === 'universidade' ? 'A universidade' : 'O campus'

  const semDados = atual.total === 0
  if (semDados) {
    return [
      {
        id: 'sem-dados',
        tone: 'neutral',
        text: `Ainda não há consumo registrado para ${formatMonthLong(mes)}. Registre em Lançamentos ou importe a planilha da concessionária.`
      },
      ...avisoSemConsumo
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
    // Só quem tem nota disputa posição.
    const ordenado = comNota(indicadores)
    const melhor = ordenado[0]
    const pior = ordenado[ordenado.length - 1]
    if (melhor && pior && melhor.campusId !== pior.campusId) {
      insights.push({
        id: 'ranking',
        tone: 'positive',
        text: `${melhor.nome} teve o melhor desempenho do mês; ${pior.nome} é quem mais precisa de atenção.`
      })
    }

    const semCadastro = indicadores.filter((i) => i.situacao === 'sem_cadastro')
    if (semCadastro.length > 0) {
      insights.push({
        id: 'sem-cadastro',
        tone: 'warning',
        text:
          semCadastro.length === 1
            ? `${semCadastro[0].nome} ainda não tem população e área cadastradas, então está fora do ranking.`
            : `${semCadastro.length} campi ainda não têm população e área cadastradas, então estão fora do ranking.`
      })
    }

    const emRevisao = indicadores.filter((i) => i.situacao === 'em_revisao')
    if (emRevisao.length > 0) {
      insights.push({
        id: 'em-revisao',
        tone: 'neutral',
        text: `${emRevisao.map((i) => i.nome).join(', ')} ${emRevisao.length === 1 ? 'está' : 'estão'} fora do ranking por enquanto; o consumo continua contando no total da universidade.`
      })
    }
  }

  return [...insights, ...avisoSemConsumo]
}
