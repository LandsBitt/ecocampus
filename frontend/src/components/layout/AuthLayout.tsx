import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'

import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'
import { Numero } from '@/components/painel/Numero'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { nomeDoMes } from '@/lib/frases'
import { medidaNumerica } from '@/lib/formatters'
import { usePeriod } from '@/providers/PeriodProvider'
import type { IndicadorCampus } from '@/lib/types'

/** Três camadas de onda em SVG: o fundo animado do login, leve e sem biblioteca 3D. */
function Mar() {
  const onda = (y: number, amp: number) =>
    `M0 ${y} C 200 ${y - amp} 400 ${y + amp} 600 ${y} S 1000 ${y - amp} 1200 ${y} S 1400 ${y + amp} 1600 ${y} V 300 H 0 Z`
  return (
    <div className="mar" aria-hidden>
      <svg className="mar__1" viewBox="0 0 1600 300" preserveAspectRatio="none">
        <path d={onda(120, 60)} />
      </svg>
      <svg className="mar__2" viewBox="0 0 1600 300" preserveAspectRatio="none">
        <path d={onda(150, 60)} />
      </svg>
      <svg className="mar__3" viewBox="0 0 1600 300" preserveAspectRatio="none">
        <path d={onda(170, 40)} />
      </svg>
    </div>
  )
}

/**
 * Água e energia da universidade no mês, pelos dados públicos do ranking.
 * Se a consulta falhar ou o mês estiver vazio, simplesmente não aparece.
 */
function NumerosDoMes() {
  const { mes } = usePeriod()
  const ranking = useQuery<IndicadorCampus[]>({
    queryKey: ['public-ranking', mes],
    queryFn: () => api.get<IndicadorCampus[]>(`/public/ranking?mes=${mes}`),
    staleTime: 5 * 60 * 1000
  })
  const itens = ranking.data ?? []
  const agua = medidaNumerica(itens.reduce((s, i) => s + i.totalAgua, 0), 'agua')
  const luz = medidaNumerica(itens.reduce((s, i) => s + i.totalLuz, 0), 'luz')
  if (!agua || !luz || (agua.n === 0 && luz.n === 0)) return null
  const demonstracao = itens.some((i) => i.demonstracao)
  const mesNome = nomeDoMes(mes, mes)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <Numero valor={agua.n} casas={agua.casas} unidade={agua.unit} className="text-4xl text-water" classeUnidade="text-base" />
          <p className="mt-1.5 text-[0.8125rem] text-subtle">de água em {mesNome}</p>
        </div>
        <div>
          <Numero valor={luz.n} casas={luz.casas} unidade={luz.unit} className="text-4xl text-energy" classeUnidade="text-base" />
          <p className="mt-1.5 text-[0.8125rem] text-subtle">de energia em {mesNome}</p>
        </div>
      </div>
      {demonstracao && (
        <p className="flex items-center gap-1.5 text-[0.8125rem] text-subtle">
          <FlaskConical className="size-3.5 text-warning" aria-hidden />
          Inclui dados de demonstração.
        </p>
      )}
    </div>
  )
}

/**
 * Moldura das telas de acesso (entrar, recuperar senha): ondas de água no
 * fundo, a frase do produto à esquerda e o formulário à direita. No celular
 * a frase encolhe e o formulário vem logo depois.
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
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Mar />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 pt-6 sm:px-10">
        <Brand />
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
            <Link to="/ranking">Ver ranking público</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-wrap items-center gap-10 px-5 pb-24 pt-8 sm:px-10 sm:pb-56 lg:gap-16">
        <section className="flex min-w-0 flex-[999_1_30rem] flex-col gap-6">
          <p className="eyebrow">Água e energia dos campi da UNITAU</p>
          <h2 className="text-balance font-display text-[2.5rem] font-bold leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-[5rem]">
            Cada gota e cada quilowatt, num só lugar.
          </h2>
          <p className="hidden max-w-xl text-lg leading-relaxed text-muted-foreground sm:block">
            Veja quanto o seu campus consumiu no mês, compare de forma justa com os outros e saiba o que mudou,
            em frases simples.
          </p>
          <div className="hidden sm:block">
            <NumerosDoMes />
          </div>
        </section>

        <section
          aria-labelledby="auth-titulo"
          className="w-full flex-[1_1_22rem] rounded-2xl border border-border bg-card p-7 shadow-lg sm:max-w-md sm:p-8"
        >
          <div className="mb-6 space-y-2">
            <h1 id="auth-titulo" className="font-display text-3xl font-bold tracking-[-0.03em] text-foreground">
              {title}
            </h1>
            <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {children}

          {footer && <div className="mt-6">{footer}</div>}
        </section>
      </main>
    </div>
  )
}
