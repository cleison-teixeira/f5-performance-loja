-- Migration 029: Criar tabela parceiros + seed PiùVita
-- Fase 9.14B.1 — Fundação estrutural
--
-- Parceiro = distribuidor/marca global que fornece biblioteca de produtos e treinamentos.
-- Exemplos: PiùVita, Nutry, Future parceiros.

CREATE TABLE IF NOT EXISTS parceiros (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,   -- identificador estável para lookups
  descricao   TEXT,
  logo_url    TEXT,
  site_url    TEXT,
  nicho       TEXT,                   -- 'suplementos', 'petshop', 'agropecuaria', etc.
  ativo       BOOLEAN DEFAULT TRUE,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_slug  ON parceiros(slug)  WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_parceiros_nicho ON parceiros(nicho) WHERE ativo = TRUE;

-- ── Seeds ─────────────────────────────────────────────────────────────────────
INSERT INTO parceiros (nome, slug, descricao, nicho, site_url)
VALUES
  ('PiùVita', 'piuvita', 'Suplementos e nutrição — linha Piùfort e produtos complementares.', 'suplementos', 'https://ngpiuvita.com.br')
ON CONFLICT (slug) DO NOTHING;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'parceiros'
  ) THEN
    RAISE EXCEPTION 'Validação 029: tabela parceiros não existe';
  END IF;

  SELECT COUNT(*) INTO cnt FROM parceiros WHERE slug = 'piuvita';
  IF cnt < 1 THEN
    RAISE EXCEPTION 'Validação 029: seed PiùVita não encontrado';
  END IF;
END $$;
