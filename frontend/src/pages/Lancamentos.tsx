import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter } from 'lucide-react'

import { PageLayout } from '@/components/layout/PageLayout'
import { LancamentoForm } from '@/components/LancamentoForm'
import { LancamentosTable } from '@/components/LancamentosTable'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { api } from '@/lib/api'
import { getCurrentMonth } from '@/lib/date'
import { useAuth } from '@/providers/AuthProvider'
import type { Campus, Lancamento, LancamentoInput } from '@/lib/types'

export default function Lancamentos() {
  const { claims, getToken } = useAuth()
  const queryClient = useQueryClient()
  const [mes, setMes] = useState(getCurrentMonth())
  const [tipo, setTipo] = useState<'all' | 'agua' | 'luz'>('all')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [editing, setEditing] = useState<Lancamento | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Lancamento | null>(null)

  const isSuper = claims?.role === 'super'

  const campusQuery = useQuery<Campus[]>({
    queryKey: ['campus-list'],
    queryFn: async () => {
      const token = await getToken()
      return api.get<Campus[]>('/campus', token)
    }
  })

  const lancamentosQuery = useQuery<Lancamento[]>({
    queryKey: ['lancamentos', mes, tipo, campusFilter],
    queryFn: async () => {
      const token = await getToken()
      const params = new URLSearchParams()
      if (mes) params.set('mes', mes)
      if (tipo !== 'all') params.set('tipo', tipo)
      if (campusFilter !== 'all') params.set('campusId', campusFilter)
      const qs = params.toString()
      return api.get<Lancamento[]>(`/lancamentos${qs ? `?${qs}` : ''}`, token)
    },
    enabled: !!claims
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: LancamentoInput & { id?: number }) => {
      const token = await getToken()
      if (payload.id) {
        const { id, ...body } = payload
        return api.put(`/lancamentos/${id}`, body, token)
      }
      return api.post('/lancamentos', payload, token)
    },
    onSuccess: () => {
      toast.success(editing ? 'Lançamento atualizado.' : 'Lançamento registrado.')
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
      setEditing(null)
    },
    onError: () => toast.error('Não foi possível salvar.')
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      return api.del(`/lancamentos/${id}`, token)
    },
    onSuccess: () => {
      toast.success('Lançamento excluído.')
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Falha ao excluir.')
  })

  const campusOptions = useMemo<Campus[]>(() => {
    if (!isSuper) return []
    return campusQuery.data ?? []
  }, [campusQuery.data, isSuper])

  const description = isSuper
    ? 'Gestão completa de lançamentos da universidade.'
    : `Lançamentos do campus ${claims?.campusId ?? ''}.`

  return (
    <PageLayout title="Lançamentos" description={description}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Filtros</CardTitle>
              </div>
              <CardDescription>Refine os lançamentos exibidos abaixo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="filter-mes">Mês</Label>
                  <Input
                    id="filter-mes"
                    type="month"
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v: 'all' | 'agua' | 'luz') => setTipo(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="agua">Água</SelectItem>
                      <SelectItem value="luz">Luz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isSuper && (
                  <div className="space-y-2">
                    <Label>Campus</Label>
                    <Select value={campusFilter} onValueChange={setCampusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {campusOptions.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {lancamentosQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <LancamentosTable
              items={lancamentosQuery.data ?? []}
              campi={campusQuery.data}
              isSuper={isSuper}
              onEdit={(item) => setEditing(item)}
              onDelete={(item) => setConfirmDelete(item)}
            />
          )}
        </div>

        <LancamentoForm
          onSubmit={async (data) => {
            await saveMutation.mutateAsync({ ...data, id: editing?.id })
          }}
          campusId={claims?.campusId}
          campusOptions={campusOptions}
          isSuper={isSuper}
          initialValues={editing}
          onCancelEdit={() => setEditing(null)}
        />
      </div>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir lançamento?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O registro será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
