import type { ReactNode } from 'react'

import { MonthPicker } from './MonthPicker'
import { cn } from '@/lib/utils'

interface PageProps {
  title: string
  /** Uma frase dizendo o que a pessoa vê nesta tela. */
  description?: ReactNode
  /** Rótulo acima do título (escopo: campus, universidade, período). */
  eyebrow?: ReactNode
  actions?: ReactNode
  /** Mostra o seletor de mês no corpo — em telas pequenas ele sai da topbar. */
  showPeriod?: boolean
  children: ReactNode
  className?: string
}

/**
 * Moldura de página: largura máxima, respiro e cabeçalho consistentes.
 * Toda tela autenticada passa por aqui, então o ritmo vertical é o mesmo
 * em todo o sistema.
 */
export function Page({
  title,
  description,
  eyebrow,
  actions,
  showPeriod = false,
  children,
  className
}: PageProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[85rem] px-4 py-6 sm:px-6 lg:py-8', className)}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showPeriod && <MonthPicker className="sm:hidden" />}
          {actions}
        </div>
      </header>

      <div className="space-y-6">{children}</div>
    </div>
  )
}

/** Título de seção dentro de uma página, com ação opcional à direita. */
export function SectionHeader({
  title,
  description,
  children,
  className
}: {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0 space-y-0.5">
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[0.8125rem] text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
