import { useQuery, type QueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import type {
  AlertasResponse,
  FatorEmissao,
  Campus,
  ComparacaoResponse,
  IndicadorCampus,
  IndicadorUniversidade,
  Lancamento,
  LancamentoTipo,
  PizzaItem,
  PontoSerie,
  ResumoResponse,
  Usuario
} from '@/lib/types'

/**
 * Consultas compartilhadas entre as telas.
 *
 * As chaves de cache seguem o padrão [recurso, ...parâmetros] para que uma
 * invalidação por prefixo (ex.: ['resumo']) atinja todos os meses em cache
 * depois de um lançamento ou importação.
 */

/** Tudo que é calculado a partir do consumo: refazer depois de lançar, editar, excluir ou importar. */
const DEPENDEM_DO_CONSUMO = ['lancamentos', 'resumo', 'indicadores', 'pizza', 'serie', 'comparacao', 'alertas']

export function invalidarConsumo(queryClient: QueryClient) {
  for (const chave of DEPENDEM_DO_CONSUMO) {
    queryClient.invalidateQueries({ queryKey: [chave] })
  }
}

export function useCampusList() {
  const { getToken, claims } = useAuth()
  return useQuery<Campus[]>({
    queryKey: ['campus'],
    queryFn: async () => api.get<Campus[]>('/campus', await getToken()),
    enabled: !!claims,
    staleTime: 10 * 60 * 1000
  })
}

export function useUsuarios() {
  const { getToken, claims } = useAuth()
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => api.get<Usuario[]>('/usuarios', await getToken()),
    enabled: claims?.role === 'super'
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

export function useIndicadorUniversidade(mes: string, enabled = true) {
  const { getToken, claims } = useAuth()
  return useQuery<IndicadorUniversidade>({
    queryKey: ['indicadores', 'universidade', mes],
    queryFn: async () =>
      api.get<IndicadorUniversidade>(`/indicadores/universidade?mes=${mes}`, await getToken()),
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
  /** Só os mais recentes (o Painel mostra quatro). */
  limite?: number
}

export function useLancamentos(filter: LancamentosFilter, enabled = true) {
  const { getToken, claims } = useAuth()
  const { mes, tipo = 'all', campusId = 'all', limite } = filter

  return useQuery<Lancamento[]>({
    queryKey: ['lancamentos', mes ?? null, tipo, campusId, limite ?? null],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (mes) params.set('mes', mes)
      if (tipo !== 'all') params.set('tipo', tipo)
      if (campusId !== 'all') params.set('campusId', String(campusId))
      if (limite) params.set('limite', String(limite))
      const qs = params.toString()
      return api.get<Lancamento[]>(`/lancamentos${qs ? `?${qs}` : ''}`, await getToken())
    },
    enabled: enabled && !!claims
  })
}

/** Um mês do gráfico de tendência. */
export type PontoHistorico = PontoSerie

/**
 * Série histórica dos N meses que terminam em `mesFinal`, numa chamada só (R.5).
 * Universidade para o super; o próprio campus para o papel campus.
 */
export function useSerie(mesFinal: string, meses = 12, enabled = true) {
  const { getToken, claims } = useAuth()
  const query = useQuery<PontoSerie[]>({
    queryKey: ['serie', mesFinal, meses],
    queryFn: async () => api.get<PontoSerie[]>(`/serie?ate=${mesFinal}&meses=${meses}`, await getToken()),
    enabled: enabled && !!claims,
    staleTime: 5 * 60 * 1000
  })
  return { data: query.data ?? [], isLoading: query.isLoading, isError: query.isError }
}

/** Fatores de emissão cadastrados, do ano mais antigo ao mais recente (R.2). */
export function useFatoresEmissao() {
  const { getToken, claims } = useAuth()
  return useQuery<FatorEmissao[]>({
    queryKey: ['fatores'],
    queryFn: async () => api.get<FatorEmissao[]>('/fatores-emissao', await getToken()),
    enabled: !!claims
  })
}

/** Alerta de pico de cada campus e medida no mês (R.4). */
export function useAlertasPico(mes: string, enabled = true) {
  const { getToken, claims } = useAuth()
  return useQuery<AlertasResponse>({
    queryKey: ['alertas', mes],
    queryFn: async () => api.get<AlertasResponse>(`/alertas/picos?mes=${mes}`, await getToken()),
    enabled: enabled && !!claims
  })
}

/** Comparação com o mês anterior e com o mesmo mês do ano anterior, por medida (R.3). */
export function useComparacao(mes: string, enabled = true) {
  const { getToken, claims } = useAuth()
  return useQuery<ComparacaoResponse>({
    queryKey: ['comparacao', mes],
    queryFn: async () => api.get<ComparacaoResponse>(`/comparacao?mes=${mes}`, await getToken()),
    enabled: enabled && !!claims
  })
}
