-- Migration 028: Criar tabela assinaturas — Asaas-ready, sem integração ativa
-- Fase 9.14B.1 — Fundação estrutural
--
-- Modelo:
--   • Uma empresa pode ter múltiplos registros (histórico), mas apenas 1 ativo por vez.
--   • billing_status controla o estado operacional.
--   • Campos asaas_* ficam NULL até webhook futuro preencher.
--   • Sem chamar API do Asaas agora.

CREATE TABLE IF NOT EXISTS assinaturas (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                 UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  plano_id                   UUID REFERENCES planos(id) ON DELETE SET NULL,
  billing_status             TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at              TIMESTAMPTZ,
  current_period_start       TIMESTAMPTZ,
  current_period_end         TIMESTAMPTZ,
  canceled_at                TIMESTAMPTZ,
  -- Asaas-ready: preenchidos via webhook futuro
  asaas_customer_id          TEXT,
  asaas_subscription_id      TEXT,
  metodo_pagamento_preferido TEXT,  -- 'boleto', 'pix', 'cartao'
  notas                      TEXT,
  criado_em                  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em              TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.assinaturas'::regclass
      AND conname  = 'assinaturas_billing_status_check'
  ) THEN
    ALTER TABLE assinaturas ADD CONSTRAINT assinaturas_billing_status_check
      CHECK (billing_status IN ('trial','ativo','cancelado','suspenso','inadimplente','cortesia','parceiro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa ON assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status  ON assinaturas(billing_status);

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assinaturas'
  ) THEN
    RAISE EXCEPTION 'Validação 028: tabela assinaturas não existe';
  END IF;
END $$;
