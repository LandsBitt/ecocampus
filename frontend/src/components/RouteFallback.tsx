import { Skeleton } from '@/components/ui/skeleton'

/**
 * Espera de carregamento de uma rota.
 *
 * Imita a anatomia das telas (cabeçalho, faixa de indicadores, painel) em
 * vez de mostrar um spinner: o layout não "salta" quando o conteúdo chega.
 */
export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-[85rem] px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>

      <Skeleton className="mt-6 h-80 rounded-xl" />
    </div>
  )
}
