# ECOCAMPUS

Sistema web de monitoramento do consumo de água e energia dos 8 campi da UNITAU em
Taubaté, com nota de eficiência (Eco Score), ranking, pegada de carbono e alertas.
Projeto PIBITI/CNPq. O roteiro de trabalho e as decisões estão no [`SPEC.md`](SPEC.md).

## Estrutura

- `frontend/` React + Vite + TypeScript + Tailwind (shadcn/ui)
- `backend/` FastAPI + SQLAlchemy + Alembic (o banco é criado só pelas migrations)
- `scripts/` utilitários de linha de comando (ver [Scripts](#scripts))
- `docker-compose.yml` Postgres local para desenvolvimento

## Desenvolvimento local

O caminho recomendado é um Postgres local em Docker, igual ao Neon de produção.
Nada aqui toca produção.

### 1. Banco

Na raiz do projeto (com o Docker Desktop aberto):

```powershell
docker compose up -d
docker compose ps
```

Para parar mantendo os dados: `docker compose stop`. Para apagar tudo: `docker compose down -v`.

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edite `backend\.env`:

```
DATABASE_URL=postgresql+psycopg://ecocampus:dev@localhost:5432/ecocampus
FIREBASE_PROJECT_ID=<id do projeto Firebase>
FIREBASE_SERVICE_ACCOUNT_JSON=<JSON da conta de serviço, em uma linha>
FRONTEND_ORIGINS=http://localhost:5173
```

> O login em dev pode usar o mesmo projeto Firebase da produção: o token é por
> projeto, não por ambiente. Para isolar, crie outro projeto Firebase.
> `scripts/firebase_admin_to_env.py` converte o JSON da conta de serviço para uma linha.

Crie as tabelas e os 8 campi, e suba a API:

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

API em `http://localhost:8000` (`/health` responde sem login).

### 3. Frontend

Em outro terminal:

```powershell
cd frontend
npm install
copy .env.example .env.local
```

Preencha `frontend\.env.local` com `VITE_API_BASE_URL=http://localhost:8000` e as
variáveis `VITE_FIREBASE_*` do snippet do console do Firebase (`apiKey` →
`VITE_FIREBASE_API_KEY`, `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`, e assim por diante).

```powershell
npm run dev
```

App em `http://localhost:5173`.

### 4. Dados de demonstração

Sem dados reais suficientes, o sistema roda com dados **de demonstração**: lançamentos
com `origem = 'demonstracao'`, que entram nos números mas aparecem sempre marcados
("Demonstração") nas telas e no CSV. Dado real lançado ou importado substitui a
demonstração do mesmo campus, tipo e mês. Para popular o banco local (com o venv do backend ativo, a partir da raiz):

```powershell
python scripts/seed_fake_data.py           # população/área FICTÍCIO, fatores de emissão e 18 meses
python scripts/seed_fake_data.py --reset   # apaga a demonstração e gera de novo
python scripts/seed_fake_data.py --wipe    # apaga só a demonstração
```

Onde já existe consumo real de um campus, a demonstração segue a média dele. O script
recusa bancos que não sejam locais.

### 5. Testes

```powershell
cd backend; pytest                # precisa do Postgres do Docker no ar
cd frontend; npm test             # vitest
cd frontend; npm run typecheck
```

Os testes do backend usam um banco separado, `ecocampus_test`, criado e migrado
automaticamente no mesmo Postgres. Para outro servidor, defina `TEST_DATABASE_URL`
(o nome do banco precisa terminar em `_test`). Instale antes `pip install -r requirements-dev.txt`.

## Usuários e papéis

Contas ficam no Firebase Auth (e-mail e senha); o papel vai nas custom claims do token:

- `role`: `super` (administração central) ou `campus`
- `campusId`: obrigatório quando `role=campus`

O caminho normal é a tela **Usuários** (só `super`): cria a conta já com o papel, libera
contas que existem sem papel, troca o papel e desativa. Trocar o papel ou desativar
obriga a pessoa a entrar de novo. Sem nenhum `super` ainda (primeira vez), use o script:

```powershell
python scripts/set_claims.py <UID> super
python scripts/set_claims.py <UID> campus 3
```

| Rota | Acesso | O que tem |
|---|---|---|
| `/login`, `/recuperar-senha` | público | autenticação |
| `/ranking` | público | ranking do mês |
| `/dashboard` | autenticado | visão geral (universidade ou o próprio campus) |
| `/lancamentos` | autenticado | lançamento manual; o campus altera só os manuais dele |
| `/ajuda`, `/perfil` | autenticado | glossário; conta e senha |
| `/relatorios` | super | ranking, distribuição, números do mês, comparação, CSV |
| `/campi` | super | população e área usadas na nota |
| `/importar` | super | planilha da concessionária |
| `/usuarios` | super | contas e papéis |

## Scripts

Rode a partir da raiz, com o venv do backend ativo.

| Script | Para quê |
|---|---|
| `seed_fake_data.py` | dados de demonstração no banco local (ver acima) |
| `excluir_cpfl_legado.py` | apaga, com prévia, a carga antiga do script CPFL (`origem = 'cpfl_legado'`, já fora dos indicadores) |
| `set_claims.py` | papel de um usuário direto no Firebase (primeiro `super`) |
| `firebase_admin_to_env.py` | JSON da conta de serviço em uma linha, para o `.env` |
| `planilha_orientadora.py` | gera e lê a planilha de pontos da Reitoria e população/área |
| `gerar_relatorio_pibiti.py` | relatório parcial do PIBITI em `.docx` |

## Dev local × produção

| Aspecto | Dev local | Produção |
|---|---|---|
| Banco | Docker Postgres 16 | Neon (Postgres) |
| Host | direto | com `-pooler` para a API; **sem** `-pooler` para rodar migrations |
| SSL | sem `?sslmode=require` | com `?sslmode=require` |
| CORS (`FRONTEND_ORIGINS`) | `http://localhost:5173` | URL da Vercel + previews |
| Migrations | `alembic upgrade head` | manual: o Render não roda migrations no deploy |
| Cold start | nenhum | Render free dorme após 15 min |

## Observações

- O backend valida o token Firebase em todas as rotas, exceto `/health` e `/public/*` (ranking e divisão do consumo, usados pela página `/ranking`).
- A regra da nota está em `backend/app/core/eco_score.py`; a do alerta de pico, em `backend/app/core/alertas.py`; os limites de um lançamento, em `backend/app/core/limites.py`.
- `DATABASE_URL` aceita `postgres://`, `postgresql://` ou `postgresql+psycopg://` (o backend ajusta).
