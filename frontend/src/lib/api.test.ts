import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, detalheDoErro } from './api'

function responde(status: number, corpo: string) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(corpo, { status, statusText: 'Erro' })))
}

async function erroDe(promessa: Promise<unknown>): Promise<ApiError> {
  try {
    await promessa
  } catch (error) {
    return error as ApiError
  }
  throw new Error('a chamada devia ter falhado')
}

afterEach(() => vi.unstubAllGlobals())

describe('erros da API', () => {
  it('guarda o detail em texto como explicação legível', async () => {
    responde(409, JSON.stringify({ detail: 'Já existe um lançamento manual deste mês.' }))
    const erro = await erroDe(api.get('/lancamentos'))
    expect(erro.status).toBe(409)
    expect(erro.message).toBe('Já existe um lançamento manual deste mês.')
    expect(detalheDoErro(erro)).toBe('Já existe um lançamento manual deste mês.')
  })

  it('validação do FastAPI (detail em lista) fica sem detalhe', async () => {
    responde(422, JSON.stringify({ detail: [{ loc: ['body', 'consumo'], msg: 'invalid' }] }))
    expect(detalheDoErro(await erroDe(api.post('/lancamentos', {})))).toBeNull()
  })

  it('corpo que não é JSON vira a mensagem, sem detalhe', async () => {
    responde(502, 'Bad Gateway')
    const erro = await erroDe(api.get('/resumo'))
    expect(erro.message).toBe('Bad Gateway')
    expect(detalheDoErro(erro)).toBeNull()
  })

  it('erro que não veio da API não tem detalhe', () => {
    expect(detalheDoErro(new Error('rede'))).toBeNull()
  })
})
