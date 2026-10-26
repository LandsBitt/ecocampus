import { FlaskConical } from 'lucide-react'

import { Explain } from '@/components/Explain'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Hint } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Faixa que aparece no topo das telas quando o mês tem dado de demonstração.
 * Número simulado nunca pode passar por medição real (SPEC R.0).
 */
export function DemonstracaoAviso({ className }: { className?: string }) {
  return (
    <Card variant="flat" className={className}>
      <CardContent className="flex gap-3 p-4">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-[0.8125rem] leading-relaxed text-foreground">
          Este mês tem dados de <Explain term="demonstracao">demonstração</Explain>: parte dos números foi
          simulada, não medida. Eles são substituídos assim que o consumo real for lançado ou importado.
        </p>
      </CardContent>
    </Card>
  )
}

/** Selo curto para linhas de tabela. */
export function DemonstracaoSelo({ className }: { className?: string }) {
  return (
    <Hint content="Dado simulado, não medido. Some quando o consumo real for lançado ou importado.">
      <Badge variant="outline" size="sm" className={cn('cursor-help', className)}>
        <FlaskConical />
        demonstração
      </Badge>
    </Hint>
  )
}
