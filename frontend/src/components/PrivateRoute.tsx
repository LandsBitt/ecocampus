import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Verificando sessão…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(claims?.role as Role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
