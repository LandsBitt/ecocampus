import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  trend?: {
    direction: 'up' | 'down' | 'flat'
    value: string
    /** When true, "down" is good (consumption decreased). */
    invertColors?: boolean
  }
  accent?: 'agua' | 'luz' | 'eco' | 'ember' | 'default'
}

const accentRing: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'ring-border/50',
  agua: 'ring-agua/30',
  luz: 'ring-luz/30',
  eco: 'ring-eco/30',
  ember: 'ring-ember/30'
}

const accentText: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-foreground',
  agua: 'text-agua',
  luz: 'text-luz',
  eco: 'text-eco',
  ember: 'text-ember'
}

export function StatCard({ label, value, hint, icon: Icon, trend, accent = 'default' }: StatCardProps) {
  let trendIcon = Minus
  let trendColor = 'text-muted-foreground'
  if (trend) {
    if (trend.direction === 'up') {
      trendIcon = ArrowUpRight
      trendColor = trend.invertColors ? 'text-destructive' : 'text-success'
    } else if (trend.direction === 'down') {
      trendIcon = ArrowDownRight
      trendColor = trend.invertColors ? 'text-success' : 'text-destructive'
    }
  }
  const TrendIcon = trendIcon

  return (
    <Card
      className={cn(
        'group relative overflow-hidden ring-1 transition-all hover:-translate-y-0.5 hover:shadow-card',
        accentRing[accent]
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <div className={cn('rounded-md bg-secondary/40 p-1.5', accentText[accent])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <p className={cn('mt-4 font-display text-2xl font-semibold', accentText[accent])}>
          {value}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          {hint && <span className="text-muted-foreground">{hint}</span>}
          {trend && (
            <span className={cn('inline-flex items-center gap-1 font-medium', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
