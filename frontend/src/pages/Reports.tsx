import { Fragment, useMemo, useState } from 'react'
import { BarChart3, CalendarRange, Download, Info, PieChart, Trophy } from 'lucide-react'

import { Explain } from '@/components/Explain'
import { EcoRankingTable } from '@/components/EcoRankingTable'
import { CampusDistribution, SeletorMedida } from '@/components/charts/CampusDistribution'
import { EcoScoreGauge } from '@/components/charts/EcoScoreGauge'
import { Page } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DemonstracaoAviso } from '@/components/DemonstracaoAviso'
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
import { useAlertasPico, useComparacao, useIndicadorUniversidade, useIndicadores, usePizza } from '@/hooks/queries'
import { formatMonthLabel, formatMonthLong } from '@/lib/date'
import { classifyScore, comNota, motivoSemNota, notaMedia, ordenarRanking } from '@/lib/ecoScore'
import { downloadCsv } from '@/lib/export'
import { descreverFator, formatDelta, formatEmissao, formatNumber, UNIDADES, type Medida } from '@/lib/formatters'
import { usePeriod } from '@/providers/PeriodProvider'
import type {
  AlertaPico,
  ComparacaoBloco,
  ComparacaoMedida,
  ComparacaoResponse,
  IndicadorUniversidade
} from '@/lib/types'

export default function Reports() {
  const { mes } = usePeriod()
  const [campusSelecionado, setCampusSelecionado] = useState<string>('all')
  const [medidaPizza, setMedidaPizza] = useState<Medida>('agua')

  const indicadores = useIndicadores(mes)
  const universidade = useIndicadorUniversidade(mes)
  const comparacao = useComparacao(mes)
  const alertas = useAlertasPico(mes)
  const pizza = usePizza(mes)

  const ranking = useMemo(() => ordenarRanking(indicadores.data ?? []), [indicadores.data])
  const comNotaQtd = useMemo(() => comNota(ranking).length, [ranking])

  const filtrado = useMemo(() => {
    if (campusSelecionado === 'all') return ranking
    return ranking.filter((item) => item.campusId === Number(campusSelecionado))
  }, [ranking, campusSelecionado])

  // Média só de quem tem nota; nula quando ninguém tem.
  const scoreMedio = notaMedia(ranking)

  const distribuicaoClasses = useMemo(() => {
    const contagem = { Ecológico: 0, 'Na média': 0, Crítico: 0 }
    ranking.forEach((item) => {
      if (item.classificacao) contagem[item.classificacao] += 1
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
        'Água por pessoa (m³/pessoa)',
        'Energia por m² (kWh/m²)',
        'Energia por pessoa (kWh/pessoa)',
        'Emissão de CO₂ da energia (kg)',
        'Eco Score',
        'Classificação',
        'Situação',
        'Demonstração',
        'Água vs mês anterior (%)',
        'Água vs ano anterior (%)',
        'Energia vs mês anterior (%)',
        'Energia vs ano anterior (%)',
        'Pico de água',
        'Pico de energia'
      ],
      ranking.map((item, index) => [
        item.ecoScore !== null ? index + 1 : '',
        item.nome,
        item.populacao,
        item.areaConstruidaM2,
        item.totalAgua,
        item.totalLuz,
        item.consumoAguaPerCapita,
        item.consumoLuzPorM2,
        item.consumoLuzPerCapita,
        item.emissaoKgCo2,
        item.ecoScore,
        item.classificacao,
        motivoSemNota(item)?.label ?? 'Com nota',
        // Dado simulado nunca sai do sistema sem a marca (SPEC R.0).
        item.demonstracao ? 'Sim' : 'Não',
        // R.3: vazio = sem base para comparar (mês sem lançamento), nunca 0.
        ...variacoesCsv(comparacao.data?.campi.find((c) => c.campusId === item.campusId)),
        situacaoPicoCsv(alertas.data?.avaliados, item.campusId, 'agua'),
        situacaoPicoCsv(alertas.data?.avaliados, item.campusId, 'luz')
      ]).concat(
        // Linha da universidade: só o kWh por pessoa (R.1) e o que entra nele.
        universidade.data
          ? [
              [
                '',
                'Universidade (campi com energia e população)',
                universidade.data.populacao,
                '',
                '',
                universidade.data.kwh,
                '',
                '',
                universidade.data.kwhPorPessoa,
                universidade.data.emissaoKgCo2,
                '',
                '',
                '',
                universidade.data.demonstracao ? 'Sim' : 'Não',
                ...variacoesCsv(comparacao.data?.escopo)
              ],
              // A pegada só vale com o fator e a fonte junto (critério da Fase R).
              [
                '',
                universidade.data.fatorEmissao
                  ? `Fator de emissão: ${descreverFator(universidade.data.fatorEmissao)}. Fonte: ${universidade.data.fatorEmissao.fonte}`
                  : 'Fator de emissão: sem fator cadastrado para o ano; emissão não calculada'
              ]
            ]
          : []
      )
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
          {indicadores.data?.some((item) => item.demonstracao) && <DemonstracaoAviso />}
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
                    {scoreMedio !== null ? (
                      <p className="text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
                        Média do <Explain term="ecoScore">Eco Score</Explain> dos {comNotaQtd}{' '}
                        {comNotaQtd === 1 ? 'campus' : 'campi'} com nota neste mês:{' '}
                        <strong className="text-foreground">{classifyScore(scoreMedio)}</strong>.
                      </p>
                    ) : (
                      <p className="text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
                        Nenhum campus tem nota neste mês. A nota exige lançamento no mês e população
                        e área cadastradas.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardToolbar
                bordered
                title="Como os campi se distribuem"
                description={
                  ranking.length > comNotaQtd
                    ? `Quantos campi estão em cada faixa neste mês. ${ranking.length - comNotaQtd} de ${ranking.length} estão sem nota (sem dados, sem cadastro ou em revisão).`
                    : 'Quantos campi estão em cada faixa de classificação neste mês.'
                }
              />
              <CardContent className="pt-5">
                {indicadores.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FaixaCard
                      titulo="Ecológico"
                      quantidade={distribuicaoClasses['Ecológico']}
                      total={comNotaQtd}
                      descricao="Consomem bem menos que a referência"
                      tone="success"
                    />
                    <FaixaCard
                      titulo="Na média"
                      quantidade={distribuicaoClasses['Na média']}
                      total={comNotaQtd}
                      descricao="Estão perto da referência"
                      tone="brand"
                    />
                    <FaixaCard
                      titulo="Crítico"
                      quantidade={distribuicaoClasses['Crítico']}
                      total={comNotaQtd}
                      descricao="Consomem bem acima da referência"
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
                <TabsTrigger value="comparacao">
                  <CalendarRange />
                  Comparação
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
                  title={`Participação no consumo de ${medidaPizza === 'agua' ? 'água (m³)' : 'energia (kWh)'}`}
                  description="Diferente do ranking: aqui vale o volume absoluto, sem ajuste por tamanho. Campi maiores aparecem com fatias maiores."
                >
                  <SeletorMedida value={medidaPizza} onChange={setMedidaPizza} />
                </CardToolbar>
                <CardContent className="pt-5">
                  {pizza.isLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <CampusDistribution
                      data={pizza.data ?? []}
                      medida={medidaPizza}
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
                    <TabelaDetalhe
                      itens={campusSelecionado === 'all' ? ranking : filtrado}
                      universidade={campusSelecionado === 'all' ? universidade.data : undefined}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparacao">
              <Card>
                <CardToolbar
                  bordered
                  title="Comparação com o mês e o ano anteriores"
                  description={
                    comparacao.data
                      ? `${formatMonthLabel(mes)} contra ${formatMonthLabel(comparacao.data.mesAnterior)} e contra ${formatMonthLabel(comparacao.data.anoAnterior)}. Aqui, cair é bom.`
                      : 'Cada medida contra o mês anterior e o mesmo mês do ano anterior.'
                  }
                />
                <CardContent className="pt-5">
                  {comparacao.isError ? (
                    <ErrorState
                      action={
                        <Button variant="secondary" size="sm" onClick={() => comparacao.refetch()}>
                          Tentar novamente
                        </Button>
                      }
                    />
                  ) : !comparacao.data ? (
                    <SkeletonTable rows={6} cols={7} />
                  ) : (
                    <TabelaComparacao dados={comparacao.data} campusSelecionado={campusSelecionado} />
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
                  área construída. Cada resultado é comparado com a referência da universidade —
                  consumo total dividido pela população total (água) e pela área total (energia) — e
                  vira uma nota de 0 a 100: metade da referência ou menos vale 100, a referência vale
                  50, e 50% acima ou mais vale 0. A nota final é a média das duas. Campus sem
                  lançamento no mês, ou sem população e área cadastradas, fica sem nota e fora da
                  referência.
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
  tone: 'success' | 'brand' | 'destructive'
}) {
  const classes = {
    success: 'border-success/25 bg-success-soft text-success',
    brand: 'border-brand/25 bg-brand-soft text-brand',
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
  itens,
  universidade
}: {
  /** Linha final com o kWh por pessoa da universidade (R.1). Só na visão de todos os campi. */
  universidade?: IndicadorUniversidade
  itens: {
    campusId: number
    nome: string
    populacao: number
    areaConstruidaM2: number
    totalAgua: number
    totalLuz: number
    consumoLuzPerCapita: number | null
    emissaoKgCo2: number | null
    ecoScore: number | null
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
            <th className="px-4 py-2.5 text-right eyebrow">Área (<span className="normal-case">m²</span>)</th>
            <th className="px-4 py-2.5 text-right eyebrow">Água (<span className="normal-case">m³</span>)</th>
            <th className="px-4 py-2.5 text-right eyebrow">Energia (<span className="normal-case">kWh</span>)</th>
            <th className="px-4 py-2.5 text-right eyebrow"><span className="normal-case">kWh/pessoa</span></th>
            <th className="px-4 py-2.5 text-right eyebrow"><span className="normal-case">CO₂</span> da energia</th>
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
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {formatNumber(item.consumoLuzPerCapita, 1)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                {formatEmissao(item.emissaoKgCo2)}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatNumber(item.ecoScore, 1)}
              </td>
            </tr>
          ))}
        </tbody>
        {universidade && (
          <tfoot className="border-t border-border bg-surface-sunken">
            <tr>
              <td className="px-4 py-3 font-medium">Universidade</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {universidade.populacao ? formatNumber(universidade.populacao, 0) : '—'}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(universidade.kwh, 0)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatNumber(universidade.kwhPorPessoa, 1)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                {formatEmissao(universidade.emissaoKgCo2)}
              </td>
              <td className="px-4 py-3" />
            </tr>
            <tr>
              <td colSpan={8} className="px-4 pb-3 text-2xs leading-relaxed text-muted-foreground">
                <Explain term="energiaPorPessoa">kWh por pessoa</Explain> da universidade: energia total
                dividida pela população total, só dos campi que têm os dois números no mês (
                {universidade.campiConsiderados.length} de {itens.length}).
                {universidade.campiSemPopulacao.length > 0 &&
                  ` Sem população cadastrada, ficam de fora: ${universidade.campiSemPopulacao.join(', ')}.`}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="px-4 pb-3 text-2xs leading-relaxed text-muted-foreground">
                <Explain term="pegadaCarbono">Pegada de carbono</Explain> da energia de todos os campi:{' '}
                {universidade.fatorEmissao ? (
                  <>
                    kWh × {descreverFator(universidade.fatorEmissao)}. Fonte: {universidade.fatorEmissao.fonte}.
                  </>
                ) : (
                  'sem fator de emissão cadastrado para este ano, então a emissão não é calculada.'
                )}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/** As quatro variações de um bloco para o CSV, na ordem das colunas. Vazio = sem base. */
function variacoesCsv(bloco: ComparacaoBloco | undefined): (number | string)[] {
  if (!bloco) return ['', '', '', '']
  const v = (x: number | null) => (x === null ? '' : Number(x.toFixed(1)))
  return [
    v(bloco.agua.variacaoMensal),
    v(bloco.agua.variacaoAnual),
    v(bloco.luz.variacaoMensal),
    v(bloco.luz.variacaoAnual)
  ]
}

/** "+12,0%", ou o motivo de não haver número: sem dado no mês ou sem base para comparar. */
function CelulaVariacao({ medida, qual }: { medida: ComparacaoMedida; qual: 'mensal' | 'anual' }) {
  const delta = qual === 'mensal' ? medida.variacaoMensal : medida.variacaoAnual
  if (delta !== null) {
    return (
      <span
        className={
          Math.abs(delta) < 0.5 ? 'text-muted-foreground' : delta < 0 ? 'text-success' : 'text-destructive'
        }
      >
        {formatDelta(delta)}
      </span>
    )
  }
  return <span className="text-2xs text-subtle">{medida.atual === null ? 'sem dados' : 'sem base'}</span>
}

function TabelaComparacao({
  dados,
  campusSelecionado
}: {
  dados: ComparacaoResponse
  campusSelecionado: string
}) {
  const linhas =
    campusSelecionado === 'all'
      ? dados.campi
      : dados.campi.filter((c) => c.campusId === Number(campusSelecionado))
  const medidas: Medida[] = ['agua', 'luz']

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken">
          <tr className="border-b border-border">
            <th rowSpan={2} className="px-4 py-2.5 text-left eyebrow">
              Campus
            </th>
            {medidas.map((m) => (
              <th key={m} colSpan={3} className="px-4 pt-2.5 text-center eyebrow">
                {UNIDADES[m].nome} (<span className="normal-case">{UNIDADES[m].curta}</span>)
              </th>
            ))}
          </tr>
          <tr className="border-b border-border">
            {medidas.map((m) => (
              <Fragment key={m}>
                <th className="px-4 py-2 text-right eyebrow">No mês</th>
                <th className="px-4 py-2 text-right eyebrow normal-case">vs. {formatMonthLabel(dados.mesAnterior)}</th>
                <th className="px-4 py-2 text-right eyebrow normal-case">vs. {formatMonthLabel(dados.anoAnterior)}</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((bloco) => (
            <LinhaComparacao key={bloco.campusId ?? 'universidade'} bloco={bloco} medidas={medidas} />
          ))}
        </tbody>
        {campusSelecionado === 'all' && (
          <tfoot className="border-t border-border bg-surface-sunken font-medium">
            <LinhaComparacao bloco={dados.escopo} medidas={medidas} />
          </tfoot>
        )}
      </table>
    </div>
  )
}

function LinhaComparacao({ bloco, medidas }: { bloco: ComparacaoBloco; medidas: Medida[] }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{bloco.nome}</td>
      {medidas.map((m) => (
        <Fragment key={m}>
          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(bloco[m].atual, 0)}</td>
          <td className="px-4 py-3 text-right tabular-nums">
            <CelulaVariacao medida={bloco[m]} qual="mensal" />
          </td>
          <td className="px-4 py-3 text-right tabular-nums">
            <CelulaVariacao medida={bloco[m]} qual="anual" />
          </td>
        </Fragment>
      ))}
    </tr>
  )
}

/** "Sim (+45,0%)", "Não", "Histórico insuficiente" ou vazio quando não houve consumo no mês. */
function situacaoPicoCsv(avaliados: AlertaPico[] | undefined, campusId: number, medida: Medida): string {
  const alerta = avaliados?.find((a) => a.campusId === campusId && a.medida === medida)
  if (!alerta) return ''
  if (alerta.situacao === 'historico_insuficiente') return 'Histórico insuficiente'
  if (alerta.situacao === 'normal') return 'Não'
  return alerta.razao !== null ? `Sim (${formatDelta((alerta.razao - 1) * 100)})` : 'Sim'
}
