import { Navigate, Route, Routes } from 'react-router-dom'

import PrivateRoute from './components/PrivateRoute'
import Dashboard from './pages/Dashboard'
import Lancamentos from './pages/Lancamentos'
import Login from './pages/Login'
import Super from './pages/Super'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
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