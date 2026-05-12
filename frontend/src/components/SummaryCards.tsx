import { Droplet, Zap, Sigma, Building2 } from 'lucide-react'

import { formatNumber } from '@/lib/formatters'
import { StatCard } from './StatCard'

interface SummaryProps {
  agua: number
  luz: number
  total: number
  totalGeral: number
  /** Optional comparison values (previous month) for trend arrows. */
  previous?: { agua?: number; luz?: number; total?: number }
}

function trend(current: number, previous: number | undefined) {
  if (previous === undefined || previous === null || previous === 0) return undefined
  const delta = ((current - previous) / previous) * 100
  const direction = Math.abs(delta) < 0.5 ? 'flat' : delta > 0 ? 'up' : 'down'
  return {
    direction: direction as 'up' | 'down' | 'flat',
    value: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`,
    invertColors: true // up = mais consumo = ruim
  }
}

export function SummaryCards({ agua, luz, total, totalGeral, previous }: SummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        accent="agua"
        icon={Droplet}
        label="Água no mês"
        value={formatNumber(agua)}
        hint="m³"
        trend={trend(agua, previous?.agua)}
      />
      <StatCard
        accent="luz"
        icon={Zap}
        label="Luz no mês"
        value={formatNumber(luz)}
        hint="kWh"
        trend={trend(luz, previous?.luz)}
      />
      <StatCard
        accent="default"
        icon={Sigma}
        label="Total do mês"
        value={formatNumber(total)}
        hint="soma de todas as medidas"
        trend={trend(total, previous?.total)}
      />
      <StatCard
        accent="ember"
        icon={Building2}
        label="Total geral universidade"
        value={formatNumber(totalGeral)}
        hint="todos os campi consolidados"
      />
    </div>
  )
}
