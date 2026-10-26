import { Menu, Search } from 'lucide-react'

import { Brand } from './Brand'
import { MonthPicker } from './MonthPicker'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { Button } from '@/components/ui/button'
import { Kbd, modKeyLabel } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

interface TopbarProps {
  pathname: string
  campusNome?: string | null
  onOpenMenu: () => void
  onOpenCommand: () => void
  /** Telas sem recorte mensal (Perfil, Ajuda) escondem o seletor de período. */
  showPeriod?: boolean
}

export function Topbar({ campusNome, onOpenMenu, onOpenCommand, showPeriod = true }: TopbarProps) {
  return (
    <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegação"
      >
        <Menu />
      </Button>

      {/* No celular a marca vem para o topo, porque o trilho lateral some. */}
      <Brand compact className="lg:hidden [&>span]:size-9 [&_img]:size-8" />

      <button
        type="button"
        onClick={onOpenCommand}
        className={cn(
          'group hidden h-11 w-full max-w-sm items-center gap-2.5 rounded-full border border-border bg-surface-sunken px-4 text-left transition-colors',
          'hover:border-input hover:bg-muted lg:flex'
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm text-subtle">Buscar página ou ação</span>
        <span className="flex items-center gap-0.5">
          <Kbd>{modKeyLabel}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenCommand} aria-label="Buscar">
          <Search />
        </Button>
        {showPeriod && <MonthPicker className="hidden sm:flex" />}
        <ThemeToggle />
        <UserMenu campusNome={campusNome} />
      </div>
    </header>
  )
}
