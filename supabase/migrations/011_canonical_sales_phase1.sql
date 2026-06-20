-- F5 Canonical Sales — Phase 1
-- Aplicada diretamente no Supabase MCP em 2026-06-19 antes de ser versionada.
-- Objetivo: preparar o schema para o modelo de venda canônica.
--
-- Estado esperado após esta migration:
--   vendas.origem          text NOT NULL DEFAULT 'venda_manual'
--   itens_venda.comissionavel boolean NOT NULL DEFAULT true
--   recompras.venda_id     uuid nullable REFERENCES vendas(id)

-- 1. Origem da venda
--    Permite diferenciar venda_manual | recompra | oferta.
--    Registros existentes ficam com 'venda_manual' pelo DEFAULT.
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'venda_manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendas_origem_check'
  ) THEN
    ALTER TABLE vendas
      ADD CONSTRAINT vendas_origem_check
      CHECK (origem IN ('venda_manual', 'recompra', 'oferta'));
  END IF;
END $$;

-- 2. Snapshot de comissionável do item
--    Grava o estado comissionável no momento da venda, sem depender de leitura
--    dinâmica de produtos.comissionavel_recompra.
--    Registros existentes ficam com true pelo DEFAULT.
ALTER TABLE itens_venda
  ADD COLUMN IF NOT EXISTS comissionavel boolean NOT NULL DEFAULT true;

-- 3. Ponteiro da recompra para a venda canônica
--    Permite que uma recompra confirmada aponte para a nova venda criada.
--    Nullable: registros antigos ficam como NULL.
ALTER TABLE recompras
  ADD COLUMN IF NOT EXISTS venda_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recompras_venda_id_fkey'
  ) THEN
    ALTER TABLE recompras
      ADD CONSTRAINT recompras_venda_id_fkey
      FOREIGN KEY (venda_id) REFERENCES vendas(id);
  END IF;
END $$;
