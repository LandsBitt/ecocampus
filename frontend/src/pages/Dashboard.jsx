import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import DashboardLayout from '../layouts/DashboardLayout'
import SummaryCards from '../components/SummaryCards'
import LancamentosTable from '../components/LancamentosTable'
import { InlineMessage } from '../components/FullScreenState'
import { api } from '../lib/api'
import { getCurrentMonth } from '../lib/date'
import { classifyScore } from '../lib/ecoScore'
import { useAuth } from '../providers/AuthProvider'

export default function Dashboard() {
  const { claims, getToken } = useAuth()
  const [mes, setMes] = useState(getCurrentMonth())

  const resumoQuery = useQuery({
    queryKey: ['resumo', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get(`/resumo?mes=${mes}`, token)
    },
    enabled: !!claims
  })

  const indicadoresQuery = useQuery({
    queryKey: ['indicadores', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get(`/indicadores?mes=${mes}`, token)
    },
    enabled: !!claims
  })

  const lancamentosQuery = useQuery({
    queryKey: ['lancamentos', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get(`/lancamentos?mes=${mes}`, token)
    },
    enabled: !!claims
  })

  const campusSummary = useMemo(() => {
    if (!resumoQuery.data) return null
    if (claims?.role === 'super') {
      const totalGeral = resumoQuery.data.totalGeral
      return {
        agua: totalGeral.agua,
        luz: totalGeral.luz,
        total: totalGeral.total,
        totalGeral: totalGeral.total
      }
    }
    const campus = resumoQuery.data.campus
    return {
      agua: campus?.agua || 0,
      luz: campus?.luz || 0,
      total: campus?.total || 0,
      totalGeral: resumoQuery.data.totalGeral?.total || 0
    }
  }, [resumoQuery.data, claims?.role])

  const campusLabel = useMemo(() => {
    if (claims?.role === 'super') return 'Visão geral da universidade'
    return resumoQuery.data?.campus?.nome || `Campus ${claims?.campusId}`
  }, [claims?.role, claims?.campusId, resumoQuery.data])

  const status = useMemo(() => {
    if (!indicadoresQuery.data) return 'Indisponível'
    if (claims?.role === 'campus') {
      const indicador = indicadoresQuery.data[0]
      return indicador?.classificacao || 'Indisponível'
    }
    const scores = indicadoresQuery.data.map((item) => item.ecoScore)
    if (!scores.length) return 'Indisponível'
    const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length
    return classifyScore(avg)
  }, [indicadoresQuery.data, claims?.role])

  const recentLancamentos = (lancamentosQuery.data || []).slice(0, 6)

  return (
    <DashboardLayout title="Dashboard" campusLabel={campusLabel} status={status}>
      <div className="flex flex-wrap items-center gap-4">
        <img
          src="/image/unitau-logo.png"
          alt="Unitau logo"
          className="h-12 w-12 rounded-2xl bg-white/5 p-2 object-contain"
        />
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate/70">
          <span className="mr-2 text-xs uppercase tracking-[0.2em] text-slate/50">Mês</span>
          <input
            type="month"
            value={mes}
            onChange={(event) => setMes(event.target.value)}
            className="bg-transparent text-slate/80 outline-none"
          />
        </div>
      </div>

      {resumoQuery.isLoading ? (
        <InlineMessage title="Carregando resumo" description="Aguarde a consolidação dos dados." />
      ) : resumoQuery.isError ? (
        <InlineMessage title="Erro ao carregar" description="Não foi possível buscar o resumo." />
      ) : (
        <SummaryCards summary={campusSummary} />
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-pearl">Últimos lançamentos</h2>
        </div>
        {lancamentosQuery.isLoading ? (
          <InlineMessage title="Carregando lançamentos" description="Buscando dados do mês." />
        ) : lancamentosQuery.isError ? (
          <InlineMessage title="Erro ao carregar" description="Não foi possível buscar lançamentos." />
        ) : (
          <LancamentosTable
            items={recentLancamentos}
            isSuper={claims?.role === 'super'}
            showActions={false}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
