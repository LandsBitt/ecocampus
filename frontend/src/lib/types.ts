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

export type Classificacao = 'Ecológico' | 'Na média' | 'Crítico'

/**
 * `ok` tem nota. As demais explicam por que o campus não tem:
 * sem lançamento no mês, sem população/área, ou fora do ranking por decisão registrada.
 */
export type Situacao = 'ok' | 'sem_dados' | 'sem_cadastro' | 'em_revisao'

export interface IndicadorCampus {
  campusId: number
  nome: string
  populacao: number
  areaConstruidaM2: number
  situacao: Situacao
  motivoForaDoRanking: string | null
  /** Tem ao menos um lançamento com consumo no período. */
  temDados: boolean
  total: number
  /** m³ */
  totalAgua: number
  /** kWh */
  totalLuz: number
  /** m³ por pessoa */
  consumoAguaPerCapita: number | null
  /** kWh por m² */
  consumoLuzPorM2: number | null
  /** kWh por pessoa — informativo, não entra na nota */
  consumoLuzPerCapita: number | null
  /** Referência da universidade usada na nota (total ÷ total). */
  referenciaAguaPerCapita: number | null
  referenciaLuzPorM2: number | null
  /** Nulo quando o campus não tem nota (situacao diferente de `ok`). */
  ecoScore: number | null
  ecoScoreAgua: number | null
  ecoScoreLuz: number | null
  classificacao: Classificacao | null
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
