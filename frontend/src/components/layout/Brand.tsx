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
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand">
        <img
          src="/image/unitau-logo.png"
          alt=""
          className="size-8 object-contain"
          aria-hidden
        />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-sm font-bold leading-none tracking-tight text-foreground">
            ECOCAMPUS
          </span>
          <span className="mt-1 block truncate text-2xs leading-none text-muted-foreground">
            UNITAU · Gestão de consumo
          </span>
        </span>
      )}
    </div>
  )
}
