import { cn } from '@/lib/utils'

/** Deriva até duas iniciais de um e-mail institucional ou nome. */
export function initialsFrom(source: string | null | undefined): string {
  if (!source) return '?'
  const local = source.includes('@') ? source.split('@')[0] : source
  const parts = local.split(/[.\-_\s]+/).filter(Boolean)
  if (parts.length === 0) return local.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

interface AvatarProps {
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand font-semibold text-brand-foreground',
        size === 'sm' && 'size-6 text-2xs',
        size === 'md' && 'size-8 text-xs',
        size === 'lg' && 'size-11 text-sm',
        className
      )}
    >
      {initialsFrom(name)}
    </span>
  )
}
