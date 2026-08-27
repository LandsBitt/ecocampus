import * as React from 'react'

import { cn } from '@/lib/utils'

const toneClass = {
  brand: 'bg-brand',
  water: 'bg-water',
  energy: 'bg-energy',
  eco: 'bg-eco',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground'
} as const

export type ProgressTone = keyof typeof toneClass

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Valores fora da faixa são fixados nos limites. */
  value: number
  tone?: ProgressTone
  size?: 'sm' | 'md'
  /** Rótulo acessível — obrigatório quando a barra não tem texto ao lado. */
  label?: string
}

/** Barra de proporção. Anima ao entrar para dar leitura de grandeza. */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, tone = 'brand', size = 'md', label, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted',
          size === 'sm' ? 'h-1.5' : 'h-2',
          className
        )}
        {...props}
      >
        <div
          className={cn('h-full origin-left rounded-full animate-grow-bar', toneClass[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

/** Barra empilhada de duas partes — usada para água x energia. */
function SplitBar({
  parts,
  className,
  size = 'md'
}: {
  parts: { value: number; tone: ProgressTone; label: string }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  const total = parts.reduce((sum, p) => sum + Math.max(0, p.value), 0)
  return (
    <div
      className={cn(
        'flex w-full overflow-hidden rounded-full bg-muted',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className
      )}
    >
      {total > 0 &&
        parts.map((part) => (
          <div
            key={part.label}
            title={part.label}
            className={cn('h-full first:rounded-l-full last:rounded-r-full', toneClass[part.tone])}
            style={{ width: `${(Math.max(0, part.value) / total) * 100}%` }}
          />
        ))}
    </div>
  )
}

export { Progress, SplitBar }
