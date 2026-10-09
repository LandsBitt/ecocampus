import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { EcoRankingTable } from './EcoRankingTable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { indicador, semNota } from '@/test/fixtures'

function renderTabela(items: Parameters<typeof EcoRankingTable>[0]['items']) {
  return render(
    <TooltipProvider>
      <EcoRankingTable items={items} />
    </TooltipProvider>
  )
}

function linhaDe(nome: string) {
  return within(screen.getByText(nome).closest('tr') as HTMLElement)
}

const ITENS = [
  semNota('sem_dados', { campusId: 3, nome: 'Campus sem lançamento' }),
  indicador({ campusId: 2, nome: 'Campus B', ecoScore: 10, ecoScoreAgua: 10, ecoScoreLuz: 10, classificacao: 'Crítico' }),
  semNota('sem_cadastro', { campusId: 4, nome: 'Campus sem cadastro', totalAgua: 150 }),
  indicador({ campusId: 1, nome: 'Campus A' }),
  semNota('em_revisao', { campusId: 6, nome: 'Reitoria', motivoForaDoRanking: 'Pontos em revisão' })
]

afterEach(cleanup)

describe('EcoRankingTable', () => {
  it('campus sem lançamento aparece como "Sem dados", nunca como 100 ou Ecológico', () => {
    renderTabela(ITENS)
    const linha = linhaDe('Campus sem lançamento')
    expect(linha.getByText('Sem dados')).toBeTruthy()
    expect(linha.queryByText('Ecológico')).toBeNull()
    expect(linha.queryByText(/100/)).toBeNull()
  })

  it('campus sem cadastro e campus em revisão ficam sem nota e sem posição', () => {
    renderTabela(ITENS)
    expect(linhaDe('Campus sem cadastro').getByText('Sem cadastro')).toBeTruthy()
    expect(linhaDe('Reitoria').getByText('Em revisão')).toBeTruthy()
    for (const nome of ['Campus sem cadastro', 'Reitoria', 'Campus sem lançamento']) {
      const primeiraCelula = screen.getByText(nome).closest('tr')?.querySelector('td')
      expect(primeiraCelula?.textContent).toBe('—')
    }
  })

  it('a posição considera só quem tem nota, e sem nota vai para o fim', () => {
    renderTabela(ITENS)
    const nomes = screen
      .getAllByRole('row')
      .slice(1)
      .map((linha) => linha.querySelectorAll('td')[1]?.textContent ?? '')
    expect(nomes[0]).toContain('Campus A')
    expect(nomes[1]).toContain('Campus B')
    expect(linhaDe('Campus A').getByText('1')).toBeTruthy()
    expect(linhaDe('Campus B').getByText('2')).toBeTruthy()
    expect(linhaDe('Campus B').getByText('Crítico')).toBeTruthy()
  })

  it('cada coluna traz a própria unidade, nunca "m³/kWh"', () => {
    const { container } = renderTabela(ITENS)
    const cabecalho = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(cabecalho).toContain('Água (m³/pessoa)')
    expect(cabecalho).toContain('Energia (kWh/m²)')
    expect(cabecalho).toContain('Energia (kWh/pessoa)')
    expect(container.textContent).not.toContain('m³/kWh')
  })
})
