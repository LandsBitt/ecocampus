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
  /** Quem forneceu população/área. "FICTÍCIO" marca dado de desenvolvimento. */
  demografiaFonte?: string | null
  demografiaReferencia?: string | null
}

export const FONTE_FICTICIA = 'FICTÍCIO'

export type LancamentoTipo = 'agua' | 'luz'

/** `cpfl_legado`: carga antiga (total anual ÷ 12), fora de todos os indicadores. */
export type LancamentoOrigem = 'manual' | 'importado' | 'cpfl_legado'

export interface Lancamento {
  id: number
  campusId: number
  tipo: LancamentoTipo
  /** Consumo físico: m³ para água, kWh para energia. Nulo em importado antigo sem consumo. */
  consumo: number | null
  /** Valor da fatura em R$ — complementar, nunca entra em nota ou ranking. */
  valorRs: number | null
  origem: LancamentoOrigem
  pontoMedicaoId: number | null
  mesReferencia: string
  createdAt?: string
}

export type LancamentoInput = {
  campusId: number
  tipo: LancamentoTipo
  consumo: number
  valorRs: number | null
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
  /** Importados do período que têm fatura em R$ mas não têm consumo físico. */
  pontosSemConsumo?: number
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
  consumoFisico: number
  valorFatura: number | null
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
