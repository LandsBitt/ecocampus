import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Droplet, Zap } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { getCurrentMonth } from '@/lib/date'
import { UNIDADES } from '@/lib/formatters'
import type { Campus, Lancamento, LancamentoInput, LancamentoTipo } from '@/lib/types'

const schema = z.object({
  campusId: z.coerce.number().int().min(1, 'Escolha um campus'),
  tipo: z.enum(['agua', 'luz']),
  consumo: z.coerce.number({ invalid_type_error: 'Informe um número' }).positive('O consumo deve ser maior que zero'),
  // Opcional: campo vazio vira null, não zero.
  valorRs: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number({ invalid_type_error: 'Informe um número' }).min(0, 'O valor não pode ser negativo').nullable()
  ),
  mesReferencia: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Escolha um mês válido')
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
 * Formulário de lançamento em diálogo.
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

  const submit = handleSubmit(async (data) => {
    await onSubmit({ ...data, id: editing?.id })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Corrija os valores e salve. O histórico e os indicadores são recalculados na hora.'
              : 'Registre o consumo de um campus em um mês. Confira antes na lista se já não existe um lançamento do mesmo tipo para este período.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {isSuper && (
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

          <Field label="O que está sendo registrado">
            <Segmented
              aria-label="Tipo de consumo"
              value={tipo}
              onChange={(value) => setValue('tipo', value as LancamentoTipo, { shouldValidate: true })}
              options={[
                { value: 'agua', label: 'Água', icon: Droplet },
                { value: 'luz', label: 'Energia', icon: Zap }
              ]}
              className="w-full [&>button]:flex-1"
            />
          </Field>

          <Field
            label={`Consumo em ${UNIDADES[tipo].curta}`}
            htmlFor="lanc-consumo"
            hint={<Explain term={tipo === 'agua' ? 'metroCubico' : 'kwh'} className="text-2xs font-normal text-subtle" />}
            error={errors.consumo?.message}
            help={
              tipo === 'agua'
                ? 'O número que aparece como consumo na conta de água do mês.'
                : 'O número que aparece como consumo na conta de luz do mês.'
            }
          >
            <Input
              id="lanc-consumo"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder={tipo === 'agua' ? '1240,50' : '18500'}
              suffix={UNIDADES[tipo].curta}
              invalid={!!errors.consumo}
              {...register('consumo')}
            />
          </Field>

          <Field
            label="Valor da fatura em R$ (opcional)"
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

          <Field
            label="Mês de referência"
            htmlFor="lanc-mes"
            hint={<Explain term="mesReferencia" className="text-2xs font-normal text-subtle" />}
            error={errors.mesReferencia?.message}
          >
            <Input
              id="lanc-mes"
              type="month"
              max={getCurrentMonth()}
              invalid={!!errors.mesReferencia}
              {...register('mesReferencia')}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'Salvar alterações' : 'Registrar lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
