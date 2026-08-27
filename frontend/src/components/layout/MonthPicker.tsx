import { useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/tooltip'
import { formatMonthLabel, getCurrentMonth } from '@/lib/date'
import { usePeriod } from '@/providers/PeriodProvider'
import { cn } from '@/lib/utils'

/**
 * Seletor de mês da barra superior.
 *
 * Navegar com as setas cobre 90% dos casos (olhar o mês passado), e o
 * calendário nativo fica disponível para saltos maiores. Meses futuros
 * são bloqueados porque nunca têm dado.
 */
export function MonthPicker({ className }: { className?: string }) {
  const { mes, setMes, step, reset, isCurrent } = usePeriod()
  const inputRef = useRef<HTMLInputElement>(null)

  // Não faz sentido avançar para um mês que ainda não terminou de ser faturado.
  const proximoBloqueado = mes >= getCurrentMonth()

  return (
    <div
      className={cn(
        'flex h-9 items-center rounded-lg border border-border bg-surface shadow-xs',
        className
      )}
    >
      <Hint content="Mês anterior">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Mês anterior"
          className="flex h-full w-8 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4" />
        </button>
      </Hint>

      <div className="relative flex h-full items-center border-x border-border">
        <button
          type="button"
          onClick={() => inputRef.current?.showPicker?.()}
          className="flex h-full items-center gap-1.5 px-3 text-[0.8125rem] font-medium tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <CalendarDays className="size-3.5 text-subtle" />
          {formatMonthLabel(mes)}
        </button>
        {/* Input nativo por cima: dá o calendário do sistema sem UI própria. */}
        <input
          ref={inputRef}
          type="month"
          value={mes}
          max={getCurrentMonth()}
          onChange={(event) => setMes(event.target.value)}
          aria-label="Escolher mês de referência"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      <Hint content={proximoBloqueado ? 'Não há dados de meses futuros' : 'Próximo mês'}>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={proximoBloqueado}
          aria-label="Próximo mês"
          className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronRight className="size-4" />
        </button>
      </Hint>

      {!isCurrent && (
        <Hint content="Voltar para o mês atual">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={reset}
            aria-label="Voltar para o mês atual"
            className="mx-0.5 h-7 w-7 rounded-md"
          >
            <RotateCcw />
          </Button>
        </Hint>
      )}
    </div>
  )
}
