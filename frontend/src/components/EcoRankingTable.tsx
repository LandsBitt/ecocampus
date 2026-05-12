import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/formatters'
import type { IndicadorCampus } from '@/lib/types'

interface EcoRankingTableProps {
  items: IndicadorCampus[]
}

function variantFor(classificacao: IndicadorCampus['classificacao']) {
  if (classificacao === 'Ecológico') return 'success' as const
  if (classificacao === 'Atenção') return 'warning' as const
  return 'destructive' as const
}

export function EcoRankingTable({ items }: EcoRankingTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Sem indicadores disponíveis no período selecionado.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campus</TableHead>
            <TableHead className="text-right">Água/pessoa</TableHead>
            <TableHead className="text-right">Luz/m²</TableHead>
            <TableHead className="text-right">Eco score</TableHead>
            <TableHead>Classificação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.campusId}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{item.nome}</span>
                  {!item.normalizado && (
                    <span className="text-[10px] uppercase tracking-wider text-warning">
                      sem dados de população/área
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {item.consumoAguaPerCapita != null ? formatNumber(item.consumoAguaPerCapita) : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {item.consumoLuzPorM2 != null ? formatNumber(item.consumoLuzPorM2) : '—'}
              </TableCell>
              <TableCell className="text-right font-display text-base font-semibold">
                {item.ecoScore.toFixed(1)}
              </TableCell>
              <TableCell>
                <Badge variant={variantFor(item.classificacao)}>{item.classificacao}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
