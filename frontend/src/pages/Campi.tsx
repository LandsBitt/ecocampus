import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, Info, RotateCcw, Save, Users } from 'lucide-react'

import { Explain } from '@/components/Explain'
import { Page } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { useCampusList } from '@/hooks/queries'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/formatters'
import { useAuth } from '@/providers/AuthProvider'
import { FONTE_FICTICIA, type Campus } from '@/lib/types'

interface Rascunho {
  populacao: string
  area: string
}

type Rascunhos = Record<number, Rascunho>

function paraRascunho(campi: Campus[]): Rascunhos {
  return Object.fromEntries(
    campi.map((campus) => [
      campus.id,
      {
        populacao: campus.populacao ? String(campus.populacao) : '',
        area: campus.areaConstruidaM2 ? String(campus.areaConstruidaM2) : ''
      }
    ])
  )
}

export default function Campi() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const campi = useCampusList()

  const [rascunhos, setRascunhos] = useState<Rascunhos>({})
  const [salvandoId, setSalvandoId] = useState<number | null>(null)

  // Recarrega os campos sempre que o servidor devolve dados novos, mas
  // preserva o que o usuário já digitou e ainda não salvou.
  useEffect(() => {
    if (!campi.data) return
    setRascunhos((atual) => {
      const base = paraRascunho(campi.data)
      return Object.fromEntries(
        Object.entries(base).map(([id, valores]) => [id, atual[Number(id)] ?? valores])
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campi.data])

  const salvar = useMutation({
    mutationFn: async ({
      id,
      populacao,
      areaConstruidaM2
    }: {
      id: number
      populacao: number
      areaConstruidaM2: number
    }) => api.patch(`/campus/${id}`, { populacao, areaConstruidaM2 }, await getToken()),
    onSuccess: () => {
      toast.success('Dados do campus atualizados.', {
        description: 'O Eco Score dos meses já registrados foi recalculado.'
      })
      queryClient.invalidateQueries({ queryKey: ['campus'] })
      queryClient.invalidateQueries({ queryKey: ['indicadores'] })
    },
    onError: () => toast.error('Não foi possível salvar. Verifique os valores informados.'),
    onSettled: () => setSalvandoId(null)
  })

  const lista = campi.data ?? []
  const completos = lista.filter((c) => c.populacao > 0 && c.areaConstruidaM2 > 0).length
  const progresso = lista.length ? (completos / lista.length) * 100 : 0

  const alterados = useMemo(
    () =>
      lista.filter((campus) => {
        const rascunho = rascunhos[campus.id]
        if (!rascunho) return false
        return (
          Number(rascunho.populacao || 0) !== (campus.populacao ?? 0) ||
          Number(rascunho.area || 0) !== (campus.areaConstruidaM2 ?? 0)
        )
      }),
    [lista, rascunhos]
  )

  const salvarCampus = (campus: Campus) => {
    const rascunho = rascunhos[campus.id]
    if (!rascunho) return
    setSalvandoId(campus.id)
    salvar.mutate({
      id: campus.id,
      populacao: Number(rascunho.populacao || 0),
      areaConstruidaM2: Number(rascunho.area || 0)
    })
  }

  return (
    <Page
      title="Campi"
      description="População e área construída de cada campus. São esses dois números que permitem comparar campi de tamanhos diferentes de forma justa."
      actions={
        alterados.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => campi.data && setRascunhos(paraRascunho(campi.data))}
          >
            <RotateCcw />
            Descartar alterações
          </Button>
        )
      }
    >
      <Card variant="flat">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Info className="hidden size-4 shrink-0 text-brand sm:block" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[0.8125rem] font-medium text-foreground">
              Por que estes números importam
            </p>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              Um campus grande gasta mais por natureza. Dividindo a água pela população e a energia
              pela área, o sistema mede eficiência em vez de tamanho — é a{' '}
              <Explain term="normalizacao">comparação justa</Explain>. Sem esses dados, o campus
              entra no ranking pelo consumo absoluto e fica em desvantagem.
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-48">
            <div className="mb-1.5 flex items-center justify-between text-2xs text-muted-foreground">
              <span>Cadastro completo</span>
              <span className="tabular-nums">
                {completos}/{lista.length}
              </span>
            </div>
            <Progress
              value={progresso}
              tone={progresso === 100 ? 'success' : 'warning'}
              label="Campi com população e área cadastradas"
            />
          </div>
        </CardContent>
      </Card>

      {campi.isError ? (
        <ErrorState
          title="Não foi possível carregar os campi"
          action={
            <Button variant="secondary" size="sm" onClick={() => campi.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : campi.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((campus) => {
            const rascunho = rascunhos[campus.id] ?? { populacao: '', area: '' }
            const alterado = alterados.some((c) => c.id === campus.id)
            const completo = campus.populacao > 0 && campus.areaConstruidaM2 > 0

            return (
              <Card key={campus.id}>
                <CardToolbar
                  bordered
                  title={
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-subtle" />
                      <span className="truncate">{campus.nome}</span>
                    </span>
                  }
                >
                  {campus.demografiaFonte === FONTE_FICTICIA ? (
                    <Badge variant="warning" size="sm">
                      FICTÍCIO
                    </Badge>
                  ) : completo ? (
                    <Badge variant="success" size="sm">
                      <Check />
                      Completo
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Incompleto
                    </Badge>
                  )}
                </CardToolbar>

                <CardContent className="space-y-4 pt-5">
                  <Field
                    label="População"
                    htmlFor={`pop-${campus.id}`}
                    help="Alunos, professores e funcionários que frequentam o campus."
                  >
                    <Input
                      id={`pop-${campus.id}`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      icon={<Users />}
                      suffix="pessoas"
                      value={rascunho.populacao}
                      onChange={(event) =>
                        setRascunhos((atual) => ({
                          ...atual,
                          [campus.id]: { ...rascunho, populacao: event.target.value }
                        }))
                      }
                    />
                  </Field>

                  <Field
                    label="Área construída"
                    htmlFor={`area-${campus.id}`}
                    help="Soma da área dos prédios do campus, em metros quadrados."
                  >
                    <Input
                      id={`area-${campus.id}`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      icon={<Building2 />}
                      suffix="m²"
                      value={rascunho.area}
                      onChange={(event) =>
                        setRascunhos((atual) => ({
                          ...atual,
                          [campus.id]: { ...rascunho, area: event.target.value }
                        }))
                      }
                    />
                  </Field>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-2xs tabular-nums text-subtle">
                      Salvo: {formatNumber(campus.populacao, 0)} pessoas ·{' '}
                      {formatNumber(campus.areaConstruidaM2, 0)} m²
                      {campus.demografiaFonte === FONTE_FICTICIA
                        ? ' · valores de teste, não usar em relatório'
                        : campus.demografiaFonte
                          ? ` · fonte: ${campus.demografiaFonte}`
                          : ''}
                    </p>
                    <Button
                      size="sm"
                      disabled={!alterado}
                      loading={salvandoId === campus.id}
                      onClick={() => salvarCampus(campus)}
                    >
                      <Save />
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}
