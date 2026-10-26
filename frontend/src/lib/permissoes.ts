import type { Lancamento, UserClaims } from './types'

/**
 * Quem pode editar ou excluir um lançamento — a mesma regra do backend
 * (`_exige_permissao` em app/api/routes/lancamentos.py, decisão D5):
 * o super altera tudo; o admin de campus, só lançamentos manuais do próprio campus.
 * Demonstração não se altera pela tela: some sozinha quando chega o dado real (SPEC R.0).
 */
export function podeAlterarLancamento(
  claims: UserClaims | null | undefined,
  item: Pick<Lancamento, 'origem' | 'campusId'>
): boolean {
  if (!claims || item.origem === 'demonstracao') return false
  if (claims.role === 'super') return true
  return item.origem === 'manual' && item.campusId === claims.campusId
}
