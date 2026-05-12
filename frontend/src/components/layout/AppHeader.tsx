import { LogOut, Menu, UserCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/providers/AuthProvider'

interface AppHeaderProps {
  title: string
  description?: string
  rightSlot?: React.ReactNode
  onToggleSidebar?: () => void
}

export function AppHeader({ title, description, rightSlot, onToggleSidebar }: AppHeaderProps) {
  const { user, claims, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <UserCircle2 className="h-4 w-4" />
              <span className="hidden truncate sm:inline-block max-w-[160px]">
                {user?.email || 'Usuário'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-foreground normal-case tracking-normal">
                  {user?.email}
                </span>
                <span className="text-[10px] font-normal normal-case text-muted-foreground tracking-normal">
                  {claims?.role === 'super'
                    ? 'Administração central'
                    : `Campus ${claims?.campusId ?? '—'}`}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil">Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
