import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  /** Explique em linguagem simples o que aconteceu e o que fazer a seguir. */
  description?: string
  action?: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Estado vazio padrão. Nunca deixe uma área de dados em branco:
 * o usuário precisa saber se não há dados ou se algo falhou.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border text-center',
        size === 'sm' ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-12',
        className
      )}
    >
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
      )}
      <div className="space-y-1">
        <p className="font-display text-lg font-bold tracking-[-0.02em] text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

/** Variante de erro — mesma anatomia, tom vermelho. */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente novamente. Se persistir, avise o administrador do sistema.',
  action,
  className
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive-soft/50 px-6 py-10 text-center',
        className
      )}
    >
      <div className="space-y-1">
        <p className="font-display text-lg font-bold tracking-[-0.02em] text-destructive">{title}</p>
        <p className="mx-auto max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
