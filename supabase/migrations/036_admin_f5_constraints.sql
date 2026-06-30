-- Migration 036: Admin F5 — corrigir constraints legadas de empresas
-- Fase 9.16B — Admin F5 mínimo billing-ready
--
-- Regras:
--   • Não dropa colunas.
--   • Não dropa tabelas.
--   • Não altera dados existentes.
--   • Apenas ajusta CHECK constraints desatualizadas.

-- 1. Dropar constraint desatualizada de empresas.plano
--    plano_id → planos é agora a fonte de verdade do plano contratado.
--    O campo empresas.plano é legado e fica inerte com DEFAULT 'trial'.
ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_plano_check;

-- 2. Expandir empresas.status para incluir 'em_onboarding'
--    (mantém todos os valores existentes: ativa, inativa, trial)
ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_status_check;
ALTER TABLE empresas ADD CONSTRAINT empresas_status_check
  CHECK (status IN ('ativa', 'inativa', 'trial', 'em_onboarding'));

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.empresas'::regclass
      AND conname = 'empresas_plano_check'
  ) THEN
    RAISE EXCEPTION 'Validação 036: constraint empresas_plano_check ainda existe — dropar falhou';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.empresas'::regclass
      AND conname = 'empresas_status_check'
  ) THEN
    RAISE EXCEPTION 'Validação 036: constraint empresas_status_check não foi criada';
  END IF;
END $$;
