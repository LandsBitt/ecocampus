import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, X } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { Campus, LancamentoInput, LancamentoTipo } from '@/lib/types'

const schema = z.object({
  campusId: z.coerce.number().int().min(1),
  tipo: z.enum(['agua', 'luz']),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  mesReferencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato YYYY-MM')
})

type FormValues = z.infer<typeof schema>

interface LancamentoFormProps {
  onSubmit: (data: LancamentoInput) => Promise<void> | void
  campusId: number | undefined | null
  campusOptions: Campus[]
  isSuper: boolean
  initialValues?: (Partial<LancamentoInput> & { id?: number }) | null
  onCancelEdit?: () => void
}

export function LancamentoForm({
  onSubmit,
  campusId,
  campusOptions,
  isSuper,
  initialValues,
  onCancelEdit
}: LancamentoFormProps) {
  const defaults: FormValues = {
    campusId: campusId ?? 1,
    tipo: 'agua',
    valor: 0,
    mesReferencia: '',
    ...(initialValues as Partial<FormValues>)
  } as FormValues

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  })

  useEffect(() => {
    reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.id, campusId])

  const tipoValue = watch('tipo')
  const campusValue = watch('campusId')

  const submit = handleSubmit(async (data) => {
    await onSubmit(data as LancamentoInput)
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{initialValues?.id ? 'Editar lançamento' : 'Novo lançamento'}</CardTitle>
            <CardDescription>
              {initialValues?.id
                ? 'Ajuste os campos e salve para registrar a correção.'
                : 'Insira o consumo do mês de referência.'}
            </CardDescription>
          </div>
          {initialValues?.id && onCancelEdit && (
            <Button variant="ghost" size="sm" onClick={onCancelEdit} type="button">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {isSuper ? (
              <div className="space-y-2">
                <Label htmlFor="campusId">Campus</Label>
                <Select
                  value={String(campusValue || '')}
                  onValueChange={(v) => setValue('campusId', Number(v), { shouldValidate: true })}
                >
                  <SelectTrigger id="campusId">
                    <SelectValue placeholder="Selecione um campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <input type="hidden" {...register('campusId')} value={campusId ?? ''} />
            )}

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={tipoValue}
                onValueChange={(v) =>
                  setValue('tipo', v as LancamentoTipo, { shouldValidate: true })
                }
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agua">Água (m³)</SelectItem>
                  <SelectItem value="luz">Luz (kWh)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder={tipoValue === 'agua' ? 'Ex: 1240.50' : 'Ex: 18500.00'}
                {...register('valor')}
              />
              {errors.valor && (
                <p className="text-xs text-destructive">{errors.valor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mesReferencia">Mês de referência</Label>
              <Input
                id="mesReferencia"
                type="month"
                {...register('mesReferencia')}
              />
              {errors.mesReferencia && (
                <p className="text-xs text-destructive">{errors.mesReferencia.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Salvando…' : 'Salvar lançamento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
