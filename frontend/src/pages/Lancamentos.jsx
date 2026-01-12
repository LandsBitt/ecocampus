import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import DashboardLayout from '../layouts/DashboardLayout'
import LancamentoForm from '../components/LancamentoForm'
import LancamentosTable from '../components/LancamentosTable'
import { InlineMessage } from '../components/FullScreenState'
import { api } from '../lib/api'
import { getCurrentMonth } from '../lib/date'
import { useAuth } from '../providers/AuthProvider'

export default function Lancamentos() {
  const { claims, getToken } = useAuth()
  const queryClient = useQueryClient()
  const [mes, setMes] = useState(getCurrentMonth())
  const [tipo, setTipo] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [editing, setEditing] = useState(null)

  const campusQuery = useQuery({
    queryKey: ['campus'],
    queryFn: async () => {
      const token = await getToken()
      return api.get('/campus', token)
    },
    enabled: claims?.role === 'super'
  })

  const lancamentosQuery = useQuery({
    queryKey: ['lancamentos', mes, tipo, campusFilter],
    queryFn: async () => {
      const token = await getToken()
      const params = new URLSearchParams()
      if (mes) params.set('mes', mes)
      if (tipo) params.set('tipo', tipo)
      if (campusFilter) params.set('campusId', campusFilter)
      const query = params.toString()
      return api.get(`/lancamentos${query ? `?${query}` : ''}`, token)
    },
    enabled: !!claims
  })

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const token = await getToken()
      if (payload.id) {
        const { id, ...body } = payload
        return api.put(`/lancamentos/${id}`, body, token)
      }
      return api.post('/lancamentos', payload, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      setEditing(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (payload) => {
      const token = await getToken()
      return api.del(`/lancamentos/${payload.id}`, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
    }
  })

  const campusOptions = useMemo(() => {
    if (claims?.role !== 'super') return []
    return campusQuery.data || []
  }, [campusQuery.data, claims?.role])

  const campusLabel = claims?.role === 'super' ? 'Gestão completa de lançamentos' : `Campus ${claims?.campusId}`

  const handleSubmit = async (data) => {
    if (editing) {
      await mutation.mutateAsync({ ...data, id: editing.id })
    } else {
      await mutation.mutateAsync(data)
    }
  }

  const handleDelete = (item) => {
    if (window.confirm('Deseja excluir este lançamento?')) {
      deleteMutation.mutate(item)
    }
  }

  return (
    <DashboardLayout title="Lançamentos" campusLabel={campusLabel} status="Controle ativo">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate/70">
              <span className="mr-2 text-xs uppercase tracking-[0.2em] text-slate/50">Mês</span>
              <input
                type="month"
                value={mes}
                onChange={(event) => setMes(event.target.value)}
                className="bg-transparent text-slate/80 outline-none"
              />
            </div>
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="agua">Água</option>
              <option value="luz">Luz</option>
            </select>
            {claims?.role === 'super' && (
              <select
                value={campusFilter}
                onChange={(event) => setCampusFilter(event.target.value)}
                className="rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
              >
                <option value="">Todos os campi</option>
                {campusOptions.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {lancamentosQuery.isLoading ? (
            <InlineMessage title="Carregando lançamentos" description="Buscando dados do filtro selecionado." />
          ) : lancamentosQuery.isError ? (
            <InlineMessage title="Erro ao carregar" description="Não foi possível listar lançamentos." />
          ) : (
            <LancamentosTable
              items={lancamentosQuery.data || []}
              isSuper={claims?.role === 'super'}
              onEdit={(item) => setEditing(item)}
              onDelete={handleDelete}
            />
          )}
        </div>
        <LancamentoForm
          onSubmit={handleSubmit}
          campusId={claims?.campusId}
          campusOptions={campusOptions}
          isSuper={claims?.role === 'super'}
          initialValues={editing}
          onCancelEdit={() => setEditing(null)}
        />
      </div>
    </DashboardLayout>
  )
}
