import { formatDelta, variacao, type Medida } from './formatters'
import { formatMonthLong } from './date'

/** Um pedaço da frase; `medida` marca o trecho que leva a cor do dado. */
export interface TrechoFrase {
  texto: string
  medida?: Medida
}

interface Valores {
  agua: number
  luz: number
}

const NOME: Record<Medida, string> = { agua: 'água', luz: 'energia' }

/** "setembro" no mesmo ano; "dezembro de 2025" quando o ano muda. */
export function nomeDoMes(mes: string, referencia: string): string {
  const longo = formatMonthLong(mes)
  return mes.slice(0, 4) === referencia.slice(0, 4) ? longo.replace(/ de \d{4}$/, '') : longo
}

function trechoDaMedida(medida: Medida, delta: number): TrechoFrase {
  if (Math.abs(delta) < 0.5) return { texto: `a mesma quantidade de ${NOME[medida]}`, medida }
  const quanto = formatDelta(Math.abs(delta)).replace('+', '')
  return { texto: `${quanto} ${delta < 0 ? 'menos' : 'mais'} ${NOME[medida]}`, medida }
}

/**
 * A frase de destaque da Visão geral: o dado principal do mês em português comum,
 * para ser entendido em 3 segundos. Água e energia aparecem lado a lado, nunca somadas.
 */
export function fraseDoMes(params: {
  mes: string
  mesAnterior: string
  atual: Valores | null
  anterior: Valores | null | undefined
  sujeito: string
}): TrechoFrase[] {
  const { mes, mesAnterior, atual, anterior, sujeito } = params
  if (!atual || (atual.agua === 0 && atual.luz === 0)) {
    return [{ texto: `Ainda não há consumo registrado em ${formatMonthLong(mes)}.` }]
  }

  const trechos = (['agua', 'luz'] as const)
    .map((medida) => {
      const delta = variacao(atual[medida], anterior?.[medida])
      return delta === null ? null : trechoDaMedida(medida, delta)
    })
    .filter((t): t is TrechoFrase => t !== null)

  if (trechos.length === 0) {
    return [{ texto: `Ainda não dá para comparar com ${nomeDoMes(mesAnterior, mes)}: falta o consumo daquele mês.` }]
  }

  const meio: TrechoFrase[] = trechos.length === 2 ? [trechos[0], { texto: ' e ' }, trechos[1]] : trechos
  return [{ texto: `${sujeito} gastou ` }, ...meio, { texto: ` que em ${nomeDoMes(mesAnterior, mes)}.` }]
}

/** A frase inteira como texto corrido (para leitores de tela e testes). */
export function fraseComoTexto(trechos: TrechoFrase[]): string {
  return trechos.map((t) => t.texto).join('')
}

/** A partir desta diferença (para mais ou para menos) o formulário pede para conferir o número. */
export const LIMITE_CONFERIR = 30

/**
 * Compara o consumo que está sendo digitado com o do mês anterior do mesmo
 * campus e tipo. Serve para pegar erro de digitação (um zero a mais) antes de salvar.
 */
export function comparaComMesAnterior(
  atual: number | null,
  anterior: number | null
): { quanto: string; direcao: 'mais' | 'menos' | 'igual'; conferir: boolean } | null {
  if (atual === null || !Number.isFinite(atual) || anterior === null) return null
  const delta = variacao(atual, anterior)
  if (delta === null) return null
  if (Math.abs(delta) < 0.5) return { quanto: '0%', direcao: 'igual', conferir: false }
  return {
    quanto: formatDelta(Math.abs(delta)).replace('+', ''),
    direcao: delta > 0 ? 'mais' : 'menos',
    conferir: Math.abs(delta) >= LIMITE_CONFERIR
  }
}
