import { Pencil, Trash2, Droplet, Zap } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatMonth, formatNumber } from '@/lib/formatters'
import type { Campus, Lancamento } from '@/lib/types'

interface LancamentosTableProps {
  items: Lancamento[]
  campi?: Campus[]
  isSuper: boolean
  showActions?: boolean
  onEdit?: (item: Lancamento) => void
  onDelete?: (item: Lancamento) => void
}

export function LancamentosTable({
  items,
  campi = [],
  isSuper,
  showActions = true,
  onEdit,
  onDelete
}: LancamentosTableProps) {
  const campusName = (id: number) =>
    campi.find((c) => c.id === id)?.nome ?? `Campus ${id}`

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento encontrado para os filtros selecionados.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês</TableHead>
            {isSuper && <TableHead>Campus</TableHead>}
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {isSuper && showActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatMonth(item.mesReferencia)}</TableCell>
              {isSuper && (
                <TableCell className="text-muted-foreground">
                  {campusName(item.campusId)}
                </TableCell>
              )}
              <TableCell>
                {item.tipo === 'agua' ? (
                  <Badge className="gap-1.5 normal-case tracking-normal" variant="default">
                    <Droplet className="h-3 w-3" />
                    Água
                  </Badge>
                ) : (
                  <Badge className="gap-1.5 normal-case tracking-normal" variant="warning">
                    <Zap className="h-3 w-3" />
                    Luz
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatNumber(item.valor)}{' '}
                <span className="text-xs text-muted-foreground">
                  {item.tipo === 'agua' ? 'm³' : 'kWh'}
                </span>
              </TableCell>
              {isSuper && showActions && (
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    {onEdit && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
