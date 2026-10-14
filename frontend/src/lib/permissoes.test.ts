import { describe, expect, it } from 'vitest'

import { podeAlterarLancamento } from './permissoes'

const campus2 = { role: 'campus', campusId: 2 } as const
const superUser = { role: 'super', campusId: null } as const

describe('podeAlterarLancamento (D5)', () => {
  it('admin de campus altera manual do próprio campus', () => {
    expect(podeAlterarLancamento(campus2, { origem: 'manual', campusId: 2 })).toBe(true)
  })

  it('admin de campus não altera importado, nem do próprio campus', () => {
    expect(podeAlterarLancamento(campus2, { origem: 'importado', campusId: 2 })).toBe(false)
    expect(podeAlterarLancamento(campus2, { origem: 'cpfl_legado', campusId: 2 })).toBe(false)
  })

  it('admin de campus não altera lançamento de outro campus', () => {
    expect(podeAlterarLancamento(campus2, { origem: 'manual', campusId: 3 })).toBe(false)
  })

  it('super altera tudo', () => {
    expect(podeAlterarLancamento(superUser, { origem: 'importado', campusId: 3 })).toBe(true)
    expect(podeAlterarLancamento(superUser, { origem: 'manual', campusId: 1 })).toBe(true)
  })

  it('sem login, ninguém altera', () => {
    expect(podeAlterarLancamento(null, { origem: 'manual', campusId: 2 })).toBe(false)
  })
})
