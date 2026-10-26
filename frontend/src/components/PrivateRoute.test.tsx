import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PrivateRoute } from './PrivateRoute'
import type { Role, UserClaims } from '@/lib/types'

const recarregarAcesso = vi.fn()
let auth: { user: { email: string } | null; claims: UserClaims | null; loading: boolean; error: Error | null }

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ ...auth, recarregarAcesso, signOut: vi.fn() })
}))

function renderRota(roles?: Role[]) {
  return render(
    <MemoryRouter initialEntries={['/area']}>
      <Routes>
        <Route element={<PrivateRoute roles={roles} />}>
          <Route path="/area" element={<p>conteúdo</p>} />
        </Route>
        <Route path="/login" element={<p>login</p>} />
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  recarregarAcesso.mockClear()
})

describe('PrivateRoute', () => {
  it('usuário sem papel vê que o acesso não foi liberado, e não uma tela carregando', () => {
    auth = { user: { email: 'novo@unitau.br' }, claims: null, loading: false, error: null }
    renderRota()

    expect(screen.getByText('Seu acesso ainda não foi liberado')).toBeTruthy()
    expect(screen.queryByText('conteúdo')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Verificar de novo' }))
    expect(recarregarAcesso).toHaveBeenCalledOnce()
  })

  it('falha ao ler o token mostra erro com "Tentar novamente"', () => {
    auth = { user: { email: 'a@unitau.br' }, claims: null, loading: false, error: new Error('network') }
    renderRota()

    expect(screen.getByText('Não foi possível verificar seu acesso')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(recarregarAcesso).toHaveBeenCalledOnce()
  })

  it('admin de campus em rota da administração central vê o aviso', () => {
    auth = { user: { email: 'a@unitau.br' }, claims: { role: 'campus', campusId: 1 }, loading: false, error: null }
    renderRota(['super'])

    expect(screen.getByText('Esta área é da administração central')).toBeTruthy()
  })

  it('com papel, mostra a rota', () => {
    auth = { user: { email: 'a@unitau.br' }, claims: { role: 'super', campusId: null }, loading: false, error: null }
    renderRota(['super'])

    expect(screen.getByText('conteúdo')).toBeTruthy()
  })
})
