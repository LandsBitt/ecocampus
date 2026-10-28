import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Award, LogIn, PieChart, Trophy } from 'lucide-react'

import { ComoANotaECalculada } from '@/components/ComoANotaECalculada'
import { DemonstracaoAviso } from '@/components/DemonstracaoAviso'
import { Explain } from '@/components/Explain'
import { EcoRankingTable } from '@/components/EcoRankingTable'
import { EcoScoreGauge } from '@/components/charts/EcoScoreGauge'
import { Brand } from '@/components/layout/Brand'
import { MonthPicker } from '@/components/layout/MonthPicker'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/empty-state'
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRanking } from '@/hooks/useRanking'
import { api } from '@/lib/api'
import { formatMonthLong } from '@/lib/date'
import type { Medida } from '@/lib/formatters'
import { classifyScore } from '@/lib/ecoScore'
import { usePeriod } from '@/providers/PeriodProvider'
import type { IndicadorCampus, PizzaItem } from '@/lib/types'

// A pizza traz o Recharts inteiro; só baixa quando alguém abre a aba "Divisão do consumo".
const CampusDistribution = lazy(() =>
  import('@/components/charts/CampusDistribution').then((m) => ({ default: m.CampusDistribution }))
)
const SeletorMedida = lazy(() =>
  import('@/components/charts/CampusDistribution').then((m) => ({ default: m.SeletorMedida }))
)

export default function RankingPublico() {
  const { mes } = usePeriod()
  const [medidaPizza, setMedidaPizza] = useState<Medida>('agua')

  const ranking = useQuery<IndicadorCampus[]>({
    queryKey: ['public-ranking', mes],
    queryFn: () => api.get<IndicadorCampus[]>(`/public/ranking?mes=${mes}`)
  })

  const pizza = useQuery<PizzaItem[]>({
    queryKey: ['public-pizza', mes],
    queryFn: () => api.get<PizzaItem[]>(`/public/pizza?mes=${mes}`)
  })

  const { ordenado: itens, media: scoreMedio, lider } = useRanking(ranking.data)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border glass">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Brand />
          <div className="ml-auto flex items-center gap-2">
            <MonthPicker className="hidden sm:flex" />
            <ThemeToggle />
            <Button asChild variant="secondary" size="sm">
              <Link to="/login">
                <LogIn />
                <span className="sr-only sm:not-sr-only">Entrar</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Página aberta a qualquer pessoa: número simulado precisa do aviso antes de tudo (R.0). */}
        {/* Enquanto carrega, o aviso ocupa o lugar invisível para a página não pular depois. */}
        {ranking.isLoading ? (
          <DemonstracaoAviso className="invisible mb-6" />
        ) : (
          itens.some((item) => item.demonstracao) && <DemonstracaoAviso className="mb-6" />
        )}
        <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Universidade de Taubaté · {formatMonthLong(mes)}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Ranking ecológico dos campi
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Quanto cada campus consumiu de água e energia no mês, comparado de forma justa: os
              números são ajustados pela população e pela área construída, então um campus pequeno e
              um grande competem em pé de igualdade.
            </p>
            <div className="mt-4 sm:hidden">
              <MonthPicker />
            </div>
          </div>

          {ranking.isLoading && <Skeleton className="h-[146px] shrink-0 rounded-xl lg:w-72" />}
          {!ranking.isLoading && scoreMedio !== null && (
            <Card className="shrink-0 lg:w-72">
              <CardContent className="flex items-center gap-5 p-5">
                <EcoScoreGauge score={scoreMedio} size={104} />
                <div className="min-w-0">
                  <p className="eyebrow">Média da universidade</p>
                  <p className="mt-1 font-display text-base font-semibold text-foreground">
                    {classifyScore(scoreMedio)}
                  </p>
                  {lider && (
                    <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
                      <Award className="mt-px size-3 shrink-0 text-warning" />
                      <span>
                        Melhor do mês: <strong className="text-foreground">{lider.nome}</strong>
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {ranking.isError ? (
          <ErrorState
            title="Os dados não puderam ser carregados"
            description="O painel público pode estar temporariamente indisponível. Tente novamente em alguns minutos."
            action={
              <Button variant="secondary" size="sm" onClick={() => ranking.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        ) : (
          <Tabs defaultValue="ranking" className="space-y-4">
            <TabsList>
              <TabsTrigger value="ranking">
                <Trophy />
                Ranking
              </TabsTrigger>
              <TabsTrigger value="distribuicao">
                <PieChart />
                Divisão do consumo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ranking">
              <Card>
                <CardToolbar
                  bordered
                  title="Do mais eficiente ao que mais precisa de atenção"
                  description={
                    <>
                      A posição é dada pelo <Explain term="ecoScore">Eco Score</Explain> — uma nota
                      de 0 a 100 em que consumir menos que a referência da universidade vale mais
                      pontos.
                    </>
                  }
                />
                <CardContent className="pt-5">
                  {ranking.isLoading ? (
                    <SkeletonTable rows={7} cols={5} />
                  ) : (
                    <EcoRankingTable items={itens} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribuicao">
              <Card>
                <CardToolbar
                  bordered
                  title={`Participação de cada campus no consumo de ${medidaPizza === 'agua' ? 'água (m³)' : 'energia (kWh)'}`}
                  description="Aqui vale o volume absoluto, sem ajuste de tamanho — por isso campi maiores aparecem com fatias maiores."
                >
                  <Suspense fallback={null}>
                    <SeletorMedida value={medidaPizza} onChange={setMedidaPizza} />
                  </Suspense>
                </CardToolbar>
                <CardContent className="pt-5">
                  <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                    {pizza.isLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <CampusDistribution data={pizza.data ?? []} medida={medidaPizza} />
                    )}
                  </Suspense>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <ComoANotaECalculada className="mt-6" />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-2xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>ECOCAMPUS · Universidade de Taubaté</p>
          <p>Dados de consumo informados pelas concessionárias de água e energia.</p>
        </div>
      </footer>
    </div>
  )
}
