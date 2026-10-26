import NumberFlow from '@number-flow/react'

import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/**
 * Número de mostrador: rola até o valor quando ele muda (troca de mês) e usa
 * vírgula decimal e ponto de milhar. A unidade fica sempre colada ao valor.
 */
export function Numero({
  valor,
  casas = 0,
  unidade,
  className,
  classeUnidade
}: {
  /** `null` = sem dado: mostra um traço, nunca zero. */
  valor: number | null
  casas?: number
  unidade?: string
  className?: string
  classeUnidade?: string
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      {valor === null ? (
        <span className={cn('num font-semibold', className)}>—</span>
      ) : (
        <>
          {/* O mostrador fica num shadow DOM sem rótulo: o leitor de tela lê o texto ao lado. */}
          <NumberFlow
            value={valor}
            locales="pt-BR"
            format={{ minimumFractionDigits: casas, maximumFractionDigits: casas }}
            className={cn('num font-semibold', className)}
            aria-hidden
            willChange
          />
          <span className="sr-only">{formatNumber(valor, casas)}</span>
        </>
      )}
      {unidade && <span className={cn('font-medium text-muted-foreground', classeUnidade)}>{unidade}</span>}
    </span>
  )
}
