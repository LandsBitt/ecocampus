import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'

import { Brand } from '@/components/layout/Brand'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'
import type { Role } from '@/lib/types'

interface PrivateRouteProps {
  roles?: Role[]
}

export function PrivateRoute({ roles }: PrivateRouteProps) {
  const { user, claims, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Brand />
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Verificando seu acesso…
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Autenticado mas sem as permissões da rota: explica em vez de redirecionar
  // em silêncio, senão o usuário fica sem saber por que voltou ao início.
  if (roles && !roles.includes(claims?.role as Role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-warning-soft text-warning">
          <ShieldAlert className="size-5" />
        </span>
        <div className="max-w-md space-y-2">
          <h1 className="font-display text-xl font-semibold">Esta área é da administração central</h1>
          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
            Seu acesso é de administrador de campus, então esta tela não está disponível. Se você
            precisa dela, peça a liberação à administração do sistema.
          </p>
        </div>
        <Button asChild>
          <a href="/dashboard">Voltar para a visão geral</a>
        </Button>
      </div>
    )
  }

  return <Outlet />
}
