import { Menu, Search } from 'lucide-react'

import { MonthPicker } from './MonthPicker'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { Button } from '@/components/ui/button'
import { Kbd, modKeyLabel } from '@/components/ui/kbd'
import { navItemFor } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface TopbarProps {
  pathname: string
  campusNome?: string | null
  onOpenMenu: () => void
  onOpenCommand: () => void
  /** Telas sem recorte mensal (Perfil, Ajuda) escondem o seletor de período. */
  showPeriod?: boolean
}

export function Topbar({
  pathname,
  campusNome,
  onOpenMenu,
  onOpenCommand,
  showPeriod = true
}: TopbarProps) {
  const current = navItemFor(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border glass px-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegação"
      >
        <Menu />
      </Button>

      {/* Onde estou: visível no topo em telas pequenas, onde a sidebar some. */}
      <span className="truncate font-display text-sm font-semibold lg:hidden">
        {current?.label ?? 'ECOCAMPUS'}
      </span>

      <button
        type="button"
        onClick={onOpenCommand}
        className={cn(
          'group hidden h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 text-left transition-colors',
          'hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex'
        )}
      >
        <Search className="size-4 shrink-0 text-subtle" />
        <span className="flex-1 truncate text-[0.8125rem] text-subtle">Buscar página ou ação</span>
        <span className="flex items-center gap-0.5">
          <Kbd>{modKeyLabel}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenCommand}
          aria-label="Buscar"
        >
          <Search />
        </Button>
        {showPeriod && <MonthPicker className="hidden sm:flex" />}
        <ThemeToggle />
        <UserMenu campusNome={campusNome} />
      </div>
    </header>
  )
}
