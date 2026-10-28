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

/** Conta do Firebase Auth com o papel das custom claims. */
export interface Usuario {
  uid: string
  email: string | null
  /** Nulo quando a conta existe mas ninguém atribuiu papel. */
  role: Role | null
  campusId: number | null
  desativado: boolean
  /** ms desde a época */
  criadoEm: number | null
  ultimoAcesso: number | null
}

export interface UsuarioInput {
  email: string
  senha: string
  role: Role
  campusId: number | null
}

export type LancamentoTipo = 'agua' | 'luz'

/**
 * `cpfl_legado`: carga antiga (total anual ÷ 12), fora de todos os indicadores.
 * `demonstracao`: dado simulado; conta nos números, mas é sempre sinalizado (SPEC R.0).
 */
export type LancamentoOrigem = 'manual' | 'importado' | 'cpfl_legado' | 'demonstracao'

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
  /** E-mail (ou uid) de quem criou. Nulo em registro anterior à trilha de auditoria. */
  criadoPor?: string | null
  atualizadoEm?: string
}

export type LancamentoInput = {
  campusId: number
  tipo: LancamentoTipo
  consumo: number
  valorRs: number | null
  mesReferencia: string
}

/** Consumo físico do período. Água e energia nunca são somadas. */
export interface ResumoCampus {
  campusId: number
  nome: string | null
  /** m³ */
  agua: number
  /** kWh */
  luz: number
  /** A soma inclui lançamento de demonstração: não é medição real. */
  demonstracao?: boolean
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

/** Fator de emissão usado num cálculo, para mostrar ao lado do número (R.2). */
export interface FatorAplicado {
  anoReferencia: number
  /** Pode ser anterior ao ano de referência, quando este ainda não tem fator. */
  anoDoFator: number
  /** tCO₂/MWh = kgCO₂/kWh */
  fator: number
  provisorio: boolean
  fonte: string
}

/** Indicadores da universidade inteira no período (GreenMetric EC4). */
export interface IndicadorUniversidade {
  /** kWh total ÷ população total, só sobre os campi com energia e população no período. */
  kwhPorPessoa: number | null
  kwh: number
  populacao: number
  campiConsiderados: string[]
  /** Têm energia no período mas não têm população: ficam fora da conta. */
  campiSemPopulacao: string[]
  demonstracao: boolean
  /** Pegada de carbono da energia de todos os campi, em kg CO₂. Nula sem fator cadastrado. */
  emissaoKgCo2: number | null
  fatorEmissao: FatorAplicado | null
}

export interface IndicadorCampus {
  campusId: number
  nome: string
  populacao: number
  areaConstruidaM2: number
  situacao: Situacao
  motivoForaDoRanking: string | null
  /** Tem ao menos um lançamento com consumo no período. */
  temDados: boolean
  /** O consumo do período inclui lançamento de demonstração. */
  demonstracao: boolean
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
  /** Pegada de carbono da energia (kWh × fator do ano), em kg CO₂. Nula sem energia ou sem fator. */
  emissaoKgCo2: number | null
  /** Referência da universidade usada na nota (total ÷ total). */
  referenciaAguaPerCapita: number | null
  referenciaLuzPorM2: number | null
  /** Nulo quando o campus não tem nota (situacao diferente de `ok`). */
  ecoScore: number | null
  ecoScoreAgua: number | null
  ecoScoreLuz: number | null
  classificacao: Classificacao | null
}

/** Participação de cada campus no mês; cada pizza usa uma medida só. */
export interface PizzaItem {
  campusId: number
  nome: string
  /** m³ */
  agua: number
  /** kWh */
  luz: number
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
  /** Número da linha no arquivo (o cabeçalho é a linha 1). */
  linha: number | null
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
  /** Lançamentos manuais do mesmo campus/tipo/mês que a confirmação vai remover. */
  manuaisSubstituidos: number
  /** Lançamentos de demonstração do mesmo campus/tipo/mês, que o dado real substitui. */
  demonstracaoSubstituida: number
}

export interface ConfirmarOut {
  imported: number
  updated: number
  ignored: number
  manuaisRemovidos: number
  demonstracaoRemovida: number
}

/** Um mês da série histórica (R.5). Água em m³, energia em kWh, nunca somadas. */
export interface PontoSerie {
  mes: string
  agua: number
  luz: number
  /** Distingue "consumiu zero" de "não tem lançamento". */
  temAgua: boolean
  temLuz: boolean
  demonstracao: boolean
}

/**
 * Uma medida no mês e nas duas bases de comparação (R.3). Nulo = mês sem
 * lançamento ("sem base"); variação nula quando falta o atual ou a base.
 */
export interface ComparacaoMedida {
  atual: number | null
  mesAnterior: number | null
  anoAnterior: number | null
  /** Em %. */
  variacaoMensal: number | null
  variacaoAnual: number | null
  demonstracao: boolean
}

export interface ComparacaoBloco {
  campusId: number | null
  nome: string
  agua: ComparacaoMedida
  luz: ComparacaoMedida
}

export interface ComparacaoResponse {
  mes: string
  mesAnterior: string
  anoAnterior: string
  /** Universidade para o super; o próprio campus para o papel campus. */
  escopo: ComparacaoBloco
  /** Um bloco por campus; vazio para o papel campus. */
  campi: ComparacaoBloco[]
}

export type SituacaoPico = 'pico' | 'normal' | 'historico_insuficiente'

/** Um campus e uma medida contra o próprio histórico (R.4). */
export interface AlertaPico {
  campusId: number
  nome: string
  medida: 'agua' | 'luz'
  situacao: SituacaoPico
  atual: number
  /** Média dos meses com dado na janela; nula com histórico insuficiente. */
  media: number | null
  mesesNaMedia: number
  /** atual ÷ média (1,45 = 45% acima). */
  razao: number | null
  demonstracao: boolean
}

export interface AlertasResponse {
  mes: string
  /** Pico = mês acima de `limiar` × média dos `janelaMeses` anteriores. */
  limiar: number
  janelaMeses: number
  historicoMinimo: number
  /** Picos primeiro, do maior salto para o menor. */
  avaliados: AlertaPico[]
}

/** Fator médio anual de emissão do SIN, como cadastrado (R.2). */
export interface FatorEmissao {
  ano: number
  /** tCO₂/MWh = kgCO₂/kWh */
  fator: number
  provisorio: boolean
  fonte: string
}
