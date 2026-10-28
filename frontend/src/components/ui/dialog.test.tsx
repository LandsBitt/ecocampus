import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

// Abre como as telas abrem: botão comum + estado controlado, sem DialogTrigger.
function Exemplo() {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button onClick={() => setAberto(true)}>Novo lançamento</button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>Formulário</DialogDescription>
          <input aria-label="Consumo" />
        </DialogContent>
      </Dialog>
    </>
  )
}

afterEach(cleanup)

describe('DialogContent', () => {
  it('devolve o foco ao botão que abriu quando fecha com Esc', async () => {
    render(<Exemplo />)
    const botao = screen.getByRole('button', { name: 'Novo lançamento' })
    botao.focus()
    fireEvent.click(botao)

    const dialogo = await screen.findByRole('dialog')
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(botao))
  })
})
