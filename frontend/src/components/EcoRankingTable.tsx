import { useMemo } from 'react'
import { Trophy } from 'lucide-react'

import { EcoScoreBar } from '@/components/charts/EcoScoreGauge'
import { Badge, Dot } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  SortableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Hint } from '@/components/ui/tooltip'
import { useSort } from '@/hooks/useSort'
import { classificacaoStyles, comNota, motivoSemNota } from '@/lib/ecoScore'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { IndicadorCampus } from '@/lib/types'

type SortKey = 'nome' | 'agua' | 'luz' | 'luzPessoa' | 'score'

interface EcoRankingTableProps {
  items: IndicadorCampus[]
  /** Destaca a linha de um campus (o do usuário, ou o filtrado). */
  highlightId?: number | null
  /** Mostra medalha nas três primeiras posições. */
  showPodium?: boolean
}

export function EcoRankingTable({
  items,
  highlightId,
  showPodium = true
}: EcoRankingTableProps) {
  // A posição é sempre pelo score, mesmo quando a tabela está ordenada
  // por outra coluna — senão "1º lugar" mudaria de significado.
  // Campus sem nota não tem posição.
  const posicoes = useMemo(
    () => new Map(comNota(items).map((item, index) => [item.campusId, index + 1])),
    [items]
  )

  const accessors = useMemo(
    () => ({
      nome: (item: IndicadorCampus) => item.nome,
      agua: (item: IndicadorCampus) => item.consumoAguaPerCapita,
      luz: (item: IndicadorCampus) => item.consumoLuzPorM2,
      luzPessoa: (item: IndicadorCampus) => item.consumoLuzPerCapita,
      score: (item: IndicadorCampus) => item.ecoScore
    }),
    []
  )

  const { sorted, sort, toggle } = useSort<IndicadorCampus, SortKey>(
    items,
    accessors,
    { key: 'score', direction: 'desc' },
    { agua: 'asc', luz: 'asc', luzPessoa: 'asc', score: 'desc' }
  )

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Nenhum campus com dados neste mês"
        description="O ranking aparece assim que houver lançamentos de água ou energia no período selecionado."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {showPodium && <TableHead className="w-12 text-center">#</TableHead>}
            <SortableHead
              active={sort.key === 'nome'}
              direction={sort.direction}
              onSort={() => toggle('nome')}
            >
              Campus
            </SortableHead>
            <SortableHead
              className="hidden md:table-cell"
              align="right"
              active={sort.key === 'agua'}
              direction={sort.direction}
              onSort={() => toggle('agua')}
            >
              Água (m³/pessoa)
            </SortableHead>
            <SortableHead
              className="hidden md:table-cell"
              align="right"
              active={sort.key === 'luz'}
              direction={sort.direction}
              onSort={() => toggle('luz')}
            >
              Energia (kWh/m²)
            </SortableHead>
            <SortableHead
              className="hidden lg:table-cell"
              align="right"
              active={sort.key === 'luzPessoa'}
              direction={sort.direction}
              onSort={() => toggle('luzPessoa')}
            >
              Energia (kWh/pessoa)
            </SortableHead>
            <SortableHead
              className="w-44"
              align="right"
              active={sort.key === 'score'}
              direction={sort.direction}
              onSort={() => toggle('score')}
            >
              Eco Score
            </SortableHead>
            <TableHead className="w-32">Situação</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((item) => {
            const posicao = posicoes.get(item.campusId) ?? null
            const style = item.classificacao ? classificacaoStyles[item.classificacao] : null
            const semNota = motivoSemNota(item)
            const destaque = highlightId === item.campusId

            return (
              <TableRow
                key={item.campusId}
                className={cn(destaque && 'bg-accent/60 hover:bg-accent/60')}
              >
                {showPodium && (
                  <TableCell className="text-center">
                    <PodiumMark posicao={posicao} />
                  </TableCell>
                )}

                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">{item.nome}</span>
                    {/* Em telas estreitas as colunas do meio somem; o dado volta aqui. */}
                    <span className="mt-1 text-2xs tabular-nums text-subtle md:hidden">
                      {formatNumber(item.consumoAguaPerCapita, 2)} m³/pessoa ·{' '}
                      {formatNumber(item.consumoLuzPorM2, 2)} kWh/m²
                    </span>
                  </div>
                </TableCell>

                <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                  {formatNumber(item.consumoAguaPerCapita, 2)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                  {formatNumber(item.consumoLuzPorM2, 2)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                  {formatNumber(item.consumoLuzPerCapita, 1)}
                </TableCell>

                <TableCell>
                  <EcoScoreBar score={item.ecoScore} />
                </TableCell>

                <TableCell>
                  {style ? (
                    <Hint content={style.meaning}>
                      <Badge variant={style.badge} size="sm" className="cursor-help">
                        <Dot />
                        {item.classificacao}
                      </Badge>
                    </Hint>
                  ) : (
                    semNota && (
                      <Hint content={semNota.meaning}>
                        <Badge variant="outline" size="sm" className="cursor-help">
                          {semNota.label}
                        </Badge>
                      </Hint>
                    )
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/** 1º, 2º e 3º recebem destaque; o resto é apenas o número. Sem nota, sem posição. */
function PodiumMark({ posicao }: { posicao: number | null }) {
  if (posicao === null) {
    return <span className="text-xs text-subtle">—</span>
  }
  if (posicao > 3) {
    return <span className="text-xs tabular-nums text-subtle">{posicao}</span>
  }
  const tones = {
    1: 'bg-warning-soft text-warning border-warning/30',
    2: 'bg-muted text-muted-foreground border-border',
    3: 'bg-energy-soft text-energy border-energy/30'
  } as const
  return (
    <span
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full border text-2xs font-semibold tabular-nums',
        tones[posicao as 1 | 2 | 3]
      )}
    >
      {posicao}
    </span>
  )
}
