-- Migration 030: Criar tabela bibliotecas + seeds F5 Geral e PiùVita
-- Fase 9.14B.1 — Fundação estrutural
--
-- Biblioteca = container global de produtos-modelo e treinamentos.
-- Uma biblioteca pode ser de um parceiro (parceiro_id preenchido)
-- ou do próprio F5 (parceiro_id NULL).
--
-- Instalação por loja fica na tabela instalacoes_biblioteca (migration 032).

CREATE TABLE IF NOT EXISTS bibliotecas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parceiro_id  UUID REFERENCES parceiros(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  descricao    TEXT,
  nicho        TEXT,
  ativo        BOOLEAN DEFAULT TRUE,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bibliotecas_parceiro ON bibliotecas(parceiro_id) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_bibliotecas_nicho    ON bibliotecas(nicho)       WHERE ativo = TRUE;

-- ── Seeds ─────────────────────────────────────────────────────────────────────
-- Biblioteca F5 Geral (sem parceiro — conteúdo genérico da plataforma)
INSERT INTO bibliotecas (parceiro_id, nome, slug, descricao, nicho)
VALUES (
  NULL,
  'Biblioteca F5 Geral',
  'f5-geral',
  'Conteúdo genérico da plataforma F5 Recompra — templates, treinamentos e produtos de uso geral.',
  NULL
)
ON CONFLICT (slug) DO NOTHING;

-- Biblioteca PiùVita (vinculada ao parceiro PiùVita)
INSERT INTO bibliotecas (parceiro_id, nome, slug, descricao, nicho)
SELECT
  p.id,
  'PiùVita',
  'piuvita',
  'Catálogo completo de produtos e treinamentos da linha PiùVita — suplementos, Piùfort e complementares.',
  'suplementos'
FROM parceiros p
WHERE p.slug = 'piuvita'
ON CONFLICT (slug) DO NOTHING;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cnt     INTEGER;
  parcid  UUID;
  bibid   UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bibliotecas'
  ) THEN
    RAISE EXCEPTION 'Validação 030: tabela bibliotecas não existe';
  END IF;

  SELECT COUNT(*) INTO cnt FROM bibliotecas WHERE slug IN ('f5-geral','piuvita');
  IF cnt < 2 THEN
    RAISE EXCEPTION 'Validação 030: seeds de bibliotecas incompletos (encontrados %)', cnt;
  END IF;

  -- Verificar que PiùVita está vinculada ao parceiro correto
  SELECT p.id INTO parcid FROM parceiros p WHERE p.slug = 'piuvita';
  SELECT b.parceiro_id INTO bibid FROM bibliotecas b WHERE b.slug = 'piuvita';

  IF parcid IS NULL THEN
    RAISE EXCEPTION 'Validação 030: parceiro piuvita não encontrado';
  END IF;
  IF bibid IS DISTINCT FROM parcid THEN
    RAISE EXCEPTION 'Validação 030: biblioteca piuvita não está vinculada ao parceiro PiùVita (esperado %, encontrado %)', parcid, bibid;
  END IF;
END $$;
