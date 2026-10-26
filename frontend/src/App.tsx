import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { PrivateRoute } from '@/components/PrivateRoute'
import { RouteFallback } from '@/components/RouteFallback'
import { AppShell } from '@/components/layout/AppShell'
import Login from '@/pages/Login'

/**
 * Cada tela é carregada sob demanda. Isso mantém a tela de login leve —
 * ela não precisa de gráficos nem das tabelas — e faz o resto do sistema
 * chegar em pedaços conforme a navegação.
 */
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Lancamentos = lazy(() => import('@/pages/Lancamentos'))
const Reports = lazy(() => import('@/pages/Reports'))
const Campi = lazy(() => import('@/pages/Campi'))
const Importar = lazy(() => import('@/pages/Importar'))
const Usuarios = lazy(() => import('@/pages/Usuarios'))
const Ajuda = lazy(() => import('@/pages/Ajuda'))
const Profile = lazy(() => import('@/pages/Profile'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const RankingPublico = lazy(() => import('@/pages/public/RankingPublico'))

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<ResetPassword />} />
        <Route path="/ranking" element={<RankingPublico />} />

        {/* Qualquer usuário autenticado */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/ajuda" element={<Ajuda />} />
            <Route path="/perfil" element={<Profile />} />
          </Route>
        </Route>

        {/* Somente administração central */}
        <Route element={<PrivateRoute roles={['super']} />}>
          <Route element={<AppShell />}>
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/campi" element={<Campi />} />
            <Route path="/importar" element={<Importar />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
