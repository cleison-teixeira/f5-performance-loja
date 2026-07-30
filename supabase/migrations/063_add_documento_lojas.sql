-- Migration 063: Adiciona lojas.documento (paridade staging ↔ produção)
--
-- Contexto: produção já possui public.lojas.documento (TEXT), criada fora do
-- fluxo de migrations em algum momento após o commit 8386c13 ("feat: minha-conta
-- simplificada... Adiciona campo CNPJ/CPF"). Essa coluna nunca foi versionada
-- no repositório, então o baseline de staging (2026-07-27) nunca a recebeu.
--
-- O código (app/(app)/minha-conta/{page,actions,FormMinhaConta}.tsx) já
-- consulta e grava esse campo — está correto e alinhado com produção. O gap
-- é somente de schema em staging. Esta migration formaliza retroativamente
-- essa coluna no controle de versão.
--
-- Idempotente (IF NOT EXISTS) e não destrutiva.

ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS documento TEXT;
