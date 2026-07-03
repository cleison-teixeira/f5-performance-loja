-- Migration 041: Preparação para PIN por operador (fase futura)
-- Adiciona campos em membros_loja para suporte a PIN individual por membro.
-- Nenhum PIN é ativado; pin_ativo = false por padrão para todos os registros existentes.
-- Não altera RLS, constraints ou dados existentes.

ALTER TABLE membros_loja
  ADD COLUMN IF NOT EXISTS pin_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS pin_ativo BOOLEAN NOT NULL DEFAULT false;
