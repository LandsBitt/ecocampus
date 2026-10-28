import { useEffect, useId, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
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
  const reduzir = useReducedMotion()

  // A linha se desenha só na primeira carga; trocar de medida ou de mês não reanima.
  const [entrando, setEntrando] = useState(!reduzir)
  useEffect(() => {
    const id = window.setTimeout(() => setEntrando(false), 1300)
    return () => window.clearTimeout(id)
  }, [])

  const { serie, media } = useMemo(() => {
    // Mês sem lançamento fica vazio (um vão na linha), nunca zero: não ter dado não é consumir zero.
    const valorDe = (ponto: PontoHistorico) =>
      tipo === 'agua' ? (ponto.temAgua ? ponto.agua : null) : ponto.temLuz ? ponto.luz : null
    const serie = data.map((ponto, index) => ({
      mes: ponto.mes,
      label: formatMonthShort(ponto.mes),
      valor: valorDe(ponto),
      anterior: index > 0 ? valorDe(data[index - 1]) : null
    }))
    const comValor = serie.filter((p): p is typeof p & { valor: number } => p.valor !== null && p.valor > 0)
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
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
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
            const delta = point.valor === null ? null : variacao(point.valor, point.anterior)
            return (
              <TooltipCard
                title={formatMonthLong(point.mes)}
                rows={[
                  {
                    label: tipo === 'agua' ? 'Água' : 'Energia',
                    value: point.valor === null ? 'sem lançamento' : formatMedidaInline(point.valor, tipo),
                    color
                  }
                ]}
                footer={
                  point.valor === null || delta === null
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
          isAnimationActive={entrando}
          animationDuration={1100}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={color}
          strokeWidth={2.5}
          dot={(props: { cx?: number; cy?: number; index?: number }) => {
            const ponto = props.index !== undefined ? serie[props.index] : undefined
            // Mês sem lançamento: nenhum ponto (o Recharts manda cy vazio e o círculo iria para o topo).
            if (!ponto || ponto.valor === null || props.cy == null) return <g key={props.index} />
            const destaque = ponto.mes === highlight
            return (
              <circle
                key={props.index}
                cx={props.cx}
                cy={props.cy}
                r={destaque ? 6 : 2.5}
                fill={color}
                stroke={destaque ? colors.surface : 'none'}
                strokeWidth={destaque ? 3 : 0}
                style={destaque ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
              />
            )
          }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
          isAnimationActive={entrando}
          animationDuration={1100}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
