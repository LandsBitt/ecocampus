import { Navigate, Route, Routes } from 'react-router-dom'

import { PrivateRoute } from '@/components/PrivateRoute'
import { AppShell } from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import Lancamentos from '@/pages/Lancamentos'
import Reports from '@/pages/Reports'
import Campi from '@/pages/Campi'
import Profile from '@/pages/Profile'
import Login from '@/pages/Login'
import ResetPassword from '@/pages/ResetPassword'
import NotFound from '@/pages/NotFound'
import RankingPublico from '@/pages/public/RankingPublico'
import { useAuth } from '@/providers/AuthProvider'

function DashboardEntry() {
  const { claims } = useAuth()
  if (claims?.role === 'super') return <Navigate to="/relatorios" replace />
  return <Dashboard />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar-senha" element={<ResetPassword />} />
      <Route path="/ranking" element={<RankingPublico />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardEntry />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/perfil" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<PrivateRoute roles={['super']} />}>
        <Route element={<AppShell />}>
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/campi" element={<Campi />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
