-- Migration 033: Upgrade produtos — campos de origem de biblioteca e parceiro
-- Fase 9.14B.1 — Fundação estrutural
--
-- Mantém:
--   produtos.parceiro (TEXT) — campo legado, não removido.
--   produtos.modelo_id → produtos_modelo — continua como está.
--
-- Adiciona:
--   produtos.biblioteca_item_id → biblioteca_itens (nullable, rastreia origem)
--   produtos.parceiro_id        → parceiros         (nullable, FK real para parceiro)
--   produtos.repasse_ativo      → bool, para acordo comercial futuro
--   produtos.tipo_acordo        → enum, para tipo de repasse futuro

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS biblioteca_item_id UUID REFERENCES biblioteca_itens(id) ON DELETE SET NULL;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS parceiro_id        UUID REFERENCES parceiros(id) ON DELETE SET NULL;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS repasse_ativo      BOOLEAN DEFAULT FALSE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_acordo        TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.produtos'::regclass
      AND conname  = 'produtos_tipo_acordo_check'
  ) THEN
    ALTER TABLE produtos
      ADD CONSTRAINT produtos_tipo_acordo_check
      CHECK (tipo_acordo IN ('livre','comissao_percentual','comissao_fixa','cota'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_produtos_biblioteca_item ON produtos(biblioteca_item_id) WHERE biblioteca_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id     ON produtos(parceiro_id)        WHERE parceiro_id IS NOT NULL;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col  TEXT;
  cols TEXT[] := ARRAY['biblioteca_item_id','parceiro_id','repasse_ativo','tipo_acordo'];
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'produtos'
        AND column_name  = col
    ) THEN
      RAISE EXCEPTION 'Validação 033: coluna % não existe em produtos', col;
    END IF;
  END LOOP;

  -- Garantir que produtos existentes não foram alterados
  IF EXISTS (
    SELECT 1 FROM produtos
    WHERE biblioteca_item_id IS NOT NULL
       OR parceiro_id        IS NOT NULL
       OR repasse_ativo      = TRUE
  ) THEN
    RAISE EXCEPTION 'Validação 033: novos campos de produtos devem estar NULL/FALSE em todos os registros existentes';
  END IF;
END $$;
