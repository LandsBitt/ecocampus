import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FatoresEmissaoCard, errosDoFator } from './FatoresEmissaoCard'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { FatorEmissao } from '@/lib/types'

let fatores: FatorEmissao[] = []
const put = vi.fn()

vi.mock('@/hooks/queries', () => ({
  useFatoresEmissao: () => ({ data: fatores, isLoading: false, isError: false, refetch: vi.fn() })
}))
vi.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ getToken: async () => 'token' }) }))
vi.mock('@/lib/api', () => ({
  api: { put: (...args: unknown[]) => put(...args) },
  detalheDoErro: () => null
}))

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <FatoresEmissaoCard />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  put.mockReset()
})

describe('errosDoFator', () => {
  const ok = { ano: '2026', fator: '0,0461', provisorio: true, fonte: 'MCTI' }

  it('aceita vírgula ou ponto decimal', () => {
    expect(errosDoFator(ok)).toEqual({})
    expect(errosDoFator({ ...ok, fator: '0.0461' })).toEqual({})
  })

  it('recusa o que a API recusaria', () => {
    expect(Object.keys(errosDoFator({ ...ok, ano: '1999' }))).toEqual(['ano'])
    expect(Object.keys(errosDoFator({ ...ok, fator: '0' }))).toEqual(['fator'])
    expect(Object.keys(errosDoFator({ ...ok, fator: '2' }))).toEqual(['fator'])
    expect(Object.keys(errosDoFator({ ...ok, fator: 'abc' }))).toEqual(['fator'])
    expect(Object.keys(errosDoFator({ ...ok, fonte: ' ' }))).toEqual(['fonte'])
  })
})

describe('FatoresEmissaoCard', () => {
  it('lista do ano mais recente ao mais antigo, com a situação de cada um', () => {
    fatores = [
      { ano: 2025, fator: 0.0461, provisorio: false, fonte: 'MCTI 2025' },
      { ano: 2026, fator: 0.0461, provisorio: true, fonte: 'Repete 2025' }
    ]
    renderCard()
    const linhas = screen.getAllByRole('row').slice(1)
    expect(linhas[0].textContent).toContain('2026')
    expect(within(linhas[0]).getByText('Provisório')).toBeTruthy()
    expect(within(linhas[1]).getByText('Publicado')).toBeTruthy()
    expect(linhas[1].textContent).toContain('0,0461')
  })

  it('sem fator, avisa o que acontece com a pegada', () => {
    fatores = []
    renderCard()
    expect(screen.getByText('Nenhum fator cadastrado')).toBeTruthy()
  })

  it('novo ano sugere o seguinte ao mais recente e grava com ponto decimal', async () => {
    fatores = [{ ano: 2026, fator: 0.0461, provisorio: true, fonte: 'Repete 2025' }]
    put.mockResolvedValue({ ano: 2027, fator: 0.05, provisorio: false, fonte: 'MCTI 2027' })
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: /Adicionar ano/ }))
    expect((screen.getByLabelText('Ano') as HTMLInputElement).value).toBe('2027')
    fireEvent.change(screen.getByLabelText('Fator'), { target: { value: '0,05' } })
    fireEvent.change(screen.getByLabelText('Fonte'), { target: { value: 'MCTI 2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar fator' }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(put).toHaveBeenCalledWith(
      '/fatores-emissao/2027',
      { fator: 0.05, provisorio: false, fonte: 'MCTI 2027' },
      'token'
    )
  })

  it('não envia com campo inválido e mostra o motivo', () => {
    fatores = []
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar ano/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar fator' }))
    expect(put).not.toHaveBeenCalled()
    expect(screen.getByText(/Informe o fator em tCO₂\/MWh/)).toBeTruthy()
  })
})
