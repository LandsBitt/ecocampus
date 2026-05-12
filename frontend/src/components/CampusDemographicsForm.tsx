import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Building2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { api } from '@/lib/api'
import type { Campus } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

function CampusRow({
  campus,
  onSave,
  isSaving
}: {
  campus: Campus
  onSave: (id: number, body: { populacao: number; areaConstruidaM2: number }) => void
  isSaving: boolean
}) {
  const [populacao, setPopulacao] = useState(campus.populacao ?? 0)
  const [area, setArea] = useState(campus.areaConstruidaM2 ?? 0)

  useEffect(() => {
    setPopulacao(campus.populacao ?? 0)
    setArea(campus.areaConstruidaM2 ?? 0)
  }, [campus.id, campus.populacao, campus.areaConstruidaM2])

  const dirty =
    Number(populacao) !== Number(campus.populacao ?? 0) ||
    Number(area) !== Number(campus.areaConstruidaM2 ?? 0)

  return (
    <TableRow>
      <TableCell className="font-medium">{campus.nome}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={populacao}
          onChange={(e) => setPopulacao(Number(e.target.value))}
          className="h-9 w-32 text-right tabular-nums"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={area}
          onChange={(e) => setArea(Number(e.target.value))}
          className="h-9 w-36 text-right tabular-nums"
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant={dirty ? 'default' : 'outline'}
          size="sm"
          disabled={!dirty || isSaving}
          onClick={() =>
            onSave(campus.id, {
              populacao: Number(populacao),
              areaConstruidaM2: Number(area)
            })
          }
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Salvando…' : 'Salvar'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function CampusDemographicsForm() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [savingId, setSavingId] = useState<number | null>(null)

  const campusQuery = useQuery<Campus[]>({
    queryKey: ['campus-list'],
    queryFn: async () => {
      const token = await getToken()
      return api.get<Campus[]>('/campus', token)
    }
  })

  const mutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: { populacao: number; areaConstruidaM2: number } }) => {
      const token = await getToken()
      return api.patch(`/campus/${id}`, body, token)
    },
    onSuccess: () => {
      toast.success('Dados do campus atualizados.')
      queryClient.invalidateQueries({ queryKey: ['campus-list'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores-super'] })
    },
    onError: () => {
      toast.error('Falha ao salvar. Verifique os valores.')
    },
    onSettled: () => setSavingId(null)
  })

  const handleSave = (id: number, body: { populacao: number; areaConstruidaM2: number }) => {
    setSavingId(id)
    mutation.mutate({ id, body })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Dados demográficos dos campi</CardTitle>
            <CardDescription>
              População (alunos + funcionários) e área construída (m²) normalizam o Eco Score —
              água por pessoa, luz por m². Sem esses dados, o ranking volta ao modo absoluto.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {campusQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : campusQuery.isError ? (
          <p className="text-sm text-destructive">Erro ao carregar campi.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campus</TableHead>
                  <TableHead>População</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campusQuery.data || []).map((campus) => (
                  <CampusRow
                    key={campus.id}
                    campus={campus}
                    onSave={handleSave}
                    isSaving={mutation.isPending && savingId === campus.id}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
