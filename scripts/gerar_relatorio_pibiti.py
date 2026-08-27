# -*- coding: utf-8 -*-
"""Gera o relatorio parcial PIBITI/CNPq (UNITAU) em .docx com formatacao ABNT.

Alinhado ao plano de trabalho aprovado (Docs/PROJETO INICIACAO TECNOLOGICA.pdf):
titulo oficial, area CIENCIAS EXATAS, palavras-chave oficiais, cronograma
fev-dez/2026, metodologia agil (Scrum) e referencias do plano. O relatorio
reconcilia o previsto x executado, incluindo a mudanca de arquitetura
(Next.js previsto -> FastAPI + React adotado).

Campos administrativos que dependem do bolsista (processo CNPq, edital,
vigencia) ficam destacados em amarelo (funcao `field(..., confirm=True)`).
"""
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

FONTE = "Arial"

doc = Document()

# ---- Estilo base (ABNT: Arial 12, espacamento 1,5) ----
normal = doc.styles["Normal"]
normal.font.name = FONTE
normal.font.size = Pt(12)
normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONTE)
pf = normal.paragraph_format
pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
pf.space_after = Pt(0)
pf.space_before = Pt(0)

# ---- Margens ABNT: sup 3, esq 3, inf 2, dir 2 ----
sec = doc.sections[0]
sec.top_margin = Cm(3)
sec.left_margin = Cm(3)
sec.bottom_margin = Cm(2)
sec.right_margin = Cm(2)


def _set_font(run, size=12, bold=False, italic=False):
    run.font.name = FONTE
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:ascii"), FONTE)
    rfonts.set(qn("w:hAnsi"), FONTE)
    rfonts.set(qn("w:eastAsia"), FONTE)


def highlight(run):
    """Marca o run em amarelo (campo a confirmar/preencher)."""
    rpr = run._element.get_or_add_rPr()
    hl = OxmlElement("w:highlight")
    hl.set(qn("w:val"), "yellow")
    rpr.append(hl)


def p(text="", bold=False, italic=False, align="just", size=12, indent=True,
      space_after=0, space_before=0):
    par = doc.add_paragraph()
    amap = {
        "just": WD_ALIGN_PARAGRAPH.JUSTIFY,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
    }
    par.alignment = amap[align]
    par.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    par.paragraph_format.space_after = Pt(space_after)
    par.paragraph_format.space_before = Pt(space_before)
    if indent and align == "just":
        par.paragraph_format.first_line_indent = Cm(1.25)
    if text:
        r = par.add_run(text)
        _set_font(r, size=size, bold=bold, italic=italic)
    return par


def heading(num, text):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.LEFT
    par.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    par.paragraph_format.space_before = Pt(12)
    par.paragraph_format.space_after = Pt(6)
    r = par.add_run(f"{num}  {text}" if num else text)
    _set_font(r, size=12, bold=True)
    return par


def bullets(items):
    for item in items:
        par = doc.add_paragraph(style="List Bullet")
        par.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        par.paragraph_format.space_after = Pt(0)
        r = par.add_run(item)
        _set_font(r)


def field(label, value, confirm=False):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.LEFT
    par.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    rl = par.add_run(label + " ")
    _set_font(rl, bold=True)
    rv = par.add_run(value)
    _set_font(rv)
    if confirm:
        highlight(rv)
    return par


TITULO = ("Desenvolvimento de um Sistema Web para Monitoramento Sustentável do "
          "Consumo de Recursos Energéticos e Hídricos nos Campi da UNITAU")

# =====================================================================
# FOLHA DE ROSTO
# =====================================================================
p("", indent=False)
p("UNIVERSIDADE DE TAUBATÉ (UNITAU)", bold=True, align="center", indent=False)
p("PRÓ-REITORIA DE PESQUISA E PÓS-GRADUAÇÃO (PRPPG)", align="center", indent=False)
p("PROGRAMA INSTITUCIONAL DE BOLSAS DE INICIAÇÃO EM DESENVOLVIMENTO "
  "TECNOLÓGICO E INOVAÇÃO (PIBITI/CNPq)", align="center", indent=False)
for _ in range(5):
    p("", indent=False)
p("RELATÓRIO PARCIAL DE ATIVIDADES", bold=True, align="center", indent=False, size=14)
p("(Período: fevereiro a junho de 2026)", align="center", indent=False)
for _ in range(5):
    p("", indent=False)
p(TITULO, bold=True, align="center", indent=False)
p("Sistema desenvolvido: EcoCampus", italic=True, align="center", indent=False,
  space_before=6)
for _ in range(7):
    p("", indent=False)
p("Bolsista: Roland dos Santos Bittencourt de Castro", align="center", indent=False)
p("Curso: Análise e Desenvolvimento de Sistemas", align="center", indent=False)
p("Orientadora: Profa. Fabrina Moreira Silva", align="center", indent=False)
p("Área de conhecimento (CNPq): Ciências Exatas e da Terra", align="center", indent=False)
for _ in range(5):
    p("", indent=False)
p("Taubaté – SP", align="center", indent=False)
p("2026", align="center", indent=False)

doc.add_page_break()

# =====================================================================
# IDENTIFICACAO
# =====================================================================
heading("", "IDENTIFICAÇÃO DO PROJETO")
field("Título do projeto:", TITULO)
field("Sistema desenvolvido:", "EcoCampus — plataforma web de monitoramento de "
      "indicadores de sustentabilidade")
field("Modalidade:", "PIBITI — Programa Institucional de Bolsas de Iniciação em "
      "Desenvolvimento Tecnológico e Inovação (CNPq)")
field("Área de conhecimento (CNPq):", "Ciências Exatas e da Terra")
field("Área de concentração:", "Tecnologias para o Desenvolvimento Sustentável")
field("Linha de pesquisa:", "Inovação Tecnológica e Gestão de Recursos Naturais")
field("Bolsista:", "Roland dos Santos Bittencourt de Castro")
field("Curso:", "Análise e Desenvolvimento de Sistemas")
field("Orientadora:", "Profa. Fabrina Moreira Silva")
field("Instituição:", "Universidade de Taubaté (UNITAU)")
field("Departamento:", "Instituto Básico de Exatas (IBE)")
field("Nº do processo:", "IBE-11379-2025")
field("Edital / Chamada:", "Edital PRPPG nº 2025/009063 — PIBITI/UNITAU 2026")
field("Vigência da bolsa:", "[confirmar — plano de trabalho: fevereiro a "
      "dezembro de 2026]", confirm=True)
field("Data de início das atividades:", "fevereiro de 2026")
field("Tipo de relatório:", "Parcial (referente à primeira metade da vigência)")

# =====================================================================
# RESUMO
# =====================================================================
heading("", "RESUMO")
p("A gestão do consumo de água e energia elétrica em universidades multicampi "
  "é dificultada pela fragmentação dos dados, que chegam à instituição em "
  "contas mensais, planilhas e documentos isolados, dificultando análises "
  "globais e comparações entre unidades. Este projeto desenvolve o EcoCampus, "
  "um sistema web para o monitoramento, a análise e a conscientização sobre o "
  "consumo de água e energia nos campi da Universidade de Taubaté (UNITAU), "
  "atribuindo a cada unidade um indicador de eficiência ambiental (Eco Score) "
  "e organizando os dados em painéis (dashboards) de fácil interpretação. Além "
  "de apoiar a gestão interna, o sistema visa fornecer indicadores compatíveis "
  "com redes e rankings de sustentabilidade universitária, como o UI "
  "GreenMetric e o THE Impact Rankings. No primeiro período de vigência da "
  "bolsa foram implementados o modelo de dados, o serviço de aplicação (API) "
  "com autenticação e controle de acesso por perfil, a interface web de "
  "visualização e o cálculo do Eco Score, além do mapeamento dos endereços das "
  "faturas aos respectivos campi — base do importador automatizado. Duas "
  "adequações relevantes ao plano original foram realizadas: a adoção de uma "
  "arquitetura em camadas separadas (API em Python e cliente em React), em "
  "lugar da abordagem monolítica inicialmente prevista, e a evolução do "
  "indicador de eficiência de uma comparação por consumo absoluto para uma "
  "base per capita. A plataforma encontra-se funcional e publicada em ambiente "
  "de nuvem.")
par = doc.add_paragraph()
par.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
par.paragraph_format.space_before = Pt(6)
r = par.add_run("Palavras-chave: ")
_set_font(r, bold=True)
r = par.add_run("Desenvolvimento Web; Eficiência Energética; Monitoramento "
                "Ambiental; Sustentabilidade; Tecnologia da Informação.")
_set_font(r)

doc.add_page_break()

# =====================================================================
# 1 INTRODUCAO
# =====================================================================
heading("1", "INTRODUÇÃO")
p("Este projeto vincula-se à área de concentração “Tecnologias para o "
  "Desenvolvimento Sustentável” e à linha de pesquisa “Inovação Tecnológica e "
  "Gestão de Recursos Naturais”. Tem como eixo o desenvolvimento de um sistema "
  "web para o monitoramento, a análise e a gestão do consumo de água e energia "
  "elétrica nos campi da Universidade de Taubaté (UNITAU). A proposta surge da "
  "necessidade institucional de integrar dados dispersos, promover "
  "transparência das informações de consumo e apoiar decisões estratégicas "
  "voltadas à redução do desperdício de recursos naturais.")
p("Atualmente, os dados de consumo chegam à instituição de forma fragmentada, "
  "distribuídos em contas mensais de concessionárias de água e de energia (no "
  "caso da eletricidade, a CPFL), planilhas e documentos isolados. Tratadas "
  "manualmente, essas informações dificultam a comparação entre unidades, a "
  "identificação de anomalias de consumo e a geração de indicadores "
  "consolidados para a tomada de decisão.")
p("Além de atender às demandas internas de gestão ambiental, o projeto cumpre "
  "um papel estratégico para o posicionamento institucional da UNITAU em "
  "redes e rankings de sustentabilidade universitária — como o UI GreenMetric "
  "World University Ranking e o THE Impact Rankings —, que exigem dados "
  "ambientais padronizados, auditáveis e consolidados. O trabalho alinha-se "
  "ainda aos Objetivos de Desenvolvimento Sustentável da Agenda 2030 "
  "(notadamente os ODS 4, 11, 12 e 13), ao integrar eficiência no uso de "
  "recursos, educação e gestão ambiental responsável.")
p("Este relatório descreve as atividades desenvolvidas na primeira metade da "
  "vigência da bolsa, entre fevereiro e junho de 2026, apresentando os "
  "resultados parciais, as dificuldades encontradas e as soluções adotadas, "
  "inclusive as adequações realizadas em relação ao plano de trabalho "
  "originalmente aprovado.")

# =====================================================================
# 2 OBJETIVOS
# =====================================================================
heading("2", "OBJETIVOS")
heading("2.1", "Objetivo geral")
p("Desenvolver um sistema web para monitorar e analisar o consumo de água e "
  "energia elétrica nos campi da UNITAU, promovendo a sustentabilidade "
  "institucional e a eficiência no uso de recursos naturais, e fornecendo "
  "indicadores essenciais à participação da universidade em redes e rankings "
  "de sustentabilidade.")
heading("2.2", "Objetivos específicos")
bullets([
    "Implementar autenticação de usuários via Firebase Authentication, com "
    "níveis diferenciados de acesso por campus e perfil administrativo;",
    "Modelar e implementar o banco de dados em PostgreSQL (Neon), com "
    "armazenamento seguro e padronizado dos dados institucionais de consumo;",
    "Desenvolver dashboards interativos com gráficos, comparações e "
    "indicadores ecológicos de eficiência;",
    "Criar interface funcional para inserção, atualização e visualização dos "
    "dados administrativos de consumo;",
    "Elaborar relatórios com métricas de eficiência hídrica e energética, "
    "apoiando decisões de gestão ambiental;",
    "Definir e calcular indicadores institucionais alinhados a métricas de "
    "sustentabilidade utilizadas por rankings como UI GreenMetric e THE "
    "Impact Rankings;",
    "Mapear os endereços das faturas das concessionárias aos respectivos "
    "campi, viabilizando a importação automatizada dos dados de consumo.",
])

# =====================================================================
# 3 MATERIAIS E METODOS
# =====================================================================
heading("3", "MATERIAIS E MÉTODOS")
p("O estudo caracteriza-se como pesquisa aplicada de natureza tecnológica, "
  "com abordagem qualitativa e iterativa, centrada no desenvolvimento de um "
  "sistema web funcional (GIL, 2017). O desenho metodológico apoia-se em "
  "engenharia de software, com ênfase em desenvolvimento ágil inspirado no "
  "Scrum, modelagem de requisitos, implementação de arquitetura full-stack e "
  "validação técnica da solução (PRESSMAN; MAXIM, 2021), organizado em ciclos "
  "curtos de levantamento de requisitos, implementação, teste e ajuste, com "
  "versionamento de código por meio da ferramenta Git.")
p("Foram utilizados exclusivamente dados administrativos institucionais — "
  "contas mensais de água e energia e planilhas consolidadas mantidas pelos "
  "setores responsáveis —, sem coleta com seres humanos. A avaliação de "
  "usabilidade da interface baseia-se em inspeções heurísticas e testes "
  "internos de navegação (NIELSEN, 1993), conduzidos pela própria equipe de "
  "desenvolvimento.")
p("A arquitetura do sistema foi estruturada em três camadas independentes: uma "
  "aplicação cliente (frontend), um serviço de aplicação (backend) e um banco "
  "de dados relacional. Em relação à tecnologia, o plano de trabalho previa o "
  "uso do framework Next.js (abordagem única em JavaScript para cliente e "
  "servidor). Ao longo do desenvolvimento, optou-se por uma arquitetura de "
  "camadas separadas: o backend foi implementado em Python com o framework "
  "FastAPI, e o frontend em React com a ferramenta Vite. Mantiveram-se as "
  "escolhas de Firebase Authentication para a autenticação e Neon (PostgreSQL "
  "em nuvem) para a persistência, conforme o plano. As razões dessa adequação "
  "são discutidas na seção 6.")
p("No backend utilizam-se, além do FastAPI, a biblioteca SQLAlchemy para "
  "mapeamento objeto-relacional e a ferramenta Alembic para o controle de "
  "versão do esquema do banco. A autenticação e o controle de acesso apoiam-se "
  "em perfis de usuário (custom claims do Firebase) validados no servidor a "
  "cada requisição. No frontend empregam-se React, Vite, Tailwind CSS e a "
  "biblioteca Recharts para os gráficos; a validação dos formulários ocorre "
  "tanto no cliente (React Hook Form e Zod) quanto no servidor (Pydantic). "
  "Para a publicação, foram utilizados os serviços Vercel (frontend), Render "
  "(backend) e Neon (banco de dados), com publicação automatizada a partir do "
  "repositório de código.")
p("Para a coleta dos dados, definiu-se uma planilha-padrão para cada recurso "
  "(água e energia elétrica), estabelecendo o formato de entrada esperado pelo "
  "sistema. Cada linha corresponde a um ponto de medição (unidade "
  "consumidora), identificado, no caso da água, pelo código PDE/RGI e, no da "
  "energia, pelos números de unidade consumidora e de instalação da "
  "concessionária. O consumo é registrado na respectiva unidade física — "
  "metros cúbicos para a água e quilowatts-hora para a energia —, e o campus "
  "de cada ponto é determinado automaticamente a partir do endereço da fatura.")
p("As atividades de desenvolvimento contaram com o apoio de ferramentas de "
  "inteligência artificial generativa nas etapas de organização, redação e "
  "revisão, conforme previsto no plano de trabalho, preservando integralmente "
  "a autoria e a responsabilidade intelectual do bolsista.")

# =====================================================================
# 4 ATIVIDADES DESENVOLVIDAS
# =====================================================================
heading("4", "ATIVIDADES DESENVOLVIDAS NO PERÍODO")
p("As atividades realizadas entre fevereiro e junho de 2026 são descritas a "
  "seguir, em ordem cronológica, acompanhando a evolução do projeto e a sua "
  "aderência ao plano de trabalho.")

heading("4.1", "Levantamento, concepção e estruturação inicial (fevereiro a "
        "março de 2026)")
p("O período inicial foi dedicado ao levantamento dos dados administrativos de "
  "consumo junto aos setores responsáveis, à organização e padronização das "
  "planilhas recebidas e ao estudo das métricas exigidas por rankings de "
  "sustentabilidade. Em paralelo, realizou-se o desenho da arquitetura do "
  "sistema e a configuração do ambiente de desenvolvimento. Definiu-se um "
  "modelo de dados enxuto e suficiente para o domínio, centrado nas entidades "
  "Campus e Lançamento (registro mensal de consumo, do tipo água ou luz, "
  "associado a um mês de referência). Foram implementadas a estrutura base do "
  "backend, a integração inicial com o banco PostgreSQL, o mecanismo de "
  "autenticação por perfis e as primeiras telas (login e painel inicial), além "
  "das verificações de integridade do serviço (health checks) para a "
  "hospedagem em nuvem e da incorporação da identidade visual da UNITAU.")

heading("4.2", "Implementação do backend, do frontend e migração para "
        "TypeScript (abril a maio de 2026)")
p("Nesta fase consolidaram-se o backend (API) e as rotas de registro e "
  "consulta dos lançamentos, bem como o desenvolvimento do frontend com os "
  "primeiros dashboards e a visualização segmentada por campus. Após a "
  "validação do protótipo funcional, o frontend foi migrado da linguagem "
  "JavaScript para TypeScript, com reorganização dos componentes da interface. "
  "Essa decisão trouxe verificação estática de tipos, reduzindo erros "
  "silenciosos na comunicação entre cliente e servidor. No mesmo período, os "
  "dados genéricos de teste foram substituídos pela estrutura real da "
  "universidade, com o cadastro dos oito campi da UNITAU: Campus da Juta, "
  "Campus do Itaim, Campus do Bom Conselho, Polo da Saúde, Direito, Reitoria, "
  "Colégio UNITAU e Campus de Arquitetura — este último incorporado ao final "
  "do período. Nesta etapa, o cadastro concentrou-se nas unidades localizadas "
  "no município de Taubaté, onde se encontra a maior parte dos endereços e a "
  "maior complexidade de faturamento; a extensão às unidades de Caraguatatuba "
  "e Cruzeiro está prevista para etapas seguintes.")

heading("4.3", "Arquitetura de campi e pontos de medição (junho de 2026)")
p("A etapa mais recente concentrou-se em aproximar o sistema da realidade "
  "operacional da instituição. Constatou-se que cada campus, na prática, "
  "corresponde a diversos endereços e pontos de medição (unidades "
  "consumidoras) nas faturas das concessionárias — cerca de quarenta pontos "
  "para água e trinta para energia por mês. Foi então desenvolvido um "
  "mapeamento entre os endereços das faturas — incluindo as unidades de alta "
  "tensão (cabines) da CPFL — e os respectivos campi, com normalização textual "
  "dos endereços para tornar o reconhecimento automático robusto a variações "
  "de grafia. Definiram-se também as planilhas-padrão de coleta de água e de "
  "energia, que fixam as colunas de identificação de cada ponto (endereço, "
  "código PDE/RGI ou número de unidade consumidora), o consumo e o valor da "
  "fatura. Esse mapeamento é o alicerce do importador automatizado de "
  "planilhas, previsto para a etapa seguinte.")

heading("4.4", "Definição e evolução do indicador de eficiência (Eco Score)")
p("Transversalmente às etapas anteriores, foi concebido o Eco Score, "
  "indicador que sintetiza o desempenho ambiental de cada campus em uma escala "
  "de 0 a 100, com posterior classificação em três faixas — Ecológico, "
  "Atenção e Crítico. A primeira versão comparava o consumo absoluto de cada "
  "campus com a média das demais unidades. Ao longo do desenvolvimento, "
  "identificou-se que essa formulação penalizava injustamente os campi "
  "maiores, ainda que eficientes. O cálculo foi então reformulado para uma "
  "base relativa: o consumo de água passou a ser normalizado pela população "
  "atendida e o de energia pela área construída (m²), tornando a comparação "
  "mais equânime entre unidades de portes distintos. Essa evolução é detalhada "
  "na seção 6.")

# =====================================================================
# 5 RESULTADOS PARCIAIS
# =====================================================================
heading("5", "RESULTADOS PARCIAIS")
p("Ao término da primeira metade da vigência, o projeto apresenta uma "
  "plataforma funcional, publicada em ambiente de nuvem, contemplando os "
  "seguintes resultados:")
bullets([
    "Autenticação e controle de acesso por perfil implementados (administração "
    "central e administrador de campus), via Firebase Authentication;",
    "Banco de dados modelado e implementado em PostgreSQL (Neon), com "
    "armazenamento padronizado e prevenção de lançamentos duplicados por ponto "
    "de medição e mês;",
    "Backend (API) estruturado para o registro e a consulta dos lançamentos de "
    "consumo, com validação de dados no cliente e no servidor;",
    "Dashboards com gráficos comparativos, ranking entre campi e cards de "
    "resumo dos indicadores;",
    "Interface para inserção, atualização e visualização dos dados de consumo, "
    "segmentada por campus;",
    "Indicador Eco Score implementado em base per capita (água por população) "
    "e por área construída (energia por m²), com classificação em faixas de "
    "desempenho;",
    "Cadastro dos oito campi da UNITAU (unidades de Taubaté) e mapeamento dos "
    "endereços das faturas de água e energia aos respectivos pontos de "
    "medição, além da definição das planilhas-padrão de coleta;",
    "Infraestrutura de publicação automatizada configurada (Vercel, Render e "
    "Neon).",
])
p("Em relação aos objetivos específicos, encontram-se concluídos os relativos "
  "à autenticação, ao banco de dados, aos dashboards e à interface de dados. "
  "O objetivo de definição e cálculo de indicadores foi parcialmente "
  "alcançado — o Eco Score já está implementado, restando o alinhamento formal "
  "às métricas de rankings como o UI GreenMetric —, e a importação "
  "automatizada dos dados encontra-se em andamento.")
p("Além dos artefatos de software, o período proporcionou ganho técnico "
  "expressivo ao bolsista, com aprofundamento em desenvolvimento web "
  "full-stack, modelagem de dados, segurança de aplicações, integração "
  "contínua e boas práticas de engenharia de software, competências alinhadas "
  "à formação em Análise e Desenvolvimento de Sistemas.", space_before=6)

# =====================================================================
# 6 DIFICULDADES ENCONTRADAS E SOLUCOES ADOTADAS
# =====================================================================
heading("6", "DIFICULDADES ENCONTRADAS E SOLUÇÕES ADOTADAS")
p("O caráter incremental do projeto expôs, ao longo do período, um conjunto de "
  "dificuldades técnicas e conceituais cujo enfrentamento constituiu parte "
  "relevante do aprendizado. As principais são relatadas a seguir.")

heading("6.1", "Adequação da arquitetura em relação ao plano de trabalho")
p("O plano de trabalho previa o desenvolvimento com o framework Next.js, que "
  "unifica cliente e servidor em uma única base de código JavaScript. Durante "
  "a estruturação inicial, avaliou-se que a manipulação e a importação de "
  "planilhas de consumo, a validação rigorosa dos dados e a organização das "
  "regras de negócio seriam mais bem atendidas por um serviço dedicado em "
  "Python. Optou-se, assim, por uma arquitetura de camadas separadas — backend "
  "em FastAPI e frontend em React —, que oferece uma fronteira de API explícita "
  "e tipada, favorece a testabilidade e permite evoluir cliente e servidor de "
  "forma independente. As demais escolhas do plano (Firebase Authentication e "
  "banco Neon/PostgreSQL) foram mantidas. Trata-se de uma adequação de meio, "
  "que preserva integralmente os objetivos do projeto.")

heading("6.2", "Comparação justa entre campi de portes diferentes")
p("A dificuldade conceitual mais significativa envolveu o indicador de "
  "eficiência. A primeira versão do Eco Score comparava campi pelo consumo "
  "absoluto, o que penalizava as unidades maiores mesmo quando eficientes — um "
  "campus com muitos alunos consome naturalmente mais água e energia que uma "
  "unidade administrativa pequena. A solução foi migrar o indicador para uma "
  "base relativa: consumo de água por pessoa e consumo de energia por metro "
  "quadrado de área construída. Isso exigiu incorporar ao modelo de dados os "
  "atributos de população e área de cada campus e reformular o cálculo.")

heading("6.3", "Mistura de unidades de medida distintas")
p("Constatou-se que somar consumo de água (em metros cúbicos) e de energia "
  "(em quilowatts-hora) em um único total não tem significado físico. A "
  "solução foi tratar cada recurso de forma independente, com registro "
  "separado do valor financeiro (em reais) e do consumo físico, calculando um "
  "índice específico para água e outro para energia, depois combinados em um "
  "escore composto.")

heading("6.4", "A realidade das faturas: um campus, muitos pontos de medição")
p("Ao confrontar o modelo inicial com as faturas reais, verificou-se que cada "
  "campus corresponde a vários endereços e unidades consumidoras — incluindo "
  "cabines de alta tensão da CPFL —, frequentemente com grafias inconsistentes "
  "entre documentos, como abreviações variadas e até erros de digitação do "
  "mesmo logradouro. Foi necessário introduzir a entidade Ponto de Medição e "
  "construir um mapeamento de endereços com normalização textual, de modo que "
  "essas variações sejam reconhecidas e consolidadas sob o campus correto.")

heading("6.5", "Correção de defeitos e consistência dos dados")
p("Durante os testes, identificou-se que, para o administrador de um campus, o "
  "indicador de eficiência era calculado tomando como referência apenas o "
  "próprio campus, o que distorcia o resultado; o cálculo foi corrigido para "
  "usar sempre a média de todas as unidades como parâmetro de comparação. "
  "Foram ainda corrigidos problemas na rotina de criação do banco de dados e "
  "na importação de planilhas, e adotou-se uma restrição de unicidade que "
  "impede o registro duplicado de consumo para o mesmo ponto de medição em um "
  "mesmo mês.")

# =====================================================================
# 7 CRONOGRAMA (PREVISTO x EXECUTADO)
# =====================================================================
heading("7", "CRONOGRAMA: ATIVIDADES PREVISTAS x EXECUTADAS")
p("O quadro a seguir compara as etapas do cronograma aprovado no plano de "
  "trabalho com a situação de cada uma ao término deste período parcial.")

tabela = [
    ("Etapa prevista (plano de trabalho)", "Período", "Situação"),
    ("Levantamento e organização dos dados administrativos", "Fev–Mar", "Concluída"),
    ("Modelagem da arquitetura do sistema", "Mar–Abr", "Concluída (com adequação)"),
    ("Implementação do backend e banco de dados", "Abr–Mai", "Concluída"),
    ("Frontend e dashboards interativos", "Mai–Jun", "Concluída"),
    ("Interface de inserção e atualização de dados", "Jun–Ago", "Em andamento"),
    ("Testes funcionais internos e ajustes iterativos", "Jul–Out", "Em andamento"),
    ("Cálculo e validação técnica dos indicadores", "Ago–Nov", "Iniciada"),
    ("Redação do relatório técnico parcial", "Jun", "Em execução"),
    ("Redação e revisão final do relatório + documentação", "Out–Dez", "Prevista"),
]
t = doc.add_table(rows=len(tabela), cols=3)
t.style = "Table Grid"
t.alignment = WD_TABLE_ALIGNMENT.CENTER
for i, linha in enumerate(tabela):
    cells = t.rows[i].cells
    for j, txt in enumerate(linha):
        cell = cells[j]
        cell.paragraphs[0].paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        run = cell.paragraphs[0].add_run(txt)
        _set_font(run, size=10, bold=(i == 0))
p("De modo geral, as atividades previstas para o período foram cumpridas, com "
  "a ressalva da adequação de arquitetura descrita na seção 6.1 e do "
  "adiantamento de tarefas de etapas subsequentes, como a definição do "
  "indicador de eficiência.", space_before=6)

# =====================================================================
# 8 ATIVIDADES PREVISTAS
# =====================================================================
heading("8", "ATIVIDADES PREVISTAS PARA O PRÓXIMO PERÍODO")
p("Para a segunda metade da vigência da bolsa, alinhadas ao cronograma "
  "aprovado, estão previstas as seguintes atividades:")
bullets([
    "Conclusão do importador automatizado de planilhas de consumo (água e "
    "CPFL), eliminando a digitação manual e reduzindo erros;",
    "Refinamento do cálculo do Eco Score e alinhamento formal dos indicadores "
    "às métricas de rankings de sustentabilidade (UI GreenMetric, THE Impact "
    "Rankings);",
    "Inclusão de comparação histórica (mês anterior e mesmo mês do ano "
    "anterior), identificação de picos anômalos e metas institucionais de "
    "redução;",
    "Tradução dos indicadores em métricas de fácil compreensão (equivalência "
    "em custo financeiro ou em pegada de carbono);",
    "Ampliação do cadastro às unidades de Caraguatatuba e Cruzeiro;",
    "Testes funcionais internos, trilha de auditoria dos lançamentos e ajustes "
    "iterativos, ampliando a confiabilidade do sistema;",
    "Redação do relatório final e preparação de material para divulgação "
    "(por exemplo, apresentação no CICTED).",
])

# =====================================================================
# 9 CONSIDERACOES PARCIAIS
# =====================================================================
heading("9", "CONSIDERAÇÕES PARCIAIS")
p("O desenvolvimento do projeto transcorre em aderência ao cronograma "
  "aprovado. Na primeira metade da vigência, consolidou-se uma base "
  "tecnológica sólida e segura, com o sistema EcoCampus funcional e já "
  "publicado, capaz de representar a estrutura real dos campi da UNITAU. As "
  "atividades cumpriram os objetivos definidos para a etapa, e as dificuldades "
  "encontradas — sobretudo a construção de um indicador de eficiência justo "
  "entre unidades de portes distintos e a adequação da arquitetura ao "
  "problema real de importação de dados — foram enfrentadas com soluções que "
  "agregaram qualidade ao produto. O trabalho prepara o terreno para os "
  "refinamentos previstos no período seguinte, com destaque para a "
  "automatização da importação de dados e o alinhamento dos indicadores às "
  "métricas de rankings de sustentabilidade. Reitera-se o agradecimento à "
  "orientação da Profa. Fabrina Moreira Silva, à UNITAU e ao CNPq pelo apoio e "
  "pelo fomento que viabilizam esta pesquisa.")

# =====================================================================
# REFERENCIAS
# =====================================================================
heading("", "REFERÊNCIAS")
refs = [
    "ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. NBR 14724: informação e "
    "documentação — trabalhos acadêmicos — apresentação. Rio de Janeiro: ABNT, "
    "2011.",
    "GIL, A. C. Métodos e técnicas de pesquisa social. 7. ed. São Paulo: "
    "Atlas, 2017.",
    "NIELSEN, J. Usability engineering. San Francisco: Morgan Kaufmann, 1993.",
    "ORGANIZAÇÃO DAS NAÇÕES UNIDAS. Agenda 2030 para o Desenvolvimento "
    "Sustentável. Brasília: ONU Brasil, 2015. Disponível em: "
    "https://brasil.un.org/pt-br/sdgs. Acesso em: jun. 2026.",
    "PRESSMAN, R. S.; MAXIM, B. R. Engenharia de software: uma abordagem "
    "profissional. 9. ed. Porto Alegre: AMGH, 2021.",
    "FASTAPI. FastAPI framework documentation. Disponível em: "
    "https://fastapi.tiangolo.com. Acesso em: jun. 2026.",
    "REACT. React documentation. Disponível em: https://react.dev. Acesso em: "
    "jun. 2026.",
    "POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL documentation. Disponível "
    "em: https://www.postgresql.org/docs. Acesso em: jun. 2026.",
]
for ref in refs:
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.LEFT
    par.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    par.paragraph_format.space_after = Pt(12)
    r = par.add_run(ref)
    _set_font(r)

out = r"d:\Projetos\WEB\ecocampus\Docs\Relatorio_Parcial_PIBITI_Roland.docx"
doc.save(out)
print("Salvo em:", out)
print("Paragrafos:", len(doc.paragraphs))
