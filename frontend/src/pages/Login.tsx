import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { AlertCircle, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/providers/AuthProvider'

/** Traduz os códigos do Firebase para mensagens que orientam o que fazer. */
function mensagemDeErro(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Esse e-mail não parece válido. Confira se digitou corretamente.'
    case 'auth/user-disabled':
      return 'Esta conta está desativada. Procure a administração do sistema.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos antes de tentar de novo.'
    case 'auth/network-request-failed':
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    default:
      return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  }
}

export default function Login() {
  const { user } = useAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  if (user) {
    const destino = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
    return <Navigate to={destino || '/dashboard'} replace />
  }

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch (error) {
      setErro(mensagemDeErro((error as { code?: string }).code ?? ''))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Use o e-mail institucional cadastrado pela administração do sistema."
      footer={
        <p className="text-center text-[0.8125rem] leading-relaxed text-subtle">
          Acesso restrito a servidores autorizados da UNITAU. O ranking dos campi também está{' '}
          <Link to="/ranking" className="text-brand underline underline-offset-4">
            disponível publicamente
          </Link>
          .
        </p>
      }
    >
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

        <Field
          label="Senha"
          htmlFor="senha"
          hint={
            <Link
              to="/recuperar-senha"
              className="ml-auto text-[0.8125rem] font-semibold text-brand underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          }
        >
          <div className="relative">
            <Input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              invalid={!!erro}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((valor) => !valor)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {erro && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-soft px-3.5 py-3 text-[0.8125rem] leading-relaxed text-destructive"
          >
            <AlertCircle className="mt-px size-4 shrink-0" />
            {erro}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={carregando}>
          Entrar
          <ArrowRight />
        </Button>
      </form>
    </AuthLayout>
  )
}
