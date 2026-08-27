import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardList,
  FileUp,
  Gauge,
  Scale
} from 'lucide-react'

import { Page, SectionHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { classificacaoStyles } from '@/lib/ecoScore'
import { glossary, type GlossaryTerm } from '@/lib/glossary'
import { useAuth } from '@/providers/AuthProvider'

const PASSOS = [
  {
    icon: ClipboardList,
    titulo: '1. Os dados entram',
    texto:
      'Todo mês, o consumo de água e energia de cada campus é registrado — digitado em Lançamentos ou importado de uma vez pela planilha da concessionária.'
  },
  {
    icon: Scale,
    titulo: '2. Os números são ajustados',
    texto:
      'Comparar campi pelo total bruto seria injusto: o maior sempre pareceria o pior. Por isso a água é dividida pela população e a energia pela área construída.'
  },
  {
    icon: Calculator,
    titulo: '3. Vira uma nota',
    texto:
      'Cada campus é comparado com a média da universidade e recebe uma nota de 0 a 100 para água e outra para energia. A média das duas é o Eco Score.'
  },
  {
    icon: Gauge,
    titulo: '4. A nota vira uma situação',
    texto:
      'A nota é traduzida em Ecológico, Atenção ou Crítico — a leitura rápida que aparece no ranking e nos painéis.'
  }
]

const TERMOS: GlossaryTerm[] = [
  'ecoScore',
  'normalizacao',
  'aguaPorPessoa',
  'energiaPorM2',
  'classificacao',
  'lancamento',
  'pontoMedicao',
  'mesReferencia',
  'metroCubico',
  'kwh',
  'variacaoMensal',
  'semDadosDemograficos'
]

export default function Ajuda() {
  const { claims } = useAuth()
  const isSuper = claims?.role === 'super'

  return (
    <Page
      title="Como funciona"
      description="Uma explicação sem jargão do que o sistema mede, como calcula e o que cada termo significa."
    >
      <Card variant="brand">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <BookOpen className="size-5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold text-foreground">
              Em uma frase
            </p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              O ECOCAMPUS acompanha quanta água e energia cada campus da UNITAU consome por mês e
              transforma isso em uma nota comparável, de modo que dá para ver onde o esforço de
              redução rende mais.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader
          title="O caminho do dado até a nota"
          description="Quatro etapas, do registro do consumo até a classificação do campus."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {PASSOS.map((passo) => (
            <Card key={passo.titulo}>
              <CardContent className="flex gap-4 p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <passo.icon className="size-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-display text-[0.9375rem] font-semibold text-foreground">
                    {passo.titulo}
                  </p>
                  <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {passo.texto}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardToolbar
          bordered
          title="As três situações"
          description="Como a nota de 0 a 100 é traduzida no ranking."
        />
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-3">
          {(
            [
              { faixa: 'Ecológico', regra: 'Nota 70 ou mais' },
              { faixa: 'Atenção', regra: 'Nota entre 40 e 70' },
              { faixa: 'Crítico', regra: 'Nota abaixo de 40' }
            ] as const
          ).map(({ faixa, regra }) => {
            const style = classificacaoStyles[faixa]
            return (
              <div
                key={faixa}
                className={`rounded-lg border px-4 py-3.5 ${style.border} ${style.bg}`}
              >
                <Badge variant={style.badge} size="sm">
                  {faixa}
                </Badge>
                <p className="mt-2.5 text-[0.8125rem] font-medium text-foreground">{regra}</p>
                <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                  {style.meaning}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader
          title="Glossário"
          description="Todo termo técnico que aparece na interface, explicado."
        />
        <Card>
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {TERMOS.map((termo) => {
                const entrada = glossary[termo]
                return (
                  <div key={termo} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                    <dt className="font-display text-[0.875rem] font-semibold text-foreground">
                      {entrada.label}
                    </dt>
                    <dd className="space-y-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      <p>{entrada.short}</p>
                      {'detail' in entrada && entrada.detail && (
                        <p className="text-subtle">{entrada.detail}</p>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Tarefas do dia a dia" description="Atalhos para o que você mais faz." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card interactive>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ClipboardList className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] font-medium text-foreground">
                  Registrar o consumo de um mês
                </p>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  Um lançamento por tipo, campus e mês.
                </p>
              </div>
              <Button asChild variant="ghost" size="icon-sm" aria-label="Ir para Lançamentos">
                <Link to="/lancamentos">
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {isSuper && (
            <Card interactive>
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileUp className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-medium text-foreground">
                    Importar as contas do mês
                  </p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    Envie o CSV da concessionária e confira antes de gravar.
                  </p>
                </div>
                <Button asChild variant="ghost" size="icon-sm" aria-label="Ir para Importar">
                  <Link to="/importar">
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </Page>
  )
}
