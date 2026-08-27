import { useId, useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import { TooltipCard } from './ChartTooltip'
import { axisProps, medidaColor, useChartColors } from './chart-theme'
import { formatMonthLong, formatMonthShort } from '@/lib/date'
import { formatDelta, formatMedidaInline, variacao, type Medida } from '@/lib/formatters'
import type { PontoHistorico } from '@/hooks/queries'

interface ConsumoTrendChartProps {
  data: PontoHistorico[]
  tipo: Medida
  height?: number
  /** Mês em destaque (o período selecionado no sistema). */
  highlight?: string
}

/**
 * Série mensal da medida selecionada, com média do período como referência.
 * A média dá ao leitor um ponto de comparação imediato: acima ou abaixo do normal.
 */
export function ConsumoTrendChart({
  data,
  tipo,
  height = 260,
  highlight
}: ConsumoTrendChartProps) {
  const colors = useChartColors()
  const gradientId = useId()
  const color = medidaColor(colors, tipo)

  const { serie, media } = useMemo(() => {
    const serie = data.map((ponto, index) => ({
      mes: ponto.mes,
      label: formatMonthShort(ponto.mes),
      valor: tipo === 'agua' ? ponto.agua : ponto.luz,
      anterior: index > 0 ? (tipo === 'agua' ? data[index - 1].agua : data[index - 1].luz) : null
    }))
    const comValor = serie.filter((p) => p.valor > 0)
    const media = comValor.length
      ? comValor.reduce((sum, p) => sum + p.valor, 0) / comValor.length
      : 0
    return { serie, media }
  }, [data, tipo])

  const axis = axisProps(colors)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axis} dy={6} interval="preserveStartEnd" minTickGap={8} />
        <YAxis
          {...axis}
          width={52}
          tickFormatter={(value: number) =>
            tipo === 'luz' && value >= 10000
              ? `${Math.round(value / 1000)}k`
              : new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
          }
        />

        {media > 0 && (
          <ReferenceLine
            y={media}
            stroke={colors['muted-foreground']}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: 'média do período',
              position: 'insideTopRight',
              fill: colors['subtle-foreground'],
              fontSize: 10,
              dy: -4
            }}
          />
        )}

        {highlight && serie.some((p) => p.mes === highlight) && (
          <ReferenceLine
            x={formatMonthShort(highlight)}
            stroke={colors.brand}
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        )}

        <Tooltip
          cursor={{ stroke: colors['muted-foreground'], strokeWidth: 1, strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as (typeof serie)[number]
            const delta = variacao(point.valor, point.anterior)
            return (
              <TooltipCard
                title={formatMonthLong(point.mes)}
                rows={[
                  {
                    label: tipo === 'agua' ? 'Água' : 'Energia',
                    value: formatMedidaInline(point.valor, tipo),
                    color
                  }
                ]}
                footer={
                  delta === null
                    ? 'Sem mês anterior para comparar'
                    : `${formatDelta(delta)} em relação ao mês anterior`
                }
              />
            )
          }}
        />

        <Area
          type="monotone"
          dataKey="valor"
          stroke="none"
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4.5, strokeWidth: 2, stroke: colors.surface }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
