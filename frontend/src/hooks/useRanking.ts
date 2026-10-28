import { useMemo } from 'react'

import { comNota, notaMedia, ordenarRanking } from '@/lib/ecoScore'

/**
 * Tudo o que as telas tiram do ranking, calculado uma vez: a lista completa
 * (com nota primeiro), só os que têm nota, a média deles e o líder.
 * Campus sem dado ou sem cadastro fica sem nota e fora da média.
 */
export function useRanking<T extends { ecoScore: number | null }>(itens: T[] | undefined) {
  return useMemo(() => {
    const lista = itens ?? []
    const avaliados = comNota(lista)
    return {
      ordenado: ordenarRanking(lista),
      avaliados,
      media: notaMedia(avaliados),
      lider: avaliados[0] ?? null
    }
  }, [itens])
}
