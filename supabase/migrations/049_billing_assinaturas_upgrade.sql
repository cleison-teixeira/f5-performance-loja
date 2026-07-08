-- Migration 049: Billing assinaturas upgrade + preços de planos
-- Adiciona campos de cobrança granular ao assinaturas.
-- Atualiza preco_mensal dos planos com valores reais do MVP.

-- ── Colunas adicionais em assinaturas ─────────────────────────────────────────

-- Provedor de cobrança (ex: 'asaas', 'manual', 'parceria')
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS billing_provider TEXT DEFAULT 'manual';

-- ID do pagamento avulso no Asaas (diferente de asaas_subscription_id)
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;

-- URL da fatura/boleto gerado pelo Asaas
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT;

-- Link de pagamento do Asaas (payment link reutilizável)
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT;

-- Próxima data de vencimento
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS next_due_date DATE;

-- ── Preços dos planos ─────────────────────────────────────────────────────────

UPDATE planos SET preco_mensal = 0      WHERE slug = 'trial';
UPDATE planos SET preco_mensal = 149.00 WHERE slug = '1-loja';
UPDATE planos SET preco_mensal = 0      WHERE slug = 'cortesia';
UPDATE planos SET preco_mensal = 0      WHERE slug = 'parceiro';
-- multi-loja: preço sob negociação — permanece NULL

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'assinaturas'
    AND column_name  IN ('billing_provider','asaas_payment_id','asaas_invoice_url','asaas_payment_link','next_due_date');

  IF col_count < 5 THEN
    RAISE EXCEPTION 'Validação 049: colunas de billing em assinaturas incompletas (% de 5 encontradas)', col_count;
  END IF;
END $$;
