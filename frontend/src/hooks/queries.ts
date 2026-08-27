import { useQueries, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { monthRange } from '@/lib/date'
import { useAuth } from '@/providers/AuthProvider'
import type {
  Campus,
  IndicadorCampus,
  Lancamento,
  LancamentoTipo,
  PizzaItem,
  ResumoResponse
} from '@/lib/types'

/**
 * Consultas compartilhadas entre as telas.
 *
 * As chaves de cache seguem o padrão [recurso, ...parâmetros] para que uma
 * invalidação por prefixo (ex.: ['resumo']) atinja todos os meses em cache
 * depois de um lançamento ou importação.
 */

export function useCampusList() {
  const { getToken, claims } = useAuth()
  return useQuery<Campus[]>({
    queryKey: ['campus'],
    queryFn: async () => api.get<Campus[]>('/campus', await getToken()),
    enabled: !!claims,
    staleTime: 10 * 60 * 1000
  })
}

export function useResumo(mes: string, enabled = true) {
  const { getToken, claims } = useAuth()
  return useQuery<ResumoResponse>({
    queryKey: ['resumo', mes],
    queryFn: async () => api.get<ResumoResponse>(`/resumo?mes=${mes}`, await getToken()),
    enabled: enabled && !!claims
  })
}

export function useIndicadores(mes: string, enabled = true) {
  const { getToken, claims } = useAuth()
  return useQuery<IndicadorCampus[]>({
    queryKey: ['indicadores', mes],
    queryFn: async () => api.get<IndicadorCampus[]>(`/indicadores?mes=${mes}`, await getToken()),
    enabled: enabled && !!claims
  })
}

export function usePizza(mes: string, enabled = true) {
  const { getToken, claims } = useAuth()
  return useQuery<PizzaItem[]>({
    queryKey: ['pizza', mes],
    queryFn: async () => api.get<PizzaItem[]>(`/grafico/pizza?mes=${mes}`, await getToken()),
    enabled: enabled && !!claims
  })
}

interface LancamentosFilter {
  mes?: string
  tipo?: LancamentoTipo | 'all'
  campusId?: string | number | 'all'
}

export function useLancamentos(filter: LancamentosFilter, enabled = true) {
  const { getToken, claims } = useAuth()
  const { mes, tipo = 'all', campusId = 'all' } = filter

  return useQuery<Lancamento[]>({
    queryKey: ['lancamentos', mes ?? null, tipo, campusId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (mes) params.set('mes', mes)
      if (tipo !== 'all') params.set('tipo', tipo)
      if (campusId !== 'all') params.set('campusId', String(campusId))
      const qs = params.toString()
      return api.get<Lancamento[]>(`/lancamentos${qs ? `?${qs}` : ''}`, await getToken())
    },
    enabled: enabled && !!claims
  })
}

export interface PontoHistorico {
  mes: string
  agua: number
  luz: number
  total: number
  /** Falso enquanto o mês ainda está carregando. */
  carregado: boolean
}

/**
 * Série histórica dos últimos N meses.
 *
 * A API expõe /resumo por mês, sem endpoint de série. Buscar N meses em
 * paralelo é aceitável nesta escala (7 campi, dados mensais) e cada mês fica
 * no cache do React Query, então navegar entre períodos reaproveita quase tudo.
 */
export function useHistoricoResumo(mesFinal: string, meses = 12, enabled = true) {
  const { getToken, claims } = useAuth()
  const lista = monthRange(mesFinal, meses)

  const results = useQueries({
    queries: lista.map((mes) => ({
      queryKey: ['resumo', mes],
      queryFn: async () => api.get<ResumoResponse>(`/resumo?mes=${mes}`, await getToken()),
      enabled: enabled && !!claims,
      staleTime: 5 * 60 * 1000
    }))
  })

  const isLoading = results.some((r) => r.isLoading)
  const isError = results.every((r) => r.isError) && results.length > 0

  const data: PontoHistorico[] = lista.map((mes, index) => {
    const result = results[index]
    const resposta = result?.data
    const bloco =
      claims?.role === 'campus' ? resposta?.campus : resposta?.totalGeral
    return {
      mes,
      agua: bloco?.agua ?? 0,
      luz: bloco?.luz ?? 0,
      total: bloco?.total ?? 0,
      carregado: !!result?.isSuccess
    }
  })

  return { data, isLoading, isError }
}
