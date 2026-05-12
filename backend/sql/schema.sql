-- ECOCAMPUS schema for PostgreSQL (Supabase/Neon)

-- Enum type for launch kind
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lancamento_tipo') THEN
    CREATE TYPE lancamento_tipo AS ENUM ('agua', 'luz');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS campus (
  id integer PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  populacao integer NOT NULL DEFAULT 0,
  area_construida_m2 integer NOT NULL DEFAULT 0
);

-- Backfill columns when table already exists (idempotent)
ALTER TABLE campus ADD COLUMN IF NOT EXISTS populacao integer NOT NULL DEFAULT 0;
ALTER TABLE campus ADD COLUMN IF NOT EXISTS area_construida_m2 integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS lancamentos (
  id serial PRIMARY KEY,
  campus_id integer NOT NULL REFERENCES campus(id) ON DELETE RESTRICT,
  tipo lancamento_tipo NOT NULL,
  valor_numeric numeric(12, 2) NOT NULL CHECK (valor_numeric >= 0),
  mes_referencia char(7) NOT NULL CHECK (mes_referencia ~ '^(19|20)[0-9]{2}-(0[1-9]|1[0-2])$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_lancamentos_campus_id ON lancamentos (campus_id);
CREATE INDEX IF NOT EXISTS ix_lancamentos_mes_referencia ON lancamentos (mes_referencia);
CREATE INDEX IF NOT EXISTS ix_lancamentos_tipo ON lancamentos (tipo);
CREATE INDEX IF NOT EXISTS ix_lancamentos_campus_mes ON lancamentos (campus_id, mes_referencia);

-- Seed canônico UNITAU (espelha app/data/campus_mapping.py e migrations 0003/0004).
INSERT INTO campus (id, nome) VALUES
  (1, 'Campus da Juta'),
  (2, 'Campus do Itaim'),
  (3, 'Campus do Bom Conselho'),
  (4, 'Polo da Saúde'),
  (5, 'Direito'),
  (6, 'Reitoria'),
  (7, 'Colégio UNITAU')
ON CONFLICT (id) DO NOTHING;
