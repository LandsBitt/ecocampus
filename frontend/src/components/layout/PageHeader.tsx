import type { ReactNode } from 'react'

import { MonthPicker } from './MonthPicker'
import { cn } from '@/lib/utils'

interface PageProps {
  title: string
  /** Uma frase dizendo o que a pessoa vê nesta tela. */
  description?: ReactNode
  /**
   * Frase de destaque, grande, logo abaixo do título: o dado principal da
   * tela dito em português comum, para ser entendido em 3 segundos.
   */
  lede?: ReactNode
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
  lede,
  eyebrow,
  actions,
  showPeriod = false,
  children,
  className
}: PageProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[85rem] px-4 py-7 sm:px-8 lg:py-10', className)}>
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-4xl space-y-3">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="text-balance font-display text-[2.5rem] font-bold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[3.5rem]">
            {title}
          </h1>
          {lede && (
            <p className="text-balance text-xl font-medium leading-snug tracking-[-0.015em] text-foreground sm:text-2xl">
              {lede}
            </p>
          )}
          {description && (
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
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
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
