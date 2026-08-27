import { AlertTriangle, Info, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Insight, InsightTone } from '@/lib/insights'
import { cn } from '@/lib/utils'

const toneStyles: Record<InsightTone, { icon: typeof Info; className: string }> = {
  positive: { icon: TrendingDown, className: 'text-success' },
  negative: { icon: TrendingUp, className: 'text-destructive' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  neutral: { icon: Info, className: 'text-muted-foreground' }
}

/**
 * "O que os números dizem" — a ponte entre o painel e quem não lê indicadores.
 *
 * As frases são geradas a partir dos mesmos dados exibidos nos gráficos, então
 * nunca divergem deles. Fica no topo da tela porque é a leitura mais rápida
 * possível do mês.
 */
export function InsightPanel({
  insights,
  loading,
  className
}: {
  insights: Insight[]
  loading?: boolean
  className?: string
}) {
  if (loading) {
    return (
      <Card variant="flat" className={cn('p-5', className)}>
        <Skeleton className="h-3 w-32" />
        <div className="mt-4 space-y-2.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </Card>
    )
  }

  if (insights.length === 0) return null

  return (
    <Card variant="flat" className={cn('p-5', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-brand" />
        <h2 className="eyebrow">Resumo do mês</h2>
      </div>
      <ul className="space-y-2.5">
        {insights.map((insight) => {
          const { icon: Icon, className: toneClass } = toneStyles[insight.tone]
          return (
            <li key={insight.id} className="flex items-start gap-2.5">
              <Icon className={cn('mt-0.5 size-4 shrink-0', toneClass)} />
              <p className="text-[0.8125rem] leading-relaxed text-foreground">{insight.text}</p>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
