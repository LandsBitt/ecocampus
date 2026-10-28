import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Droplet, Zap } from 'lucide-react'

import { Explain } from '@/components/Explain'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input, inputBase } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useLancamentos } from '@/hooks/queries'
import { getCurrentMonth, previousMonth } from '@/lib/date'
import { comparaComMesAnterior, nomeDoMes } from '@/lib/frases'
import { formatNumber, UNIDADES } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Campus, Lancamento, LancamentoInput, LancamentoTipo } from '@/lib/types'

const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/

const schema = z.object({
  campusId: z.coerce.number().int().min(1, 'Escolha um campus'),
  tipo: z.enum(['agua', 'luz']),
  consumo: z.coerce.number({ invalid_type_error: 'Informe um número' }).min(0, 'O consumo não pode ser negativo'),
  // Opcional: campo vazio vira null, não zero.
  valorRs: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number({ invalid_type_error: 'Informe um número' }).min(0, 'O valor não pode ser negativo').nullable()
  ),
  mesReferencia: z.string().regex(MES_VALIDO, 'Escolha um mês válido')
})

type FormValues = z.infer<typeof schema>

interface LancamentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: LancamentoInput & { id?: number }) => Promise<void>
  /** Preenchido quando é edição; nulo quando é criação. */
  editing?: Lancamento | null
  campusId: number | null | undefined
  campusOptions: Campus[]
  isSuper: boolean
  /** Mês sugerido ao criar — normalmente o período selecionado no sistema. */
  defaultMes?: string
}

/**
 * Formulário de lançamento em diálogo (no celular, gaveta que sobe de baixo).
 *
 * Ficar em diálogo (e não em coluna fixa ao lado da tabela) devolve a
 * largura inteira para a lista, que é o que o usuário olha na maior parte
 * do tempo, e deixa criar e editar usarem exatamente o mesmo formulário.
 */
export function LancamentoDialog({
  open,
  onOpenChange,
  onSubmit,
  editing,
  campusId,
  campusOptions,
  isSuper,
  defaultMes
}: LancamentoDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      campusId: campusId ?? campusOptions[0]?.id ?? 1,
      tipo: 'agua',
      consumo: undefined as unknown as number,
      valorRs: null,
      mesReferencia: defaultMes ?? getCurrentMonth()
    }
  })

  // Reabrir o diálogo sempre recarrega os valores: em edição, os do registro;
  // em criação, os padrões do contexto atual.
  useEffect(() => {
    if (!open) return
    reset(
      editing
        ? {
            campusId: editing.campusId,
            tipo: editing.tipo,
            consumo: editing.consumo ?? (undefined as unknown as number),
            valorRs: editing.valorRs,
            mesReferencia: editing.mesReferencia
          }
        : {
            campusId: campusId ?? campusOptions[0]?.id ?? 1,
            tipo: 'agua',
            consumo: undefined as unknown as number,
            valorRs: null,
            mesReferencia: defaultMes ?? getCurrentMonth()
          }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const tipo = watch('tipo')
  const campusValue = watch('campusId')
  const mesValor = watch('mesReferencia')
  const digitado = watch('consumo') as unknown
  // Importado segue o ponto de medição: campus e tipo não mudam (a API recusa).
  const importado = editing?.pontoMedicaoId != null
  const unidade = UNIDADES[tipo].curta

  // Mês anterior do mesmo campus e tipo, para dizer embaixo do número se ele
  // está muito fora do normal (um zero a mais é o erro de digitação mais comum).
  const mesValido = MES_VALIDO.test(mesValor ?? '')
  const mesAnterior = mesValido ? previousMonth(mesValor) : ''
  const anteriores = useLancamentos(
    { mes: mesAnterior, tipo, campusId: campusValue },
    open && mesValido && !!campusValue
  )
  const consumoAnterior =
    anteriores.data?.find((item) => item.campusId === Number(campusValue) && item.tipo === tipo)
      ?.consumo ?? null
  const atual = digitado === '' || digitado == null ? null : Number(digitado)
  const comparacao = comparaComMesAnterior(atual, consumoAnterior)

  let ajudaConsumo: ReactNode =
    tipo === 'agua'
      ? 'O número que aparece como consumo na conta de água do mês.'
      : 'O número que aparece como consumo na conta de luz do mês.'
  if (mesValido && consumoAnterior !== null) {
    const nomeAnterior = nomeDoMes(mesAnterior, mesValor)
    const valorAnterior = `${formatNumber(consumoAnterior, 0)} ${unidade}`
    if (!comparacao) {
      ajudaConsumo = `Em ${nomeAnterior}, este campus registrou ${valorAnterior}.`
    } else if (comparacao.direcao === 'igual') {
      ajudaConsumo = `Praticamente igual a ${nomeAnterior} neste campus (${valorAnterior}).`
    } else {
      ajudaConsumo = (
        <>
          É{' '}
          <strong className={comparacao.direcao === 'mais' ? 'text-destructive' : 'text-success'}>
            {comparacao.quanto} a {comparacao.direcao}
          </strong>{' '}
          que {nomeAnterior} neste campus ({valorAnterior}).
          {comparacao.conferir && ' Confira se o número está certo.'}
        </>
      )
    }
  }

  const submit = handleSubmit(async (data) => {
    await onSubmit({ ...data, id: editing?.id })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[40rem] sm:gap-6 sm:p-9">
        <DialogHeader>
          <DialogTitle className="text-[1.875rem] sm:text-[2.5rem]">
            {editing ? 'Editar lançamento' : 'Novo lançamento'}
          </DialogTitle>
          <DialogDescription className="sm:text-[0.9375rem]">
            {editing
              ? 'Corrija os valores e salve. O histórico e os indicadores são recalculados na hora.'
              : 'Copie o consumo da conta do mês. Confira antes na lista se o mês já não tem um lançamento do mesmo tipo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {importado && (
            <p className="rounded-md bg-surface-sunken px-3.5 py-2.5 text-[0.8125rem] text-muted-foreground">
              Lançamento importado da planilha: campus e tipo seguem o ponto de medição e não podem ser trocados.
            </p>
          )}

          {!importado && (
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-foreground">O que você está lançando?</legend>
              <div role="radiogroup" aria-label="Tipo de consumo" className="grid grid-cols-2 gap-3">
                {(['agua', 'luz'] as const).map((opcao) => (
                  <TipoTile
                    key={opcao}
                    tipo={opcao}
                    ativo={tipo === opcao}
                    onClick={() => setValue('tipo', opcao, { shouldValidate: true })}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            {isSuper && !importado && (
              <Field label="Campus" htmlFor="lanc-campus" error={errors.campusId?.message}>
                <Select
                  value={campusValue ? String(campusValue) : ''}
                  onValueChange={(value) =>
                    setValue('campusId', Number(value), { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="lanc-campus">
                    <SelectValue placeholder="Selecione um campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((campus) => (
                      <SelectItem key={campus.id} value={String(campus.id)}>
                        {campus.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field
              label="Mês da conta"
              htmlFor="lanc-mes"
              hint={<Explain term="mesReferencia" className="text-2xs font-normal text-subtle" />}
              error={errors.mesReferencia?.message}
              className={isSuper && !importado ? undefined : 'sm:col-span-2'}
            >
              <Input
                id="lanc-mes"
                type="month"
                max={getCurrentMonth()}
                invalid={!!errors.mesReferencia}
                {...register('mesReferencia')}
              />
            </Field>
          </div>

          <Field
            label={tipo === 'agua' ? 'Consumo de água' : 'Consumo de energia'}
            htmlFor="lanc-consumo"
            hint={<Explain term={tipo === 'agua' ? 'metroCubico' : 'kwh'} className="text-2xs font-normal text-subtle" />}
            error={errors.consumo?.message}
            help={<span aria-live="polite">{ajudaConsumo}</span>}
          >
            {/* O número da conta é o que importa no formulário: campo grande, no tamanho do mostrador. */}
            <div className="relative">
              <input
                id="lanc-consumo"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder={tipo === 'agua' ? '1240' : '18500'}
                aria-invalid={!!errors.consumo || undefined}
                className={cn(
                  inputBase,
                  'num h-[4.75rem] rounded-lg px-5 pr-20 text-[2.625rem] font-semibold tracking-[-0.03em] sm:h-[5.25rem] sm:text-5xl',
                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                  errors.consumo && 'border-destructive focus-visible:border-destructive'
                )}
                {...register('consumo')}
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground sm:text-xl">
                {unidade}
              </span>
            </div>
          </Field>

          <Field
            label={
              <>
                Valor da conta <span className="font-medium text-subtle">(opcional)</span>
              </>
            }
            htmlFor="lanc-valor-rs"
            error={errors.valorRs?.message}
            help="Só para registro. A nota e o ranking usam apenas o consumo."
          >
            <Input
              id="lanc-valor-rs"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              suffix="R$"
              invalid={!!errors.valorRs}
              {...register('valorRs')}
            />
          </Field>

          <DialogFooter className="pt-1">
            {/* No celular a gaveta já fecha pelo X e tocando fora; sobra só a ação principal. */}
            <Button type="button" variant="ghost" className="max-sm:hidden" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} className="max-sm:h-14 max-sm:text-base">
              <Check />
              {editing ? 'Salvar alterações' : 'Salvar lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Bloco grande para escolher água ou energia: mais fácil de acertar no celular que um seletor. */
function TipoTile({ tipo, ativo, onClick }: { tipo: LancamentoTipo; ativo: boolean; onClick: () => void }) {
  const Icone = tipo === 'agua' ? Droplet : Zap
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onClick}
      className={cn(
        'flex min-h-14 items-center gap-2.5 rounded-lg border-[1.5px] bg-surface-sunken px-4 text-left text-base font-semibold text-foreground transition-[border-color,box-shadow,background-color]',
        'sm:flex-col sm:items-start sm:p-[1.125rem]',
        'focus-visible:outline-none focus-visible:shadow-focus',
        ativo
          ? tipo === 'agua'
            ? 'border-water-fill bg-[hsl(var(--water-fill)/0.1)] shadow-glow-water'
            : 'border-energy-fill bg-[hsl(var(--energy-fill)/0.1)] shadow-glow-energy'
          : 'border-input hover:border-muted-foreground'
      )}
    >
      <Icone
        className={cn('size-[1.375rem] sm:size-[1.625rem]', tipo === 'agua' ? 'text-water' : 'text-energy')}
        aria-hidden
      />
      <span>
        {tipo === 'agua' ? 'Água' : 'Energia'}
        <small className="mt-1 hidden text-[0.8125rem] font-medium text-muted-foreground sm:block">
          {tipo === 'agua' ? 'Conta de água, em m³' : 'Conta de luz, em kWh'}
        </small>
      </span>
    </button>
  )
}
