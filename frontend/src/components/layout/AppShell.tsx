import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useCampusList } from '@/hooks/queries'
import { useAuth } from '@/providers/AuthProvider'

/** Telas cujo conteúdo não depende do mês selecionado. */
const SEM_PERIODO = ['/perfil', '/ajuda', '/campi', '/importar', '/usuarios']

/** Curva da casa (tailwind `ease-smooth`). */
const EASE = [0.32, 0.72, 0, 1] as const

export function AppShell() {
  const { claims } = useAuth()
  const location = useLocation()
  const outlet = useOutlet()
  const reduzir = useReducedMotion()
  const campusQuery = useCampusList()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

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
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[6.5rem] shrink-0 border-r border-border lg:block">
        <Sidebar role={claims?.role} campusNome={campusNome} />
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
          {/* Troca de tela: entra subindo 8 px em 240 ms; sem movimento, só aparece. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduzir ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzir ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
