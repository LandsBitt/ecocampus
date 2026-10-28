import { describe, expect, it } from 'vitest'

import { comparaComMesAnterior, fraseComoTexto, fraseDoMes, nomeDoMes } from './frases'
import { medidaNumerica } from './formatters'

const base = { mes: '2026-10', mesAnterior: '2026-09', sujeito: 'A universidade' }

describe('fraseDoMes', () => {
  it('diz o quanto cada medida subiu ou caiu, sem somar água e energia', () => {
    const trechos = fraseDoMes({ ...base, atual: { agua: 21283, luz: 48426 }, anterior: { agua: 19051, luz: 49528 } })
    expect(fraseComoTexto(trechos)).toBe('A universidade gastou 11,7% mais água e 2,2% menos energia que em setembro.')
    expect(trechos.filter((t) => t.medida).map((t) => t.medida)).toEqual(['agua', 'luz'])
  })

  it('variação abaixo de 0,5% vira "a mesma quantidade"', () => {
    const texto = fraseComoTexto(fraseDoMes({ ...base, atual: { agua: 1001, luz: 0 }, anterior: { agua: 1000, luz: 0 } }))
    expect(texto).toBe('A universidade gastou a mesma quantidade de água que em setembro.')
  })

  it('na virada do ano o mês anterior leva o ano', () => {
    const texto = fraseComoTexto(
      fraseDoMes({ mes: '2026-01', mesAnterior: '2025-12', sujeito: 'Campus da Juta', atual: { agua: 90, luz: 0 }, anterior: { agua: 100, luz: 0 } })
    )
    expect(texto).toBe('Campus da Juta gastou 10,0% menos água que em dezembro de 2025.')
  })

  it('sem mês anterior para comparar, diz isso', () => {
    const texto = fraseComoTexto(fraseDoMes({ ...base, atual: { agua: 100, luz: 5 }, anterior: null }))
    expect(texto).toBe('Ainda não dá para comparar com setembro: falta o consumo daquele mês.')
  })

  it('mês vazio não inventa número', () => {
    const texto = fraseComoTexto(fraseDoMes({ ...base, atual: { agua: 0, luz: 0 }, anterior: { agua: 10, luz: 10 } }))
    expect(texto).toBe('Ainda não há consumo registrado em outubro de 2026.')
  })
})

describe('nomeDoMes', () => {
  it('omite o ano quando é o mesmo', () => {
    expect(nomeDoMes('2026-09', '2026-10')).toBe('setembro')
    expect(nomeDoMes('2025-12', '2026-01')).toBe('dezembro de 2025')
  })
})

describe('medidaNumerica', () => {
  it('escolhe a mesma unidade que o texto formatado', () => {
    expect(medidaNumerica(48426, 'luz')).toEqual({ n: 48.426, casas: 1, unit: 'MWh' })
    expect(medidaNumerica(21283, 'agua')).toEqual({ n: 21283, casas: 0, unit: 'm³' })
    expect(medidaNumerica(null, 'agua')).toBeNull()
  })
})

describe('comparaComMesAnterior', () => {
  it('diz quanto a mais ou a menos, sem sinal', () => {
    expect(comparaComMesAnterior(2259, 2062)).toEqual({ quanto: '9,6%', direcao: 'mais', conferir: false })
    expect(comparaComMesAnterior(1800, 2000)).toEqual({ quanto: '10,0%', direcao: 'menos', conferir: false })
  })

  it('pede para conferir quando a diferença é grande (provável erro de digitação)', () => {
    expect(comparaComMesAnterior(20620, 2062)?.conferir).toBe(true)
    expect(comparaComMesAnterior(206, 2062)?.conferir).toBe(true)
  })

  it('sem número digitado ou sem mês anterior, não compara', () => {
    expect(comparaComMesAnterior(null, 2062)).toBeNull()
    expect(comparaComMesAnterior(Number.NaN, 2062)).toBeNull()
    expect(comparaComMesAnterior(100, null)).toBeNull()
    expect(comparaComMesAnterior(100, 0)).toBeNull()
  })

  it('diferença abaixo de 0,5% conta como igual', () => {
    expect(comparaComMesAnterior(1001, 1000)?.direcao).toBe('igual')
  })
})
