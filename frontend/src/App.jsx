import { Navigate, Route, Routes } from 'react-router-dom'

import PrivateRoute from './components/PrivateRoute'
import Dashboard from './pages/Dashboard'
import Lancamentos from './pages/Lancamentos'
import Login from './pages/Login'
import Super from './pages/Super'
import { useAuth } from './providers/AuthProvider'

function DashboardEntry() {
  const { claims } = useAuth()

  if (claims?.role === 'super') {
    return <Navigate to="/super" replace />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardEntry />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
      </Route>
      <Route element={<PrivateRoute roles={['super']} />}>
        <Route path="/super" element={<Super />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}