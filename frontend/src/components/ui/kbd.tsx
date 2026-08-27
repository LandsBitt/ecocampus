import { cn } from '@/lib/utils'

/** Tecla de atalho renderizada como legenda. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface px-1.5 font-sans text-2xs font-medium text-muted-foreground shadow-xs',
        className
      )}
    >
      {children}
    </kbd>
  )
}

/** Ctrl no Windows/Linux, ⌘ no macOS. Resolvido uma vez no carregamento. */
export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export const modKeyLabel = isMac ? '⌘' : 'Ctrl'
