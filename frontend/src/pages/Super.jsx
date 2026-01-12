import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import DashboardLayout from '../layouts/DashboardLayout'
import CampusPieChart from '../components/CampusPieChart'
import EcoRankingTable from '../components/EcoRankingTable'
import { InlineMessage } from '../components/FullScreenState'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { getCurrentMonth } from '../lib/date'
import { useAuth } from '../providers/AuthProvider'

export default function Super() {
  const { getToken } = useAuth()
  const [mes, setMes] = useState(getCurrentMonth())
  const [selectedCampusId, setSelectedCampusId] = useState('')

  const pieQuery = useQuery({
    queryKey: ['grafico-pizza', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get(`/grafico/pizza?mes=${mes}`, token)
    }
  })

  const indicadoresQuery = useQuery({
    queryKey: ['indicadores-super', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get(`/indicadores?mes=${mes}`, token)
    }
  })

  const campusOptions = useMemo(() => pieQuery.data || [], [pieQuery.data])

  const selectedCampus = useMemo(() => {
    const id = Number(selectedCampusId)
    if (!id) return null
    return campusOptions.find((item) => item.campusId === id)
  }, [campusOptions, selectedCampusId])

  const ranking = useMemo(() => {
    if (!indicadoresQuery.data) return []
    return [...indicadoresQuery.data].sort((a, b) => b.ecoScore - a.ecoScore)
  }, [indicadoresQuery.data])

  return (
    <DashboardLayout title="Relatórios" campusLabel="Visão estratégica" status="Supervisão">
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate/70">
          <span className="mr-2 text-xs uppercase tracking-[0.2em] text-slate/50">Mês</span>
          <input
            type="month"
            value={mes}
            onChange={(event) => setMes(event.target.value)}
            className="bg-transparent text-slate/80 outline-none"
          />
        </div>
        <select
          value={selectedCampusId}
          onChange={(event) => setSelectedCampusId(event.target.value)}
          className="rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
        >
          <option value="">Selecionar campus</option>
          {campusOptions.map((campus) => (
            <option key={campus.campusId} value={campus.campusId}>
              {campus.nome}
            </option>
          ))}
        </select>
        {selectedCampus && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate/50">Total do campus</p>
            <p className="font-display text-lg text-pearl">{formatCurrency(selectedCampus.total)}</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {pieQuery.isLoading ? (
          <InlineMessage title="Carregando gráfico" description="Gerando distribuição por campus." />
        ) : pieQuery.isError ? (
          <InlineMessage title="Erro" description="Não foi possível carregar o gráfico." />
        ) : (
          <CampusPieChart data={pieQuery.data || []} highlightedId={Number(selectedCampusId) || null} />
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg text-pearl">Ranking ecológico</h3>
          <p className="mt-2 text-sm text-slate/70">
            Os campi mais eficientes aparecem no topo.
          </p>
          <div className="mt-6">
            {indicadoresQuery.isLoading ? (
              <InlineMessage title="Carregando" description="Buscando indicadores." />
            ) : indicadoresQuery.isError ? (
              <InlineMessage title="Erro" description="Não foi possível carregar indicadores." />
            ) : (
              <EcoRankingTable items={ranking} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}