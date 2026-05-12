import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Building2,
  UserCircle2,
  Sparkles
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles?: Role[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', icon: ClipboardList },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['super'] },
  { to: '/campi', label: 'Gestão de campi', icon: Building2, roles: ['super'] },
  { to: '/perfil', label: 'Perfil', icon: UserCircle2 }
]

interface AppSidebarProps {
  role: Role | undefined
  collapsed?: boolean
}

export function AppSidebar({ role, collapsed = false }: AppSidebarProps) {
  const visible = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)))

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-border/60 bg-card/30 backdrop-blur md:flex md:flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 ring-1 ring-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display text-sm font-semibold tracking-wide">ECOCAMPUS</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Sustentabilidade
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visible.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="m-3 rounded-lg border border-border/40 bg-card/40 p-3">
          <p className="text-xs font-medium text-foreground">UNITAU</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Painel de gestão de consumo de água e energia entre os 8 campi.
          </p>
        </div>
      )}
    </aside>
  )
}
