import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { apiFetch } from './api'
import type { IndicadorCampus, PizzaItem } from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ─── badge ───────────────────────────────────────────────────────────────────

const BADGE: Record<string, string> = {
  'Ecológico': 'bg-eco-100 text-eco-700 ring-eco-200',
  'Atenção':   'bg-yellow-100 text-yellow-700 ring-yellow-200',
  'Crítico':   'bg-red-100 text-red-700 ring-red-200',
}

function ClassBadge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[label] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
      {label}
    </span>
  )
}

// ─── medal position ───────────────────────────────────────────────────────────

function Medal({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-lg leading-none">🥇</span>
  if (pos === 2) return <span className="text-lg leading-none">🥈</span>
  if (pos === 3) return <span className="text-lg leading-none">🥉</span>
  return <span className="w-5 text-center text-sm font-semibold text-gray-400">{pos}</span>
}

// ─── ranking table ────────────────────────────────────────────────────────────

function RankingTable({ items }: { items: IndicadorCampus[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        Nenhum dado disponível para este período.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Campus</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Água/pessoa</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Luz/m²</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Eco score</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <tr key={item.campusId} className={idx === 0 ? 'bg-eco-50/60' : 'hover:bg-gray-50/60'}>
              <td className="px-4 py-3 text-center">
                <Medal pos={idx + 1} />
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-800">{item.nome}</span>
                {!item.normalizado && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-yellow-500">
                    sem dados demográficos
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {fmt(item.consumoAguaPerCapita)} <span className="text-gray-400">L</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {fmt(item.consumoLuzPorM2)} <span className="text-gray-400">kWh</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-base font-bold text-gray-800">{item.ecoScore.toFixed(1)}</span>
                <span className="text-gray-400">/100</span>
              </td>
              <td className="px-4 py-3">
                <ClassBadge label={item.classificacao} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── pie chart ────────────────────────────────────────────────────────────────

const COLORS = ['#4ade80', '#fb923c', '#60a5fa', '#c084fc', '#f9a8d4', '#fde68a', '#6ee7b7', '#a5b4fc']

function ConsumoPieChart({ data }: { data: PizzaItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
        Sem dados para exibir.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="nome" innerRadius={60} outerRadius={100} paddingAngle={2} stroke="#fff" strokeWidth={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${fmt(value, 0)} kWh+L (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem', border: '1px solid #e5e7eb' }}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem', color: '#6b7280' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── methodology section ──────────────────────────────────────────────────────

function Methodology() {
  return (
    <section className="rounded-2xl border border-eco-200 bg-eco-50 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-eco-800">Como o Eco Score é calculado?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
          <p className="text-sm font-semibold text-gray-700">1. Normalização por porte</p>
          <p className="text-sm text-gray-500">
            O consumo de água é dividido pelo número de alunos e funcionários (<em>litros/pessoa</em>),
            e o consumo de energia pela área construída (<em>kWh/m²</em>). Isso torna a comparação
            justa entre campi de tamanhos diferentes.
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
          <p className="text-sm font-semibold text-gray-700">2. Score relativo à média</p>
          <p className="text-sm text-gray-500">
            Cada valor é comparado com a média de todos os campi. Consumir 50% da média gera
            score 100. Consumir 150% ou mais gera score 0. O score final é a média dos dois
            indicadores.
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
          <p className="text-sm font-semibold text-gray-700">3. Classificação</p>
          <ul className="mt-1 space-y-1 text-sm text-gray-500">
            <li><ClassBadge label="Ecológico" /> — score ≥ 70</li>
            <li className="mt-1"><ClassBadge label="Atenção" /> — score entre 40 e 69</li>
            <li className="mt-1"><ClassBadge label="Crítico" /> — score &lt; 40</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
          <p className="text-sm font-semibold text-gray-700">4. Dados e periodicidade</p>
          <p className="text-sm text-gray-500">
            Os lançamentos são feitos mensalmente pela equipe de cada campus. Use o seletor de mês
            no topo para navegar entre os períodos disponíveis.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
}

// ─── app ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [mes, setMes] = useState(getCurrentMonth())

  const rankingQuery = useQuery<IndicadorCampus[]>({
    queryKey: ['public-ranking', mes],
    queryFn: () => apiFetch<IndicadorCampus[]>(`/public/ranking?mes=${mes}`),
  })

  const pizzaQuery = useQuery<PizzaItem[]>({
    queryKey: ['public-pizza', mes],
    queryFn: () => apiFetch<PizzaItem[]>(`/public/pizza?mes=${mes}`),
  })

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <span className="text-base font-bold text-eco-700">EcoCampus</span>
            <span className="hidden text-sm text-gray-400 sm:block">· Painel Público</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="mes" className="text-xs text-gray-500">Mês</label>
            <input
              id="mes"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-eco-500 focus:outline-none focus:ring-1 focus:ring-eco-500"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* intro */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Desempenho ecológico dos campi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe o consumo de água e energia de cada campus da Unitau de forma
            transparente e acessível a toda a comunidade acadêmica.
          </p>
        </div>

        {/* ranking */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-700">Ranking — Eco Score</h2>
          {rankingQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rankingQuery.isError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              Não foi possível carregar o ranking. Tente novamente mais tarde.
            </p>
          ) : (
            <RankingTable items={rankingQuery.data ?? []} />
          )}
        </section>

        {/* pie chart */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-700">Distribuição do consumo total</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {pizzaQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : pizzaQuery.isError ? (
              <p className="py-8 text-center text-sm text-red-500">
                Não foi possível carregar o gráfico.
              </p>
            ) : (
              <ConsumoPieChart data={pizzaQuery.data ?? []} />
            )}
          </div>
        </section>

        {/* methodology */}
        <Methodology />

        <footer className="pb-4 text-center text-xs text-gray-400">
          Dados atualizados mensalmente pela equipe de gestão ambiental · EcoCampus Unitau
        </footer>
      </main>
    </div>
  )
}
