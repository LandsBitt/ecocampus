import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Reports from './Reports'
import { TooltipProvider } from '@/components/ui/tooltip'
import { indicador, semNota } from '@/test/fixtures'
import type { IndicadorCampus } from '@/lib/types'

let indicadores: IndicadorCampus[] = []

vi.mock('@/hooks/queries', () => ({
  useIndicadores: () => ({ data: indicadores, isLoading: false, isError: false, refetch: vi.fn() }),
  usePizza: () => ({ data: [], isLoading: false, isError: false })
}))

vi.mock('@/providers/PeriodProvider', () => ({
  usePeriod: () => ({ mes: '2026-01', setMes: vi.fn(), step: vi.fn(), reset: vi.fn(), isCurrent: false })
}))

function renderReports() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <Reports />
      </TooltipProvider>
    </MemoryRouter>
  )
}

afterEach(cleanup)

describe('Relatórios', () => {
  it('mês sem nenhum lançamento não mostra nota nem classifica a universidade', () => {
    indicadores = [
      semNota('sem_dados', { campusId: 1, nome: 'Campus A' }),
      semNota('sem_dados', { campusId: 2, nome: 'Campus B' })
    ]
    const { container } = renderReports()

    expect(screen.getByText(/Nenhum campus tem nota neste mês/)).toBeTruthy()
    expect(screen.getByText('sem nota')).toBeTruthy()
    expect(screen.getAllByText('Sem dados').length).toBe(2)
    // Antes da correção esta tela dizia "A universidade está classificada como Ecológico".
    expect(container.textContent).not.toMatch(/classificada como/)
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('a nota média usa só os campi com nota', () => {
    indicadores = [
      indicador({ campusId: 1, nome: 'Campus A', ecoScore: 70 }),
      indicador({ campusId: 2, nome: 'Campus B', ecoScore: 10, classificacao: 'Crítico' }),
      semNota('sem_dados', { campusId: 3, nome: 'Campus C' })
    ]
    const { container } = renderReports()

    // (70 + 10) ÷ 2 = 40 → "Na média". Com o campus sem dado valendo 100 daria 60.
    expect(container.textContent).toContain('40,0')
    expect(screen.getByText(/dos 2 campi com nota neste mês/)).toBeTruthy()
    expect(container.textContent).toContain('1 de 3 estão sem nota')
  })
})
