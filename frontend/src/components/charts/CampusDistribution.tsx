import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'

import { TooltipCard } from './ChartTooltip'
import { useChartColors } from './chart-theme'
import { EmptyState } from '@/components/ui/empty-state'
import { formatNumber, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { PizzaItem } from '@/lib/types'

interface CampusDistributionProps {
  data: PizzaItem[]
  /** Campus destacado — os demais são esmaecidos. */
  highlightedId?: number | null
  height?: number
}

/**
 * Participação de cada campus no consumo do mês.
 *
 * O anel sozinho é difícil de ler com 7 fatias, então ele vem acompanhado
 * de uma lista ordenada com valor e percentual — quem precisa do número
 * exato lê na lista; quem quer a proporção olha o anel.
 */
export function CampusDistribution({ data, highlightedId, height = 260 }: CampusDistributionProps) {
  const colors = useChartColors()
  const [hovered, setHovered] = useState<number | null>(null)

  const { items, total } = useMemo(() => {
    const positivos = data.filter((d) => d.total > 0)
    const total = positivos.reduce((sum, d) => sum + d.total, 0)
    const items = [...positivos]
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        share: total > 0 ? (item.total / total) * 100 : 0,
        color: colors.categorical[index % colors.categorical.length]
      }))
    return { items, total }
  }, [data, colors])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PieIcon}
        title="Sem consumo registrado neste mês"
        description="Assim que houver lançamentos no período, a divisão entre os campi aparece aqui."
      />
    )
  }

  const active = hovered ?? highlightedId ?? null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto w-full max-w-[15rem]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="total"
              nameKey="nome"
              innerRadius="64%"
              outerRadius="94%"
              paddingAngle={1.5}
              stroke={colors.surface}
              strokeWidth={2}
              isAnimationActive={false}
              onMouseEnter={(_, index) => setHovered(items[index]?.campusId ?? null)}
              onMouseLeave={() => setHovered(null)}
            >
              {items.map((item) => (
                <Cell
                  key={item.campusId}
                  fill={item.color}
                  opacity={active && item.campusId !== active ? 0.25 : 1}
                  style={{ transition: 'opacity 150ms' }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active: isActive, payload }) => {
                if (!isActive || !payload?.length) return null
                const item = payload[0].payload as (typeof items)[number]
                return (
                  <TooltipCard
                    title={item.nome}
                    rows={[
                      { label: 'Consumo', value: formatNumber(item.total), color: item.color },
                      { label: 'Participação', value: formatPercent(item.share) }
                    ]}
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total no centro do anel: o número que resume o gráfico inteiro. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="eyebrow">Total</span>
          <span className="font-display text-xl font-semibold tabular-nums">
            {formatNumber(total, 0)}
          </span>
          <span className="text-2xs text-subtle">{items.length} campi</span>
        </div>
      </div>

      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.campusId}>
            <div
              onMouseEnter={() => setHovered(item.campusId)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
                active === item.campusId ? 'bg-muted' : 'hover:bg-muted/60'
              )}
            >
              <span className="w-4 shrink-0 text-right text-2xs tabular-nums text-subtle">
                {index + 1}
              </span>
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">
                {item.nome}
              </span>
              <span className="shrink-0 text-[0.8125rem] font-medium tabular-nums text-foreground">
                {formatPercent(item.share, 1)}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
                {formatNumber(item.total, 0)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
