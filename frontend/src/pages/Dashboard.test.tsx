import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Dashboard from './Dashboard'
import { TooltipProvider } from '@/components/ui/tooltip'
import { indicador } from '@/test/fixtures'
import type { ResumoResponse, UserClaims } from '@/lib/types'

let claims: UserClaims = { role: 'super', campusId: null }
let resumo: { data?: ResumoResponse; isLoading: boolean; isError: boolean; refetch: () => void }
const refetchResumo = vi.fn()

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ claims })
}))

vi.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', resolved: 'light', setTheme: vi.fn(), toggle: vi.fn() })
}))

vi.mock('@/providers/PeriodProvider', () => ({
  usePeriod: () => ({ mes: '2026-01', setMes: vi.fn(), step: vi.fn(), reset: vi.fn(), isCurrent: false })
}))

vi.mock('@/hooks/queries', () => ({
  useResumo: () => resumo,
  useIndicadores: () => ({
    data: [indicador({ campusId: 3, nome: 'Campus C' })],
    isLoading: false,
    isError: false,
    refetch: vi.fn()
  }),
  useHistoricoResumo: () => ({ data: [], isLoading: false, isError: false }),
  useLancamentos: () => ({ data: [], isLoading: false }),
  useCampusList: () => ({ data: [{ id: 3, nome: 'Campus C' }] }),
  usePizza: () => ({ data: [], isLoading: false })
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <Dashboard />
      </TooltipProvider>
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  refetchResumo.mockClear()
})

describe('Dashboard', () => {
  it('com a API fora do ar mostra erro e "Tentar novamente" em vez de carregar para sempre', () => {
    claims = { role: 'super', campusId: null }
    resumo = { data: undefined, isLoading: false, isError: true, refetch: refetchResumo }
    const { container } = renderDashboard()

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy()
    expect(container.querySelector('.animate-pulse')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(refetchResumo).toHaveBeenCalledOnce()
  })

  it('o campus vê o total da universidade rotulado como referência (D11)', () => {
    claims = { role: 'campus', campusId: 3 }
    resumo = {
      data: {
        mes: '2026-01',
        campus: { campusId: 3, nome: 'Campus C', agua: 120, luz: 3000 },
        totalGeral: { campusId: 0, nome: 'Universidade', agua: 900, luz: 40000 }
      },
      isLoading: false,
      isError: false,
      refetch: refetchResumo
    }
    const { container } = renderDashboard()

    expect(container.textContent).toMatch(/Universidade \(referência\): 900/)
    expect(container.textContent).toMatch(/Universidade \(referência\): 40/)
    expect(container.textContent).not.toMatch(/dados de demonstração/)
  })

  it('mês com demonstração mostra a faixa de aviso (R.0)', () => {
    claims = { role: 'super', campusId: null }
    resumo = {
      data: {
        mes: '2026-01',
        campi: [],
        totalGeral: { campusId: 0, nome: 'Universidade', agua: 900, luz: 40000, demonstracao: true }
      },
      isLoading: false,
      isError: false,
      refetch: refetchResumo
    }
    const { container } = renderDashboard()

    expect(container.textContent).toMatch(/Este mês tem dados de demonstração/)
  })
})
