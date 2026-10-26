import { cn } from '@/lib/utils'

/**
 * Assinatura da marca: brasão da UNITAU + nome do sistema.
 * O brasão vem do arquivo institucional; nada é redesenhado aqui.
 */
export function Brand({
  compact = false,
  className
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-brand',
          compact ? 'size-12' : 'size-11'
        )}
      >
        <img
          src="/image/unitau-logo.png"
          alt={compact ? 'EcoCampus · UNITAU' : ''}
          className={compact ? 'size-11 object-contain' : 'size-10 object-contain'}
          aria-hidden={compact ? undefined : true}
        />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-lg font-bold leading-none tracking-[-0.02em] text-foreground">
            EcoCampus
          </span>
          <span className="mt-1 block truncate text-xs leading-none text-muted-foreground">
            Universidade de Taubaté
          </span>
        </span>
      )}
    </div>
  )
}
