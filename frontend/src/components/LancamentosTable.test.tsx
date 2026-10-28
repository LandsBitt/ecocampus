import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LancamentosTable } from './LancamentosTable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { podeAlterarLancamento } from '@/lib/permissoes'
import type { Lancamento, UserClaims } from '@/lib/types'

function lancamento(id: number, campusId: number, origem: Lancamento['origem'], mes: string): Lancamento {
  return { id, campusId, tipo: 'agua', consumo: 100, valorRs: null, origem, pontoMedicaoId: null, mesReferencia: mes }
}

// Um mês por linha, para achar cada uma pelo rótulo do mês.
const ITENS = [
  lancamento(1, 2, 'manual', '2026-01'),
  lancamento(2, 2, 'importado', '2026-02'),
  lancamento(3, 3, 'manual', '2026-03'),
  lancamento(4, 2, 'demonstracao', '2026-04')
]

function renderComo(claims: UserClaims) {
  return render(
    <TooltipProvider>
      <LancamentosTable
        items={ITENS}
        isSuper={claims.role === 'super'}
        onEdit={() => {}}
        onDelete={() => {}}
        podeAlterar={(item) => podeAlterarLancamento(claims, item)}
      />
    </TooltipProvider>
  )
}

function botoesDa(mes: RegExp) {
  return within(screen.getByText(mes).closest('tr') as HTMLElement).queryAllByRole('button', {
    name: /Editar|Excluir/
  })
}

afterEach(cleanup)

describe('LancamentosTable — Editar/Excluir só para quem pode (D5)', () => {
  it('admin de campus vê as ações só no manual do próprio campus', () => {
    renderComo({ role: 'campus', campusId: 2 })
    expect(botoesDa(/jan/i)).toHaveLength(2)
    expect(botoesDa(/fev/i)).toHaveLength(0) // importado
    expect(botoesDa(/mar/i)).toHaveLength(0) // outro campus
  })

  it('super vê as ações em todas as linhas', () => {
    renderComo({ role: 'super', campusId: null })
    for (const mes of [/jan/i, /fev/i, /mar/i]) expect(botoesDa(mes)).toHaveLength(2)
  })

  it('demonstração tem selo e não tem ações, nem para o super (R.0)', () => {
    renderComo({ role: 'super', campusId: null })
    const linha = screen.getByText(/abr/i).closest('tr') as HTMLElement
    expect(within(linha).getByText('demonstração')).toBeTruthy()
    expect(botoesDa(/abr/i)).toHaveLength(0)
  })

  it('sem nenhuma linha alterável, a coluna de ações some', () => {
    renderComo({ role: 'campus', campusId: 9 })
    expect(screen.queryByRole('columnheader', { name: 'Ações' })).toBeNull()
  })
})
