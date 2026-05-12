import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageLayout } from '@/components/layout/PageLayout'
import { CampusPieChart } from '@/components/CampusPieChart'
import { EcoRankingTable } from '@/components/EcoRankingTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getCurrentMonth } from '@/lib/date'
import { useAuth } from '@/providers/AuthProvider'
import type { IndicadorCampus, PizzaItem } from '@/lib/types'

export default function Reports() {
  const { getToken } = useAuth()
  const [mes, setMes] = useState(getCurrentMonth())
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')

  const pieQuery = useQuery<PizzaItem[]>({
    queryKey: ['grafico-pizza', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get<PizzaItem[]>(`/grafico/pizza?mes=${mes}`, token)
    }
  })

  const indicadoresQuery = useQuery<IndicadorCampus[]>({
    queryKey: ['indicadores-super', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get<IndicadorCampus[]>(`/indicadores?mes=${mes}`, token)
    }
  })

  const ranking = useMemo(() => {
    if (!indicadoresQuery.data) return []
    return [...indicadoresQuery.data].sort((a, b) => b.ecoScore - a.ecoScore)
  }, [indicadoresQuery.data])

  const filtered = useMemo(() => {
    if (selectedCampusId === 'all') return ranking
    const id = Number(selectedCampusId)
    return ranking.filter((i) => i.campusId === id)
  }, [ranking, selectedCampusId])

  const rightSlot = (
    <div className="flex items-center gap-2">
      <Label htmlFor="rep-mes" className="text-[10px]">
        Mês
      </Label>
      <Input
        id="rep-mes"
        type="month"
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        className="h-9 w-[160px]"
      />
    </div>
  )

  return (
    <PageLayout
      title="Relatórios"
      description="Comparativos e indicadores entre os 8 campi."
      rightSlot={rightSlot}
    >
      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle>Ranking ecológico</CardTitle>
                  <CardDescription>
                    Score normalizado: água por pessoa e luz por m². Comparação justa entre campi
                    de tamanhos diferentes.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px]">Filtro</Label>
                  <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os campi</SelectItem>
                      {ranking.map((i) => (
                        <SelectItem key={i.campusId} value={String(i.campusId)}>
                          {i.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {indicadoresQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <EcoRankingTable items={filtered} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribuicao">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de consumo</CardTitle>
              <CardDescription>
                Participação de cada campus no total consolidado da universidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieQuery.isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <CampusPieChart
                  data={pieQuery.data ?? []}
                  highlightedId={selectedCampusId !== 'all' ? Number(selectedCampusId) : null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
