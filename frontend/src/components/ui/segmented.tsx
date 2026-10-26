import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

/**
 * Controle segmentado para escolhas curtas e mutuamente exclusivas
 * (tipo de consumo, período do gráfico). Mais rápido que um select
 * porque todas as opções ficam visíveis.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-surface-sunken p-1',
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-[0.8125rem]',
              active
                ? 'bg-surface-raised text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
