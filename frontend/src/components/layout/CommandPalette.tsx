import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  CalendarDays,
  CornerDownLeft,
  LogOut,
  Monitor,
  Moon,
  Search,
  Sun,
  type LucideIcon
} from 'lucide-react'

import { Kbd, modKeyLabel } from '@/components/ui/kbd'
import { formatMonthLabel, getCurrentMonth, shiftMonth } from '@/lib/date'
import { visibleNav } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { usePeriod } from '@/providers/PeriodProvider'
import { useTheme } from '@/providers/ThemeProvider'

interface Command {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  group: string
  /** Palavras extras que também encontram o comando na busca. */
  keywords?: string
  run: () => void
}

/** Remove acentos para que "relatorios" encontre "Relatórios". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Paleta de comandos (Ctrl/⌘ + K).
 *
 * Dá acesso de teclado a tudo que a barra lateral oferece, mais as ações de
 * período e tema. Para quem usa o sistema todo dia, é o caminho mais curto;
 * para quem não usa, é invisível.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { claims, signOut } = useAuth()
  const { mes, setMes, reset } = usePeriod()
  const { setTheme } = useTheme()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const close = (action: () => void) => () => {
      onOpenChange(false)
      action()
    }

    const navegacao: Command[] = visibleNav(claims?.role).map((item) => ({
      id: `nav:${item.to}`,
      label: item.label,
      hint: item.description,
      icon: item.icon,
      group: 'Ir para',
      keywords: item.to,
      run: close(() => navigate(item.to))
    }))

    const periodo: Command[] = [
      {
        id: 'periodo:anterior',
        label: `Ver ${formatMonthLabel(shiftMonth(mes, -1))}`,
        hint: 'Mês anterior ao selecionado',
        icon: CalendarDays,
        group: 'Período',
        keywords: 'mes anterior voltar',
        run: close(() => setMes(shiftMonth(mes, -1)))
      },
      {
        id: 'periodo:atual',
        label: `Voltar para ${formatMonthLabel(getCurrentMonth())}`,
        hint: 'Mês corrente',
        icon: CalendarDays,
        group: 'Período',
        keywords: 'mes atual hoje agora',
        run: close(reset)
      }
    ]

    const aparencia: Command[] = [
      {
        id: 'tema:claro',
        label: 'Tema claro',
        icon: Sun,
        group: 'Aparência',
        keywords: 'light branco',
        run: close(() => setTheme('light'))
      },
      {
        id: 'tema:escuro',
        label: 'Tema escuro',
        icon: Moon,
        group: 'Aparência',
        keywords: 'dark noite preto',
        run: close(() => setTheme('dark'))
      },
      {
        id: 'tema:sistema',
        label: 'Seguir o tema do sistema',
        icon: Monitor,
        group: 'Aparência',
        keywords: 'auto automatico',
        run: close(() => setTheme('system'))
      }
    ]

    const conta: Command[] = [
      {
        id: 'conta:sair',
        label: 'Sair da conta',
        icon: LogOut,
        group: 'Conta',
        keywords: 'logout deslogar encerrar sessao',
        run: close(async () => {
          await signOut()
          navigate('/login', { replace: true })
        })
      }
    ]

    return [...navegacao, ...periodo, ...aparencia, ...conta]
  }, [claims?.role, mes, navigate, onOpenChange, reset, setMes, setTheme, signOut])

  const filtered = useMemo(() => {
    const term = normalize(query.trim())
    if (!term) return commands
    return commands.filter((command) =>
      normalize(`${command.label} ${command.hint ?? ''} ${command.keywords ?? ''} ${command.group}`).includes(
        term
      )
    )
  }, [commands, query])

  // Reinicia a seleção sempre que a lista muda para não apontar para o vazio.
  useEffect(() => setActiveIndex(0), [query, open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const grouped = useMemo(() => {
    const map = new Map<string, { command: Command; index: number }[]>()
    filtered.forEach((command, index) => {
      const bucket = map.get(command.group) ?? []
      bucket.push({ command, index })
      map.set(command.group, bucket)
    })
    return [...map.entries()]
  }, [filtered])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      filtered[activeIndex]?.run()
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl outline-none data-[state=open]:animate-scale-in"
        >
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Busque uma página ou ação e pressione Enter.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar página ou ação…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-subtle"
            />
            <Kbd>esc</Kbd>
          </div>

          <div ref={listRef} className="max-h-[22rem] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-[0.8125rem] text-muted-foreground">
                Nada encontrado para “{query}”.
              </p>
            ) : (
              grouped.map(([group, entries]) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="px-3 py-1.5 eyebrow">{group}</p>
                  {entries.map(({ command, index }) => {
                    const Icon = command.icon
                    const active = index === activeIndex
                    return (
                      <button
                        key={command.id}
                        type="button"
                        data-index={index}
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={command.run}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                          active ? 'bg-accent text-accent-foreground' : 'text-foreground'
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-subtle" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-medium">
                            {command.label}
                          </span>
                          {command.hint && (
                            <span className="block truncate text-2xs text-muted-foreground">
                              {command.hint}
                            </span>
                          )}
                        </span>
                        {active && <CornerDownLeft className="size-3.5 shrink-0 text-subtle" />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border bg-surface-sunken px-4 py-2 text-2xs text-subtle">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navegar
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> abrir
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <Kbd>{modKeyLabel}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
