# ECOCAMPUS

Monorepo com dashboard de sustentabilidade para 8 campi universitarios.

## Estrutura

- `frontend/` React + Vite + Tailwind
- `backend/` FastAPI + SQLAlchemy + Alembic
- `scripts/set_claims.py` utilitario para custom claims do Firebase
- `backend/sql/schema.sql` script SQL para Supabase/Neon
- `docker-compose.yml` Postgres local para desenvolvimento

## Desenvolvimento local (Docker Postgres)

Caminho recomendado: subir um Postgres local em Docker (idêntico ao Neon de produção)
e apontar o backend pra ele. Não toca em produção.

### 1. Subir o banco

Na raiz do projeto:

```powershell
docker compose up -d
```

Verifique que está saudável:

```powershell
docker compose ps
```

Para parar (mantém dados): `docker compose stop`
Para zerar tudo (apaga dados): `docker compose down -v`

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
FIREBASE_PROJECT_ID=<mesmo da prod>
FIREBASE_SERVICE_ACCOUNT_JSON=<mesmo JSON da prod, em uma linha>
FRONTEND_ORIGINS=http://localhost:5173
```

> Pode reusar as credenciais Firebase de produção para login em dev — os tokens
> são por projeto Firebase, não por ambiente. Se preferir isolar, crie um projeto
> Firebase separado.

Aplique o schema e popule os campi:

```powershell
alembic upgrade head
python -m app.seed
```

Suba o servidor:

```powershell
uvicorn app.main:app --reload
```

API em `http://localhost:8000`. Teste o health: `curl http://localhost:8000/health`.

### 3. Frontend

> ⚠️ O frontend foi migrado para **TypeScript + shadcn/ui**. Após o `git pull`,
> rode `npm install` para baixar as novas dependências (Radix UI, lucide-react,
> sonner, etc). Veja seção "Migração TS" abaixo se vier de uma versão anterior.

Em outro terminal:

```powershell
cd frontend
npm install
copy .env.example .env.local
```

Edite `frontend\.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=<...>
VITE_FIREBASE_AUTH_DOMAIN=<...>
# ... demais VITE_FIREBASE_* iguais ao da Vercel
```

Suba o front:

```powershell
npm run dev
```

App em `http://localhost:5173`. Login funciona com os mesmos usuários de prod
(o token Firebase é validado pelo backend local).

### 4. Custom claims (primeira vez)

Se for criar usuários novos só para dev, use:

```powershell
cd backend
.venv\Scripts\activate
python ..\scripts\set_claims.py <UID> super
python ..\scripts\set_claims.py <UID> campus 3
```

### 5. Popular dados de teste

Faça login como `super` e abra a página de Relatórios. Use o formulário
"Dados demográficos dos campi" para preencher população e área. Depois,
faça login como `campus` e crie alguns lançamentos.

### Estrutura do frontend (após refatoração)

```
frontend/src/
├── components/
│   ├── ui/              # shadcn/ui primitives (Button, Card, Dialog, etc)
│   ├── layout/          # AppShell, AppSidebar, AppHeader, PageLayout
│   └── *.tsx            # feature components (SummaryCards, EcoRankingTable…)
├── lib/                 # api, types, utils, formatters, ecoScore, firebase
├── pages/               # Login, Dashboard, Lancamentos, Reports, Campi, Profile…
├── providers/           # AuthProvider
└── App.tsx, main.tsx
```

### Rotas e papéis

| Rota | Acesso | Descrição |
|---|---|---|
| `/login`, `/recuperar-senha` | público | autenticação |
| `/dashboard` | autenticado | overview por papel |
| `/lancamentos` | autenticado | CRUD de lançamentos |
| `/perfil` | autenticado | dados da conta + alteração de senha |
| `/relatorios` | super | ranking + distribuição |
| `/campi` | super | gestão de população/área |

### Diferenças entre dev local e prod

| Aspecto | Dev local | Prod |
|---|---|---|
| Banco | Docker Postgres 16 | NeonDB (Postgres) |
| Pooler | Direto, sem pooler | Use sempre `-pooler` no host |
| SSL | Sem `?sslmode=require` | Com `?sslmode=require` |
| CORS | `http://localhost:5173` | URL Vercel + previews |
| Cold start | Nenhum | Render free dorme após 15min |

## Backend (FastAPI)

1. Instale dependencias:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure variaveis:

```bash
copy .env.example .env
```

Preencha:

- `DATABASE_URL` (PostgreSQL). Exemplo:
  `postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require`
  Supabase:
  `postgresql+psycopg://postgres:YOUR_PASSWORD@db.znqkstqwwvahhcmsqoqj.supabase.co:5432/postgres?sslmode=require`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (opcional) ou `GOOGLE_APPLICATION_CREDENTIALS`
- `FRONTEND_ORIGINS` (ex: `http://localhost:5173`)

3. Crie o schema (Supabase/Neon):

- Execute `backend/sql/schema.sql` no SQL editor do Supabase/Neon, ou
- Rode as migracoes com Alembic:

```bash
alembic upgrade head
```

4. Seed inicial dos campi:

```bash
python -m app.seed
```

5. Suba o servidor:

```bash
uvicorn app.main:app --reload
```

## Frontend (React + Vite + Tailwind)

1. Instale dependencias:

```bash
cd frontend
npm install
```

2. Configure variaveis:

```bash
copy .env.example .env.local
```

Preencha os valores do Firebase (console do projeto) e a API:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_API_BASE_URL` (ex: `http://localhost:8000`)

Mapa direto do snippet do Firebase:

- `apiKey` -> `VITE_FIREBASE_API_KEY`
- `authDomain` -> `VITE_FIREBASE_AUTH_DOMAIN`
- `projectId` -> `VITE_FIREBASE_PROJECT_ID`
- `storageBucket` -> `VITE_FIREBASE_STORAGE_BUCKET`
- `messagingSenderId` -> `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `appId` -> `VITE_FIREBASE_APP_ID`
- `measurementId` -> `VITE_FIREBASE_MEASUREMENT_ID`

3. Suba o front:

```bash
npm run dev
```

## Firebase Auth + Claims

1. Ative **Email/Senha** no Firebase Auth.
2. Crie os usuarios (8 admins de campus + 2 super).
3. Aplique custom claims usando o script (no mesmo venv do backend):

```bash
python scripts/set_claims.py <UID> super
python scripts/set_claims.py <UID> campus 3
```

- `role`: `super` ou `campus`
- `campusId`: obrigatorio quando `role=campus` (1..8)

Depois de aplicar claims, o usuario precisa sair e entrar novamente para atualizar o token.

## Observacoes

- O backend valida token Firebase em todas as rotas protegidas.
- O calculo de eco score e centralizado em `backend/app/core/eco_score.py`.
- Para credenciais locais, use `GOOGLE_APPLICATION_CREDENTIALS` apontando para o JSON do Admin SDK.
- A conexao com Postgres aceita `postgresql://` ou `postgresql+psycopg://` (o backend ajusta automaticamente).