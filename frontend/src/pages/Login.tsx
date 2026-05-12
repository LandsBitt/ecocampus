import { useState, type FormEvent } from 'react'
import { Navigate, Link, useLocation } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Loader2, LogIn } from 'lucide-react'

import { auth } from '@/lib/firebase'
import { useAuth } from '@/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function Login() {
  const { user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    const fromPath = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
    return <Navigate to={fromPath || '/dashboard'} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setError('Credenciais inválidas ou usuário não encontrado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 animate-rise">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/image/unitau-logo.png"
            alt="Unitau"
            className="h-16 w-16 rounded-2xl bg-card/40 p-2 ring-1 ring-border"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
              ECOCAMPUS
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Painel de gestão</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sustentabilidade e consumo dos 8 campi UNITAU.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email institucional</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu.nome@unitau.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/recuperar-senha"
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Esqueci a senha
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito a administradores institucionais cadastrados no Firebase Auth.
        </p>
      </div>
    </div>
  )
}
