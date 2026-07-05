-- Performance 6: índice composto em liberacoes_acesso(email, status)
--
-- Diagnóstico (Fase 5): o índice anterior idx_liberacoes_status cobria apenas
-- a coluna status. A query de contexto filtra por email E status — o planner
-- usava status como entry point e aplicava email como filtro pós-heap, lendo
-- linhas desnecessárias (0.83ms vs 0.08ms do membros_loja).
--
-- Correção: índice composto com email como leading column (alta seletividade).
-- O índice antigo idx_liberacoes_status é mantido — não é removido.

CREATE INDEX IF NOT EXISTS idx_liberacoes_email_status
  ON liberacoes_acesso(email, status);

ANALYZE liberacoes_acesso;
