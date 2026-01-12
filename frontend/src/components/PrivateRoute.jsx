import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { FullScreenLoading } from './FullScreenState'
import { useAuth } from '../providers/AuthProvider'

export default function PrivateRoute({ roles }) {
  const { user, claims, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullScreenLoading />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(claims?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}