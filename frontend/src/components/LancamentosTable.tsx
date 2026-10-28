import { useMemo } from 'react'
import { ClipboardList, Droplet, Pencil, Trash2, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { DemonstracaoSelo } from '@/components/DemonstracaoAviso'
import { useSort } from '@/hooks/useSort'
import { formatMonthLabel } from '@/lib/date'
import { formatCurrency, formatNumber, UNIDADES } from '@/lib/formatters'
import type { Campus, Lancamento } from '@/lib/types'

type SortKey = 'mes' | 'campus' | 'tipo' | 'consumo' | 'valorRs'

interface LancamentosTableProps {
  items: Lancamento[]
  campi?: Campus[]
  isSuper: boolean
  showActions?: boolean
  onEdit?: (item: Lancamento) => void
  onDelete?: (item: Lancamento) => void
  /** Quem pode editar/excluir cada linha (D5). Sem ela, todas as linhas mostram as ações. */
  podeAlterar?: (item: Lancamento) => boolean
  emptyAction?: React.ReactNode
}

export function LancamentosTable({
  items,
  campi = [],
  isSuper,
  showActions = true,
  onEdit,
  onDelete,
  podeAlterar = () => true,
  emptyAction
}: LancamentosTableProps) {
  const nomePorId = useMemo(
    () => new Map(campi.map((campus) => [campus.id, campus.nome])),
    [campi]
  )
  const campusName = (id: number) => nomePorId.get(id) ?? `Campus ${id}`

  const accessors = useMemo(
    () => ({
      mes: (item: Lancamento) => item.mesReferencia,
      campus: (item: Lancamento) => campusName(item.campusId),
      tipo: (item: Lancamento) => item.tipo,
      consumo: (item: Lancamento) => item.consumo,
      valorRs: (item: Lancamento) => item.valorRs
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nomePorId]
  )

  const { sorted, sort, toggle } = useSort<Lancamento, SortKey>(
    items,
    accessors,
    { key: 'mes', direction: 'desc' },
    { mes: 'desc', consumo: 'desc', valorRs: 'desc' }
  )

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhum lançamento encontrado"
        description="Não há registros para os filtros selecionados. Tente outro mês ou remova algum filtro."
        action={emptyAction}
      />
    )
  }

  // A coluna só aparece se houver ao menos uma linha que o usuário pode alterar.
  const comAcoes = showActions && (!!onEdit || !!onDelete) && items.some(podeAlterar)

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead
              active={sort.key === 'mes'}
              direction={sort.direction}
              onSort={() => toggle('mes')}
            >
              Mês
            </SortableHead>
            {isSuper && (
              <SortableHead
                active={sort.key === 'campus'}
                direction={sort.direction}
                onSort={() => toggle('campus')}
              >
                Campus
              </SortableHead>
            )}
            <SortableHead
              active={sort.key === 'tipo'}
              direction={sort.direction}
              onSort={() => toggle('tipo')}
            >
              Tipo
            </SortableHead>
            <SortableHead
              align="right"
              active={sort.key === 'consumo'}
              direction={sort.direction}
              onSort={() => toggle('consumo')}
            >
              Consumo
            </SortableHead>
            <SortableHead
              className="hidden lg:table-cell"
              align="right"
              active={sort.key === 'valorRs'}
              direction={sort.direction}
              onSort={() => toggle('valorRs')}
            >
              Fatura (R$)
            </SortableHead>
            {comAcoes && <TableHead className="w-24 text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap font-medium tabular-nums">
                {formatMonthLabel(item.mesReferencia)}
              </TableCell>

              {isSuper && (
                <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                  {campusName(item.campusId)}
                </TableCell>
              )}

              <TableCell>
                {item.tipo === 'agua' ? (
                  <Badge variant="water" size="sm">
                    <Droplet />
                    Água
                  </Badge>
                ) : (
                  <Badge variant="energy" size="sm">
                    <Zap />
                    Energia
                  </Badge>
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {item.consumo === null ? (
                  <Hint content="Esta conta foi importada só com o valor em R$. Sem o consumo, ela não entra nos indicadores.">
                    <span className="cursor-help text-xs text-warning">sem consumo</span>
                  </Hint>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{formatNumber(item.consumo)}</span>{' '}
                    <span className="text-xs text-subtle">{UNIDADES[item.tipo].curta}</span>
                  </>
                )}
                {item.origem === 'cpfl_legado' && (
                  <Hint content="Carga antiga: total anual dividido por 12. Não entra em nenhum indicador.">
                    <Badge variant="warning" size="sm" className="ml-2 cursor-help">
                      legado
                    </Badge>
                  </Hint>
                )}
                {item.origem === 'demonstracao' && <DemonstracaoSelo className="ml-2" />}
              </TableCell>

              <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground lg:table-cell">
                {formatCurrency(item.valorRs)}
              </TableCell>

              {comAcoes && (
                <TableCell className="text-right">
                  {podeAlterar(item) && (
                    <div className="inline-flex gap-0.5">
                      {onEdit && (
                        <Hint content="Editar lançamento">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEdit(item)}
                            aria-label={`Editar lançamento de ${formatMonthLabel(item.mesReferencia)}`}
                          >
                            <Pencil />
                          </Button>
                        </Hint>
                      )}
                      {onDelete && (
                        <Hint content="Excluir lançamento">
                          <Button
                            variant="destructive-ghost"
                            size="icon-sm"
                            onClick={() => onDelete(item)}
                            aria-label={`Excluir lançamento de ${formatMonthLabel(item.mesReferencia)}`}
                          >
                            <Trash2 />
                          </Button>
                        </Hint>
                      )}
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
