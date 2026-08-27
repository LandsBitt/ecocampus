import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface Step {
  id: string
  label: string
  description?: string
}

/**
 * Indicador de progresso de um fluxo de várias etapas.
 * Mostrar as três etapas desde o início reduz a sensação de "e agora?"
 * de quem está importando uma planilha pela primeira vez.
 */
export function Stepper({
  steps,
  current,
  className
}: {
  steps: Step[]
  /** Índice da etapa atual, a partir de 0. */
  current: number
  className?: string
}) {
  return (
    <ol className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2', className)}>
      {steps.map((step, index) => {
        const concluida = index < current
        const ativa = index === current

        return (
          <li key={step.id} className="flex flex-1 items-center gap-3">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-2xs font-semibold transition-colors',
                concluida && 'border-brand bg-brand text-brand-foreground',
                ativa && 'border-brand bg-brand-soft text-brand',
                !concluida && !ativa && 'border-border bg-surface text-subtle'
              )}
            >
              {concluida ? <Check className="size-3.5" /> : index + 1}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-[0.8125rem] font-medium',
                  ativa ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="block truncate text-2xs text-subtle">{step.description}</span>
              )}
            </span>

            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'hidden h-px flex-1 sm:block',
                  concluida ? 'bg-brand' : 'bg-border'
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
