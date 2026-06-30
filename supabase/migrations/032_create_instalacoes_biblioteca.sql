-- Migration 032: Criar tabela instalacoes_biblioteca
-- Fase 9.14B.1 — Fundação estrutural
--
-- Registra quais bibliotecas foram instaladas em cada loja.
-- A instalação NÃO importa produtos automaticamente.
-- A importação de produtos será um passo manual/aprovado pelo dono (fase futura).
--
-- Regra:
--   UNIQUE(loja_id, biblioteca_id) — uma biblioteca só pode ser instalada
--   uma vez por loja; para reinstalar, basta setar ativo = TRUE.

CREATE TABLE IF NOT EXISTS instalacoes_biblioteca (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id        UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  biblioteca_id  UUID NOT NULL REFERENCES bibliotecas(id) ON DELETE CASCADE,
  instalado_por  UUID REFERENCES perfis(id) ON DELETE SET NULL,
  instalado_em   TIMESTAMPTZ DEFAULT NOW(),
  ativo          BOOLEAN DEFAULT TRUE,
  UNIQUE(loja_id, biblioteca_id)
);

CREATE INDEX IF NOT EXISTS idx_instalacoes_loja       ON instalacoes_biblioteca(loja_id)       WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_instalacoes_biblioteca ON instalacoes_biblioteca(biblioteca_id) WHERE ativo = TRUE;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'instalacoes_biblioteca'
  ) THEN
    RAISE EXCEPTION 'Validação 032: tabela instalacoes_biblioteca não existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.instalacoes_biblioteca'::regclass
      AND contype  = 'u'
  ) THEN
    RAISE EXCEPTION 'Validação 032: constraint UNIQUE(loja_id, biblioteca_id) não existe';
  END IF;

  -- Garantir que nenhuma loja recebeu biblioteca automaticamente
  IF EXISTS (SELECT 1 FROM instalacoes_biblioteca LIMIT 1) THEN
    RAISE EXCEPTION 'Validação 032: instalacoes_biblioteca deve estar vazia após criação — nenhuma instalação automática permitida';
  END IF;
END $$;
