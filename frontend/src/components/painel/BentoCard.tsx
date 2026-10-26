import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'

/**
 * Card do bento da Visão geral. O spotlight segue o mouse (variáveis CSS,
 * sem re-render); `feixe` liga o brilho que corre na borda — só no card
 * principal da tela. Entra em sequência na primeira carga (`ordem`).
 */
export function BentoCard({
  children,
  className,
  feixe = false,
  ordem = 0,
  as = 'article',
  'aria-label': ariaLabel
}: {
  children: ReactNode
  className?: string
  feixe?: boolean
  ordem?: number
  as?: 'article' | 'section'
  'aria-label'?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const reduzir = useReducedMotion()
  const Tag = as === 'section' ? motion.section : motion.article

  const mover = (event: React.MouseEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - r.left}px`)
    el.style.setProperty('--my', `${event.clientY - r.top}px`)
  }

  return (
    <Tag
      ref={ref}
      aria-label={ariaLabel}
      onMouseMove={mover}
      initial={reduzir ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reduzir ? 0 : ordem * 0.05, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        'spotlight relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground shadow-md',
        feixe && 'beam rounded-2xl',
        className
      )}
    >
      {children}
    </Tag>
  )
}

/** Cabeçalho padrão de um card do bento: título à esquerda, selo ou ação à direita. */
export function BentoTitulo({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="min-w-0 font-sans text-[1.0625rem] font-semibold tracking-normal">{titulo}</h2>
      {children}
    </div>
  )
}
