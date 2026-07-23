import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle2, AlertCircle, RotateCcw, Download } from 'lucide-react'

import { PageLayout } from '@/components/layout/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import { api } from '@/lib/api'
import { getCurrentMonth } from '@/lib/date'
import { useAuth } from '@/providers/AuthProvider'
import type { ConfirmarOut, ImportPreview, LancamentoTipo, PontoPreview } from '@/lib/types'

type Step = 'upload' | 'preview' | 'done'

export default function Importar() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [tipo, setTipo] = useState<LancamentoTipo>('agua')
  const [mes, setMes] = useState(getCurrentMonth())
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ConfirmarOut | null>(null)

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Nenhum arquivo selecionado')
      const token = await getToken()
      const form = new FormData()
      form.append('file', file)
      form.append('tipo', tipo)
      form.append('mes_referencia', mes)
      return api.uploadForm<ImportPreview>('/importar/preview', form, token)
    },
    onSuccess: (data) => {
      setPreview(data)
      setStep('preview')
    },
    onError: () => toast.error('Erro ao analisar o CSV.'),
  })

  const confirmarMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Sem preview')
      const token = await getToken()
      return api.post<ConfirmarOut>('/importar/confirmar', {
        mes_referencia: preview.mesReferencia,
        lancamentos: preview.matched.map((m: PontoPreview) => ({
          ponto_medicao_id: m.pontoMedicaoId,
          valor_fatura: m.valorFatura,
          consumo_fisico: m.consumoFisico,
        })),
      }, token)
    },
    onSuccess: (data) => {
      setResult(data)
      setStep('done')
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
    },
    onError: () => toast.error('Erro ao confirmar importação.'),
  })

  function reset() {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <PageLayout
      title="Importar CSV"
      description="Importe os dados mensais de consumo de água ou energia a partir da planilha padrão."
    >
      {step === 'upload' && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Selecionar arquivo
            </CardTitle>
            <CardDescription>
              Use a planilha padrão salva como CSV (UTF-8). Não tem o modelo? Baixe abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Planilhas modelo + passo a passo</p>
                  <p className="text-xs text-muted-foreground">
                    Modelos de água e eletricidade e um guia para preencher.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/modelo-planilhas-ecocampus.zip" download>
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Baixar modelo (.zip)
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v: LancamentoTipo) => setTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agua">Água</SelectItem>
                  <SelectItem value="luz">Eletricidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Arquivo CSV</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button
              className="w-full"
              disabled={!file || !mes || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? 'Analisando…' : 'Analisar CSV'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Referência: <strong>{preview.mesReferencia}</strong> — Tipo:{' '}
                <strong>{preview.tipo === 'agua' ? 'Água' : 'Eletricidade'}</strong>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Recomeçar
            </Button>
          </div>

          {/* Matched */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Pontos identificados
                <Badge variant="secondary">{preview.matched.length}</Badge>
              </CardTitle>
              <CardDescription>
                Total: R$ {preview.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2">Ponto</th>
                      <th className="px-4 py-2">Campus</th>
                      <th className="px-4 py-2 text-right">
                        {preview.tipo === 'agua' ? 'Consumo (m³)' : 'Consumo (kWh)'}
                      </th>
                      <th className="px-4 py-2 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.matched.map((m) => (
                      <tr key={m.pontoMedicaoId} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{m.nome}</td>
                        <td className="px-4 py-2 text-muted-foreground">{m.campusNome}</td>
                        <td className="px-4 py-2 text-right">
                          {m.consumoFisico != null
                            ? m.consumoFisico.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {m.valorFatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Unmatched */}
          {preview.unmatched.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Linhas não identificadas
                  <Badge variant="outline">{preview.unmatched.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Estes registros não serão importados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2">Local</th>
                        <th className="px-4 py-2">Identificador</th>
                        <th className="px-4 py-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.unmatched.map((u, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-4 py-2">{u.local || '—'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{u.identificador || '—'}</td>
                          <td className="px-4 py-2 text-amber-600 text-xs">{u.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              disabled={preview.matched.length === 0 || confirmarMutation.isPending}
              onClick={() => confirmarMutation.mutate()}
            >
              {confirmarMutation.isPending
                ? 'Importando…'
                : `Confirmar importação (${preview.matched.length} registros)`}
            </Button>
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold">{result.imported}</p>
                <p className="text-sm text-muted-foreground">Novos registros</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold">{result.updated}</p>
                <p className="text-sm text-muted-foreground">Atualizados</p>
              </div>
            </div>
            <Button className="w-full" onClick={reset}>
              <FileText className="mr-2 h-4 w-4" />
              Importar outro arquivo
            </Button>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  )
}
