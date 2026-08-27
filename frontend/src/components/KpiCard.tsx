import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'

import { ExplainIcon } from '@/components/Explain'
import { Sparkline } from '@/components/charts/Sparkline'
import { useChartColors } from '@/components/charts/chart-theme'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Hint } from '@/components/ui/tooltip'
import { consumoTrend } from '@/lib/ecoScore'
import { formatDelta } from '@/lib/formatters'
import type { GlossaryTerm } from '@/lib/glossary'
import { cn } from '@/lib/utils'

export type KpiAccent = 'water' | 'energy' | 'eco' | 'brand' | 'neutral'

interface KpiCardProps {
  label: string
  value: string
  /** Unidade exibida ao lado do número, em corpo menor. */
  unit?: string
  icon?: LucideIcon
  accent?: KpiAccent
  /** Variação percentual contra o mês anterior. Queda é tratada como melhora. */
  delta?: number | null
  /** Frase de apoio: o que esse número quer dizer. */
  footnote?: React.ReactNode
  /** Série para o micrográfico. Menos de 2 pontos oculta o gráfico. */
  series?: number[]
  term?: GlossaryTerm
  loading?: boolean
  className?: string
}

const accentStyles: Record<KpiAccent, { icon: string; spark: (c: ReturnType<typeof useChartColors>) => string }> = {
  water: { icon: 'bg-water-soft text-water', spark: (c) => c.water },
  energy: { icon: 'bg-energy-soft text-energy', spark: (c) => c.energy },
  eco: { icon: 'bg-eco-soft text-eco', spark: (c) => c.eco },
  brand: { icon: 'bg-brand-soft text-brand', spark: (c) => c.brand },
  neutral: { icon: 'bg-muted text-muted-foreground', spark: (c) => c['muted-foreground'] }
}

/**
 * Cartão de indicador.
 *
 * Três camadas de leitura: o número (o que aconteceu), a variação com cor
 * (é bom ou ruim) e a nota de rodapé em linguagem comum (por que importa).
 * Quem só bate o olho lê a primeira; quem quer entender lê as três.
 */
export function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = 'neutral',
  delta,
  footnote,
  series,
  term,
  loading,
  className
}: KpiCardProps) {
  const colors = useChartColors()
  const styles = accentStyles[accent]
  const trend = consumoTrend(delta ?? null)

  if (loading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="mt-5 h-8 w-32" />
        <Skeleton className="mt-4 h-3 w-full" />
      </Card>
    )
  }

  const TrendIcon =
    trend?.direction === 'up' ? ArrowUpRight : trend?.direction === 'down' ? ArrowDownRight : Minus

  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[0.8125rem] font-medium text-muted-foreground">{label}</p>
          {term && <ExplainIcon term={term} />}
        </div>
        {Icon && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', styles.icon)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {trend && (
            <Hint
              content={
                trend.direction === 'flat'
                  ? 'Praticamente o mesmo consumo do mês anterior.'
                  : `Em relação ao mês anterior, ${trend.reading}. Aqui, consumir menos é melhor.`
              }
            >
              <span
                className={cn(
                  'inline-flex cursor-help items-center gap-1 text-xs font-medium',
                  trend.tone === 'success' && 'text-success',
                  trend.tone === 'destructive' && 'text-destructive',
                  trend.tone === 'muted' && 'text-muted-foreground'
                )}
              >
                <TrendIcon className="size-3.5" />
                {formatDelta(delta)}
                <span className="font-normal text-subtle">vs. mês anterior</span>
              </span>
            </Hint>
          )}
          {footnote && (
            <p className="text-2xs leading-relaxed text-subtle">{footnote}</p>
          )}
        </div>

        {series && series.length > 1 && (
          <div className="w-20 shrink-0 sm:w-24">
            <Sparkline values={series} color={styles.spark(colors)} height={26} />
          </div>
        )}
      </div>
    </Card>
  )
}
