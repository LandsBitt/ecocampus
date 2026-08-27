import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, Download, Droplet, Layers, Plus, Search, Trash2, Zap } from 'lucide-react'

import { LancamentoDialog } from '@/components/LancamentoDialog'
import { LancamentosTable } from '@/components/LancamentosTable'
import { Page } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { SkeletonTable } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { useCampusList, useLancamentos } from '@/hooks/queries'
import { ApiError, api } from '@/lib/api'
import { formatMonthLabel, formatMonthLong } from '@/lib/date'
import { downloadCsv } from '@/lib/export'
import { UNIDADES } from '@/lib/formatters'
import { useAuth } from '@/providers/AuthProvider'
import { usePeriod } from '@/providers/PeriodProvider'
import type { Lancamento, LancamentoInput } from '@/lib/types'

type FiltroTipo = 'all' | 'agua' | 'luz'
type FiltroPeriodo = 'mes' | 'todos'

export default function Lancamentos() {
  const { claims, getToken } = useAuth()
  const { mes } = usePeriod()
  const queryClient = useQueryClient()
  const isSuper = claims?.role === 'super'

  const [tipo, setTipo] = useState<FiltroTipo>('all')
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('mes')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [busca, setBusca] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const [paraExcluir, setParaExcluir] = useState<Lancamento | null>(null)

  const campi = useCampusList()
  const lancamentos = useLancamentos({
    mes: periodo === 'mes' ? mes : undefined,
    tipo,
    campusId: campusFilter
  })

  const nomePorId = useMemo(
    () => new Map((campi.data ?? []).map((campus) => [campus.id, campus.nome])),
    [campi.data]
  )

  // Busca textual acontece no cliente: a lista de um mês é pequena e assim
  // o filtro responde a cada tecla sem ida ao servidor.
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return lancamentos.data ?? []
    return (lancamentos.data ?? []).filter((item) =>
      (nomePorId.get(item.campusId) ?? '').toLowerCase().includes(termo)
    )
  }, [lancamentos.data, busca, nomePorId])

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
    queryClient.invalidateQueries({ queryKey: ['resumo'] })
    queryClient.invalidateQueries({ queryKey: ['indicadores'] })
    queryClient.invalidateQueries({ queryKey: ['pizza'] })
  }

  const salvar = useMutation({
    mutationFn: async (payload: LancamentoInput & { id?: number }) => {
      const token = await getToken()
      if (payload.id) {
        const { id, ...body } = payload
        return api.put(`/lancamentos/${id}`, body, token)
      }
      return api.post('/lancamentos', payload, token)
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.id ? 'Lançamento atualizado.' : 'Lançamento registrado.')
      invalidar()
      setFormOpen(false)
      setEditando(null)
    },
    onError: (error: Error) => {
      // 409 é o caso comum: já existe lançamento do mesmo tipo no mesmo mês.
      const conflito = error instanceof ApiError && error.status === 409
      toast.error('Não foi possível salvar', {
        description: conflito
          ? 'Já existe um lançamento deste tipo para este campus e mês. Edite o registro existente em vez de criar outro.'
          : 'Verifique os dados informados e tente novamente.'
      })
    }
  })

  const excluir = useMutation({
    mutationFn: async (id: number) => api.del(`/lancamentos/${id}`, await getToken()),
    onSuccess: () => {
      toast.success('Lançamento excluído.')
      invalidar()
      setParaExcluir(null)
    },
    onError: () => toast.error('Falha ao excluir o lançamento.')
  })

  const exportar = () => {
    downloadCsv(
      `lancamentos-${periodo === 'mes' ? mes : 'todos'}`,
      ['Mês', 'Campus', 'Tipo', 'Consumo', 'Unidade'],
      visiveis.map((item) => [
        formatMonthLabel(item.mesReferencia),
        nomePorId.get(item.campusId) ?? `Campus ${item.campusId}`,
        item.tipo === 'agua' ? 'Água' : 'Energia',
        item.valor,
        UNIDADES[item.tipo].curta
      ])
    )
    toast.success('Arquivo CSV gerado.')
  }

  const temFiltro = tipo !== 'all' || campusFilter !== 'all' || busca.trim() !== ''

  return (
    <Page
      eyebrow={periodo === 'mes' ? formatMonthLabel(mes) : 'Todo o histórico'}
      title="Lançamentos"
      description={
        isSuper
          ? 'Registros mensais de água e energia de todos os campi, digitados aqui ou vindos da importação de planilhas.'
          : 'Registros mensais de água e energia do seu campus.'
      }
      showPeriod
      actions={
        <>
          <Button variant="secondary" onClick={exportar} disabled={visiveis.length === 0}>
            <Download />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button
            onClick={() => {
              setEditando(null)
              setFormOpen(true)
            }}
          >
            <Plus />
            Novo lançamento
          </Button>
        </>
      }
    >
      <Card variant="flat">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <Segmented
            aria-label="Período"
            value={periodo}
            onChange={setPeriodo}
            options={[
              { value: 'mes', label: formatMonthLabel(mes), icon: CalendarRange },
              { value: 'todos', label: 'Todos os meses', icon: Layers }
            ]}
          />

          <Segmented
            aria-label="Tipo de consumo"
            value={tipo}
            onChange={setTipo}
            options={[
              { value: 'all', label: 'Tudo' },
              { value: 'agua', label: 'Água', icon: Droplet },
              { value: 'luz', label: 'Energia', icon: Zap }
            ]}
          />

          {isSuper && (
            <Select value={campusFilter} onValueChange={setCampusFilter}>
              <SelectTrigger className="w-full lg:w-52" aria-label="Filtrar por campus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os campi</SelectItem>
                {(campi.data ?? []).map((campus) => (
                  <SelectItem key={campus.id} value={String(campus.id)}>
                    {campus.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isSuper && (
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar campus…"
              icon={<Search />}
              className="lg:max-w-56"
              aria-label="Buscar por nome do campus"
            />
          )}

          <div className="flex items-center gap-3 lg:ml-auto">
            {temFiltro && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTipo('all')
                  setCampusFilter('all')
                  setBusca('')
                }}
              >
                Limpar filtros
              </Button>
            )}
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {visiveis.length} {visiveis.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </CardContent>
      </Card>

      {lancamentos.isLoading ? (
        <SkeletonTable rows={6} cols={isSuper ? 5 : 4} />
      ) : (
        <LancamentosTable
          items={visiveis}
          campi={campi.data}
          isSuper={isSuper}
          onEdit={(item) => {
            setEditando(item)
            setFormOpen(true)
          }}
          onDelete={setParaExcluir}
          emptyAction={
            <Button
              size="sm"
              onClick={() => {
                setEditando(null)
                setFormOpen(true)
              }}
            >
              <Plus />
              Registrar consumo
            </Button>
          }
        />
      )}

      <LancamentoDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditando(null)
        }}
        onSubmit={async (data) => {
          await salvar.mutateAsync(data)
        }}
        editing={editando}
        campusId={claims?.campusId}
        campusOptions={campi.data ?? []}
        isSuper={isSuper}
        defaultMes={mes}
      />

      <Dialog open={!!paraExcluir} onOpenChange={(open) => !open && setParaExcluir(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir este lançamento?</DialogTitle>
            <DialogDescription>
              {paraExcluir && (
                <>
                  {paraExcluir.tipo === 'agua' ? 'Água' : 'Energia'} de{' '}
                  {nomePorId.get(paraExcluir.campusId) ?? `Campus ${paraExcluir.campusId}`} em{' '}
                  {formatMonthLong(paraExcluir.mesReferencia)}. A exclusão é permanente e os
                  indicadores do mês serão recalculados.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={excluir.isPending}
              onClick={() => paraExcluir && excluir.mutate(paraExcluir.id)}
            >
              <Trash2 />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
