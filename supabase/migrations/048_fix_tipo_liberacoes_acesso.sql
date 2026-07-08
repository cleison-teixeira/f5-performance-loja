-- Migration 048: Corrigir drift de liberacoes_acesso.tipo
-- A coluna tipo existe no banco mas estava ausente da migration 037.
-- Esta migration é idempotente: segura para rodar em qualquer estado.

-- 1. Adicionar coluna se ainda não existir
ALTER TABLE liberacoes_acesso
  ADD COLUMN IF NOT EXISTS tipo TEXT;

-- 2. Preencher registros nulos com valor padrão 'loja'
UPDATE liberacoes_acesso
  SET tipo = 'loja'
  WHERE tipo IS NULL;

-- 3. Definir default para novas inserções
ALTER TABLE liberacoes_acesso
  ALTER COLUMN tipo SET DEFAULT 'loja';

-- 4. Adicionar CHECK constraint idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.liberacoes_acesso'::regclass
      AND conname  = 'liberacoes_acesso_tipo_check'
  ) THEN
    ALTER TABLE liberacoes_acesso
      ADD CONSTRAINT liberacoes_acesso_tipo_check
      CHECK (tipo IN ('loja', 'rede'));
  END IF;
END $$;

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'liberacoes_acesso'
      AND column_name  = 'tipo'
  ) THEN
    RAISE EXCEPTION 'Validação 048: coluna liberacoes_acesso.tipo não existe após migration';
  END IF;
END $$;
