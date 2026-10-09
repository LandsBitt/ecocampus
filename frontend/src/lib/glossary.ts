/**
 * Glossário em linguagem simples.
 *
 * O sistema é usado por pessoas que não trabalham com indicadores ambientais.
 * Todo termo técnico que aparece na interface tem uma entrada aqui e é
 * exposto via <Explain term="..."> — a definição fica a um hover de distância,
 * sem poluir a tela de texto explicativo.
 */

export interface GlossaryEntry {
  /** Como o termo aparece na interface. */
  label: string
  /** Uma frase, sem jargão, respondendo "o que é isso?". */
  short: string
  /** Detalhe opcional: como é calculado ou por que importa. */
  detail?: string
}

export const glossary = {
  ecoScore: {
    label: 'Eco Score',
    short:
      'Nota de 0 a 100 que compara o consumo do campus com a referência da universidade.',
    detail:
      'Quanto maior, melhor: 100 é consumir metade da referência ou menos; 50 é estar exatamente na referência; 0 é consumir 50% acima dela ou mais. A referência é o consumo total da universidade dividido pela população total (água) e pela área total (energia). A nota junta água e energia com o mesmo peso.'
  },
  normalizacao: {
    label: 'Comparação justa',
    short:
      'Antes de comparar, o consumo é dividido pelo tamanho do campus.',
    detail:
      'Um campus grande naturalmente gasta mais. Por isso a água é medida por pessoa e a energia por metro quadrado — assim um campus pequeno e um grande podem ser comparados de igual para igual.'
  },
  aguaPorPessoa: {
    label: 'Água por pessoa',
    short: 'Quantos metros cúbicos de água cada pessoa do campus consumiu no mês.',
    detail:
      'Total de água do mês dividido pela população cadastrada (alunos + funcionários). 1 m³ equivale a mil litros.'
  },
  energiaPorM2: {
    label: 'Energia por m²',
    short: 'Quanto de energia foi gasto em cada metro quadrado construído do campus.',
    detail:
      'Total de energia do mês dividido pela área construída cadastrada. É o indicador usado para comparar prédios de tamanhos diferentes.'
  },
  energiaPorPessoa: {
    label: 'Energia por pessoa',
    short: 'Quantos kWh cada pessoa do campus consumiu no mês.',
    detail:
      'Total de energia do mês dividido pela população cadastrada. É um indicador usado em rankings internacionais de sustentabilidade. Aqui ele é só informativo: não entra no Eco Score.'
  },
  semDados: {
    label: 'Sem dados',
    short: 'O campus não tem nenhum lançamento de água ou energia no mês.',
    detail:
      'Sem consumo registrado não há o que comparar, então o campus fica sem nota naquele mês — isso é diferente de consumir zero.'
  },
  classificacao: {
    label: 'Classificação',
    short: 'Tradução do Eco Score em três faixas: Ecológico, Na média e Crítico.',
    detail:
      'Ecológico: nota 70 ou mais. Na média: entre 40 e 70. Crítico: abaixo de 40 — consumo bem acima da referência da universidade.'
  },
  semDadosDemograficos: {
    label: 'Sem cadastro',
    short:
      'Este campus ainda não tem população e área construída cadastradas.',
    detail:
      'Sem esses dois números não dá para fazer a comparação justa, então o campus fica sem nota e fora do ranking. O consumo dele continua contando no total da universidade. Cadastre os dados em Campi.'
  },
  metroCubico: {
    label: 'm³ (metro cúbico)',
    short: 'Unidade de volume de água. 1 m³ = 1.000 litros.'
  },
  kwh: {
    label: 'kWh (quilowatt-hora)',
    short: 'Unidade de energia elétrica — é o que aparece na conta de luz.',
    detail: '1.000 kWh = 1 MWh. Uma casa média brasileira consome cerca de 160 kWh por mês.'
  },
  lancamento: {
    label: 'Lançamento',
    short: 'Um registro de consumo: um campus, um tipo (água ou energia) e um mês.',
    detail:
      'Pode ser digitado à mão em Lançamentos ou criado em lote pela importação da planilha da concessionária.'
  },
  pontoMedicao: {
    label: 'Ponto de medição',
    short: 'Cada relógio/hidrômetro que a concessionária cobra separadamente.',
    detail:
      'Um campus costuma ter vários pontos. A importação usa o endereço da fatura para descobrir a qual campus cada ponto pertence.'
  },
  mesReferencia: {
    label: 'Mês de referência',
    short: 'O mês a que o consumo se refere — não a data em que a conta foi paga.'
  },
  totalGeral: {
    label: 'Total da universidade',
    short: 'Soma do consumo de todos os campi no mês selecionado.'
  },
  variacaoMensal: {
    label: 'Variação',
    short: 'Diferença percentual em relação ao mês anterior.',
    detail: 'Aqui, cair é bom: uma seta verde para baixo significa que o consumo diminuiu.'
  }
} as const satisfies Record<string, GlossaryEntry>

export type GlossaryTerm = keyof typeof glossary
