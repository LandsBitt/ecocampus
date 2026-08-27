import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Droplet, ShieldCheck, Zap } from 'lucide-react'

import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

const DESTAQUES = [
  {
    icon: Droplet,
    titulo: 'Água e energia no mesmo lugar',
    texto: 'Consumo mensal de todos os campi, com histórico e comparação automática.'
  },
  {
    icon: BarChart3,
    titulo: 'Comparação justa entre campi',
    texto: 'Os números são ajustados por população e área, então tamanho não distorce o ranking.'
  },
  {
    icon: ShieldCheck,
    titulo: 'Acesso controlado',
    texto: 'Cada campus enxerga os próprios dados; a reitoria enxerga o conjunto.'
  }
]

/**
 * Moldura das telas de acesso. A coluna da esquerda existe para dar contexto
 * institucional a quem chega pela primeira vez — em telas pequenas ela some
 * e sobra apenas o formulário.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer
}: {
  title: string
  description: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel institucional */}
      <div className="relative hidden overflow-hidden bg-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-grid absolute inset-0 opacity-[0.07]" aria-hidden />
        <div
          className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white/95">
            <img src="/image/unitau-logo.png" alt="" className="size-9 object-contain" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-white">ECOCAMPUS</p>
            <p className="text-2xs text-white/70">Universidade de Taubaté</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight text-white">
            Gestão de consumo de água e energia dos campi
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            Um painel único para acompanhar o consumo mensal, entender o que mudou e agir sobre o
            que mais pesa.
          </p>

          <ul className="mt-8 space-y-5">
            {DESTAQUES.map((item) => (
              <li key={item.titulo} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[0.8125rem] font-medium text-white">{item.titulo}</p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-white/65">{item.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 text-2xs text-white/50">
          <span className="flex items-center gap-1.5">
            <Droplet className="size-3" /> m³
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="size-3" /> kWh
          </span>
          <span className="ml-auto">
            <Link to="/ranking" className="underline-offset-4 hover:text-white/80 hover:underline">
              Ver ranking público
            </Link>
          </span>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Brand className="lg:hidden" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm animate-rise">
            <div className="mb-7 space-y-2">
              <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
              <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>

            {children}

            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
