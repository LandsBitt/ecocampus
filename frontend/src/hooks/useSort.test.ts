import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useSort } from './useSort'

type Linha = { nome: string; nota: number | null }

const linhas: Linha[] = [
  { nome: 'sem-1', nota: null },
  { nome: 'b', nota: 40 },
  { nome: 'sem-2', nota: null },
  { nome: 'a', nota: 80 }
]
const acessores = { nota: (l: Linha) => l.nota }

function ordenar(direction: 'asc' | 'desc') {
  const { result } = renderHook(() => useSort(linhas, acessores, { key: 'nota', direction }))
  return result.current.sorted.map((l) => l.nome)
}

describe('useSort', () => {
  it('valores ausentes vão para o fim nas duas direções, na ordem em que vieram', () => {
    expect(ordenar('desc')).toEqual(['a', 'b', 'sem-1', 'sem-2'])
    expect(ordenar('asc')).toEqual(['b', 'a', 'sem-1', 'sem-2'])
  })
})
