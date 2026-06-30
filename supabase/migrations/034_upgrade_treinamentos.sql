-- Migration 034: Upgrade treinamentos — campos de parceiro, biblioteca, nicho, ordem e status
-- Fase 9.14B.1 — Fundação estrutural
--
-- A tabela treinamentos existe desde a migration 005 (empresa_id ou loja_id).
-- Este upgrade não altera colunas existentes — apenas adiciona.
-- A tela /treinamentos ainda é hardcoded; a reconexão ao banco fica para fase futura.

ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS parceiro_id    UUID REFERENCES parceiros(id)   ON DELETE SET NULL;
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS biblioteca_id  UUID REFERENCES bibliotecas(id) ON DELETE SET NULL;
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS nicho          TEXT;
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS thumbnail_url  TEXT;
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS ordem          SMALLINT DEFAULT 99;
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'em_breve';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.treinamentos'::regclass
      AND conname  = 'treinamentos_status_check'
  ) THEN
    ALTER TABLE treinamentos
      ADD CONSTRAINT treinamentos_status_check
      CHECK (status IN ('disponivel','em_breve','inativo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_treinamentos_parceiro   ON treinamentos(parceiro_id)   WHERE parceiro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treinamentos_biblioteca ON treinamentos(biblioteca_id) WHERE biblioteca_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treinamentos_status     ON treinamentos(status)        WHERE status = 'disponivel';

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col  TEXT;
  cols TEXT[] := ARRAY['parceiro_id','biblioteca_id','nicho','thumbnail_url','ordem','status'];
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'treinamentos'
        AND column_name  = col
    ) THEN
      RAISE EXCEPTION 'Validação 034: coluna % não existe em treinamentos', col;
    END IF;
  END LOOP;
END $$;
