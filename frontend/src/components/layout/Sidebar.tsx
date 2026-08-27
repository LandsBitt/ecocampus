import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { Brand } from './Brand'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/ui/tooltip'
import { GROUP_LABELS, visibleNav, type NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

interface SidebarProps {
  role: Role | undefined
  campusNome?: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** No painel móvel não há colapso nem tooltips. */
  variant?: 'desktop' | 'mobile'
  onNavigate?: () => void
}

export function Sidebar({
  role,
  campusNome,
  collapsed = false,
  onToggleCollapse,
  variant = 'desktop',
  onNavigate
}: SidebarProps) {
  const items = visibleNav(role)
  const isMobile = variant === 'mobile'
  const isCollapsed = !isMobile && collapsed

  const groups = (['analise', 'dados', 'conta'] as const)
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0)

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <Brand compact={isCollapsed} />
        {!isCollapsed && onToggleCollapse && (
          <Hint content="Recolher menu">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Recolher menu"
              className="rounded-md p-1.5 text-subtle transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </Hint>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {groups.map(({ group, items: groupItems }, index) => (
          <div key={group} className={cn(index > 0 && 'mt-5')}>
            {!isCollapsed && <p className="px-3 pb-1.5 eyebrow">{GROUP_LABELS[group]}</p>}
            {isCollapsed && index > 0 && <div className="mx-2 mb-2 h-px bg-border" />}
            <ul className="space-y-0.5">
              {groupItems.map((item) => (
                <li key={item.to}>
                  <SidebarLink
                    item={item}
                    collapsed={isCollapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-border', isCollapsed ? 'p-2' : 'p-3')}>
        {isCollapsed ? (
          onToggleCollapse && (
            <Hint content="Expandir menu" side="right">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expandir menu"
                className="flex w-full items-center justify-center rounded-md p-2 text-subtle transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </Hint>
          )
        ) : (
          <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-2xs font-medium text-muted-foreground">Seu acesso</p>
              <Badge variant={role === 'super' ? 'brand' : 'default'} size="sm">
                {role === 'super' ? 'Reitoria' : 'Campus'}
              </Badge>
            </div>
            <p className="mt-1 truncate text-[0.8125rem] font-medium text-foreground">
              {role === 'super' ? 'Todos os campi' : campusNome || 'Campus vinculado'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarLink({
  item,
  collapsed,
  onNavigate
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-md text-[0.8125rem] font-medium transition-colors',
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Marcador de item ativo: barra fina na borda esquerda. */}
          <span
            aria-hidden
            className={cn(
              'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />
          <Icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Hint side="right" content={<span className="font-medium">{item.label}</span>}>
      {link}
    </Hint>
  )
}
