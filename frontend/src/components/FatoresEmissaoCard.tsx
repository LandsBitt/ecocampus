import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Leaf, Pencil, Plus } from 'lucide-react'

import { Explain } from '@/components/Explain'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { SkeletonTable } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { useFatoresEmissao } from '@/hooks/queries'
import { api, detalheDoErro } from '@/lib/api'
import { errosDoFator, type RascunhoFator as Rascunho } from '@/lib/fatores'
import { formatNumber } from '@/lib/formatters'
import { useAuth } from '@/providers/AuthProvider'
import type { FatorEmissao } from '@/lib/types'

/**
 * Fatores médios anuais de emissão da rede elétrica (SPEC R.2). Sem um fator
 * para o ano (ou um anterior), a pegada de carbono aparece como "sem fator cadastrado".
 */
export function FatoresEmissaoCard() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const fatores = useFatoresEmissao()
  const [editando, setEditando] = useState<FatorEmissao | null>(null)
  const [aberto, setAberto] = useState(false)

  const salvar = useMutation({
    mutationFn: async (f: FatorEmissao) =>
      api.put<FatorEmissao>(
        `/fatores-emissao/${f.ano}`,
        { fator: f.fator, provisorio: f.provisorio, fonte: f.fonte },
        await getToken()
      ),
    onSuccess: (f) => {
      toast.success(`Fator de ${f.ano} salvo.`, { description: 'A pegada de carbono já usa o valor novo.' })
      queryClient.invalidateQueries({ queryKey: ['fatores'] })
      // A emissão vem junto com os indicadores.
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
      setAberto(false)
    },
    onError: (error) => toast.error(detalheDoErro(error) ?? 'Não foi possível salvar o fator.')
  })

  const abrir = (fator: FatorEmissao | null) => {
    setEditando(fator)
    setAberto(true)
  }

  const lista = fatores.data ?? []
  // Sugestão para "Adicionar ano": o ano seguinte ao mais recente cadastrado.
  const proximoAno = lista.length ? Math.max(...lista.map((f) => f.ano)) + 1 : new Date().getFullYear()

  return (
    <Card>
      <CardToolbar
        bordered
        title={
          <span className="flex items-center gap-2">
            <Leaf className="size-4 shrink-0 text-subtle" />
            Fatores de emissão da energia
          </span>
        }
        description={
          <>
            Usados na <Explain term="pegadaCarbono">pegada de carbono</Explain>: um fator médio por ano,
            publicado pelo MCTI. Ano sem fator usa o do ano anterior, marcado como provisório.
          </>
        }
      >
        <Button size="sm" variant="secondary" onClick={() => abrir(null)}>
          <Plus />
          Adicionar ano
        </Button>
      </CardToolbar>
      <CardContent className="pt-5">
        {fatores.isError ? (
          <ErrorState
            action={
              <Button variant="secondary" size="sm" onClick={() => fatores.refetch()}>
                Tentar novamente
              </Button>
            }
          />
        ) : fatores.isLoading ? (
          <SkeletonTable rows={3} cols={4} />
        ) : lista.length === 0 ? (
          <EmptyState
            size="sm"
            title="Nenhum fator cadastrado"
            description="Enquanto não houver um, a pegada de carbono aparece como “sem fator cadastrado”."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left eyebrow">Ano</th>
                  <th className="px-4 py-2.5 text-right eyebrow">
                    Fator (<span className="normal-case">tCO₂/MWh</span>)
                  </th>
                  <th className="px-4 py-2.5 text-left eyebrow">Situação</th>
                  <th className="px-4 py-2.5 text-left eyebrow">Fonte</th>
                  <th className="w-20 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {[...lista].reverse().map((f) => (
                  <tr key={f.ano} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium tabular-nums">{f.ano}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(f.fator, 4)}</td>
                    <td className="px-4 py-3">
                      {f.provisorio ? (
                        <Badge variant="warning" size="sm">Provisório</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Publicado</Badge>
                      )}
                    </td>
                    <td className="max-w-[24rem] truncate px-4 py-3 text-muted-foreground" title={f.fonte}>
                      {f.fonte}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => abrir(f)} aria-label={`Editar fator de ${f.ano}`}>
                        <Pencil />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <FatorDialog
        open={aberto}
        onOpenChange={setAberto}
        editando={editando}
        anoSugerido={proximoAno}
        salvando={salvar.isPending}
        onSalvar={(f) => salvar.mutate(f)}
      />
    </Card>
  )
}

function FatorDialog({
  open,
  onOpenChange,
  editando,
  anoSugerido,
  salvando,
  onSalvar
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editando: FatorEmissao | null
  anoSugerido: number
  salvando: boolean
  onSalvar: (f: FatorEmissao) => void
}) {
  const inicial = (): Rascunho =>
    editando
      ? {
          ano: String(editando.ano),
          fator: String(editando.fator).replace('.', ','),
          provisorio: editando.provisorio,
          fonte: editando.fonte
        }
      : { ano: String(anoSugerido), fator: '', provisorio: false, fonte: '' }
  const [rascunho, setRascunho] = useState<Rascunho>(inicial)
  const [tentou, setTentou] = useState(false)

  // Cada abertura (de um ano diferente, ou de "novo") recomeça o formulário.
  // Ajustado durante a renderização, não num efeito que redesenha depois.
  const abertura = open ? `aberto-${editando?.ano ?? 'novo'}` : 'fechado'
  const [aberturaAntes, setAberturaAntes] = useState(abertura)
  if (abertura !== aberturaAntes) {
    setAberturaAntes(abertura)
    if (open) {
      setTentou(false)
      setRascunho(inicial())
    }
  }

  const erros = errosDoFator(rascunho)
  const mostrar = (campo: keyof Rascunho) => (tentou ? erros[campo] : undefined)

  const enviar = (event: React.FormEvent) => {
    event.preventDefault()
    setTentou(true)
    if (Object.keys(erros).length > 0) return
    onSalvar({
      ano: Number(rascunho.ano),
      fator: Number(rascunho.fator.replace(',', '.')),
      provisorio: rascunho.provisorio,
      fonte: rascunho.fonte.trim()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? `Fator de ${editando.ano}` : 'Novo fator de emissão'}</DialogTitle>
          <DialogDescription>
            O fator médio anual do Sistema Interligado Nacional, como o MCTI publica. Gravar um ano
            que já existe substitui o valor dele.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          <Field label="Ano" htmlFor="fator-ano" error={mostrar('ano')}>
            <Input
              id="fator-ano"
              type="number"
              inputMode="numeric"
              readOnly={!!editando}
              invalid={!!mostrar('ano')}
              value={rascunho.ano}
              onChange={(e) => setRascunho((r) => ({ ...r, ano: e.target.value }))}
            />
          </Field>

          <Field
            label="Fator"
            htmlFor="fator-valor"
            error={mostrar('fator')}
            help="Em tCO₂/MWh, que é o mesmo que kg de CO₂ por kWh."
          >
            <Input
              id="fator-valor"
              inputMode="decimal"
              placeholder="0,0461"
              suffix="tCO₂/MWh"
              invalid={!!mostrar('fator')}
              value={rascunho.fator}
              onChange={(e) => setRascunho((r) => ({ ...r, fator: e.target.value }))}
            />
          </Field>

          <Field label="Situação" help="Provisório: o MCTI ainda não publicou o valor definitivo do ano.">
            <Segmented
              aria-label="Situação do fator"
              value={rascunho.provisorio ? 'provisorio' : 'publicado'}
              onChange={(v) => setRascunho((r) => ({ ...r, provisorio: v === 'provisorio' }))}
              options={[
                { value: 'publicado', label: 'Publicado' },
                { value: 'provisorio', label: 'Provisório' }
              ]}
              className="w-full [&>button]:flex-1"
            />
          </Field>

          <Field label="Fonte" htmlFor="fator-fonte" error={mostrar('fonte')} help="Aparece ao lado da pegada de carbono nos relatórios.">
            <Textarea
              id="fator-fonte"
              rows={3}
              placeholder="MCTI – fator médio anual do SIN, publicado em …"
              value={rascunho.fonte}
              onChange={(e) => setRascunho((r) => ({ ...r, fonte: e.target.value }))}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando}>
              Salvar fator
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
