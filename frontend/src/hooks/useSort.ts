import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

/**
 * Ordenação de tabela com toggle de direção.
 *
 * Clicar numa coluna nova aplica a direção padrão dela (números começam
 * decrescentes, texto crescente); clicar de novo inverte.
 */
export function useSort<T, K extends string>(
  items: T[],
  accessors: Record<K, (item: T) => string | number | null | undefined>,
  initial: SortState<K>,
  defaultDirections?: Partial<Record<K, SortDirection>>
) {
  const [sort, setSort] = useState<SortState<K>>(initial)

  const sorted = useMemo(() => {
    const get = accessors[sort.key]
    if (!get) return items
    const factor = sort.direction === 'asc' ? 1 : -1

    return [...items].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      // Valores ausentes vão sempre para o fim, independentemente da direção.
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), 'pt-BR') * factor
    })
  }, [items, accessors, sort])

  function toggle(key: K) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: defaultDirections?.[key] ?? 'asc' }
    )
  }

  return { sorted, sort, toggle }
}
