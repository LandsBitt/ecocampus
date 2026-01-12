import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  campusId: z.coerce.number().int().min(1),
  tipo: z.enum(['agua', 'luz']),
  valor: z.coerce.number().positive(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM')
})

export default function LancamentoForm({
  onSubmit,
  campusId,
  campusOptions,
  isSuper,
  initialValues,
  onCancelEdit
}) {
  const defaultValues = {
    campusId: campusId || 1,
    tipo: 'agua',
    valor: '',
    mesReferencia: '',
    ...(initialValues || {})
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues
  })

  useEffect(() => {
    reset(defaultValues)
  }, [initialValues, campusId])

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-pearl">
          {initialValues ? 'Editar lançamento' : 'Novo lançamento'}
        </h3>
        {initialValues && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs uppercase tracking-[0.18em] text-slate/60"
          >
            Cancelar
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {isSuper ? (
          <label className="text-xs uppercase tracking-[0.2em] text-slate/60">
            Campus
            <select
              {...register('campusId')}
              className="mt-2 w-full rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
            >
              {campusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" {...register('campusId')} value={campusId} />
        )}
        <label className="text-xs uppercase tracking-[0.2em] text-slate/60">
          Tipo
          <select
            {...register('tipo')}
            className="mt-2 w-full rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
          >
            <option value="agua">Água</option>
            <option value="luz">Luz</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-slate/60">
          Valor (R$)
          <input
            type="number"
            step="0.01"
            {...register('valor')}
            className="mt-2 w-full rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
          />
          {errors.valor && <span className="text-xs text-rose-300">{errors.valor.message}</span>}
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-slate/60">
          Mês (YYYY-MM)
          <input
            type="month"
            {...register('mesReferencia')}
            className="mt-2 w-full rounded-xl border border-white/10 bg-navy/80 px-3 py-2 text-sm"
          />
          {errors.mesReferencia && (
            <span className="text-xs text-rose-300">{errors.mesReferencia.message}</span>
          )}
        </label>
      </div>
      {errors.campusId && <span className="text-xs text-rose-300">{errors.campusId.message}</span>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-cyan/80 px-5 py-3 text-sm font-semibold text-navy transition hover:bg-cyan"
      >
        {isSubmitting ? 'Salvando...' : 'Salvar lançamento'}
      </button>
    </form>
  )
}
