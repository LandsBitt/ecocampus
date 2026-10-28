import { NavLink } from 'react-router-dom'

import { Brand } from './Brand'
import { Badge } from '@/components/ui/badge'
import { GROUP_LABELS, visibleNav, type NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

interface SidebarProps {
  role: Role | undefined
  campusNome?: string | null
  /** `rail`: trilho estreito do desktop (ícone + rótulo). `mobile`: lista completa no painel. */
  variant?: 'rail' | 'mobile'
  onNavigate?: () => void
}

function grupos(role: Role | undefined) {
  const items = visibleNav(role)
  return (['analise', 'dados', 'conta'] as const)
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0)
}

export function Sidebar({ role, campusNome, variant = 'rail', onNavigate }: SidebarProps) {
  return variant === 'mobile' ? (
    <ListaMovel role={role} campusNome={campusNome} onNavigate={onNavigate} />
  ) : (
    <Trilho role={role} campusNome={campusNome} />
  )
}

/**
 * Trilho do desktop: o rótulo fica sempre visível embaixo do ícone, porque
 * quem usa é leigo e ícone sozinho não diz para onde leva.
 */
function Trilho({ role, campusNome }: { role: Role | undefined; campusNome?: string | null }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center bg-surface/60">
      <div className="flex h-20 shrink-0 items-center justify-center">
        <Brand compact />
      </div>

      <nav aria-label="Principal" className="no-scrollbar min-h-0 w-full flex-1 overflow-y-auto px-3 pb-4">
        {grupos(role).map(({ group, items }, index) => (
          <div key={group} className={cn(index > 0 && 'mt-3 border-t border-border pt-3')}>
            <p className="sr-only">{GROUP_LABELS[group]}</p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.to}>
                  <ItemTrilho item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 px-3 pb-5 text-center">
        <Badge variant={role === 'super' ? 'brand' : 'default'} size="sm" className="max-w-[5.5rem]">
          <span className="truncate">{role === 'super' ? 'Reitoria' : campusNome || 'Campus'}</span>
        </Badge>
      </div>
    </div>
  )
}

function ItemTrilho({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center text-[0.6875rem] font-semibold leading-tight transition-colors',
          isActive
            ? 'bg-surface-sunken text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-[22px] shrink-0', isActive && 'text-brand')} aria-hidden />
          <span className="line-clamp-2">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

/** Painel do celular: a lista completa, com grupos e rótulos por extenso. */
function ListaMovel({
  role,
  campusNome,
  onNavigate
}: {
  role: Role | undefined
  campusNome?: string | null
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Brand />
      </div>

      <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {grupos(role).map(({ group, items }, index) => (
          <div key={group} className={cn(index > 0 && 'mt-5')}>
            <p className="px-3 pb-2 eyebrow">{GROUP_LABELS[group]}</p>
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold transition-colors',
                          isActive
                            ? 'bg-surface-sunken text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn('size-5 shrink-0', isActive && 'text-brand')} aria-hidden />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Seu acesso</p>
            <Badge variant={role === 'super' ? 'brand' : 'default'} size="sm">
              {role === 'super' ? 'Reitoria' : 'Campus'}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {role === 'super' ? 'Todos os campi' : campusNome || 'Campus vinculado'}
          </p>
        </div>
      </div>
    </div>
  )
}
