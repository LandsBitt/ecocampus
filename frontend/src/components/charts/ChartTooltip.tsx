import type { TooltipProps } from 'recharts'

import { cn } from '@/lib/utils'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

/** Caixa de tooltip usada por todos os gráficos — mesma anatomia em todos. */
export function TooltipCard({
  title,
  rows,
  footer,
  className
}: {
  title: string
  rows: TooltipRow[]
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-w-[9rem] rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
        className
      )}
    >
      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && (
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-2xs text-subtle">{footer}</div>}
    </div>
  )
}

/** Adaptador para o Recharts: recebe o payload e delega ao TooltipCard. */
export function makeTooltip(
  render: (payload: NonNullable<TooltipProps<number, string>['payload']>, label: string) => React.ReactNode
) {
  return function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload || payload.length === 0) return null
    return <>{render(payload, String(label ?? ''))}</>
  }
}
