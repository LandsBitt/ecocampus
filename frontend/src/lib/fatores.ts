/** Formulário de um fator de emissão, como o usuário digita (texto). */
export interface RascunhoFator {
  ano: string
  fator: string
  provisorio: boolean
  fonte: string
}

/** O que o formulário recusa antes de ir à API (que valida de novo: 2000–2099, 0 < fator < 2). */
export function errosDoFator(r: RascunhoFator): Partial<Record<keyof RascunhoFator, string>> {
  const erros: Partial<Record<keyof RascunhoFator, string>> = {}
  const ano = Number(r.ano)
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2099) erros.ano = 'Informe um ano entre 2000 e 2099'
  const fator = Number(r.fator.replace(',', '.'))
  if (!r.fator.trim() || !Number.isFinite(fator) || fator <= 0 || fator >= 2) {
    erros.fator = 'Informe o fator em tCO₂/MWh, por exemplo 0,0461'
  }
  if (r.fonte.trim().length < 3) erros.fonte = 'Diga de onde veio o valor'
  return erros
}
