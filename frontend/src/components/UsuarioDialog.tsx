import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, ShieldCheck } from 'lucide-react'

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
import type { Campus, Role, Usuario, UsuarioInput } from '@/lib/types'

/** Mesmo mínimo do backend (`SENHA_MINIMA`). */
const SENHA_MINIMA = 8

const schema = z
  .object({
    editando: z.boolean(),
    email: z.string().trim().email('Informe um e-mail válido'),
    senha: z.string(),
    role: z.enum(['super', 'campus']),
    campusId: z.number().int().nullable()
  })
  .superRefine((v, ctx) => {
    if (!v.editando && v.senha.length < SENHA_MINIMA) {
      ctx.addIssue({ code: 'custom', path: ['senha'], message: `Use pelo menos ${SENHA_MINIMA} caracteres` })
    }
    if (v.role === 'campus' && !v.campusId) {
      ctx.addIssue({ code: 'custom', path: ['campusId'], message: 'Escolha o campus' })
    }
  })

type FormValues = z.infer<typeof schema>

interface UsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UsuarioInput) => Promise<void>
  /** Preenchido para trocar o papel de uma conta existente; nulo para criar. */
  editing?: Usuario | null
  campusOptions: Campus[]
}

/** Gera uma senha inicial legível, sem caracteres que se confundem (0/O, 1/l). */
function senhaAleatoria(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(bytes, (n) => letras[n % letras.length]).join('')
}

export function UsuarioDialog({ open, onOpenChange, onSubmit, editing, campusOptions }: UsuarioDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { editando: false, email: '', senha: '', role: 'campus', campusId: null }
  })

  useEffect(() => {
    if (!open) return
    reset({
      editando: !!editing,
      email: editing?.email ?? '',
      senha: '',
      role: editing?.role ?? 'campus',
      campusId: editing?.campusId ?? null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.uid])

  const role = watch('role')
  const campusId = watch('campusId')

  const submit = handleSubmit(async (data) => {
    await onSubmit({
      email: data.email,
      senha: data.senha,
      role: data.role,
      campusId: data.role === 'campus' ? data.campusId : null
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Alterar acesso' : 'Novo usuário'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'A pessoa precisará entrar de novo para que o novo acesso valha.'
              : 'A conta é criada já com o acesso definido. Passe o e-mail e a senha para a pessoa por um canal seguro; ela pode trocar a senha em Perfil.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail" htmlFor="usuario-email" error={errors.email?.message}>
            <Input
              id="usuario-email"
              type="email"
              autoComplete="off"
              placeholder="nome@unitau.br"
              readOnly={!!editing}
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          {!editing && (
            <Field label="Senha inicial" htmlFor="usuario-senha" error={errors.senha?.message}>
              <div className="flex gap-2">
                <Input
                  id="usuario-senha"
                  type="text"
                  autoComplete="new-password"
                  className="font-mono"
                  invalid={!!errors.senha}
                  {...register('senha')}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setValue('senha', senhaAleatoria(), { shouldValidate: true })}
                >
                  Gerar
                </Button>
              </div>
            </Field>
          )}

          <Field label="Acesso">
            <Segmented
              aria-label="Papel"
              value={role}
              onChange={(value) => setValue('role', value as Role, { shouldValidate: true })}
              options={[
                { value: 'campus', label: 'Um campus', icon: Building2 },
                { value: 'super', label: 'Administração central', icon: ShieldCheck }
              ]}
              className="w-full [&>button]:flex-1"
            />
          </Field>

          {role === 'campus' && (
            <Field
              label="Campus"
              htmlFor="usuario-campus"
              error={errors.campusId?.message}
              help="Vê e lança dados só deste campus."
            >
              <Select
                value={campusId ? String(campusId) : ''}
                onValueChange={(value) => setValue('campusId', Number(value), { shouldValidate: true })}
              >
                <SelectTrigger id="usuario-campus">
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

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'Salvar acesso' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
