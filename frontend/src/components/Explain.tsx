import { HelpCircle } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { glossary, type GlossaryTerm } from '@/lib/glossary'
import { cn } from '@/lib/utils'

/**
 * Marcador de termo técnico. Envolve o rótulo com um sublinhado pontilhado
 * discreto; ao passar o mouse (ou focar pelo teclado) mostra a definição
 * em linguagem simples vinda do glossário.
 */
export function Explain({
  term,
  children,
  className,
  side = 'top'
}: {
  term: GlossaryTerm
  children?: React.ReactNode
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  const entry = glossary[term]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-help decoration-dotted underline-offset-[3px] hover:underline focus-visible:underline',
            'inline text-left',
            className
          )}
          style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}
        >
          {children ?? entry.label}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <TermBody term={term} />
      </TooltipContent>
    </Tooltip>
  )
}

/** Ícone de interrogação isolado — quando não há texto para sublinhar. */
export function ExplainIcon({
  term,
  className,
  side = 'top'
}: {
  term: GlossaryTerm
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`O que é ${glossary[term].label}?`}
          className={cn(
            'inline-flex shrink-0 text-subtle transition-colors hover:text-foreground focus-visible:text-foreground',
            className
          )}
        >
          <HelpCircle className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <TermBody term={term} />
      </TooltipContent>
    </Tooltip>
  )
}

function TermBody({ term }: { term: GlossaryTerm }) {
  const entry = glossary[term]
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-foreground">{entry.label}</p>
      <p className="text-muted-foreground">{entry.short}</p>
      {'detail' in entry && entry.detail && (
        <p className="text-muted-foreground/80">{entry.detail}</p>
      )}
    </div>
  )
}
