import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Droplet, Gauge, Plus, Users, Zap } from 'lucide-react'

import { DemonstracaoAviso } from '@/components/DemonstracaoAviso'
import { Explain } from '@/components/Explain'
import { InsightPanel } from '@/components/InsightPanel'
import { KpiCard } from '@/components/KpiCard'
import { LancamentosTable } from '@/components/LancamentosTable'
import { CampusDistribution, SeletorMedida } from '@/components/charts/CampusDistribution'
import { ConsumoTrendChart } from '@/components/charts/ConsumoTrendChart'
import { EcoScoreGauge } from '@/components/charts/EcoScoreGauge'
import { Page, SectionHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'
import {
  useAlertasPico,
  useCampusList,
  useComparacao,
  useIndicadores,
  useLancamentos,
  usePizza,
  useResumo,
  useSerie
} from '@/hooks/queries'
import { formatMonthLabel, formatMonthLong, previousMonth } from '@/lib/date'
import { comNota, motivoSemNota, notaMedia, styleForScore, toneFill } from '@/lib/ecoScore'
import { formatMedida, litrosPorDiaPorPessoa, variacao, type Medida } from '@/lib/formatters'
import { buildInsights } from '@/lib/insights'
import { useAuth } from '@/providers/AuthProvider'
import { usePeriod } from '@/providers/PeriodProvider'

export default function Dashboard() {
  const { claims } = useAuth()
  const { mes } = usePeriod()
  const isSuper = claims?.role === 'super'

  const [medida, setMedida] = useState<Medida>('agua')
  const [medidaPizza, setMedidaPizza] = useState<Medida>('agua')

  const mesAnterior = useMemo(() => previousMonth(mes), [mes])
  const resumo = useResumo(mes)
  const resumoAnterior = useResumo(mesAnterior)
  const indicadores = useIndicadores(mes)
  const historico = useSerie(mes, 12)
  const comparacao = useComparacao(mes)
  const alertas = useAlertasPico(mes)
  const lancamentos = useLancamentos({ mes })
  const campi = useCampusList()
  const pizza = usePizza(mes, isSuper)

  // O bloco relevante do /resumo muda conforme o papel: a reitoria vê o
  // consolidado, o campus vê apenas o próprio.
  const atual = useMemo(() => {
    if (!resumo.data) return null
    const bloco = isSuper ? resumo.data.totalGeral : resumo.data.campus
    return bloco ? { agua: bloco.agua, luz: bloco.luz } : null
  }, [resumo.data, isSuper])

  const anterior = useMemo(() => {
    if (!resumoAnterior.data) return null
    const bloco = isSuper ? resumoAnterior.data.totalGeral : resumoAnterior.data.campus
    return bloco ? { agua: bloco.agua, luz: bloco.luz } : null
  }, [resumoAnterior.data, isSuper])

  const meuCampus = useMemo(
    () => (isSuper ? null : indicadores.data?.[0] ?? null),
    [indicadores.data, isSuper]
  )

  // Média só de quem tem nota: campus sem dado ou sem cadastro não entra.
  const scoreMedio = useMemo(() => notaMedia(indicadores.data ?? []), [indicadores.data])

  const score = isSuper ? scoreMedio : meuCampus?.ecoScore ?? null

  const insights = useMemo(
    () =>
      buildInsights({
        mes,
        atual,
        anterior,
        indicadores: indicadores.data ?? [],
        escopo: isSuper ? 'universidade' : 'campus',
        pontosSemConsumo: resumo.data?.pontosSemConsumo ?? 0,
        picos: alertas.data?.avaliados
      }),
    [mes, atual, anterior, indicadores.data, isSuper, resumo.data?.pontosSemConsumo, alertas.data]
  )

  const serieAgua = historico.data.map((ponto) => ponto.agua)
  const serieLuz = historico.data.map((ponto) => ponto.luz)

  const carregando = resumo.isLoading
  const agua = formatMedida(atual?.agua ?? 0, 'agua')
  const luz = formatMedida(atual?.luz ?? 0, 'luz')

  // O campus vê o próprio consumo e, ao lado, o total da universidade só como referência (D11).
  const universidade = !isSuper ? resumo.data?.totalGeral ?? null : null
  // R.3: o mesmo mês do ano anterior, ao lado da variação mensal.
  const anual = (medida: Medida) =>
    comparacao.data
      ? {
          delta: comparacao.data.escopo[medida].variacaoAnual,
          rotulo: formatMonthLabel(comparacao.data.anoAnterior)
        }
      : undefined

  const referencia = (medida: Medida) => {
    if (!universidade) return undefined
    const total = formatMedida(universidade[medida], medida)
    return `Universidade (referência): ${total.value} ${total.unit}`
  }

  const temDemonstracao = !!(isSuper ? resumo.data?.totalGeral.demonstracao : resumo.data?.campus?.demonstracao)

  // Sem /resumo ou /indicadores a tela não tem o que mostrar: melhor dizer que falhou
  // do que deixar os cartões carregando para sempre.
  const falhou = resumo.isError || indicadores.isError
  const tentarDeNovo = () => {
    if (resumo.isError) resumo.refetch()
    if (indicadores.isError) indicadores.refetch()
  }

  const nomeCampus = campi.data?.find((c) => c.id === claims?.campusId)?.nome
  const escopoLabel = isSuper ? 'Todos os campi' : nomeCampus ?? 'Meu campus'

  const cabecalho = {
    eyebrow: `${escopoLabel} · ${formatMonthLabel(mes)}`,
    title: 'Visão geral',
    description: isSuper
      ? 'Como a universidade consumiu água e energia no mês selecionado, e como isso se compara com o mês anterior.'
      : 'Como o seu campus consumiu água e energia no mês selecionado.',
    showPeriod: true,
    actions: (
      <Button asChild variant="secondary">
        <Link to="/lancamentos">
          <Plus />
          Novo lançamento
        </Link>
      </Button>
    )
  }

  if (falhou) {
    return (
      <Page {...cabecalho}>
        <ErrorState
          action={
            <Button variant="secondary" size="sm" onClick={tentarDeNovo}>
              Tentar novamente
            </Button>
          }
        />
      </Page>
    )
  }

  return (
    <Page {...cabecalho}>
      {temDemonstracao && <DemonstracaoAviso />}
      <InsightPanel insights={insights} loading={carregando} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Água no mês"
          value={agua.value}
          unit={agua.unit}
          icon={Droplet}
          accent="water"
          delta={variacao(atual?.agua ?? 0, anterior?.agua)}
          anual={anual('agua')}
          series={serieAgua}
          term="metroCubico"
          loading={carregando}
          footnote={
            isSuper
              ? `Somatório de ${indicadores.data?.length ?? 0} campi no mês`
              : referencia('agua')
          }
        />
        <KpiCard
          label="Energia no mês"
          value={luz.value}
          unit={luz.unit}
          icon={Zap}
          accent="energy"
          delta={variacao(atual?.luz ?? 0, anterior?.luz)}
          anual={anual('luz')}
          series={serieLuz}
          term="kwh"
          loading={carregando}
          footnote={referencia('luz')}
        />
        <KpiCard
          label={isSuper ? 'Eco Score médio' : 'Eco Score do campus'}
          value={score !== null ? score.toFixed(1) : '—'}
          unit="/ 100"
          icon={Gauge}
          accent="eco"
          term="ecoScore"
          loading={indicadores.isLoading}
          footnote={
            score !== null
              ? styleForScore(score).meaning
              : (meuCampus && motivoSemNota(meuCampus)?.meaning) ?? 'Sem dados suficientes no mês'
          }
        />
        {isSuper ? (
          <KpiCard
            label="Campi com registro"
            value={String((indicadores.data ?? []).filter((i) => i.temDados).length)}
            unit={`de ${indicadores.data?.length ?? 0}`}
            icon={Building2}
            accent="brand"
            loading={indicadores.isLoading}
            footnote="Campi que já têm lançamento neste mês"
          />
        ) : (
          // Para o campus, a leitura mais útil não é um total absoluto e sim o
          // consumo por pessoa — é o número que ele consegue comparar e influenciar.
          <KpiCard
            label="Água por pessoa"
            value={meuCampus?.consumoAguaPerCapita?.toFixed(2) ?? '—'}
            unit="m³/pessoa"
            icon={Users}
            accent="brand"
            term="aguaPorPessoa"
            loading={indicadores.isLoading}
            footnote={
              meuCampus?.consumoAguaPerCapita
                ? `Equivale a cerca de ${litrosPorDiaPorPessoa(meuCampus.consumoAguaPerCapita)} por pessoa`
                : 'Cadastre a população do campus para calcular'
            }
          />
        )}
      </div>

      {/* Série histórica: o painel mais importante depois dos KPIs. */}
      <Card>
        <CardToolbar
          bordered
          title="Consumo ao longo do tempo"
          description="Últimos 12 meses. A linha tracejada é a média do período — acima dela, o mês foi atípico."
        >
          <SeletorMedida value={medida} onChange={setMedida} />
        </CardToolbar>
        <CardContent className="pt-5">
          {historico.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : historico.data.every((ponto) => ponto[medida] === 0) ? (
            <EmptyState
              title="Ainda não há histórico"
              description="Assim que existirem lançamentos em meses anteriores, a evolução do consumo aparece aqui."
            />
          ) : (
            <ConsumoTrendChart data={historico.data} tipo={medida} highlight={mes} />
          )}
        </CardContent>
      </Card>

      {isSuper ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardToolbar
              bordered
              title="Divisão entre os campi"
              description={`Quanto cada campus representa do consumo de ${medidaPizza === 'agua' ? 'água (m³)' : 'energia (kWh)'} do mês.`}
            >
              <SeletorMedida value={medidaPizza} onChange={setMedidaPizza} />
            </CardToolbar>
            <CardContent className="pt-5">
              {pizza.isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <CampusDistribution data={pizza.data ?? []} medida={medidaPizza} height={220} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardToolbar
              bordered
              title="Destaques do ranking"
              description={<>Ordenado pelo <Explain term="ecoScore">Eco Score</Explain> do mês.</>}
            >
              <Button asChild variant="ghost" size="sm">
                <Link to="/relatorios">
                  Ver ranking completo
                  <ArrowRight />
                </Link>
              </Button>
            </CardToolbar>
            <CardContent className="pt-5">
              {indicadores.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <RankingDestaques itens={comNota(indicadores.data ?? [])} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        meuCampus && (
          <Card>
            <CardToolbar
              bordered
              title="Como o seu campus está"
              description={
                <>
                  A nota compara o consumo do campus com a média da universidade, já ajustada por{' '}
                  <Explain term="normalizacao">tamanho do campus</Explain>.
                </>
              }
            />
            <CardContent className="flex flex-col items-center gap-6 pt-6 sm:flex-row sm:items-center sm:gap-8">
              <EcoScoreGauge score={meuCampus.ecoScore} />
              <div className="min-w-0 flex-1 space-y-3">
                {meuCampus.ecoScore !== null ? (
                  <p className="text-sm leading-relaxed text-foreground">
                    Em {formatMonthLong(mes)}, {meuCampus.nome} está classificado como{' '}
                    <strong className={styleForScore(meuCampus.ecoScore).text}>
                      {meuCampus.classificacao}
                    </strong>
                    . {styleForScore(meuCampus.ecoScore).meaning}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground">
                    Em {formatMonthLong(mes)}, {meuCampus.nome} está{' '}
                    <strong>{motivoSemNota(meuCampus)?.label.toLowerCase()}</strong>.{' '}
                    {motivoSemNota(meuCampus)?.meaning}
                  </p>
                )}
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                    <dt className="text-2xs text-muted-foreground">
                      <Explain term="aguaPorPessoa">Água por pessoa</Explain>
                    </dt>
                    <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
                      {meuCampus.consumoAguaPerCapita?.toFixed(2) ?? '—'}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">m³/pessoa</span>
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                    <dt className="text-2xs text-muted-foreground">
                      <Explain term="energiaPorM2">Energia por m²</Explain>
                    </dt>
                    <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
                      {meuCampus.consumoLuzPorM2?.toFixed(2) ?? '—'}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">kWh/m²</span>
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                    <dt className="text-2xs text-muted-foreground">
                      <Explain term="energiaPorPessoa">Energia por pessoa</Explain>
                    </dt>
                    <dd className="mt-1 font-display text-lg font-semibold tabular-nums">
                      {meuCampus.consumoLuzPerCapita?.toFixed(1) ?? '—'}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">kWh/pessoa</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        )
      )}

      <section className="space-y-3">
        <SectionHeader
          title="Últimos lançamentos"
          description={`Registros de ${formatMonthLong(mes)}.`}
        >
          <Button asChild variant="ghost" size="sm">
            <Link to="/lancamentos">
              Ver todos
              <ArrowRight />
            </Link>
          </Button>
        </SectionHeader>

        {lancamentos.isLoading ? (
          <SkeletonTable rows={4} cols={isSuper ? 4 : 3} />
        ) : (
          <LancamentosTable
            items={(lancamentos.data ?? []).slice(0, 6)}
            campi={campi.data}
            isSuper={isSuper}
            showActions={false}
            emptyAction={
              <Button asChild size="sm">
                <Link to="/lancamentos">
                  <Plus />
                  Registrar consumo
                </Link>
              </Button>
            }
          />
        )}
      </section>
    </Page>
  )
}

/** Lista compacta: os dois melhores e os dois que mais precisam de atenção. */
function RankingDestaques({ itens }: { itens: { campusId: number; nome: string; ecoScore: number }[] }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        size="sm"
        title="Nenhum campus com nota neste mês"
        description="A nota aparece para os campi que têm lançamento no mês e população e área cadastradas."
      />
    )
  }

  // `itens` já chega só com quem tem nota, do melhor para o pior.
  const ordenado = itens
  const melhores = ordenado.slice(0, 3)
  const piores = ordenado.slice(-2).filter((item) => !melhores.includes(item))

  return (
    <div className="space-y-4">
      <Grupo titulo="Melhor desempenho" itens={melhores} inicio={1} />
      {piores.length > 0 && (
        <Grupo
          titulo="Precisam de atenção"
          itens={piores}
          inicio={ordenado.length - piores.length + 1}
        />
      )}
    </div>
  )
}

function Grupo({
  titulo,
  itens,
  inicio
}: {
  titulo: string
  itens: { campusId: number; nome: string; ecoScore: number }[]
  inicio: number
}) {
  return (
    <div>
      <p className="mb-2 eyebrow">{titulo}</p>
      <ul className="space-y-1.5">
        {itens.map((item, index) => {
          const style = styleForScore(item.ecoScore)
          return (
            <li key={item.campusId} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-2xs tabular-nums text-subtle">
                {inicio + index}º
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">
                {item.nome}
              </span>
              <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${toneFill[style.tone].bg}`}
                  style={{ width: `${Math.max(0, Math.min(100, item.ecoScore))}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums">
                {item.ecoScore.toFixed(1)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
