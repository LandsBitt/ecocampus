import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useCampusList } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

const COLLAPSE_KEY = 'ecocampus:sidebar-collapsed'

/** Telas cujo conteúdo não depende do mês selecionado. */
const SEM_PERIODO = ['/perfil', '/ajuda', '/campi', '/importar']

export function AppShell() {
  const { claims } = useAuth()
  const location = useLocation()
  const campusQuery = useCampusList()

  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(COLLAPSE_KEY) === '1'
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  const toggleCollapse = useCallback(() => {
    setCollapsed((value) => {
      const next = !value
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* modo privado: preferência dura só esta sessão */
      }
      return next
    })
  }, [])

  // Atalho global da paleta de comandos.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Trocar de rota fecha o menu móvel.
  useEffect(() => setMobileOpen(false), [location.pathname])

  const campusNome =
    claims?.role === 'campus'
      ? campusQuery.data?.find((campus) => campus.id === claims.campusId)?.nome
      : null

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-border transition-[width] duration-200 ease-smooth lg:block',
          collapsed ? 'w-[4.25rem]' : 'w-60'
        )}
      >
        <Sidebar
          role={claims?.role}
          campusNome={campusNome}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" hideClose className="p-0">
          <Sidebar
            role={claims?.role}
            campusNome={campusNome}
            variant="mobile"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          pathname={location.pathname}
          campusNome={campusNome}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
          showPeriod={!SEM_PERIODO.includes(location.pathname)}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
