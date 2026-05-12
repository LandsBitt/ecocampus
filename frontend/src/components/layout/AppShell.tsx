import { Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/providers/AuthProvider'
import { AppSidebar } from './AppSidebar'

const titleByPath: Record<string, { title: string; description?: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Visão geral de consumo e indicadores' },
  '/lancamentos': { title: 'Lançamentos', description: 'Registro mensal de consumo' },
  '/relatorios': { title: 'Relatórios', description: 'Comparativos e ranking entre campi' },
  '/campi': { title: 'Gestão de campi', description: 'Cadastro e demografia dos campi' },
  '/perfil': { title: 'Perfil', description: 'Dados da conta' }
}

export function AppShell() {
  const { claims } = useAuth()
  const location = useLocation()
  const meta = titleByPath[location.pathname] ?? { title: 'ECOCAMPUS' }

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={claims?.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet context={meta} />
      </div>
    </div>
  )
}
