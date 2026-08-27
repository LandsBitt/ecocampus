import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { AlertCircle, ArrowLeft, Mail, MailCheck } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { auth } from '@/lib/firebase'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setEnviado(true)
    } catch {
      setErro('Não foi possível enviar o e-mail. Verifique se ele está cadastrado no sistema.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <AuthLayout
      title={enviado ? 'Verifique seu e-mail' : 'Recuperar acesso'}
      description={
        enviado
          ? 'Enviamos um link para você criar uma nova senha.'
          : 'Informe o e-mail institucional e enviaremos um link para redefinir a senha.'
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para o login
        </Link>
      }
    >
      {enviado ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success-soft px-4 py-3.5">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <div className="min-w-0 space-y-1">
              <p className="text-[0.8125rem] font-medium text-foreground">
                Link enviado para <span className="break-all">{email}</span>
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                O link vale por tempo limitado. Se não aparecer em alguns minutos, confira a caixa
                de spam.
              </p>
            </div>
          </div>

          <Button variant="secondary" className="w-full" onClick={() => setEnviado(false)}>
            Enviar para outro e-mail
          </Button>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <Field label="E-mail institucional" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              icon={<Mail />}
              placeholder="seu.nome@unitau.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={!!erro}
            />
          </Field>

          {erro && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-xs leading-relaxed text-destructive"
            >
              <AlertCircle className="mt-px size-4 shrink-0" />
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={carregando}>
            <Mail />
            Enviar link de recuperação
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
