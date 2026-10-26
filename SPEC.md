# SPEC — Auditoria do EcoCampus e roteiro de melhorias

Auditoria feita em 2026-10-09 sobre o commit `7a614cc` (branch `main`). Nenhum código foi alterado. As seções 3 e 4 foram revisadas no mesmo dia com as decisões D1–D12; a seção 2 descreve o código como estava na auditoria.

**Escopo lido:** todo o `backend/app` (rotas, schemas, modelos, migrations), `scripts/`, todo o `frontend/src` de lógica (lib, hooks, providers, páginas, componentes de feature e gráficos) e `frontend-public/`. Os primitivos de `frontend/src/components/ui/` (shadcn) foram apenas inspecionados por amostragem.

**Como os achados foram verificados:**

- **Verificado (execução):** script temporário rodado com o venv do backend, com a consulta ao banco substituída por dados fixos. As saídas estão no [Apêndice A](#apêndice-a--saídas-da-prova).
- **Verificado (leitura):** o comportamento decorre diretamente do código citado, sem executar.
- **A confirmar:** depende de banco ou de ambiente que não estava disponível (o Docker estava desligado; produção não foi tocada).

Legenda — severidade: 🔴 crítico · 🟠 alto · 🟡 médio · 🟢 baixo. Esforço: P (até ~2 h) · M (meio dia a um dia) · G (mais de um dia).

---

## 1. Resumo executivo

O projeto está bem estruturado e é pequeno (cerca de 1.700 linhas de backend e 8.000 de frontend): rotas finas, ORM sem SQL manual, autorização por papel coerente, segredos fora do git, frontend com divisão de código por rota, estados de carregamento e vazio consistentes e `tsc` limpo. O problema não está na engenharia e sim **no que os números significam**: o indicador central do produto (Eco Score e ranking) hoje pode produzir resultados errados, e não existe nenhum teste automatizado no repositório para detectar isso.

Os três maiores riscos:

1. **A mesma coluna guarda grandezas diferentes (C1).** `valor_numeric` recebe consumo físico (m³/kWh) no lançamento manual, valor em R$ na importação de planilha e kWh no script da CPFL. Tudo é somado junto e exibido como m³/kWh. Dois campi com consumo idêntico saem com nota 100 e nota 0 só por terem entrado por caminhos diferentes. O consumo físico importado (`consumo_fisico`) é gravado e nunca usado em cálculo algum.
2. **Campus sem dado ganha nota máxima (C2, C3).** Um campus sem lançamento no mês recebe 100/"Ecológico" e lidera o ranking — inclusive o ranking público. Um mês inteiro sem dados mostra a universidade como "Ecológico, 100". Campus sem população/área cadastradas é pontuado numa régua diferente e pode ficar acima de um campus idêntico que tem cadastro.
3. **A importação aceita números errados em silêncio (C5, C6).** `18.500` kWh vira `18,5`; `1.234,56` é descartado; as colunas `ano`/`mes` da planilha são ignoradas, então uma linha de dezembro entra no mês escolhido no formulário.

Enquanto C1 não for decidido e corrigido, nenhum número de ranking deve ser usado em relatório.

---

## 2. Achados

### 2.1 Cálculos e regras de negócio

| ID | Descrição | Onde | Sev. | Esf. | Evidência |
|---|---|---|---|---|---|
| C1 | `valor_numeric` tem três significados: consumo físico no lançamento manual (o campo se chama "Consumo em m³/kWh"), R$ da fatura na importação, kWh no script CPFL. Resumo, indicadores, pizza e Eco Score somam tudo e o front rotula como m³/kWh. `consumo_fisico` nunca é lido. | `frontend/src/components/LancamentoDialog.tsx:167` → `backend/app/api/routes/lancamentos.py:70`; `backend/app/api/routes/importar.py:152`; `scripts/import_consumo_cpfl.py:210`; soma em `backend/app/api/routes/resumo.py:28-35`; exibição em `frontend/src/pages/Dashboard.tsx:92-93`, `frontend/src/components/LancamentosTable.tsx:148`, `frontend/src/pages/Reports.tsx:66-67` | 🔴 | M | Verificado (execução), prova 5: mesmo consumo de 600 m³, campus manual = 100 "Ecológico", campus importado = 0 "Crítico". |
| C2 | Campus sem lançamento no mês, mas com população/área, tem consumo 0 → nota 100 e 1º lugar. Ele também entra na média e a puxa para baixo, piorando a nota dos campi que têm dado. Mês sem nenhum lançamento: todos com 100. | `backend/app/api/routes/indicadores.py:36-37,49-51`; `backend/app/api/routes/public.py:40-41,51-53`; `backend/app/core/eco_score.py:23-24`; média exibida em `frontend/src/pages/Reports.tsx:46-48,126-130`, `frontend/src/pages/Dashboard.tsx:68-72`, `frontend/src/pages/public/RankingPublico.tsx:42-44` | 🔴 | P | Verificado (execução), provas 2 e 3. |
| C3 | Campus sem população/área cai num cálculo alternativo (consumo absoluto contra a média absoluta) e aparece no mesmo ranking. O resultado não é comparável e nem sempre é desvantagem, ao contrário do que a tela afirma. | `backend/app/api/routes/indicadores.py:76-81`; `backend/app/api/routes/public.py:73-75`; textos em `frontend/src/pages/Campi.tsx:137-138`, `frontend/src/lib/glossary.ts:57` | 🟠 | P | Verificado (execução), prova 4: campus pequeno sem cadastro = 100; campus idêntico com cadastro = 50. |
| C4 | `total = água + energia` soma unidades diferentes. É usado na pizza "Divisão entre os campi", na frase "consumiu X% a mais", no cálculo alternativo do C3 e no card "Campi com registro". Como a energia é numericamente muito maior, o total é praticamente só energia. O front público chega a rotular "kWh+L". | `backend/app/api/routes/resumo.py:35,58`; `backend/app/api/routes/grafico.py:25`; `backend/app/api/routes/public.py:106`; `frontend/src/lib/insights.ts:51`; `frontend-public/src/App.tsx:136` | 🟠 | M | Verificado (leitura). D1 decidiu por unidade física: a soma é removida (1.7). |
| C5 | Parser numérico da importação só troca vírgula por ponto. `18.500` → `18.5` (erro de mil vezes, sem aviso); `1.234,56` e `R$ 100,00` → nulo, e a linha vira "Valor da fatura ausente" ou some se as duas colunas falharem; negativos são aceitos. O LEIA-ME do modelo avisa para não usar ponto de milhar, mas o sistema não se protege. | `backend/app/api/routes/importar.py:25-31,93-94` | 🟠 | P | Verificado (execução), provas 6 e 7. |
| C6 | As colunas `ano` e `mes` da planilha são ignoradas; o mês vem só do formulário. Ponto repetido no arquivo aparece duas vezes na prévia e entra no total, mas só a última linha é gravada. Na prévia o mês não é validado (`2026-13` passa) e `tipo` aceita qualquer texto (tudo que não é `agua` é tratado como luz). | `backend/app/api/routes/importar.py:64-65,76-82,121-123`; chave de linha em `frontend/src/pages/Importar.tsx:264` | 🟠 | P | Verificado (execução), prova 7: total da prévia 240,00; gravaria 160,00. |
| C7 | A API de lançamentos aceita valor negativo, mês `2026-13` ou `0000-00`, e valor maior que `Numeric(12,2)` (que estoura no banco como erro 500). O front valida, a API não. O `schema.sql` tem `CHECK` para isso, mas as migrations nunca os criaram. | `backend/app/schemas/lancamento.py:14-15,27-28`; `backend/sql/schema.sql:26-27` × `backend/app/db/migrations/versions/0001_initial.py:31-32` | 🟡 | P | Verificado (execução), prova 8. O erro 500 por estouro: a confirmar. |
| C8 | Lançamento manual não tem unicidade: dois registros do mesmo campus/tipo/mês somam, e um manual somado a um importado do mesmo campus/mês conta em dobro. O front trata um erro 409 que o backend nunca devolve. | `backend/app/api/routes/lancamentos.py:52-76`; `frontend/src/pages/Lancamentos.tsx:100-105`; índice parcial em `backend/app/db/migrations/versions/0009_unique_lancamento_ponto_mes.py:33-39` | 🟡 | P | Verificado (leitura). Resolvido por D4. |
| C9 | Dinheiro trafega como `float` na importação e em todas as respostas agregadas, enquanto o lançamento manual usa `Decimal`. Com duas casas o desvio prático é desprezível, mas a soma da prévia é feita em float. | `backend/app/schemas/importar.py:8-9,28`; `backend/app/api/routes/importar.py:121`; `backend/app/api/routes/resumo.py:75-77` | 🟢 | P | Verificado (leitura). |
| C10 | A mesma medida aparece com unidades diferentes nos dois fronts: água por pessoa em "m³" no app e em "L" no `frontend-public`. | `frontend/src/components/EcoRankingTable.tsx:148` × `frontend-public/src/App.tsx:90` | 🟡 | P | Verificado (leitura). Some com S3. |
| C11 | O script da CPFL divide o total anual por 12 e grava 12 meses idênticos contados a partir de hoje, sem ponto de medição e sem idempotência (rodar duas vezes duplica). São dados sintéticos apresentados como mensais. A lista de campi usada tem 7 entradas (falta o campus 8) e o endereço da Arquitetura está mapeado para o Bom Conselho. | `scripts/import_consumo_cpfl.py:73-81,202-214`; `backend/app/data/campus_mapping.py:19-27,47` × `backend/app/db/migrations/versions/0008_seed_pontos_medicao.py:88` | 🟡 | P | Verificado (leitura). |
| C12 | As faixas 70/40 estão definidas no back e repetidas no front. Hoje são iguais; nada garante que continuem. A nota sai do back sem arredondamento. | `backend/app/core/eco_score.py:11-12`; `frontend/src/lib/ecoScore.ts:3-6` | 🟢 | P | Verificado (leitura). |

**O que está correto nesta área:** divisão por zero protegida em per capita, por m² e na média (`indicadores.py:16-17,36-37`); limites da nota entre 0 e 100 (`eco_score.py:27-29`); variação percentual devolve nulo quando não há base (`formatters.ts:95-98`); aritmética de meses em UTC, sem problema de fuso (`date.ts:42-46`); participação da pizza (`CampusDistribution.tsx:30-41`); conversão para litros por dia (`formatters.ts:89-92`, assume mês de 30 dias); o texto do glossário ("50 é a média") bate com a fórmula em uso.

### 2.2 Backend

| ID | Descrição | Onde | Sev. | Esf. | Evidência |
|---|---|---|---|---|---|
| B1 | `/public/campus` devolve, sem autenticação, todos os pontos de medição com endereço, número de UC, RGI e código de instalação. Nenhum dos dois fronts chama esse endpoint. | `backend/app/api/routes/public.py:18-25`; `backend/app/schemas/campus.py:6-15` | 🟠 | P | Verificado (leitura + busca sem ocorrências em `frontend/src` e `frontend-public/src`). |
| B2 | O papel `campus` pode criar lançamento, mas editar e excluir exigem `super`. O front mostra os botões Editar/Excluir para todos, e o usuário de campus recebe 403 com mensagem genérica. | `backend/app/api/routes/lancamentos.py:84,111`; `frontend/src/pages/Lancamentos.tsx:243-247` | 🟠 | P | Verificado (leitura). Resolvido por D5. |
| B3 | Cada request autenticado valida o token com `check_revoked=True`, o que faz uma chamada de rede ao Firebase. O Dashboard dispara cerca de 17 requests por abertura. | `backend/app/core/security.py:66` | 🟠 | P | Verificado (leitura); o ganho de latência está a confirmar medindo. |
| B4 | Editar um lançamento importado trocando mês pode violar o índice único e estourar como erro 500 sem tratamento; trocar o campus deixa o lançamento com campus diferente do ponto de medição. | `backend/app/api/routes/lancamentos.py:90-102` | 🟡 | P | A confirmar (exige banco). |
| B5 | A confirmação da importação ignora em silêncio pontos inexistentes e grava o que o cliente mandar, sem revalidar; a resposta não informa quantos foram ignorados. | `backend/app/api/routes/importar.py:141-143` | 🟡 | P | Verificado (leitura). |
| B6 | Consultas em laço na importação: duas por linha na prévia (busca do ponto e nome do campus) e duas por item na confirmação. Com 72 pontos são cerca de 150 consultas por etapa. O upload não tem limite de tamanho. | `backend/app/api/routes/importar.py:41-58,69,96,104,141,168` | 🟡 | P | Verificado (leitura). |
| B7 | `python-multipart`, exigido pelo upload, não está em `requirements.txt`; só existe porque o FastAPI 0.111 o instala junto. Atualizar o FastAPI para 0.112+ quebra a importação. FastAPI 0.111 e Starlette 0.37 são de 2024. | `backend/requirements.txt:1-9` | 🟡 | P | Verificado (`pip list`: `python-multipart 0.0.27` instalado, ausente do arquivo). |
| B8 | Cinco fontes de verdade divergentes para campi e schema: migrations (8 campi), `campus_mapping.CAMPI` (7), `seed_fake_data.py` (6), `schema.sql` (7 campi, sem `pontos_medicao`, com `CHECK` inexistentes no banco real) e `app/seed.py`. O README manda rodar o seed, que é redundante com as migrations. | `backend/sql/schema.sql:1-45`; `backend/app/data/campus_mapping.py:19-27`; `backend/app/seed.py`; `scripts/seed_fake_data.py:40-47`; `README.md:58` | 🟡 | P | Verificado (leitura). |
| B9 | O parâmetro `mes` não é validado em resumo, indicadores, pizza e endpoints públicos: `?mes=abc` responde 200 com zeros. | `backend/app/api/routes/resumo.py:67`; `indicadores.py:22`; `grafico.py:16`; `public.py:30,101` | 🟢 | P | Verificado (leitura). |
| B10 | Firebase e configurações são inicializados no import do módulo, o que obriga a ter `.env` e credenciais para importar qualquer rota. Dificulta os testes da Fase 2. | `backend/app/core/security.py:30`; `backend/app/core/config.py:34` | 🟢 | P | Verificado (execução): o script de prova precisou do `.env` real para importar as rotas. |

**O que está correto nesta área:** nenhuma consulta montada por concatenação (sem risco de injeção de SQL); nenhum segredo versionado (busca em arquivos rastreados e no histórico não encontrou chave privada nem `.env`); CORS por lista de origens; autorização coerente nas rotas de campus, importação e lançamentos; upsert atômico da importação com índice único parcial; filtro por campus aplicado no servidor para o papel `campus`. Índices: com o volume atual (72 pontos, dados mensais) não falta nenhum.

### 2.3 Frontend

| ID | Descrição | Onde | Sev. | Esf. | Evidência |
|---|---|---|---|---|---|
| F1 | O Dashboard não tem estado de erro: se `/resumo` falha, a tela fica em skeleton para sempre. O mesmo acontece com usuário autenticado sem a claim `role`, porque as consultas ficam desabilitadas e a rota não exige papel. | `frontend/src/pages/Dashboard.tsx:91`; `frontend/src/hooks/queries.ts:38`; `frontend/src/components/PrivateRoute.tsx:35` | 🟠 | P | Verificado (leitura). `Reports.tsx:104` e `Campi.tsx:157` já tratam erro; o Dashboard não. |
| F2 | A obtenção do token na carga não tem tratamento de erro: sem rede, a aplicação fica em "Verificando seu acesso…" indefinidamente. Além disso força a renovação do token a cada carga de página. | `frontend/src/providers/AuthProvider.tsx:41` | 🟡 | P | Verificado (leitura). |
| F3 | Abrir o Dashboard dispara 12 chamadas a `/resumo` (uma por mês da série), mais indicadores, pizza, lançamentos e campi. A lista de lançamentos do mês é baixada inteira para mostrar 6 linhas. | `frontend/src/hooks/queries.ts:100-111`; `frontend/src/pages/Dashboard.tsx:44-47,327` | 🟡 | M | Verificado (leitura). |
| F4 | Textos que descrevem um comportamento que não existe: a tela diz que o campus é identificado "pelo endereço da fatura", mas o casamento é por PDE/RGI, número da UC ou código de instalação. Comentários citam "7 campi" (são 8). | `frontend/src/pages/Importar.tsx:127,290`; `frontend/src/lib/glossary.ts:78`; `backend/app/api/routes/importar.py:41-58`; `frontend/src/hooks/queries.ts:97` | 🟢 | P | Verificado (leitura). |
| F5 | Pequenos: comparador de ordenação inconsistente quando os dois valores são nulos (`useSort.ts:33-34`); link com `<a href>` que recarrega a aplicação (`PrivateRoute.tsx:49`); mensagem de erro da API é o corpo JSON cru e não há tratamento central de 401 (`api.ts:31-34`). | citados | 🟢 | P | Verificado (leitura). |
| F6 | Não há ESLint nem testes; `noUnusedLocals` está desligado, então código morto não é acusado. | `frontend/package.json:6-11`; `frontend/tsconfig.app.json:19-20` | 🟡 | P | Verificado. |

**O que está correto nesta área:** carregamento sob demanda por rota; bundle adequado (o maior bloco, 372 KB antes de compressão, é o Recharts e só carrega nas telas com gráfico); nenhuma dependência sem uso e nenhum arquivo órfão; chaves de cache e invalidação coerentes; formulários com validação; rótulos de acessibilidade nos controles; navegação com fonte única; `tsc -b` sem erros.

### 2.4 Simplificação

| ID | Descrição | Onde | Sev. | Esf. | Evidência |
|---|---|---|---|---|---|
| S1 | `core/eco.py` é código morto com uma fórmula diferente da que está em uso (faixa 0–2 contra 0,5–1,5). Quem importar o arquivo errado muda as notas. | `backend/app/core/eco.py` × `backend/app/core/eco_score.py` | 🟡 | P | Verificado (execução), prova 1; nenhuma importação de `app.core.eco`. |
| S2 | O cálculo de indicadores está copiado entre a rota autenticada e a pública (cerca de 65 linhas). Qualquer correção de C2/C3 precisa ser feita duas vezes. | `backend/app/api/routes/indicadores.py:29-100` × `backend/app/api/routes/public.py:33-94` | 🟡 | P | Verificado (leitura). |
| S3 | `frontend-public/` duplica a rota `/ranking` do app principal, com tipos copiados à mão, outro lockfile (Vite 6 contra 8) e unidade divergente (C10). | `frontend-public/` × `frontend/src/pages/public/RankingPublico.tsx`, `frontend/src/App.tsx:32` | 🟡 | M | Verificado (leitura). Resolvido por D6. |
| S4 | Código sem uso ou redundante: schemas `ResumoOut`, `IndicadoresOut`, `PizzaOut`; funções `formatCompact`, `formatMonth`, `sameMonthLastYear`, `isFutureMonth`; checagem `ALLOWED_TIPOS` (o enum já valida); `_total_geral` repete a agregação de `_campus_totals`; `ResumoCampus(...)` montado quatro vezes; colunas `area_m2`/`populacao` de `pontos_medicao` nunca lidas; `requirements.txt` da raiz. | `backend/app/schemas/resumo.py:25`; `schemas/indicadores.py:31,45`; `frontend/src/lib/formatters.ts:34,100`; `frontend/src/lib/date.ts:79,83`; `backend/app/api/routes/lancamentos.py:15,58,94`; `resumo.py:48-62,72-111` | 🟢 | P | Verificado (busca por referências). |
| S5 | Lógica repetida no front: ordenação e nota média calculadas em três telas; invalidação das quatro consultas copiada em duas; bloco "Como a nota é calculada" escrito duas vezes. | `frontend/src/pages/Reports.tsx:36-48,276-290`; `pages/public/RankingPublico.tsx:37-44,169-182`; `pages/Dashboard.tsx:68-72`; `pages/Lancamentos.tsx:77-82`; `pages/Importar.tsx:101-104` | 🟢 | P | Verificado (leitura). |

### 2.5 Testes

| ID | Descrição | Sev. | Esf. | Evidência |
|---|---|---|---|---|
| T1 | Não existe nenhum teste automatizado no repositório, nem `pytest`/`vitest` nas dependências. Todos os cálculos acima estão sem rede de proteção. | 🔴 | M | Verificado (busca por arquivos de teste e dependências). |

---

## 3. Roteiro por fases

Revisado em 2026-10-09 com as decisões da [seção 4](#4-decisões-e-pendências). O prazo que manda é o relatório final do PIBITI (redação até ~04/12), então a ordem ficou: correções → indicadores do relatório → só as remoções baratas da Fase 3. O restante da Fase 3 e a Fase 4 ficam para depois do relatório.

**Escopo atual: só local.** Todo o trabalho usa o Postgres do `docker-compose`. Nada de produção, Render, Vercel ou Neon até Roland avisar; as ações 0.1 a 0.3 e 0.6 ficam suspensas até lá.

**Andamento:** 1.1 a 1.6 e 1.8 concluídas em 2026-10-09; 1.7, 1.9 e 1.10 em 2026-10-14; 1.11 em 2026-10-26, todas na branch `fase-1`. 1.12 suspensa (ver abaixo). Também em 2026-10-26, fora do roteiro original: tela **Usuários** (só `super`), que cria contas no Firebase Auth com e-mail, senha e papel, troca o papel de contas existentes e desativa/reativa; trocar papel ou desativar revoga os tokens. Antes era preciso criar no console do Firebase e rodar `scripts/set_claims.py`. Testes: `pytest` no backend (216) e `npm test` (vitest) no frontend (53). Fase R inteira (R.0 a R.5) feita em 2026-10-26; o seed local grava também os fatores de emissão da seção 4.3. R.0 feita em 2026-10-26 (migration 0014); o banco local recebeu o seed de demonstração: 280 lançamentos `demonstracao` (8 campi × 18 meses × 2 tipos, de 2025-05 a 2026-10, menos os 8 campus/mês da água real de 2026-01) e população/área FICTÍCIO. No banco local a migração 0010 classificou 84 lançamentos de luz como `cpfl_legado` e 73 de água como `manual`; nada foi apagado pela migração. Os 73 manuais eram o seed fictício de `scripts/seed_fake_data.py` e saíram depois com `--wipe` (backup em `backups/ecocampus_local_antes_wipe.sql`). Antes da 0013 o banco local não tinha nenhum manual, então o índice único entrou sem mexer em dados (backup em `backups/ecocampus_local_antes_0013.sql`). Em 2026-10-14 a planilha `Docs/PLANILHA PADRÃO AGUA - TESTE.csv` foi importada para 2026-01 pelo fluxo da API: 39 pontos, 19.242 m³, nenhuma linha ignorada. Estado local: 39 importados de água em 2026-01 e as 84 linhas `cpfl_legado` de luz (2025-06 a 2026-05); nenhum dado real de energia. O teto de consumo e de R$ (10 milhões por lançamento) está em `backend/app/core/limites.py`, com a justificativa.

**Sem dados reais (2026-10-26).** Não chegaram nem a planilha da Reitoria (P6) nem população e área dos campi (P7), e a orientadora ainda não respondeu. O projeto segue com o que existe: a única medição real é a água de 2026-01 (39 pontos); todo o resto é demonstração. Consequências:

- **1.12 suspensa.** A Reitoria continua fora do ranking pelo motivo já gravado (1.5), com o consumo no total da universidade. Nada a implementar até o mapeamento chegar.
- **População e área ficam fictícias**, com a marca "FICTÍCIO" que já existe (`campus.demografia_fonte`, `scripts/seed_fake_data.py`).
- **Lançamentos de demonstração precisam de marca própria** (novo item R.0). Hoje o seed grava como `manual`, indistinguível de um lançamento real. Sem a marca, o relatório não consegue separar o que foi medido do que foi simulado.
- **O relatório apresenta o sistema e a metodologia**, com os números de demonstração rotulados como tal, e a água de 2026-01 como o único caso real. É um desvio do plano a relatar com honestidade, junto com os outros (Next.js → FastAPI, só Taubaté).

**Conferência visual pendente:** as telas alteradas em 1.3 a 1.7 e 1.10 ainda não foram abertas num navegador com login. O que os testes cobrem: tabela do ranking e tela de Relatórios renderizadas com campus sem dado, sem cadastro e em revisão, e as unidades das colunas; frases de resumo por medida; botões Editar/Excluir da tabela de lançamentos por papel.

### Cronograma

| Até | Entrega |
|---|---|
| 16/10 | ~~Base de testes e serviço de indicadores (1.1, 1.2)~~ feito |
| 30/10 | Consumo e R$ separados, campus sem dado, nova referência do Eco Score, fim da soma água + energia (1.3 a 1.7), com os testes 2.1 e 2.2 |
| 06/11 | Importação e validação da API (1.8, 1.10, com o teste 2.3); remoção de `/public/campus` (1.9); permissões, trilha de auditoria e tratamento de erro (1.10, 1.11) |
| 13/11 | Indicadores para o relatório (Fase R) |
| ~04/12 | Reimportar as planilhas reais, gerar os números, redigir o relatório. Da Fase 3, só 3.1 e 3.2 |

### Fase 0 — Ações fora do código (Roland)

| # | Ação | Destrava |
|---|---|---|
| 0.1 | Rodar no Neon as duas consultas de [P1](#42-pendências) e me passar o resultado. Fazer backup antes de qualquer descarte. | 1.3 |
| 0.2 | Render: rodar `alembic upgrade head` no deploy (Pre-Deploy Command ou, se o plano não tiver, `alembic upgrade head && <comando atual>` no Start Command). | 1.3, 1.8, 1.10 |
| 0.3 | Vercel: verificar se `frontend-public` tem projeto publicado; se tiver, redirecionar o domínio para `/ranking`. | 3.2 |
| 0.4 | Pedir população e área construída dos 8 campi ao setor responsável. Sem isso o ranking sai vazio (D3). | relatório |
| 0.5 | Preencher a coluna `unidade_correta` de `Docs/pontos-reitoria-para-reatribuir.csv` (41 pontos: 23 de água, 18 de luz). | 1.12 |
| 0.6 | Opcional: procurar `GET /public/campus` nos logs do Render antes da remoção. | 1.9 |

### Fase 1 — Correções críticas

Cada correção entra junto com o teste que a reproduz.

| # | Tarefa | Achados | Depende de |
|---|---|---|---|
| 1.1 | ✅ **Feito.** Base de testes do backend: `pytest` + `TestClient`, autenticação por `dependency_overrides`, banco `ecocampus_test` no Postgres do `docker-compose`, criado e migrado pelo Alembic, cada teste numa transação desfeita. Inicialização do Firebase fora do import. | T1, B10 | — |
| 1.2 | ✅ **Feito.** Cálculo de indicadores em `app/services/indicadores.py`, usado pelas duas rotas, sem mudança de comportamento. `core/eco.py` apagado. | S2, S1 | 1.1 |
| 1.3 | ✅ **Feito** (migrations 0010 e 0011). **Separar consumo e R$ (D1).** Colunas `consumo` (físico: m³ para água, kWh para luz; pode ser nulo só em registro migrado) e `valor_rs` (opcional). A migração trata três casos, cada um reproduzido com dados locais em teste: **manual** → `valor_numeric` vira `consumo`; **importado** → `consumo_fisico` vira `consumo` e `valor_numeric` vira `valor_rs` (importado sem consumo físico fica com `consumo` nulo e `valor_rs` preenchido, fora dos indicadores físicos, com o aviso "N pontos sem consumo no mês" — P2); **carga do script CPFL** → marcada, não apagada: coluna `origem` (`manual` \| `importado` \| `cpfl_legado`, com índice), e os indicadores ignoram `cpfl_legado`. É legado só o que fecha todas as condições: luz, sem ponto de medição, mesmo campus com o mesmo valor em 12 meses consecutivos, criados no mesmo minuto; o resto vira `manual`. A exclusão física é um passo separado, com prévia: `scripts/excluir_cpfl_legado.py`. Resumo, indicadores, Eco Score e gráficos leem só `consumo`. A API de lançamentos passa a devolver os dois campos. Rótulos do front seguem o tipo (m³ ou kWh), nunca "m³/kWh"; R$ aparece só como coluna complementar. Seed local com população e área fictícias, marcadas "FICTÍCIO". | C1, C9 | 1.2 |
| 1.4 | ✅ **Feito.** **Campus sem dado (C2).** Sem lançamento no mês: nota nula, "Sem dados", fora da referência e do pódio. Nota da universidade só considera quem tem nota. | C2 | 1.2 |
| 1.5 | ✅ **Feito** (migration 0012: `campus.fora_do_ranking_motivo`, preenchido para a Reitoria). **Campus sem cadastro (D3, P3).** Nota e ranking exigem população **e** área. Sem um dos dois: fora do ranking, marcado "Sem cadastro" com atalho para Campi; os indicadores individuais aparecem quando houver o dado (água por pessoa com população, kWh/m² com área). O consumo continua no total da universidade. O cálculo alternativo por consumo absoluto é removido. Enquanto a lista de pontos da Reitoria não voltar preenchida (P6), a Reitoria também fica fora do ranking, com o consumo contando no total. | C3 | 1.2 |
| 1.6 | ✅ **Feito.** Exemplo calculado a mão, para o relatório, em `backend/tests/test_eco_score.py::test_exemplo_da_metodologia_calculado_a_mao`. Campus com uma medida só no mês (ex.: água importada, energia ainda não) recebe nota só dessa medida. **Metodologia (D10).** Referência ponderada: consumo total ÷ população total e kWh total ÷ área total, calculados só sobre campi com dado e cadastro no mês. Escala de 50% a 150% mantida. Faixa do meio passa de "Atenção" para "Na média" (API, tipos, glossário, Ajuda, textos). kWh por pessoa exibido ao lado de kWh/m² — informativo, não entra na nota. Feito uma única vez, antes de os testes travarem as constantes. | C12 | 1.4, 1.5 |
| 1.7 | ✅ **Feito.** **Fim da soma água + energia (C4).** `total` sai das respostas. Pizza, variação mensal e frases de resumo passam a ser por medida. "Campi com registro" conta quem tem qualquer lançamento. | C4 | 1.3 |
| 1.8 | ✅ **Feito.** **Importação.** Parser que rejeita formato ambíguo com mensagem por linha; `consumo` obrigatório e `valor_rs` opcional (P2); validar `tipo`, mês e colunas; conferir `ano`/`mes` do arquivo contra o formulário; acusar ponto repetido; recusar negativos; confirmação informa itens ignorados. Se o campus/tipo/mês tem lançamento manual, a prévia avisa "será substituído" e a confirmação apaga o manual explicitamente, na mesma transação (D4). | C5, C6, B5 | 1.3 |
| 1.9 | ✅ **Feito.** Remover `/public/campus` e o schema `CampusComUnidades` (D9). | B1 | — |
| 1.10 | ✅ **Feito** (migration 0013). **Lançamento manual (D4, D5).** Validação na API (consumo ≥ 0, mês válido, teto) e `CHECK` no banco. Um manual por campus/tipo/mês (índice único parcial); segundo devolve 409; também 409 se já existe importado para o campus/tipo/mês. Admin de campus edita e exclui apenas manuais do próprio campus; importados só o `super`. Colunas `criado_por` (uid/e-mail do Firebase) e `atualizado_em`. A tela só mostra Editar/Excluir a quem pode. Conflito de índice na edição vira 409, não 500. | C7, C8, B2, B4 | 1.3 |
| 1.11 | ✅ **Feito.** Estado de erro no Dashboard; tela própria para usuário sem papel; tratamento de erro e fim do refresh forçado no `AuthProvider`. Bloco do `/resumo` para o papel campus rotulado "Universidade (referência)" (D11). | F1, F2 | — |
| 1.12 | ⏸ **Suspensa** (sem mapeamento, ver "Sem dados reais"). **Pontos da Reitoria (D8).** Migration reatribuindo os pontos que pertencem a outra unidade, atualizando também o `campus_id` dos lançamentos já importados desses pontos. Se sobrarem pontos sem dono claro, criar o grupo "Unidades dispersas" (conta no total, fora do ranking). | — | 0.5 |

**Critérios de aceite**

- Dois campi com mesmo consumo físico e mesma população recebem a mesma nota, seja o dado manual ou importado (hoje: 100 e 0).
- Campus sem lançamento aparece como "Sem dados" e campus sem cadastro como "Sem cadastro"; nenhum dos dois tem nota, posição ou peso na referência. Mês vazio não mostra nota em nenhuma das três telas.
- Com campi A (1.000 pessoas, 500 m³) e B (100 pessoas, 100 m³), a referência de água é 600 ÷ 1.100 = 0,545 m³/pessoa, e não a média simples 0,75.
- Campus exatamente na referência recebe 50 e a classificação "Na média". `grep` por "Atenção" como classificação não encontra nada.
- Nenhuma resposta da API traz soma de água com energia; `grep` por `kWh+L` e por rótulo "m³/kWh" não encontra nada. Nenhuma tela ou CSV rotula R$ como consumo.
- Importar `18.500`, `1.234,56` ou `R$ 100,00` resulta em erro explícito por linha ou no valor correto. Arquivo com `mes` diferente do formulário, ponto repetido ou `tipo` inválido é recusado ou sinalizado.
- Segundo lançamento manual do mesmo campus/tipo/mês → 409. Manual sobre mês já importado → 409. Importação sobre mês com manual → prévia avisa, confirmação remove o manual e o total não dobra.
- Admin de campus consegue editar/excluir manual do próprio campus e recebe 403 para importado ou para outro campus. Todo lançamento novo tem `criado_por`.
- `POST /lancamentos` com consumo negativo ou mês `2026-13` → 422.
- `GET /public/campus` → 404.
- Com a API fora do ar, o Dashboard mostra erro com "Tentar novamente".
- A migração da 1.3 roda em banco local com os três casos (manual, importado com e sem consumo físico, carga CPFL) e o teste confere o destino de cada linha.
- `alembic upgrade head` roda limpo no banco local. (Aplicar migrations no deploy do Render fica para quando o escopo de nuvem for liberado.)

### Fase 2 — Testes que travam os cálculos

Os itens 2.1 a 2.3 andam junto com a Fase 1 (ver cronograma); o restante fecha a fase.

| # | Tarefa | Achados |
|---|---|---|
| 2.1 | `compute_eco_score` e `classify_score`: 50%, 80%, 100%, 120%, 150% da referência; referência zero; fronteiras exatas 40 e 70; rótulo "Na média". Escrito depois de 1.6. | T1, C12 |
| 2.2 | Serviço de indicadores: referência ponderada, campus sem dado, sem população, sem área, só água, só energia, um único campus, todos zerados, papel `campus` vendo só a própria linha com a referência de todos. | T1, C2, C3 |
| 2.3 | Parser e prévia da importação: vírgula decimal, ponto de milhar, moeda, vazio, negativo, delimitador `;` e `,`, BOM, cp1252, cabeçalho errado, mês divergente, ponto repetido, substituição de manual; os CSVs de `Docs/` como casos reais. | T1, C5, C6 |
| 2.4 | Importação de ponta a ponta: importar duas vezes atualiza em vez de duplicar; contagem de inseridos e atualizados. | T1 |
| 2.5 | Contrato da API (camelCase de cada resposta) e autorização por papel em todas as rotas, incluindo a regra de D5. | T1 |
| 2.6 | Agregação do resumo com mês, sem mês, campus sem lançamento. | T1 |
| 2.7 | Front com `vitest` (aprovado em D7): `formatters`, `date`, `insights`, `export`, `ecoScore`. | T1, F6 |

**Critérios de aceite:** `pytest` e `vitest` passam com um comando cada, documentado no README; todos os casos do Apêndice A existem como teste; alterar qualquer constante de `eco_score.py` quebra pelo menos um teste.

### Fase R — Indicadores para o relatório final

Só começa com 1.3 a 1.7 prontos: todos estes números dependem de consumo físico confiável.

| # | Tarefa | Depende de |
|---|---|---|
| R.0 | ✅ **Feito** (migration 0014). **Dados de demonstração marcados.** Nova `origem` `demonstracao`, gravada só por `scripts/seed_fake_data.py`. Entra nos cálculos como qualquer consumo, mas as telas, a exportação CSV e o relatório mostram "Demonstração" ao lado do número; mês com qualquer lançamento de demonstração fica marcado inteiro. O seed não grava campus/tipo/mês que já tenha importado (a água de 2026-01 é real e fica). `--wipe` passa a apagar por `origem`. Pelo menos 13 meses de histórico, para R.3 (ano anterior) e R.4 (6 meses de base) terem o que mostrar. | 1.3 |
| R.1 | ✅ **Feito.** kWh por pessoa por campus e da universidade (GreenMetric EC4), na tabela de detalhe e na exportação. O da universidade vem de `GET /indicadores/universidade`: kWh total ÷ população total, só sobre os campi com energia **e** população no mês (inclusive os fora do ranking); a resposta lista quem entrou e quem ficou de fora por falta de população. Linha "Universidade" no rodapé da tabela de detalhe e no fim do CSV. | 1.6 |
| R.2 | ✅ **Feito** (migration 0015). Pegada de carbono da energia: kWh × fator médio **anual** do SIN publicado pelo MCTI (GreenMetric EC8). Tabela `fator_emissao` (ano, fator em tCO₂/MWh, `provisorio`, fonte), criada vazia pela migration. Ano sem fator usa o último publicado, marcado "provisório"; sem nenhum fator, a tela mostra "sem fator cadastrado" — nunca zero. Valores para o seed local na [seção 4.3](#43-fatores-de-emissão-para-o-seed-local). Como ficou: "último publicado" é o mais recente **até** o ano do mês (fator de ano posterior nunca serve); `emissaoKgCo2` por campus em `/indicadores` e da universidade inteira (todos os campi com energia, com ou sem população) em `/indicadores/universidade`, junto com `fatorEmissao` (ano do fator, provisório, fonte). `GET /fatores-emissao` para todos e `PUT /fatores-emissao/{ano}` só para o `super`; ainda sem tela para cadastrar (hoje: seed local ou API). Coluna "CO₂ da energia" na tabela de detalhe, total da universidade no rodapé com fator e fonte, e no CSV. | 1.3 |
| R.3 | ✅ **Feito.** Comparação com o mês anterior e com o mesmo mês do ano anterior, por medida. `GET /comparacao?mes=`: bloco do escopo (universidade para o `super`, o próprio campus para o papel campus) e um por campus; valor nulo = mês sem lançamento da medida ("sem base"); variação nula também com base zero; marca demonstração por medida. Dashboard: linha "vs. <mês do ano anterior>" ou "Sem base em …" nos cartões de água e energia. Relatórios: aba Comparação (por campus, total da universidade no rodapé) e quatro colunas de variação no CSV (vazio = sem base). | 1.7 |
| R.4 | ✅ **Feito.** Alerta de pico: consumo do mês > 1,3 × média dos 12 meses anteriores, por campus e tipo, com mínimo de 6 meses de histórico. Limiar numa constante única, coberta por teste. Como ficou: regra em `app/core/alertas.py`; a média usa só os meses da janela com lançamento da medida (mês vazio não vale zero) e precisa de 6 deles; exatamente 1,3× não é pico. `GET /alertas/picos?mes=` devolve cada campus × medida com consumo no mês (`pico`, `normal` ou `historico_insuficiente`, com média, razão e marca de demonstração), picos primeiro; o papel campus vê só o próprio. Dashboard: cada pico vira aviso no topo do painel "O que os números dizem" (mais de três, uma frase só). CSV do ranking: colunas "Pico de água" e "Pico de energia". Verbete no glossário. | 1.7 |
| R.5 | ✅ **Feito.** Endpoint de série histórica por medida (antecipa o 4.1), porque R.3 e R.4 precisam dele. `GET /serie?ate=AAAA-MM&meses=1..36[&campusId=]`: um ponto por mês, com `temAgua`/`temLuz` (zero ≠ sem dado) e `demonstracao`; o papel campus só vê o próprio campus. Uma consulta agrupada por campus e mês (`app/services/serie.py`), que a comparação reaproveita. | 1.7 |

**R.0 em passos** (mapeado e feito em 2026-10-26; manual sobre demonstração apaga a demonstração do mês, edição de demonstração pela API → 422, e a tela não mostra Editar/Excluir nela; tudo que soma consumo passa por `_campus_totals` em `api/routes/resumo.py`, que indicadores e pizza reaproveitam):

1. **Migration 0014.** Acrescentar `demonstracao` ao `CHECK ck_lancamentos_origem` (hoje `manual`, `importado`, `cpfl_legado`) e ao enum `LancamentoOrigem` em `db/models.py`. Índice único parcial `(campus_id, tipo, mes_referencia) WHERE origem = 'demonstracao'`, como o dos manuais.
2. **Real substitui demonstração.** Em `lancamentos.py::_exige_mes_livre` e na confirmação da importação (`importar.py`, perto da linha 125, onde o manual já é apagado), um lançamento manual ou importado apaga o de demonstração do mesmo campus/tipo/mês, na mesma transação. A prévia da importação avisa isso. Sem isso, o total dobra.
3. **API diz o que é simulado.** `_campus_totals` devolve também `demonstracao` (bool: algum lançamento de demonstração na soma). O campo vai para `ResumoCampus`, `IndicadorCampus` e `PizzaItem`. A resposta do `/resumo` ganha `temDemonstracao` no nível do mês.
4. **Seed.** `scripts/seed_fake_data.py` grava `origem='demonstracao'`, pula campus/tipo/mês que já tenha lançamento real, gera 18 meses por padrão (R.3 precisa de 13 e R.4 de 6 de base), e `--wipe` apaga por `origem`, não mais "manual sem ponto".
5. **Front.** `LancamentoOrigem` em `lib/types.ts`; selo "Demonstração" na tabela de lançamentos (ao lado do selo do `cpfl_legado`, `LancamentosTable.tsx:172`), no ranking e nos cartões do Dashboard; faixa no topo do Dashboard e de Relatórios quando `temDemonstracao`; coluna "Demonstração" no CSV exportado. `permissoes.ts` já só libera `manual` para o campus, então demonstração não é editável pela tela.
6. **Testes.** Migration aceita a nova origem; manual e importação sobre mês de demonstração substituem sem dobrar; `_campus_totals` marca o campus e o mês; seed não toca a água real de 2026-01; front mostra o selo.

**Critérios de aceite:** cada indicador tem teste com valores calculados à mão; a pegada de carbono mostra na tela o fator e a fonte usados; comparação anual mostra "sem base" quando não há dado do ano anterior; a exportação CSV traz todos os indicadores usados no relatório, com unidade no cabeçalho.

### Fase 3 — Simplificação e refatoração

Antes do relatório, só 3.1 e 3.2. O restante fica para depois.

| # | Tarefa | Achados | Depende de |
|---|---|---|---|
| 3.1 | ✅ **Feito** (2026-10-26; `seed_fake_data.py` já usava os 8 campi e virou o seed de demonstração da R.0). Aposentar `scripts/import_consumo_cpfl.py` e `app/data/campus_mapping.py` (D2); apagar `schema.sql` e `app/seed.py`; corrigir `seed_fake_data.py` para os 8 campi ou removê-lo; atualizar README. | B8, C11 | 1.3 |
| 3.2 | Apagar `frontend-public/`; fica a rota `/ranking` do app (D6). | S3, C10 | 0.3 |
| 3.3 | Limpar código morto e redundante do backend; unificar a agregação do resumo. | S4 | — |
| 3.4 | Front: hook único para ranking e nota média, função única de invalidação, componente único para "Como a nota é calculada"; remover funções sem uso; corrigir textos. | S5, S4, F4, F5 | — |
| 3.5 | Declarar `python-multipart` e separar dependências de desenvolvimento. | B7 | — |
| 3.6 | A API devolve a nota arredondada e a classificação; o front deixa de reclassificar. | C12 | 1.6 |

**Critérios de aceite:** suíte verde sem alterar asserções; `git grep` não encontra `core.eco`, `schema.sql`, `campus_mapping`, `ResumoOut` nem as funções listadas em S4; existe um único diretório de frontend; a lista de campi aparece em um único lugar; `tsc -b` limpo com `noUnusedLocals` ligado.

### Fase 4 — Otimização (depois do relatório)

| # | Tarefa | Achados |
|---|---|---|
| 4.1 | ✅ **Adiantado com a R.5.** Dashboard passa a usar o endpoint de série (R.5) no lugar das 12 chamadas. | F3 |
| 4.2 | Validação de token sem chamada de rede por request (`check_revoked=False` ou cache curto por token). | B3 |
| 4.3 | Importação em lote: carregar os pontos do tipo uma vez; upsert em uma instrução; limite de tamanho do upload. | B6 |
| 4.4 | `Cache-Control` nos endpoints públicos; limite de linhas em "Últimos lançamentos". | F3 |

**Critérios de aceite:** abrir o Dashboard gera no máximo 6 requests à API (hoje cerca de 17); prévia e confirmação de uma planilha com 72 pontos executam no máximo 3 consultas cada; tempos medidos antes e depois registrados no PR.

### Fase 5 — Melhorias opcionais

- ESLint no front e CI (GitHub Actions) rodando `pytest`, `vitest`, `tsc` e lint.
- Atualizar FastAPI/Starlette e demais dependências, com a suíte como proteção.
- Metas institucionais e comentários no lançamento (ideias de `MarkDown/coisas_para_relatar.md`).
- Cadastro de pontos de medição pela interface, para resolver "linhas ignoradas" sem migration.

---

## 4. Decisões e pendências

### 4.1 Decisões (2026-10-09)

| # | Decisão |
|---|---|
| D1 | Nota, ranking e gráficos em **consumo físico** (m³ e kWh). R$ em coluna própria (`valor_rs`), só complementar. Rótulos seguem o tipo. |
| D2 | Dados do script CPFL são **descartados** (com backup): total anual ÷ 12, sem ponto de medição, mapeamento errado. O script e o `campus_mapping` são aposentados. O estado real de produção ainda precisa ser consultado (P1). |
| D3 | Campus sem população/área fica **fora do ranking**, marcado "Sem cadastro"; o consumo continua no total da universidade. |
| D4 | Um lançamento manual por campus/tipo/mês; segundo → 409; manual sobre mês importado → 409. Importação sobre mês com manual avisa na prévia e apaga o manual na confirmação: o importado prevalece. |
| D5 | Admin de campus edita e exclui **apenas manuais do próprio campus**; importados só o `super`. Entram `criado_por` e `atualizado_em`. |
| D6 | Fica a rota `/ranking` do app principal; `frontend-public/` é apagado. |
| D7 | `vitest` aprovado como dependência de desenvolvimento. |
| D8 | Preferência por **reatribuir** os pontos da Reitoria às unidades de fato; "Unidades dispersas" como alternativa para o que sobrar. Falta o mapeamento (P6). |
| D9 | `/public/campus` é **removido**. |
| D10 | Metodologia revista uma única vez: referência **ponderada** (total ÷ total), escala 50%–150% mantida, faixa do meio renomeada para "Na média", kWh por pessoa exibido ao lado de kWh/m². |
| D11 | Papel campus continua vendo o total da universidade, rotulado "Universidade (referência)". |
| D12 | Migrations passam a rodar no deploy. |

### 4.2 Pendências

| # | Pendência | Quem | Bloqueia |
|---|---|---|---|
| P1 | Consultas em produção (abaixo). **Suspensa** pelo escopo local; não bloqueia mais a 1.3, que trata os três casos. Volta a valer antes de aplicar a migração em produção. | Roland | deploy |
| P2 | ✅ Resolvida: não descartar. Importado sem consumo físico migra com `consumo` nulo e `valor_rs` preenchido, fica fora dos indicadores físicos com aviso. Daqui em diante a importação exige consumo e `valor_rs` é opcional. | — | — |
| P3 | ✅ Resolvida: nota e ranking exigem população **e** área; indicadores individuais aparecem quando houver o dado. | — | — |
| P4 | ✅ Resolvida: fator médio anual, um por ano; ano sem fator usa o último publicado, marcado "provisório". Falta só conferir os valores no site do MCTI antes do relatório final (4.3). | Roland | relatório |
| P5 | ✅ Resolvida: pico = mês > 1,3 × média dos 12 meses anteriores, por campus e tipo, mínimo de 6 meses de histórico. | — | — |
| P6 | Preencher `Docs/pontos-reitoria-para-reatribuir.csv`. Até lá a Reitoria fica fora do ranking. Sem resposta em 2026-10-26: 1.12 suspensa. | Roland + setor | 1.12 |
| P7 | População e área construída reais dos 8 campi. Até lá, valores fictícios marcados "FICTÍCIO" no seed local. Sem resposta em 2026-10-26: o relatório sai com dados de demonstração (R.0). | setor responsável | — |

### 4.3 Fatores de emissão para o seed local

Informados por Roland em 2026-10-09, em tCO₂/MWh. Entram só no seed local; a migration cria a tabela vazia.

| Ano | Fator | Provisório |
|---|---|---|
| 2023 | 0,0385 | não |
| 2024 | 0,0545 | não |
| 2025 | 0,0461 | não |
| 2026 | 0,0461 (repete 2025) | sim |

Fonte a gravar: "MCTI – fator médio anual do SIN (valores de 2024/2025 conferidos via inventários GEE que usam a ferramenta GHG Protocol; confirmar no site do MCTI antes do relatório final)".

Consultas de P1 (somente leitura, para quando o escopo de produção for liberado):

```sql
-- Visão geral por origem e tipo
SELECT CASE WHEN ponto_medicao_id IS NULL THEN 'manual/cpfl/seed' ELSE 'importado' END AS origem,
       tipo, count(*) AS n, min(mes_referencia) AS de, max(mes_referencia) AS ate,
       count(DISTINCT valor_numeric) AS valores_distintos,
       count(*) FILTER (WHERE consumo_fisico IS NULL) AS sem_consumo_fisico,
       min(created_at) AS primeiro, max(created_at) AS ultimo
FROM lancamentos GROUP BY 1, 2 ORDER BY 1, 2;

-- Assinatura do script CPFL: vários meses com exatamente o mesmo valor no mesmo campus
SELECT campus_id, tipo, count(*) AS meses, min(valor_numeric) AS valor, min(created_at) AS criado
FROM lancamentos
WHERE ponto_medicao_id IS NULL
GROUP BY campus_id, tipo
HAVING count(*) > 1 AND count(DISTINCT valor_numeric) = 1;
```

A primeira consulta não separa lançamento manual de carga do script (os dois têm `ponto_medicao_id` nulo); a segunda identifica a carga do script pelo padrão de valores repetidos.

---

## Apêndice A — Saídas da prova

Script temporário (não versionado), executado com `backend/.venv` e com `_campus_totals` e `_find_ponto` substituídos por dados fixos. Nenhum banco foi acessado.

```
== 1. Duas implementacoes de compute_eco_score (total, media) ==
  total= 50 media=100  eco_score.py= 100.0  eco.py(morto)=75.00
  total= 80 media=100  eco_score.py=  70.0  eco.py(morto)=60.00
  total=100 media=100  eco_score.py=  50.0  eco.py(morto)=50.00
  total=120 media=100  eco_score.py=  30.0  eco.py(morto)=40.00
  total=150 media=100  eco_score.py=   0.0  eco.py(morto)=25.00
== 2. Campus SEM lancamento no mes (pop/area cadastradas) ==
  A (com dados)          agua/pc=0.5 luz/m2=1.0 score=25.0 Crítico
  B (com dados)          agua/pc=0.7 luz/m2=1.4 score=0.0 Crítico
  C (SEM lancamentos)    agua/pc=0.0 luz/m2=0.0 score=100.0 Ecológico
== 3. Mes sem NENHUM lancamento ==
  A                      agua/pc=0.0 luz/m2=0.0 score=100.0 Ecológico normalizado=True
  B                      agua/pc=None luz/m2=None score=100.0 Ecológico normalizado=False
  media exibida no front = 100.0
== 4. Ranking misturando normalizado x fallback absoluto ==
  Grande c/ demografia   agua/pc=0.4 luz/m2=1.0 score=50.0 Atenção normalizado=True
  Pequeno c/ demografia  agua/pc=0.4 luz/m2=1.0 score=50.0 Atenção normalizado=True
  Pequeno SEM demografia agua/pc=None luz/m2=None score=100.0 Ecológico normalizado=False
== 5. Unidade: mesmos consumos fisicos, B importado (R$) x A manual (m3) ==
  A manual 600 m3        agua/pc=0.6 score=100.0 Ecológico
  B importado 600 m3     agua/pc=6.0 score=0.0 Crítico
== 6. _parse_float (importar.py:25) ==
     '6940,69' -> 6940.69
    '1.234,56' -> None
      '18.500' -> 18.5
   'R$ 100,00' -> None
         '-50' -> -50.0
== 7. preview_csv ponta a ponta (ponto de medicao simulado) ==
  entrada: UC001 18.500 kWh / 12.345,67 · UC002 950 / 1.000,00 · UC003 (linha de dezembro) 100 / 80,00 · UC003 (repetida) 200 / 160,00
  mes aceito: 2026-13 | total_valor: 240.0
  matched   3 100.0 80.0
  matched   3 200.0 160.0
  unmatched L1 18.5 None | Valor da fatura ausente
  unmatched L2 950.0 None | Valor da fatura ausente
  tipo invalido aceito: qualquer-coisa
  CSV em cp1252: 1 matched (leitura tolera a codificação)
== 8. Validacao de LancamentoCreate ==
  ACEITO: -500 2026-13
  ACEITO: 99999999999999 0000-00
```
