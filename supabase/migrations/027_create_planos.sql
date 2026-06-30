-- Migration 027: Criar tabela planos + seeds iniciais
-- Fase 9.14B.1 — Fundação estrutural

CREATE TABLE IF NOT EXISTS planos (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                         TEXT NOT NULL,
  slug                         TEXT UNIQUE NOT NULL,
  descricao                    TEXT,
  max_lojas                    INTEGER,        -- NULL = sem limite
  max_vendedoras_por_loja      INTEGER,        -- NULL = sem limite
  inclui_bibliotecas           BOOLEAN DEFAULT FALSE,
  inclui_treinamentos_parceiro BOOLEAN DEFAULT FALSE,
  preco_mensal                 NUMERIC(10,2),  -- NULL = sob negociação / gratuito
  ativo                        BOOLEAN DEFAULT TRUE,
  criado_em                    TIMESTAMPTZ DEFAULT NOW()
);

-- FK da migration 026 pode ser adicionada agora que planos existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.empresas'::regclass
      AND conname  = 'empresas_plano_id_fkey'
  ) THEN
    ALTER TABLE empresas
      ADD CONSTRAINT empresas_plano_id_fkey
      FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Seeds ─────────────────────────────────────────────────────────────────────
INSERT INTO planos (nome, slug, descricao, max_lojas, inclui_bibliotecas, inclui_treinamentos_parceiro)
VALUES
  ('Trial',      'trial',      'Período de avaliação gratuita — 1 loja, sem bibliotecas.',
   1, FALSE, FALSE),
  ('1 Loja',     '1-loja',     'Plano básico para 1 unidade, com acesso a bibliotecas e treinamentos de parceiros.',
   1, TRUE,  TRUE),
  ('Multi-loja', 'multi-loja', 'Plano para redes com múltiplas lojas, sem limite de unidades.',
   NULL, TRUE, TRUE),
  ('Cortesia',   'cortesia',   'Acesso cortesia para clientes estratégicos ou projetos pilotos.',
   NULL, TRUE, TRUE),
  ('Parceiro',   'parceiro',   'Acesso para parceiros distribuidores que operam no F5.',
   NULL, TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planos'
  ) THEN
    RAISE EXCEPTION 'Validação 027: tabela planos não existe';
  END IF;

  SELECT COUNT(*) INTO cnt FROM planos
  WHERE slug IN ('trial','1-loja','multi-loja','cortesia','parceiro');

  IF cnt < 5 THEN
    RAISE EXCEPTION 'Validação 027: seeds de planos incompletos (encontrados %)', cnt;
  END IF;
END $$;
