import { Skeleton } from '@/components/ui/skeleton'

/**
 * Espera de carregamento de uma rota.
 *
 * Imita a anatomia das telas (título grande, bento de cartões) em vez de
 * mostrar um spinner: o layout não "salta" quando o conteúdo chega.
 */
export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-[85rem] px-4 py-6 sm:px-6 lg:py-10" role="status" aria-label="Carregando">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="h-12 w-72 max-w-full rounded-lg sm:h-14" />
        <Skeleton className="h-4 w-full max-w-xl rounded-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-72 rounded-xl md:col-span-2 xl:row-span-2 xl:h-auto" />
        <Skeleton className="h-72 rounded-xl xl:row-span-2 xl:h-[30rem]" />
        <Skeleton className="h-72 rounded-xl xl:row-span-2 xl:h-[30rem]" />
      </div>

      <Skeleton className="mt-4 h-80 rounded-xl" />
    </div>
  )
}
