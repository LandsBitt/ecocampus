import { formatDelta, formatMedidaInline, UNIDADES, variacao, type Medida } from './formatters'
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

/** Consumo físico: água em m³, energia em kWh. Nunca somados. */
interface ResumoValores {
  agua: number
  luz: number
}

const MEDIDAS: Medida[] = ['agua', 'luz']

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

  const semDados = atual.agua === 0 && atual.luz === 0
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

  // 1. Movimento de cada medida em relação ao mês anterior. Água (m³) e
  // energia (kWh) não se somam, então cada uma tem a própria frase.
  for (const medida of MEDIDAS) {
    const delta = variacao(atual[medida], anterior?.[medida])
    if (delta === null) continue
    const nome = UNIDADES[medida].nome.toLowerCase()
    if (Math.abs(delta) < 0.5) {
      insights.push({
        id: medida,
        tone: 'neutral',
        text: `${sujeito} manteve o consumo de ${nome} praticamente igual ao mês anterior.`
      })
    } else {
      const quanto = formatDelta(Math.abs(delta)).replace('+', '')
      insights.push({
        id: medida,
        tone: delta < 0 ? 'positive' : 'negative',
        text: `${sujeito} consumiu ${quanto} ${delta < 0 ? 'menos' : 'mais'} ${nome} que no mês anterior.`
      })
    }
  }

  // 2. Volume do mês, em unidade legível.
  insights.push({
    id: 'volume',
    tone: 'neutral',
    text: `No mês: ${formatMedidaInline(atual.agua, 'agua')} de água e ${formatMedidaInline(atual.luz, 'luz')} de energia.`
  })

  // 3. Destaques do ranking (só faz sentido comparando campi).
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
