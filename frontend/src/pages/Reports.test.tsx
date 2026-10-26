import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Reports from './Reports'
import { TooltipProvider } from '@/components/ui/tooltip'
import { indicador, semNota } from '@/test/fixtures'
import type { IndicadorCampus, IndicadorUniversidade } from '@/lib/types'

let indicadores: IndicadorCampus[] = []
let universidade: IndicadorUniversidade | undefined

vi.mock('@/hooks/queries', () => ({
  useIndicadores: () => ({ data: indicadores, isLoading: false, isError: false, refetch: vi.fn() }),
  useIndicadorUniversidade: () => ({ data: universidade, isLoading: false, isError: false }),
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

afterEach(() => {
  cleanup()
  universidade = undefined
})

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

  it('campus com demonstração recebe selo e a tela mostra a faixa de aviso (R.0)', () => {
    indicadores = [
      indicador({ campusId: 1, nome: 'Campus A', demonstracao: true }),
      indicador({ campusId: 2, nome: 'Campus B', ecoScore: 50, classificacao: 'Na média' })
    ]
    const { container } = renderReports()

    expect(container.textContent).toMatch(/Este mês tem dados de demonstração/)
    const linha = (nome: string) => screen.getByText(nome).closest('tr')?.textContent ?? ''
    expect(linha('Campus A')).toContain('demonstração')
    expect(linha('Campus B')).not.toContain('demonstração')
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

  it('a tabela de detalhe fecha com o kWh por pessoa da universidade (R.1)', () => {
    indicadores = [
      indicador({ campusId: 1, nome: 'Campus A', populacao: 1000, totalLuz: 8000, consumoLuzPerCapita: 8 }),
      indicador({ campusId: 2, nome: 'Campus B', populacao: 500, totalLuz: 6000, consumoLuzPerCapita: 12 }),
      semNota('sem_cadastro', { campusId: 3, nome: 'Campus C', populacao: 0, totalLuz: 3000 })
    ]
    universidade = {
      kwhPorPessoa: 14000 / 1500,
      kwh: 14000,
      populacao: 1500,
      campiConsiderados: ['Campus A', 'Campus B'],
      campiSemPopulacao: ['Campus C'],
      demonstracao: false,
      emissaoKgCo2: 17000 * 0.0461,
      fatorEmissao: { anoReferencia: 2026, anoDoFator: 2025, fator: 0.0461, provisorio: true, fonte: 'MCTI (teste)' }
    }
    renderReports()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Números|Detalhe/i }))

    const rodape = screen.getByText('Universidade').closest('tfoot')?.textContent ?? ''
    expect(rodape).toContain('9,3')
    expect(rodape).toContain('2 de 3')
    expect(rodape).toContain('ficam de fora: Campus C')
    // R.2: a pegada aparece com o fator e a fonte usados.
    expect(rodape).toContain('784 kg CO₂') // 17.000 kWh × 0,0461 = 783,7
    expect(rodape).toContain('0,0461 tCO₂/MWh (fator de 2025, provisório)')
    expect(rodape).toContain('Fonte: MCTI (teste)')
  })

  it('sem fator cadastrado, a pegada diz isso em vez de mostrar zero (R.2)', () => {
    indicadores = [indicador({ campusId: 1, nome: 'Campus A', emissaoKgCo2: null })]
    universidade = {
      kwhPorPessoa: 8,
      kwh: 8000,
      populacao: 1000,
      campiConsiderados: ['Campus A'],
      campiSemPopulacao: [],
      demonstracao: false,
      emissaoKgCo2: null,
      fatorEmissao: null
    }
    renderReports()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Números/i }))

    const rodape = screen.getByText('Universidade').closest('tfoot')?.textContent ?? ''
    expect(rodape).toContain('sem fator de emissão cadastrado')
    expect(rodape).not.toMatch(/0 kg CO₂/)
  })
})
