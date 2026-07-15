-- Migration 051: status_comercial + campos financeiros complementares
-- Objetivo: separar status operacional (lojas.ativa) de status comercial da licença
-- billing_status permanece no banco para retrocompatibilidade

-- ── Novo campo principal ──────────────────────────────────────────────────────

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS status_comercial TEXT DEFAULT 'em_implantacao';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.empresas'::regclass
      AND conname  = 'empresas_status_comercial_check'
  ) THEN
    ALTER TABLE empresas ADD CONSTRAINT empresas_status_comercial_check
      CHECK (status_comercial IN (
        'em_implantacao','trial','pagante','cortesia','vencido','suspenso','cancelado'
      ));
  END IF;
END $$;

-- ── Backfill a partir de billing_status ──────────────────────────────────────
-- NOTA: billing_status='ativo' NÃO implica pagamento real.
-- Muitas lojas foram liberadas como 'ativo' apenas para liberar acesso operacional.
-- Por segurança, ativo → em_implantacao. Pagante só será definido manualmente.

UPDATE empresas
SET status_comercial = CASE
  WHEN billing_status = 'ativo'        THEN 'em_implantacao'
  WHEN billing_status = 'trial'        THEN 'trial'
  WHEN billing_status = 'cortesia'     THEN 'cortesia'
  WHEN billing_status = 'suspenso'     THEN 'suspenso'
  WHEN billing_status = 'inadimplente' THEN 'vencido'
  WHEN billing_status = 'cancelado'    THEN 'cancelado'
  WHEN billing_status = 'parceiro'     THEN 'cortesia'
  ELSE 'em_implantacao'
END
WHERE status_comercial IS NULL OR status_comercial = 'em_implantacao';

-- ── Campos financeiros complementares ────────────────────────────────────────

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS data_inicio_cobranca DATE;

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2);

-- ── Validação ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  col TEXT;
  cols TEXT[] := ARRAY['status_comercial','data_inicio_cobranca','valor_mensal'];
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'empresas'
        AND column_name  = col
    ) THEN
      RAISE EXCEPTION 'Validação 051: coluna % não existe em empresas', col;
    END IF;
  END LOOP;
END $$;
