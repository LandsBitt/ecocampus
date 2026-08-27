import { useMemo, useState } from 'react'
import { BarChart3, Download, Info, PieChart, Trophy } from 'lucide-react'

import { Explain } from '@/components/Explain'
import { EcoRankingTable } from '@/components/EcoRankingTable'
import { CampusDistribution } from '@/components/charts/CampusDistribution'
import { EcoScoreGauge } from '@/components/charts/EcoScoreGauge'
import { Page } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/sonner'
import { useIndicadores, usePizza } from '@/hooks/queries'
import { formatMonthLabel, formatMonthLong } from '@/lib/date'
import { classifyScore } from '@/lib/ecoScore'
import { downloadCsv } from '@/lib/export'
import { formatNumber } from '@/lib/formatters'
import { usePeriod } from '@/providers/PeriodProvider'

export default function Reports() {
  const { mes } = usePeriod()
  const [campusSelecionado, setCampusSelecionado] = useState<string>('all')

  const indicadores = useIndicadores(mes)
  const pizza = usePizza(mes)

  const ranking = useMemo(
    () => [...(indicadores.data ?? [])].sort((a, b) => b.ecoScore - a.ecoScore),
    [indicadores.data]
  )

  const filtrado = useMemo(() => {
    if (campusSelecionado === 'all') return ranking
    return ranking.filter((item) => item.campusId === Number(campusSelecionado))
  }, [ranking, campusSelecionado])

  const scoreMedio = ranking.length
    ? ranking.reduce((sum, item) => sum + item.ecoScore, 0) / ranking.length
    : 0

  const distribuicaoClasses = useMemo(() => {
    const contagem = { Ecológico: 0, Atenção: 0, Crítico: 0 }
    ranking.forEach((item) => {
      contagem[item.classificacao] += 1
    })
    return contagem
  }, [ranking])

  const exportar = () => {
    downloadCsv(
      `ranking-ecocampus-${mes}`,
      [
        'Posição',
        'Campus',
        'População',
        'Área (m²)',
        'Água (m³)',
        'Energia (kWh)',
        'Água por pessoa',
        'Energia por m²',
        'Eco Score',
        'Classificação',
        'Comparação justa'
      ],
      ranking.map((item, index) => [
        index + 1,
        item.nome,
        item.populacao,
        item.areaConstruidaM2,
        item.totalAgua,
        item.totalLuz,
        item.consumoAguaPerCapita,
        item.consumoLuzPorM2,
        item.ecoScore,
        item.classificacao,
        item.normalizado ? 'Sim' : 'Não (faltam população/área)'
      ])
    )
    toast.success('Ranking exportado em CSV.')
  }

  return (
    <Page
      eyebrow={formatMonthLabel(mes)}
      title="Relatórios"
      description="Comparação entre os campi no mês selecionado, com o consumo já ajustado pelo tamanho de cada um."
      showPeriod
      actions={
        <Button variant="secondary" onClick={exportar} disabled={ranking.length === 0}>
          <Download />
          <span className="hidden sm:inline">Exportar ranking</span>
        </Button>
      }
    >
      {indicadores.isError ? (
        <ErrorState
          action={
            <Button variant="secondary" size="sm" onClick={() => indicadores.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <Card>
              <CardToolbar
                bordered
                title="Nota média da universidade"
                description={formatMonthLong(mes)}
              />
              <CardContent className="flex flex-col items-center gap-3 pt-6">
                {indicadores.isLoading ? (
                  <Skeleton className="size-40 rounded-full" />
                ) : (
                  <>
                    <EcoScoreGauge score={scoreMedio} />
                    <p className="text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
                      Média do <Explain term="ecoScore">Eco Score</Explain> dos {ranking.length}{' '}
                      campi. A universidade está classificada como{' '}
                      <strong className="text-foreground">{classifyScore(scoreMedio)}</strong>.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardToolbar
                bordered
                title="Como os campi se distribuem"
                description="Quantos campi estão em cada faixa de classificação neste mês."
              />
              <CardContent className="pt-5">
                {indicadores.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FaixaCard
                      titulo="Ecológico"
                      quantidade={distribuicaoClasses['Ecológico']}
                      total={ranking.length}
                      descricao="Consomem menos que a média"
                      tone="success"
                    />
                    <FaixaCard
                      titulo="Atenção"
                      quantidade={distribuicaoClasses['Atenção']}
                      total={ranking.length}
                      descricao="Estão perto da média"
                      tone="warning"
                    />
                    <FaixaCard
                      titulo="Crítico"
                      quantidade={distribuicaoClasses['Crítico']}
                      total={ranking.length}
                      descricao="Consomem bem acima da média"
                      tone="destructive"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="ranking">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="ranking">
                  <Trophy />
                  Ranking
                </TabsTrigger>
                <TabsTrigger value="distribuicao">
                  <PieChart />
                  Distribuição
                </TabsTrigger>
                <TabsTrigger value="detalhe">
                  <BarChart3 />
                  Números do mês
                </TabsTrigger>
              </TabsList>

              <Select value={campusSelecionado} onValueChange={setCampusSelecionado}>
                <SelectTrigger className="w-56" aria-label="Destacar campus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os campi</SelectItem>
                  {ranking.map((item) => (
                    <SelectItem key={item.campusId} value={String(item.campusId)}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="ranking">
              <Card>
                <CardToolbar
                  bordered
                  title="Ranking ecológico"
                  description={
                    <>
                      Ordenado do melhor para o pior. A nota usa{' '}
                      <Explain term="aguaPorPessoa">água por pessoa</Explain> e{' '}
                      <Explain term="energiaPorM2">energia por m²</Explain>, então campi de tamanhos
                      diferentes são comparados de igual para igual.
                    </>
                  }
                />
                <CardContent className="pt-5">
                  {indicadores.isLoading ? (
                    <SkeletonTable rows={6} cols={5} />
                  ) : (
                    <EcoRankingTable
                      items={campusSelecionado === 'all' ? ranking : filtrado}
                      highlightId={
                        campusSelecionado === 'all' ? null : Number(campusSelecionado)
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribuicao">
              <Card>
                <CardToolbar
                  bordered
                  title="Participação no consumo total"
                  description="Diferente do ranking: aqui vale o volume absoluto, sem ajuste por tamanho. Campi maiores aparecem com fatias maiores."
                />
                <CardContent className="pt-5">
                  {pizza.isLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <CampusDistribution
                      data={pizza.data ?? []}
                      highlightedId={
                        campusSelecionado === 'all' ? null : Number(campusSelecionado)
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detalhe">
              <Card>
                <CardToolbar
                  bordered
                  title="Números do mês por campus"
                  description="Os valores brutos por trás da nota, incluindo população e área usadas no cálculo."
                />
                <CardContent className="pt-5">
                  {indicadores.isLoading ? (
                    <SkeletonTable rows={6} cols={6} />
                  ) : (
                    <TabelaDetalhe itens={campusSelecionado === 'all' ? ranking : filtrado} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card variant="flat">
            <CardContent className="flex gap-3 p-5">
              <Info className="mt-0.5 size-4 shrink-0 text-brand" />
              <div className="space-y-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Como a nota é calculada</p>
                <p>
                  Para cada campus, o consumo de água é dividido pela população e o de energia pela
                  área construída. Cada resultado é comparado com a média da universidade e vira uma
                  nota de 0 a 100 — quanto menor o consumo relativo, maior a nota. A nota final é a
                  média das duas. Campi sem população e área cadastradas caem no cálculo por consumo
                  absoluto e são marcados na tabela.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Page>
  )
}

function FaixaCard({
  titulo,
  quantidade,
  total,
  descricao,
  tone
}: {
  titulo: string
  quantidade: number
  total: number
  descricao: string
  tone: 'success' | 'warning' | 'destructive'
}) {
  const classes = {
    success: 'border-success/25 bg-success-soft text-success',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    destructive: 'border-destructive/25 bg-destructive-soft text-destructive'
  }[tone]

  return (
    <div className={`rounded-lg border px-4 py-3.5 ${classes}`}>
      <p className="text-2xs font-semibold uppercase tracking-[0.08em]">{titulo}</p>
      <p className="mt-2 font-display text-2xl font-semibold leading-none tabular-nums">
        {quantidade}
        <span className="ml-1 text-sm font-normal opacity-70">de {total}</span>
      </p>
      <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">{descricao}</p>
    </div>
  )
}

function TabelaDetalhe({
  itens
}: {
  itens: {
    campusId: number
    nome: string
    populacao: number
    areaConstruidaM2: number
    totalAgua: number
    totalLuz: number
    ecoScore: number
  }[]
}) {
  if (itens.length === 0) {
    return (
      <p className="py-8 text-center text-[0.8125rem] text-muted-foreground">
        Sem dados para o período selecionado.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken">
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left eyebrow">Campus</th>
            <th className="px-4 py-2.5 text-right eyebrow">População</th>
            <th className="px-4 py-2.5 text-right eyebrow">Área (m²)</th>
            <th className="px-4 py-2.5 text-right eyebrow">Água (m³)</th>
            <th className="px-4 py-2.5 text-right eyebrow">Energia (kWh)</th>
            <th className="px-4 py-2.5 text-right eyebrow">Eco Score</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.campusId} className="border-b border-border last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">{item.nome}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {item.populacao ? formatNumber(item.populacao, 0) : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {item.areaConstruidaM2 ? formatNumber(item.areaConstruidaM2, 0) : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(item.totalAgua, 0)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(item.totalLuz, 0)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {item.ecoScore.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
