import { Info } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

/** Explicação da metodologia do Eco Score, igual em Relatórios e no ranking público. */
export function ComoANotaECalculada({ className }: { className?: string }) {
  return (
    <Card variant="flat" className={className}>
      <CardContent className="flex gap-3 p-5">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" />
        <div className="space-y-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Como a nota é calculada</p>
          <p>
            Para cada campus, o consumo de água é dividido pela população e o de energia pela área
            construída. Cada resultado é comparado com a referência da universidade — consumo total
            dividido pela população total (água) e pela área total (energia) — e vira uma nota de 0
            a 100: metade da referência ou menos vale 100, a referência vale 50, e 50% acima ou mais
            vale 0. A nota final é a média das duas. Campus sem lançamento no mês, ou sem população
            e área cadastradas, fica sem nota e fora da referência.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
