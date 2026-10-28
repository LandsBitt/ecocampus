import { Link, useNavigate } from 'react-router-dom'
import { LifeBuoy, LogOut, UserCircle2 } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/providers/AuthProvider'

export function UserMenu({ campusNome }: { campusNome?: string | null }) {
  const { user, claims, signOut } = useAuth()
  const navigate = useNavigate()

  const escopo =
    claims?.role === 'super' ? 'Reitoria · todos os campi' : campusNome || 'Campus vinculado'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 gap-2 px-1.5 pr-3"
          aria-label="Menu da conta"
        >
          <Avatar name={user?.email} size="sm" />
          <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-foreground lg:inline">
            {user?.email?.split('@')[0] ?? 'Usuário'}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2.5">
          <Avatar name={user?.email} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">{user?.email}</p>
            <p className="mt-0.5 truncate text-2xs text-muted-foreground">{escopo}</p>
          </div>
        </div>
        <div className="px-2 pb-2">
          <Badge variant={claims?.role === 'super' ? 'brand' : 'default'} size="sm">
            {claims?.role === 'super' ? 'Administração central' : 'Administrador de campus'}
          </Badge>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserCircle2 />
            Perfil e senha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/ajuda">
            <LifeBuoy />
            Como funciona
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive-soft focus:text-destructive [&_svg]:text-destructive"
          onClick={async () => {
            await signOut()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
