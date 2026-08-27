import { useId } from 'react'

import { cn } from '@/lib/utils'

interface SparklineProps {
  values: number[]
  color: string
  className?: string
  height?: number
  /** Destaca o último ponto com um marcador. */
  showLast?: boolean
}

/**
 * Micrográfico sem eixos, para dentro dos cartões de indicador.
 * SVG puro: o Recharts é pesado demais para um gráfico de 60x24px
 * e não precisamos de interação aqui.
 */
export function Sparkline({
  values,
  color,
  className,
  height = 28,
  showLast = true
}: SparklineProps) {
  const gradientId = useId()
  const clean = values.filter((v) => Number.isFinite(v))

  if (clean.length < 2) {
    return <div className={cn('h-7', className)} aria-hidden />
  }

  const width = 100
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = max - min || 1
  const stepX = width / (clean.length - 1)
  // Margem vertical de 2px em cada lado evita o traço encostar na borda.
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4)

  const points = clean.map((v, i) => [i * stepX, y(v)] as const)
  const line = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLast && <circle cx={lastX} cy={lastY} r={2} fill={color} vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}
