import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageLayout } from '@/components/layout/PageLayout'
import { SummaryCards } from '@/components/SummaryCards'
import { LancamentosTable } from '@/components/LancamentosTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { getCurrentMonth, previousMonth } from '@/lib/date'
import { classifyScore } from '@/lib/ecoScore'
import { useAuth } from '@/providers/AuthProvider'
import type {
  Campus,
  IndicadorCampus,
  Lancamento,
  ResumoResponse
} from '@/lib/types'

export default function Dashboard() {
  const { claims, getToken } = useAuth()
  const [mes, setMes] = useState(getCurrentMonth())
  const mesAnterior = useMemo(() => previousMonth(mes), [mes])

  const resumoQuery = useQuery<ResumoResponse>({
    queryKey: ['resumo', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get<ResumoResponse>(`/resumo?mes=${mes}`, token)
    },
    enabled: !!claims
  })

  const resumoAnteriorQuery = useQuery<ResumoResponse>({
    queryKey: ['resumo', mesAnterior],
    queryFn: async () => {
      const token = await getToken()
      return api.get<ResumoResponse>(`/resumo?mes=${mesAnterior}`, token)
    },
    enabled: !!claims
  })

  const indicadoresQuery = useQuery<IndicadorCampus[]>({
    queryKey: ['indicadores', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get<IndicadorCampus[]>(`/indicadores?mes=${mes}`, token)
    },
    enabled: !!claims
  })

  const lancamentosQuery = useQuery<Lancamento[]>({
    queryKey: ['lancamentos', mes],
    queryFn: async () => {
      const token = await getToken()
      return api.get<Lancamento[]>(`/lancamentos?mes=${mes}`, token)
    },
    enabled: !!claims
  })

  const campusListQuery = useQuery<Campus[]>({
    queryKey: ['campus-list'],
    queryFn: async () => {
      const token = await getToken()
      return api.get<Campus[]>('/campus', token)
    },
    enabled: !!claims
  })

  const summary = useMemo(() => {
    if (!resumoQuery.data) return null
    if (claims?.role === 'super') {
      const t = resumoQuery.data.totalGeral
      return { agua: t.agua, luz: t.luz, total: t.total, totalGeral: t.total }
    }
    const c = resumoQuery.data.campus
    return {
      agua: c?.agua ?? 0,
      luz: c?.luz ?? 0,
      total: c?.total ?? 0,
      totalGeral: resumoQuery.data.totalGeral?.total ?? 0
    }
  }, [resumoQuery.data, claims?.role])

  const previous = useMemo(() => {
    if (!resumoAnteriorQuery.data) return undefined
    if (claims?.role === 'super') {
      const t = resumoAnteriorQuery.data.totalGeral
      return { agua: t.agua, luz: t.luz, total: t.total }
    }
    const c = resumoAnteriorQuery.data.campus
    return { agua: c?.agua ?? 0, luz: c?.luz ?? 0, total: c?.total ?? 0 }
  }, [resumoAnteriorQuery.data, claims?.role])

  const status = useMemo(() => {
    if (!indicadoresQuery.data || indicadoresQuery.data.length === 0) return null
    if (claims?.role === 'campus') return indicadoresQuery.data[0]?.classificacao ?? null
    const avg =
      indicadoresQuery.data.reduce((sum, i) => sum + i.ecoScore, 0) / indicadoresQuery.data.length
    return classifyScore(avg)
  }, [indicadoresQuery.data, claims?.role])

  const recent = (lancamentosQuery.data ?? []).slice(0, 6)

  const description =
    claims?.role === 'super'
      ? 'Visão geral consolidada de todos os campi.'
      : `Campus ${claims?.campusId ?? '—'}: visão do consumo do mês.`

  const rightSlot = (
    <div className="flex items-center gap-3">
      {status && (
        <Badge
          variant={
            status === 'Ecológico' ? 'success' : status === 'Atenção' ? 'warning' : 'destructive'
          }
        >
          {status}
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <Label htmlFor="mes" className="text-[10px]">
          Mês
        </Label>
        <Input
          id="mes"
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="h-9 w-[160px]"
        />
      </div>
    </div>
  )

  return (
    <PageLayout title="Dashboard" description={description} rightSlot={rightSlot}>
      {resumoQuery.isLoading || !summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <SummaryCards {...summary} previous={previous} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Últimos lançamentos</CardTitle>
          <CardDescription>
            6 lançamentos mais recentes do período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lancamentosQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <LancamentosTable
              items={recent}
              campi={campusListQuery.data}
              isSuper={claims?.role === 'super'}
              showActions={false}
            />
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
