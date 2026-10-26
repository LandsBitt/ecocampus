import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Dashboard from './Dashboard'
import { TooltipProvider } from '@/components/ui/tooltip'
import { indicador } from '@/test/fixtures'
import type { ComparacaoMedida, ComparacaoResponse, ResumoResponse, UserClaims } from '@/lib/types'

let claims: UserClaims = { role: 'super', campusId: null }
let resumo: { data?: ResumoResponse; isLoading: boolean; isError: boolean; refetch: () => void }
const refetchResumo = vi.fn()
let comparacao: ComparacaoResponse | undefined

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
  useSerie: () => ({ data: [], isLoading: false, isError: false }),
  useComparacao: () => ({ data: comparacao }),
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

  it('os cartões mostram a variação contra o mesmo mês do ano anterior, ou "sem base" (R.3)', () => {
    const vazia: ComparacaoMedida = { atual: null, mesAnterior: null, anoAnterior: null, variacaoMensal: null, variacaoAnual: null, demonstracao: false }
    claims = { role: 'super', campusId: null }
    resumo = {
      data: { mes: '2026-01', campi: [], totalGeral: { campusId: 0, nome: 'Universidade', agua: 900, luz: 40000 } },
      isLoading: false,
      isError: false,
      refetch: refetchResumo
    }
    comparacao = {
      mes: '2026-01',
      mesAnterior: '2025-12',
      anoAnterior: '2025-01',
      escopo: {
        campusId: null,
        nome: 'Universidade',
        agua: { ...vazia, atual: 900, anoAnterior: 1000, variacaoAnual: -10 },
        luz: { ...vazia, atual: 40000 }
      },
      campi: []
    }
    const { container } = renderDashboard()

    expect(container.textContent).toMatch(/-10,0%\s*vs\. jan\/2025/)
    expect(container.textContent).toContain('Sem base em jan/2025')
    comparacao = undefined
  })
})
