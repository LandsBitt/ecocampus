// Domain types — kept in sync with backend Pydantic schemas.

export type Role = 'super' | 'campus'

export interface UserClaims {
  role: Role
  campusId: number | null
}

export interface Campus {
  id: number
  nome: string
  populacao: number
  areaConstruidaM2: number
}

export type LancamentoTipo = 'agua' | 'luz'

export interface Lancamento {
  id: number
  campusId: number
  tipo: LancamentoTipo
  valor: number
  mesReferencia: string
  createdAt?: string
}

export type LancamentoInput = {
  campusId: number
  tipo: LancamentoTipo
  valor: number
  mesReferencia: string
}

export interface ResumoCampus {
  campusId: number
  nome: string | null
  agua: number
  luz: number
  total: number
}

export interface ResumoResponse {
  mes: string | null
  campus?: ResumoCampus | null
  campi?: ResumoCampus[] | null
  totalGeral: ResumoCampus
}

export type Classificacao = 'Ecológico' | 'Atenção' | 'Crítico'

export interface IndicadorCampus {
  campusId: number
  nome: string
  populacao: number
  areaConstruidaM2: number
  total: number
  totalAgua: number
  totalLuz: number
  consumoAguaPerCapita: number | null
  consumoLuzPorM2: number | null
  ecoScore: number
  ecoScoreAgua: number | null
  ecoScoreLuz: number | null
  normalizado: boolean
  classificacao: Classificacao
}

export interface PizzaItem {
  campusId: number
  nome: string
  total: number
}

export interface PontoPreview {
  pontoMedicaoId: number
  nome: string
  campusId: number
  campusNome: string
  identificador: string | null
  consumoFisico: number | null
  valorFatura: number
}

export interface LinhaIgnorada {
  local: string
  identificador: string | null
  consumoFisico: number | null
  valorFatura: number | null
  motivo: string
}

export interface ImportPreview {
  mesReferencia: string
  tipo: string
  matched: PontoPreview[]
  unmatched: LinhaIgnorada[]
  totalValor: number
}

export interface ConfirmarOut {
  imported: number
  updated: number
}
