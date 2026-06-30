-- Migration 026: Upgrade empresas — campos de contato, nicho e Asaas-ready
-- Fase 9.14B.1 — Fundação estrutural
--
-- Regras:
--   • Apenas ADD COLUMN IF NOT EXISTS — zero risco destrutivo.
--   • empresas.status (ativa/inativa/trial) continua legado.
--   • billing_status é o novo campo operacional do time F5.
--   • Campos asaas_* ficam NULL até integração futura via webhook.

-- ── Dados de contato do responsável ──────────────────────────────────────────
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS responsavel_nome      TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS responsavel_whatsapp  TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS responsavel_email     TEXT;

-- ── Contexto comercial ────────────────────────────────────────────────────────
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nicho           TEXT;  -- 'suplementos', 'petshop', etc.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS notas_internas  TEXT;  -- uso exclusivo do time F5

-- ── Billing status operacional ────────────────────────────────────────────────
-- Separado de empresas.status para não quebrar código legado que lê 'ativa'/'trial'.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'trial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.empresas'::regclass
      AND conname  = 'empresas_billing_status_check'
  ) THEN
    ALTER TABLE empresas ADD CONSTRAINT empresas_billing_status_check
      CHECK (billing_status IN ('trial','ativo','cancelado','suspenso','inadimplente','cortesia','parceiro'));
  END IF;
END $$;

-- ── Datas de ciclo (Asaas-ready, sem integração ativa) ───────────────────────
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS trial_ends_at         TIMESTAMPTZ;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS current_period_start  TIMESTAMPTZ;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS current_period_end    TIMESTAMPTZ;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS canceled_at           TIMESTAMPTZ;

-- ── IDs Asaas (preenchidos futuramente via webhook) ──────────────────────────
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS asaas_customer_id      TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS asaas_subscription_id  TEXT;

-- ── FK para planos (preenchida após criação da tabela planos em 027) ─────────
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plano_id UUID;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col TEXT;
  cols TEXT[] := ARRAY[
    'responsavel_nome','responsavel_whatsapp','responsavel_email',
    'nicho','notas_internas','billing_status',
    'trial_ends_at','current_period_start','current_period_end','canceled_at',
    'asaas_customer_id','asaas_subscription_id','plano_id'
  ];
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'empresas'
        AND column_name  = col
    ) THEN
      RAISE EXCEPTION 'Validação 026: coluna % não existe em empresas', col;
    END IF;
  END LOOP;
END $$;
