-- Migration 031: Criar tabela biblioteca_itens
-- Fase 9.14B.1 — Fundação estrutural
--
-- biblioteca_itens = catálogo global de produtos por biblioteca (parceiro ou F5).
-- Não substitui a tabela operacional `produtos` da loja.
--
-- Fluxo previsto (implementado em fases futuras):
--   1. Admin F5 cadastra itens na biblioteca.
--   2. Dono/loja instala biblioteca (instalacoes_biblioteca).
--   3. Ao importar, produto é copiado para `produtos` da loja com biblioteca_item_id.
--   4. Loja pode ajustar preço, ciclo e mensagens localmente.
--
-- Campos de repasse/acordo: presença estrutural apenas. Sem cálculo financeiro ativo.

CREATE TABLE IF NOT EXISTS biblioteca_itens (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biblioteca_id         UUID NOT NULL REFERENCES bibliotecas(id) ON DELETE CASCADE,
  parceiro_id           UUID REFERENCES parceiros(id) ON DELETE SET NULL,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  preco_sugerido        NUMERIC(10,2),
  foto_url              TEXT,
  galeria_urls          TEXT[] DEFAULT '{}',
  categoria             TEXT,
  nicho                 TEXT,
  ciclo_recompra_dias   INTEGER CHECK (ciclo_recompra_dias IS NULL OR ciclo_recompra_dias > 0),
  qtd_mensagens         SMALLINT DEFAULT 3,
  recorrente            BOOLEAN DEFAULT TRUE,
  comissionavel         BOOLEAN DEFAULT TRUE,
  -- Modelo de repasse/acordo comercial futuro (sem cálculo ativo agora)
  repasse_ativo         BOOLEAN DEFAULT FALSE,
  tipo_acordo           TEXT,
  observacao_comercial  TEXT,
  ativo                 BOOLEAN DEFAULT TRUE,
  criado_em             TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.biblioteca_itens'::regclass
      AND conname  = 'biblioteca_itens_qtd_mensagens_check'
  ) THEN
    ALTER TABLE biblioteca_itens
      ADD CONSTRAINT biblioteca_itens_qtd_mensagens_check
      CHECK (qtd_mensagens IN (1,2,3,4,5));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.biblioteca_itens'::regclass
      AND conname  = 'biblioteca_itens_tipo_acordo_check'
  ) THEN
    ALTER TABLE biblioteca_itens
      ADD CONSTRAINT biblioteca_itens_tipo_acordo_check
      CHECK (tipo_acordo IN ('livre','comissao_percentual','comissao_fixa','cota'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_biblioteca_itens_biblioteca ON biblioteca_itens(biblioteca_id) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_biblioteca_itens_parceiro   ON biblioteca_itens(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_itens_categoria  ON biblioteca_itens(categoria)    WHERE ativo = TRUE;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col TEXT;
  cols TEXT[] := ARRAY[
    'biblioteca_id','parceiro_id','nome','descricao','preco_sugerido',
    'foto_url','galeria_urls','categoria','nicho','ciclo_recompra_dias',
    'qtd_mensagens','recorrente','comissionavel',
    'repasse_ativo','tipo_acordo','observacao_comercial','ativo'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'biblioteca_itens'
  ) THEN
    RAISE EXCEPTION 'Validação 031: tabela biblioteca_itens não existe';
  END IF;

  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'biblioteca_itens'
        AND column_name  = col
    ) THEN
      RAISE EXCEPTION 'Validação 031: coluna % não existe em biblioteca_itens', col;
    END IF;
  END LOOP;
END $$;
