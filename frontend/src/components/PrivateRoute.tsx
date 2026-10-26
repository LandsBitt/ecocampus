import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert, UserX, WifiOff, type LucideIcon } from 'lucide-react'

import { Brand } from '@/components/layout/Brand'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'
import type { Role } from '@/lib/types'

interface PrivateRouteProps {
  roles?: Role[]
}

export function PrivateRoute({ roles }: PrivateRouteProps) {
  const { user, claims, loading, error, recarregarAcesso, signOut } = useAuth()
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

  if (error) {
    return (
      <AvisoDeAcesso
        icon={WifiOff}
        tone="destructive"
        title="Não foi possível verificar seu acesso"
        description="Pode ser a conexão com a internet. Confira se você está on-line e tente de novo."
        actions={
          <>
            <Button onClick={() => recarregarAcesso()}>Tentar novamente</Button>
            <Button variant="ghost" onClick={() => signOut()}>
              Sair
            </Button>
          </>
        }
      />
    )
  }

  // Conta criada no Firebase, mas ninguém atribuiu um papel ainda: sem isso
  // nenhuma consulta roda e as telas ficariam carregando para sempre.
  if (!claims) {
    return (
      <AvisoDeAcesso
        icon={UserX}
        tone="warning"
        title="Seu acesso ainda não foi liberado"
        description={`Você entrou como ${user.email ?? 'usuário sem e-mail'}, mas esta conta ainda não tem um papel no EcoCampus. Peça à administração do sistema para liberar o acesso e depois clique em "Verificar de novo".`}
        actions={
          <>
            <Button onClick={() => recarregarAcesso()}>Verificar de novo</Button>
            <Button variant="ghost" onClick={() => signOut()}>
              Sair
            </Button>
          </>
        }
      />
    )
  }

  // Autenticado mas sem as permissões da rota: explica em vez de redirecionar
  // em silêncio, senão o usuário fica sem saber por que voltou ao início.
  if (roles && !roles.includes(claims.role)) {
    return (
      <AvisoDeAcesso
        icon={ShieldAlert}
        tone="warning"
        title="Esta área é da administração central"
        description="Seu acesso é de administrador de campus, então esta tela não está disponível. Se você precisa dela, peça a liberação à administração do sistema."
        actions={
          <Button asChild>
            <a href="/dashboard">Voltar para a visão geral</a>
          </Button>
        }
      />
    )
  }

  return <Outlet />
}

function AvisoDeAcesso({
  icon: Icon,
  tone,
  title,
  description,
  actions
}: {
  icon: LucideIcon
  tone: 'warning' | 'destructive'
  title: string
  description: string
  actions: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <span
        className={
          tone === 'warning'
            ? 'flex size-11 items-center justify-center rounded-full bg-warning-soft text-warning'
            : 'flex size-11 items-center justify-center rounded-full bg-destructive-soft text-destructive'
        }
      >
        <Icon className="size-5" />
      </span>
      <div className="max-w-md space-y-2">
        <h1 className="font-display text-xl font-semibold">{title}</h1>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>
    </div>
  )
}
