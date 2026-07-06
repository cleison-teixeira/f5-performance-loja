-- Migration 047: Não Contatar / Opt-out do Cliente (Fase 1C.1)

-- 1. Adicionar colunas de opt-out na tabela clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS nao_contatar                 BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nao_contatar_em              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nao_contatar_motivo          TEXT,
  ADD COLUMN IF NOT EXISTS nao_contatar_origem          TEXT,
  ADD COLUMN IF NOT EXISTS nao_contatar_usuario_id      UUID        REFERENCES perfis(id),
  ADD COLUMN IF NOT EXISTS contato_reativado_em         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contato_reativado_usuario_id UUID        REFERENCES perfis(id);

-- Índice parcial para queries rápidas de opt-out
CREATE INDEX IF NOT EXISTS idx_clientes_nao_contatar
  ON clientes(loja_id, nao_contatar)
  WHERE nao_contatar = true;

-- 2. Tabela de auditoria de eventos de privacidade
CREATE TABLE IF NOT EXISTS clientes_privacidade_eventos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id     UUID        NOT NULL REFERENCES lojas(id),
  cliente_id  UUID        NOT NULL REFERENCES clientes(id),
  usuario_id  UUID        REFERENCES perfis(id),
  tipo        TEXT        NOT NULL CHECK (tipo IN ('nao_contatar_marcado', 'nao_contatar_removido')),
  motivo      TEXT,
  origem      TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_privacidade_cliente
  ON clientes_privacidade_eventos(loja_id, cliente_id);

-- 3. RLS na tabela de auditoria
ALTER TABLE clientes_privacidade_eventos ENABLE ROW LEVEL SECURITY;

-- Membros da loja podem ler eventos dos clientes da própria loja
CREATE POLICY "privacidade_membros_select" ON clientes_privacidade_eventos
  FOR SELECT
  USING (loja_id IN (SELECT lojas_do_usuario()));

-- Membros da loja podem inserir eventos (histórico imutável - sem UPDATE/DELETE)
CREATE POLICY "privacidade_membros_insert" ON clientes_privacidade_eventos
  FOR INSERT
  WITH CHECK (loja_id IN (SELECT lojas_do_usuario()));
