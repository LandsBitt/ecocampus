# ECOCAMPUS

Monorepo com dashboard de sustentabilidade para 8 campi universitarios.

## Estrutura

- `frontend/` React + Vite + Tailwind
- `backend/` FastAPI + SQLAlchemy + Alembic
- `scripts/set_claims.py` utilitario para custom claims do Firebase
- `backend/sql/schema.sql` script SQL para Supabase/Neon

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
- `CAMPUS_NAMES` (opcional, 8 nomes separados por virgula)

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