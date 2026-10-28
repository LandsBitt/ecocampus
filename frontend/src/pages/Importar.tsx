import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Info,
  ArrowRight,
  CheckCircle2,
  Download,
  Droplet,
  FileUp,
  RotateCcw,
  Zap
} from 'lucide-react'

import { FileDropzone } from '@/components/FileDropzone'
import { Stepper } from '@/components/Stepper'
import { Page } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { toast } from '@/components/ui/sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { api, detalheDoErro } from '@/lib/api'
import { formatMonthLong, getCurrentMonth } from '@/lib/date'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { useAuth } from '@/providers/AuthProvider'
import { usePeriod } from '@/providers/PeriodProvider'
import type { ConfirmarOut, ImportPreview, LancamentoTipo, PontoPreview } from '@/lib/types'

const STEPS = [
  { id: 'arquivo', label: 'Escolher arquivo', description: 'Tipo, mês e planilha' },
  { id: 'conferir', label: 'Conferir', description: 'Ver o que será importado' },
  { id: 'pronto', label: 'Concluído', description: 'Dados no sistema' }
]

export default function Importar() {
  const { getToken } = useAuth()
  const { mes: mesGlobal } = usePeriod()
  const queryClient = useQueryClient()

  const [etapa, setEtapa] = useState(0)
  const [tipo, setTipo] = useState<LancamentoTipo>('agua')
  const [mes, setMes] = useState(mesGlobal || getCurrentMonth())
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [resultado, setResultado] = useState<ConfirmarOut | null>(null)

  const analisar = useMutation({
    mutationFn: async () => {
      if (!arquivo) throw new Error('Nenhum arquivo selecionado')
      const form = new FormData()
      form.append('file', arquivo)
      form.append('tipo', tipo)
      form.append('mes_referencia', mes)
      return api.uploadForm<ImportPreview>('/importar/preview', form, await getToken())
    },
    onSuccess: (data) => {
      setPreview(data)
      setEtapa(1)
      if (data.matched.length === 0) {
        toast.warning('Nenhum ponto de medição foi reconhecido', {
          description: 'Confira se o arquivo é do tipo selecionado e segue o modelo.'
        })
      }
    },
    onError: (error: Error) =>
      toast.error('Não foi possível ler o arquivo', {
        description: detalheDoErro(error) ?? 'Confirme que é um CSV salvo a partir da planilha modelo.'
      })
  })

  const confirmar = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Sem prévia')
      return api.post<ConfirmarOut>(
        '/importar/confirmar',
        {
          mes_referencia: preview.mesReferencia,
          lancamentos: preview.matched.map((ponto: PontoPreview) => ({
            ponto_medicao_id: ponto.pontoMedicaoId,
            valor_fatura: ponto.valorFatura,
            consumo_fisico: ponto.consumoFisico
          }))
        },
        await getToken()
      )
    },
    onSuccess: (data) => {
      setResultado(data)
      setEtapa(2)
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
      queryClient.invalidateQueries({ queryKey: ['pizza'] })
      queryClient.invalidateQueries({ queryKey: ['serie'] })
      queryClient.invalidateQueries({ queryKey: ['comparacao'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
    },
    onError: () => toast.error('Erro ao gravar os lançamentos. Nada foi importado.')
  })

  const recomecar = () => {
    setEtapa(0)
    setArquivo(null)
    setPreview(null)
    setResultado(null)
  }

  const unidade = tipo === 'agua' ? 'm³' : 'kWh'

  const totalConsumo = useMemo(
    () =>
      (preview?.matched ?? []).reduce((soma, ponto) => soma + (ponto.consumoFisico ?? 0), 0),
    [preview]
  )

  return (
    <Page
      title="Importar planilha"
      description="Carregue de uma vez as contas de água ou energia do mês. O sistema identifica o campus de cada ponto de medição pelo endereço da fatura."
      actions={
        etapa > 0 && (
          <Button variant="secondary" onClick={recomecar}>
            <RotateCcw />
            Recomeçar
          </Button>
        )
      }
    >
      <Card variant="flat">
        <CardContent className="p-5">
          <Stepper steps={STEPS} current={etapa} />
        </CardContent>
      </Card>

      {etapa === 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          <Card>
            <CardToolbar
              bordered
              title="Dados da importação"
              description="Diga o que está sendo importado e de qual mês, depois envie o arquivo."
            />
            <CardContent className="space-y-5 pt-5">
              <Field label="O que você vai importar">
                <Segmented
                  aria-label="Tipo de consumo"
                  value={tipo}
                  onChange={setTipo}
                  options={[
                    { value: 'agua', label: 'Contas de água', icon: Droplet },
                    { value: 'luz', label: 'Contas de energia', icon: Zap }
                  ]}
                  className="w-full [&>button]:flex-1"
                />
              </Field>

              <Field
                label="Mês de referência"
                htmlFor="imp-mes"
                help="O mês a que as contas se referem — não a data de vencimento."
              >
                <Input
                  id="imp-mes"
                  type="month"
                  value={mes}
                  max={getCurrentMonth()}
                  onChange={(event) => setMes(event.target.value)}
                  className="sm:max-w-52"
                />
              </Field>

              <Field label="Arquivo da planilha">
                <FileDropzone file={arquivo} onFileChange={setArquivo} />
              </Field>

              <Button
                className="w-full sm:w-auto"
                disabled={!arquivo || !mes}
                loading={analisar.isPending}
                onClick={() => analisar.mutate()}
              >
                <FileUp />
                Analisar arquivo
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>

          <Card variant="flat">
            <CardToolbar
              title="Não tem o modelo?"
              description="Baixe as planilhas de água e energia com o passo a passo de preenchimento."
            />
            <CardContent>
              <Button variant="secondary" asChild className="w-full">
                <a href="/modelo-planilhas-ecocampus.zip" download>
                  <Download />
                  Baixar modelos (.zip)
                </a>
              </Button>
              <ul className="mt-4 space-y-2 text-2xs leading-relaxed text-muted-foreground">
                <li>1. Preencha a planilha do tipo correspondente.</li>
                <li>2. Salve como CSV (separado por ponto e vírgula).</li>
                <li>3. Envie aqui e confira antes de confirmar.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {etapa === 1 && preview && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ResumoBox
              titulo="Pontos reconhecidos"
              valor={String(preview.matched.length)}
              descricao="Serão importados"
              tone="success"
            />
            <ResumoBox
              titulo={`Consumo total (${unidade})`}
              valor={formatNumber(totalConsumo, 0)}
              descricao={formatMonthLong(preview.mesReferencia)}
              tone="neutral"
            />
            <ResumoBox
              titulo="Linhas ignoradas"
              valor={String(preview.unmatched.length)}
              descricao="Não serão importadas"
              tone={preview.unmatched.length > 0 ? 'warning' : 'neutral'}
            />
          </div>

          {preview.demonstracaoSubstituida > 0 && (
            <Card variant="flat">
              <CardContent className="flex gap-3 p-4">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-[0.8125rem] leading-relaxed text-foreground">
                  {preview.demonstracaoSubstituida === 1
                    ? 'Existe 1 lançamento de demonstração'
                    : `Existem ${preview.demonstracaoSubstituida} lançamentos de demonstração`}{' '}
                  para os mesmos campi neste mês. Ao confirmar, o consumo real da planilha toma o lugar
                  {preview.demonstracaoSubstituida === 1 ? ' dele' : ' deles'}.
                </p>
              </CardContent>
            </Card>
          )}

          {preview.manuaisSubstituidos > 0 && (
            <Card variant="flat">
              <CardContent className="flex gap-3 p-4">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-[0.8125rem] leading-relaxed text-foreground">
                  {preview.manuaisSubstituidos === 1
                    ? 'Existe 1 lançamento manual'
                    : `Existem ${preview.manuaisSubstituidos} lançamentos manuais`}{' '}
                  para os mesmos campi neste mês. Ao confirmar,{' '}
                  {preview.manuaisSubstituidos === 1 ? 'ele será substituído' : 'eles serão substituídos'}{' '}
                  pelos dados da planilha, que vêm da fatura.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardToolbar
              bordered
              title="O que será importado"
              description="Confira antes de confirmar. Valores já existentes para o mesmo ponto e mês serão atualizados."
            >
              <Badge variant="brand" size="sm">
                Valor total {formatCurrency(preview.totalValor)}
              </Badge>
            </CardToolbar>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Ponto de medição</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead className="text-right">Consumo ({unidade})</TableHead>
                    <TableHead className="text-right">Valor da fatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.matched.map((ponto) => (
                    <TableRow key={ponto.pontoMedicaoId}>
                      <TableCell className="font-medium">{ponto.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{ponto.campusNome}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(ponto.consumoFisico)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(ponto.valorFatura)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {preview.unmatched.length > 0 && (
            <Card>
              <CardToolbar
                bordered
                title={
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-warning" />
                    Linhas que ficaram de fora
                  </span>
                }
                description="Cada linha abaixo tem o motivo ao lado. Corrija na planilha e envie de novo; estes registros não entram no sistema."
              />
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead>Local na planilha</TableHead>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.unmatched.map((linha, index) => (
                      <TableRow key={`${linha.local}-${index}`}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {linha.linha ?? '—'}
                        </TableCell>
                        <TableCell>{linha.local || '—'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {linha.identificador || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-warning">{linha.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={preview.matched.length === 0}
              loading={confirmar.isPending}
              onClick={() => confirmar.mutate()}
            >
              <CheckCircle2 />
              Confirmar importação de {preview.matched.length}{' '}
              {preview.matched.length === 1 ? 'registro' : 'registros'}
            </Button>
            <Button variant="secondary" onClick={recomecar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {etapa === 2 && resultado && (
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-6" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">Importação concluída</h2>
              <p className="text-[0.8125rem] text-muted-foreground">
                Os indicadores de {formatMonthLong(preview?.mesReferencia ?? mes)} já foram
                recalculados.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
                <p className="font-display text-2xl font-semibold tabular-nums">
                  {resultado.imported}
                </p>
                <p className="mt-0.5 text-2xs text-muted-foreground">Novos registros</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
                <p className="font-display text-2xl font-semibold tabular-nums">
                  {resultado.updated}
                </p>
                <p className="mt-0.5 text-2xs text-muted-foreground">Registros atualizados</p>
              </div>
            </div>

            {(resultado.manuaisRemovidos > 0 || resultado.demonstracaoRemovida > 0 || resultado.ignored > 0) && (
              <p className="text-2xs leading-relaxed text-muted-foreground">
                {resultado.manuaisRemovidos > 0 &&
                  `${resultado.manuaisRemovidos} lançamento(s) manual(is) do mesmo mês foram substituídos. `}
                {resultado.demonstracaoRemovida > 0 &&
                  `${resultado.demonstracaoRemovida} lançamento(s) de demonstração deram lugar ao consumo real. `}
                {resultado.ignored > 0 &&
                  `${resultado.ignored} item(ns) não entraram porque o ponto de medição não existe mais.`}
              </p>
            )}

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link to="/dashboard">
                  Ver na visão geral
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="secondary" className="flex-1" onClick={recomecar}>
                <FileUp />
                Importar outro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Page>
  )
}

function ResumoBox({
  titulo,
  valor,
  descricao,
  tone
}: {
  titulo: string
  valor: string
  descricao: string
  tone: 'success' | 'warning' | 'neutral'
}) {
  const classes = {
    success: 'border-success/25 bg-success-soft',
    warning: 'border-warning/25 bg-warning-soft',
    neutral: 'border-border bg-surface-sunken'
  }[tone]

  return (
    <div className={`rounded-lg border px-4 py-3.5 ${classes}`}>
      <p className="eyebrow">{titulo}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold leading-none tabular-nums text-foreground">
        {valor}
      </p>
      <p className="mt-1.5 text-2xs text-muted-foreground">{descricao}</p>
    </div>
  )
}
