import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Leaf } from 'lucide-react'

import { CampusPieChart } from '@/components/CampusPieChart'
import { EcoRankingTable } from '@/components/EcoRankingTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getCurrentMonth } from '@/lib/date'
import type { IndicadorCampus, PizzaItem } from '@/lib/types'

export default function RankingPublico() {
  const [mes, setMes] = useState(getCurrentMonth())

  const rankingQuery = useQuery<IndicadorCampus[]>({
    queryKey: ['public-ranking', mes],
    queryFn: () => api.get<IndicadorCampus[]>(`/public/ranking?mes=${mes}`)
  })

  const pizzaQuery = useQuery<PizzaItem[]>({
    queryKey: ['public-pizza', mes],
    queryFn: () => api.get<PizzaItem[]>(`/public/pizza?mes=${mes}`)
  })

  const ranking = useMemo(
    () => rankingQuery.data ?? [],
    [rankingQuery.data]
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-success" />
            <span className="font-semibold text-foreground">EcoCampus · Ranking público</span>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pub-mes" className="text-[10px] text-muted-foreground">
              Mês
            </Label>
            <Input
              id="pub-mes"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-8 w-[150px] text-sm"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Desempenho ecológico dos campi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking baseado no consumo de água por pessoa e energia por m² — comparação justa entre
            campi de tamanhos diferentes.
          </p>
        </div>

        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Ranking ecológico</CardTitle>
                <CardDescription>
                  Campi ordenados do mais ecológico ao mais crítico.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rankingQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : rankingQuery.isError ? (
                  <p className="py-8 text-center text-sm text-destructive">
                    Não foi possível carregar os dados. Tente novamente mais tarde.
                  </p>
                ) : (
                  <EcoRankingTable items={ranking} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribuicao">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de consumo</CardTitle>
                <CardDescription>
                  Participação de cada campus no consumo total consolidado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pizzaQuery.isLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : pizzaQuery.isError ? (
                  <p className="py-8 text-center text-sm text-destructive">
                    Não foi possível carregar os dados. Tente novamente mais tarde.
                  </p>
                ) : (
                  <CampusPieChart data={pizzaQuery.data ?? []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
