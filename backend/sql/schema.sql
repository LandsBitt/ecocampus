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
  nome text NOT NULL UNIQUE
);

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

-- Optional seed (edit names as needed)
-- INSERT INTO campus (id, nome) VALUES
--   (1, 'Campus 1'),
--   (2, 'Campus 2'),
--   (3, 'Campus 3'),
--   (4, 'Campus 4'),
--   (5, 'Campus 5'),
--   (6, 'Campus 6'),
--   (7, 'Campus 7'),
--   (8, 'Campus 8')
-- ON CONFLICT (id) DO NOTHING;