import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CircleHelp, Droplet, Minus, Plus, Zap } from 'lucide-react'

import { DemonstracaoAviso } from '@/components/DemonstracaoAviso'
import { Explain } from '@/components/Explain'
import { ConsumoTrendChart } from '@/components/charts/ConsumoTrendChart'
import { SeletorMedida } from '@/components/charts/CampusDistribution'
import { Page } from '@/components/layout/PageHeader'
import { BentoCard, BentoTitulo } from '@/components/painel/BentoCard'
import { EcoScoreRing } from '@/components/painel/EcoScoreRing'
import { Numero } from '@/components/painel/Numero'
import { PulsoEnergia } from '@/components/painel/PulsoEnergia'
import { TanqueAgua } from '@/components/painel/TanqueAgua'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAlertasPico,
  useCampusList,
  useComparacao,
  useIndicadores,
  useLancamentos,
  useResumo,
  useSerie
} from '@/hooks/queries'
import { useRanking } from '@/hooks/useRanking'
import { formatMonthLabel, formatMonthLong, previousMonth } from '@/lib/date'
import { classificacaoStyles, consumoTrend, motivoSemNota, styleForScore, toneFill } from '@/lib/ecoScore'
import { fraseComoTexto, fraseDoMes, nomeDoMes } from '@/lib/frases'
import {
  formatDelta,
  formatMedida,
  formatNumber,
  litrosPorDiaPorPessoa,
  medidaNumerica,
  variacao,
  type Medida
} from '@/lib/formatters'
import { buildInsights } from '@/lib/insights'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { usePeriod } from '@/providers/PeriodProvider'
import type { IndicadorCampus, Lancamento } from '@/lib/types'

export default function Dashboard() {
  const { claims } = useAuth()
  const { mes } = usePeriod()
  const isSuper = claims?.role === 'super'

  const [medida, setMedida] = useState<Medida>('agua')
  const [explicando, setExplicando] = useState(false)

  const mesAnterior = useMemo(() => previousMonth(mes), [mes])
  const resumo = useResumo(mes)
  const resumoAnterior = useResumo(mesAnterior)
  const indicadores = useIndicadores(mes)
  const historico = useSerie(mes, 12)
  const comparacao = useComparacao(mes)
  const alertas = useAlertasPico(mes)
  const lancamentos = useLancamentos({ mes })
  const campi = useCampusList()

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

  const meuCampus = useMemo(() => (isSuper ? null : indicadores.data?.[0] ?? null), [indicadores.data, isSuper])

  const { avaliados, media: scoreMedio } = useRanking(indicadores.data)
  const score = isSuper ? scoreMedio : meuCampus?.ecoScore ?? null

  // Só os avisos (picos, campus sem cadastro, contas sem consumo) sobem para a tela:
  // o resto das frases virou a frase do mês e as frases de cada card.
  const avisos = useMemo(
    () =>
      buildInsights({
        mes,
        atual,
        anterior,
        indicadores: indicadores.data ?? [],
        escopo: isSuper ? 'universidade' : 'campus',
        pontosSemConsumo: resumo.data?.pontosSemConsumo ?? 0,
        picos: alertas.data?.avaliados
      }).filter((insight) => insight.tone === 'warning'),
    [mes, atual, anterior, indicadores.data, isSuper, resumo.data?.pontosSemConsumo, alertas.data]
  )

  const nomeCampus = campi.data?.find((c) => c.id === claims?.campusId)?.nome
  const escopoLabel = isSuper ? 'Todos os campi' : nomeCampus ?? 'Meu campus'

  const frase = useMemo(
    () =>
      fraseDoMes({ mes, mesAnterior, atual, anterior, sujeito: isSuper ? 'A universidade' : nomeCampus ?? 'O campus' }),
    [mes, mesAnterior, atual, anterior, isSuper, nomeCampus]
  )

  const serie = historico.data
  const carregando = resumo.isLoading

  // O campus vê o próprio consumo e, ao lado, o total da universidade só como referência (D11).
  const universidade = !isSuper ? resumo.data?.totalGeral ?? null : null
  const referencia = (m: Medida) => {
    if (!universidade) return undefined
    const total = formatMedida(universidade[m], m)
    return `Universidade (referência): ${total.value} ${total.unit}`
  }

  // R.3: o mesmo mês do ano anterior, ao lado da variação mensal.
  const anual = (m: Medida) =>
    comparacao.data
      ? { delta: comparacao.data.escopo[m].variacaoAnual, rotulo: formatMonthLabel(comparacao.data.anoAnterior) }
      : undefined

  const temDemonstracao = !!(isSuper ? resumo.data?.totalGeral.demonstracao : resumo.data?.campus?.demonstracao)

  // Sem /resumo ou /indicadores a tela não tem o que mostrar: melhor dizer que falhou
  // do que deixar os cartões carregando para sempre.
  const falhou = resumo.isError || indicadores.isError
  const tentarDeNovo = () => {
    if (resumo.isError) resumo.refetch()
    if (indicadores.isError) indicadores.refetch()
  }

  const cabecalho = {
    eyebrow: `${escopoLabel} · ${formatMonthLabel(mes)}`,
    title: formatMonthLong(mes).replace(/^./, (c) => c.toUpperCase()),
    lede: carregando ? undefined : (
      <span aria-label={fraseComoTexto(frase)}>
        {frase.map((trecho, i) =>
          trecho.medida ? (
            <span key={i} className={trecho.medida === 'agua' ? 'text-water' : 'text-energy'}>
              {trecho.texto}
            </span>
          ) : (
            <span key={i}>{trecho.texto}</span>
          )
        )}
      </span>
    ),
    showPeriod: true,
    actions: (
      <Button asChild>
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

  const agua = medidaNumerica(atual?.agua, 'agua')
  const luz = medidaNumerica(atual?.luz, 'luz')
  const comRegistro = (indicadores.data ?? []).filter((i) => i.temDados).length
  const totalCampi = indicadores.data?.length ?? 0
  const comNotaQtd = avaliados.length

  return (
    <Page {...cabecalho}>
      {/* Enquanto carrega, o aviso ocupa o lugar invisível para o bento não pular depois. */}
      {carregando ? <DemonstracaoAviso className="invisible" /> : temDemonstracao && <DemonstracaoAviso />}

      {avisos.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft/60 px-5 py-4">
          <ul className="space-y-2">
            {avisos.map((aviso) => (
              <li key={aviso.id} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                <AlertTriangle className="mt-1 size-4 shrink-0 text-warning" aria-hidden />
                <span>{aviso.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section aria-label="Indicadores do mês" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Eco Score: o card principal da tela (feixe na borda). */}
        <BentoCard feixe ordem={0} className="gap-6 p-8 md:col-span-2 xl:row-span-2">
          <BentoTitulo titulo={isSuper ? 'Eco Score da universidade' : `Eco Score de ${meuCampus?.nome ?? nomeCampus ?? 'seu campus'}`}>
            {score !== null ? (
              <Badge variant={styleForScore(score).badge}>
                <span className="size-2 rounded-full bg-current" />
                {styleForScore(score).label}
              </Badge>
            ) : (
              meuCampus && motivoSemNota(meuCampus) && <Badge variant="outline">{motivoSemNota(meuCampus)?.label}</Badge>
            )}
          </BentoTitulo>

          {indicadores.isLoading ? (
            <Skeleton className="mx-auto size-56 rounded-full" />
          ) : (
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
              <EcoScoreRing score={score} />
              <div className="min-w-0 space-y-4">
                <p className="text-balance text-xl font-medium leading-snug tracking-[-0.01em] sm:text-[1.375rem]">
                  {fraseDaNota(score, isSuper, meuCampus)}
                </p>
                {isSuper && (
                  <p className="text-[0.9375rem] text-muted-foreground">
                    {comNotaQtd} de {totalCampi} campi têm nota neste mês.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setExplicando((v) => !v)}
                  aria-expanded={explicando}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                >
                  <CircleHelp className="size-4" />
                  O que é isso?
                </button>
                {explicando && (
                  <p className="glass rounded-lg border border-border px-4 py-3 text-sm leading-relaxed">
                    Cada campus é comparado com a média da universidade: água por pessoa e energia por metro quadrado.
                    Gastar metade da média vale 100, igual à média vale 50, e 50% acima vale 0.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-2">
            {Object.values(classificacaoStyles).map((faixa) => (
              <Badge key={faixa.label} variant={faixa.badge} size="sm">
                {faixa.label === 'Ecológico' ? '70+' : faixa.label === 'Na média' ? '40–69' : 'abaixo de 40'} {faixa.label}
              </Badge>
            ))}
          </div>
        </BentoCard>

        {/* Água: medidor com líquido. */}
        <BentoCard ordem={1} className="gap-4 xl:row-span-2">
          <BentoTitulo titulo={<Explain term="metroCubico">Água</Explain>}>
            <Badge variant="water">
              <Droplet />
              m³
            </Badge>
          </BentoTitulo>
          {carregando ? (
            <Skeleton className="h-12 w-40" />
          ) : (
            <Numero valor={agua?.n ?? null} casas={agua?.casas} unidade={agua?.unit} className="text-[3.25rem]" classeUnidade="text-lg" />
          )}
          <TanqueAgua valor={atual?.agua ?? 0} serie={serie.map((p) => p.agua)} className="min-h-[220px] flex-1" />
          <Variacoes
            delta={variacao(atual?.agua ?? 0, anterior?.agua)}
            base={nomeDoMes(mesAnterior, mes)}
            anual={anual('agua')}
            rodape={isSuper ? `Somatório de ${totalCampi} campi no mês` : referencia('agua')}
          />
        </BentoCard>

        {/* Energia: raio com pulso. */}
        <BentoCard ordem={2} className="gap-4 xl:row-span-2">
          <BentoTitulo titulo={<Explain term="kwh">Energia</Explain>}>
            <Badge variant="energy">
              <Zap />
              {luz?.unit ?? 'kWh'}
            </Badge>
          </BentoTitulo>
          {carregando ? (
            <Skeleton className="h-12 w-40" />
          ) : (
            <Numero valor={luz?.n ?? null} casas={luz?.casas} unidade={luz?.unit} className="text-[3.25rem]" classeUnidade="text-lg" />
          )}
          <div className="flex min-h-[220px] flex-1 items-center justify-center">
            <PulsoEnergia />
          </div>
          <Variacoes
            delta={variacao(atual?.luz ?? 0, anterior?.luz)}
            base={nomeDoMes(mesAnterior, mes)}
            anual={anual('luz')}
            rodape={referencia('luz')}
          />
        </BentoCard>

        {/* Últimos 12 meses. */}
        <BentoCard ordem={3} className="gap-5 md:col-span-2 xl:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-sans text-[1.0625rem] font-semibold tracking-normal">Últimos 12 meses</h2>
              <p className="mt-1 text-sm text-muted-foreground">{fraseDaSerie(serie.map((p) => p[medida]), mes, medida)}</p>
            </div>
            <SeletorMedida value={medida} onChange={setMedida} />
          </div>
          {historico.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : serie.every((ponto) => ponto[medida] === 0) ? (
            <EmptyState
              size="sm"
              title="Ainda não há histórico"
              description="Assim que existirem lançamentos em meses anteriores, a evolução do consumo aparece aqui."
            />
          ) : (
            <ConsumoTrendChart data={serie} tipo={medida} highlight={mes} height={240} />
          )}
        </BentoCard>

        {/* Card pequeno: cobertura (universidade) ou água por pessoa (campus). */}
        {isSuper ? (
          <BentoCard ordem={4} className="gap-3">
            <BentoTitulo titulo="Campi com conta lançada" />
            <div className="mt-auto">
              <Numero valor={indicadores.isLoading ? null : comRegistro} unidade={`de ${totalCampi}`} className="text-6xl" classeUnidade="text-lg" />
            </div>
            <div className="grid grid-flow-col gap-1" aria-hidden>
              {(indicadores.data ?? []).map((i) => (
                <span key={i.campusId} className={cn('h-2 rounded-full', i.temDados ? 'bg-eco-fill' : 'bg-surface-raised')} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {comRegistro === totalCampi
                ? `Todos os campi já têm consumo de ${nomeDoMes(mes, mes)}.`
                : `Faltam ${totalCampi - comRegistro} campi lançarem ${nomeDoMes(mes, mes)}.`}
            </p>
          </BentoCard>
        ) : (
          <BentoCard ordem={4} className="gap-3">
            <BentoTitulo titulo={<Explain term="aguaPorPessoa">Água por pessoa</Explain>} />
            <div className="mt-auto">
              <Numero valor={meuCampus?.consumoAguaPerCapita ?? null} casas={2} unidade="m³/pessoa" className="text-5xl" classeUnidade="text-base" />
            </div>
            <p className="text-sm text-muted-foreground">
              {meuCampus?.consumoAguaPerCapita
                ? `Cerca de ${litrosPorDiaPorPessoa(meuCampus.consumoAguaPerCapita)} por pessoa.`
                : 'Cadastre a população do campus para calcular.'}
            </p>
          </BentoCard>
        )}

        {isSuper ? (
          <BentoCard ordem={5} className="gap-4 md:col-span-2">
            <BentoTitulo titulo="Ranking do mês">
              <Button asChild variant="ghost" size="sm">
                <Link to="/relatorios">
                  Ver ranking
                  <ArrowRight />
                </Link>
              </Button>
            </BentoTitulo>
            {indicadores.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : (
              <RankingCompacto itens={avaliados} />
            )}
          </BentoCard>
        ) : (
          meuCampus && (
            <BentoCard ordem={5} className="gap-4 md:col-span-2">
              <BentoTitulo titulo="Como o seu campus está" />
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Indicador termo="aguaPorPessoa" rotulo="Água por pessoa" valor={meuCampus.consumoAguaPerCapita} casas={2} unidade="m³/pessoa" cor="text-water" />
                <Indicador termo="energiaPorM2" rotulo="Energia por m²" valor={meuCampus.consumoLuzPorM2} casas={2} unidade="kWh/m²" cor="text-energy" />
                <Indicador termo="energiaPorPessoa" rotulo="Energia por pessoa" valor={meuCampus.consumoLuzPerCapita} casas={1} unidade="kWh/pessoa" cor="text-energy" />
              </dl>
            </BentoCard>
          )
        )}

        <BentoCard ordem={6} className="gap-3 md:col-span-2">
          <BentoTitulo titulo="Últimos lançamentos">
            <Button asChild variant="ghost" size="sm">
              <Link to="/lancamentos">
                Ver todos
                <ArrowRight />
              </Link>
            </Button>
          </BentoTitulo>
          {lancamentos.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (lancamentos.data ?? []).length === 0 ? (
            <EmptyState
              size="sm"
              title={`Nenhum consumo em ${nomeDoMes(mes, mes)}`}
              description="Registre a conta do mês ou importe a planilha da concessionária."
              action={
                <Button asChild size="sm">
                  <Link to="/lancamentos">
                    <Plus />
                    Registrar consumo
                  </Link>
                </Button>
              }
            />
          ) : (
            <ListaLancamentos itens={(lancamentos.data ?? []).slice(0, 4)} campi={campi.data} />
          )}
        </BentoCard>
      </section>
    </Page>
  )
}

/** A frase do anel: o que a nota quer dizer, em uma linha. */
function fraseDaNota(score: number | null, isSuper: boolean, campus: IndicadorCampus | null): string {
  if (score === null) {
    if (campus) return motivoSemNota(campus)?.meaning ?? 'Sem dados suficientes no mês.'
    return 'Nenhum campus tem nota neste mês ainda.'
  }
  const sujeito = isSuper ? 'A universidade' : campus?.nome ?? 'O campus'
  const label = styleForScore(score).label
  if (label === 'Ecológico') return `${sujeito} gasta menos que a média: está no verde.`
  if (label === 'Na média') return `${sujeito} está perto da média: dá para melhorar.`
  return `${sujeito} gasta bem acima da média: precisa de atenção.`
}

/** "Outubro ficou 7,6% acima da média do ano." — o mês contra a média dos meses com dado. */
function fraseDaSerie(valores: number[], mes: string, medida: Medida): string {
  const comDado = valores.filter((v) => v > 0)
  const ultimo = valores[valores.length - 1] ?? 0
  if (comDado.length < 2 || ultimo === 0) return 'A linha tracejada é a média do período: acima dela, o mês gastou mais que o normal.'
  const media = comDado.reduce((a, b) => a + b, 0) / comDado.length
  const delta = variacao(ultimo, media)
  const nome = nomeDoMes(mes, mes).replace(/^./, (c) => c.toUpperCase())
  const oque = medida === 'agua' ? 'de água' : 'de energia'
  if (delta === null || Math.abs(delta) < 0.5) return `${nome} ficou na média do período ${oque}.`
  return `${nome} ficou ${formatDelta(Math.abs(delta)).replace('+', '')} ${delta > 0 ? 'acima' : 'abaixo'} da média do período ${oque}.`
}

/** Variação contra o mês anterior e o mesmo mês do ano passado; cair é bom. */
function Variacoes({
  delta,
  base,
  anual,
  rodape
}: {
  delta: number | null
  base: string
  anual?: { delta: number | null; rotulo: string }
  rodape?: string
}) {
  return (
    <div className="space-y-1.5">
      <LinhaVariacao delta={delta} base={base} forte />
      {anual &&
        (anual.delta === null ? (
          <p className="text-[0.8125rem] text-subtle">Sem base em {anual.rotulo}</p>
        ) : (
          <LinhaVariacao delta={anual.delta} base={anual.rotulo} />
        ))}
      {rodape && <p className="text-[0.8125rem] text-subtle">{rodape}</p>}
    </div>
  )
}

function LinhaVariacao({ delta, base, forte = false }: { delta: number | null; base: string; forte?: boolean }) {
  const trend = consumoTrend(delta)
  if (!trend) return <p className="text-[0.8125rem] text-subtle">Sem base em {base}</p>
  const Icon = trend.direction === 'up' ? ArrowUpRight : trend.direction === 'down' ? ArrowDownRight : Minus
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap',
        forte ? 'text-[0.9375rem] font-semibold' : 'text-[0.8125rem] font-medium',
        trend.tone === 'success' && 'text-success',
        trend.tone === 'destructive' && 'text-destructive',
        trend.tone === 'muted' && 'text-muted-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {formatDelta(delta)}
      <span className="font-normal text-subtle">vs. {base}</span>
    </p>
  )
}

/** Os três melhores e os dois que mais precisam de atenção, com a barra do semáforo. */
function RankingCompacto({ itens }: { itens: IndicadorCampus[] }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        size="sm"
        title="Nenhum campus com nota neste mês"
        description="A nota aparece para os campi que têm lançamento no mês e população e área cadastradas."
      />
    )
  }
  const melhores = itens.slice(0, 3)
  const piores = itens.slice(-2).filter((item) => !melhores.includes(item))
  const linhas = [
    ...melhores.map((item, i) => ({ item, pos: i + 1 })),
    ...piores.map((item, i) => ({ item, pos: itens.length - piores.length + i + 1 }))
  ]
  return (
    <ol className="space-y-3">
      {linhas.map(({ item, pos }) => {
        const nota = item.ecoScore ?? 0
        // Faixa de cada campus vem da API; o front só classifica a média, que ele mesmo calcula.
        const style = item.classificacao ? classificacaoStyles[item.classificacao] : styleForScore(nota)
        return (
          <li key={item.campusId} className="grid grid-cols-[1.75rem_minmax(0,1fr)_3rem_3rem] items-center gap-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(4rem,9rem)_3.5rem] sm:gap-3">
            <span className="num text-lg font-semibold text-subtle">{pos}º</span>
            <span className="truncate font-semibold">{item.nome}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-raised">
              <span className={cn('block h-full rounded-full', toneFill[style.tone].bg)} style={{ width: `${Math.max(0, Math.min(100, nota))}%` }} />
            </span>
            <span className={cn('num text-right text-lg font-semibold', style.text)}>{formatNumber(nota, 1)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Indicador({
  termo,
  rotulo,
  valor,
  casas,
  unidade,
  cor
}: {
  termo: 'aguaPorPessoa' | 'energiaPorM2' | 'energiaPorPessoa'
  rotulo: string
  valor: number | null
  casas: number
  unidade: string
  cor: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3.5">
      <dt className="text-[0.8125rem] text-muted-foreground">
        <Explain term={termo}>{rotulo}</Explain>
      </dt>
      <dd className="mt-2">
        <Numero valor={valor} casas={casas} unidade={unidade} className={cn('text-3xl', cor)} classeUnidade="text-[0.8125rem]" />
      </dd>
    </div>
  )
}

function ListaLancamentos({ itens, campi }: { itens: Lancamento[]; campi?: { id: number; nome: string }[] }) {
  return (
    <ul className="divide-y divide-border">
      {itens.map((item) => {
        const m = medidaNumerica(item.consumo, item.tipo)
        const Icon = item.tipo === 'agua' ? Droplet : Zap
        return (
          <li key={item.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3.5 py-3">
            <span className={cn('grid size-9 place-items-center rounded-md bg-surface-sunken', item.tipo === 'agua' ? 'text-water' : 'text-energy')}>
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{campi?.find((c) => c.id === item.campusId)?.nome ?? `Campus ${item.campusId}`}</span>
              <span className="block text-[0.8125rem] text-subtle">
                {item.tipo === 'agua' ? 'Água' : 'Energia'}
                {item.origem === 'demonstracao' ? ' · demonstração' : item.origem === 'importado' ? ' · planilha' : ''}
              </span>
            </span>
            <span className="text-right">
              {m ? <Numero valor={m.n} casas={m.casas} unidade={m.unit} className="text-xl" classeUnidade="text-[0.8125rem]" /> : <span className="text-sm text-subtle">sem consumo</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
