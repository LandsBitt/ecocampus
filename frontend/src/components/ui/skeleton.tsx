import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton-shimmer rounded-md', className)} {...props} />
}

/** Esqueleto de tabela — mantém a altura da linha real para evitar salto de layout. */
function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      <div className="flex gap-4 bg-surface-sunken px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'flex-[1.6]')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonTable }
