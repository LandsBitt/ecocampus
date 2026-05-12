import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts'

import type { PizzaItem } from '@/lib/types'
import { formatNumber } from '@/lib/formatters'

const COLORS = [
  'hsl(195, 80%, 65%)', // agua
  'hsl(38, 92%, 60%)',  // luz
  'hsl(158, 64%, 52%)', // eco
  'hsl(18, 88%, 65%)',  // ember
  'hsl(225, 70%, 70%)',
  'hsl(280, 60%, 70%)',
  'hsl(330, 70%, 70%)',
  'hsl(80, 50%, 65%)'
]

interface CampusPieChartProps {
  data: PizzaItem[]
  highlightedId?: number | null
}

export function CampusPieChart({ data, highlightedId }: CampusPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sem dados para exibir.
      </div>
    )
  }

  return (
    <div className="h-[320px] rounded-lg border border-border/60 bg-card/40 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="nome"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.campusId}`}
                fill={COLORS[index % COLORS.length]}
                opacity={highlightedId && entry.campusId !== highlightedId ? 0.3 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '0.75rem'
            }}
            formatter={(value: number) => [formatNumber(value), 'Total']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconSize={10}
            wrapperStyle={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
