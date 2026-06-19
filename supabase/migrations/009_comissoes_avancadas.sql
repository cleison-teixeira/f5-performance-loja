-- Tabela: comissão fixa por produto e vendedora (Prioridade 1)
CREATE TABLE IF NOT EXISTS comissao_fixa_produto (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id         UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  produto_id      UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  vendedora_id    UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  valor_fixo      NUMERIC(10,2) NOT NULL CHECK (valor_fixo >= 0),
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, produto_id, vendedora_id)
);

-- Multiplicador opcional em metas (ex: 2x = comissao_base * 2)
ALTER TABLE metas_vendedora ADD COLUMN IF NOT EXISTS multiplicador NUMERIC(5,2);

-- Rastrear qual regra fixa foi aplicada em comissao_venda
ALTER TABLE comissao_venda ADD COLUMN IF NOT EXISTS comissao_fixa_produto_id UUID REFERENCES comissao_fixa_produto(id);

-- Atualizar constraint de tipo_comissao para incluir 'produto_fixo'
ALTER TABLE comissao_venda DROP CONSTRAINT IF EXISTS comissao_venda_tipo_comissao_check;
ALTER TABLE comissao_venda ADD CONSTRAINT comissao_venda_tipo_comissao_check
  CHECK (tipo_comissao IN ('campanha', 'meta_batida', 'base', 'padrao', 'produto_fixo'));

-- RLS: comissao_fixa_produto — somente gerente/dono/admin_f5
ALTER TABLE comissao_fixa_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gerente_gerencia_comissao_fixa" ON comissao_fixa_produto
  FOR ALL USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

-- Restringir regras_comissao: vendedoras não podem ver regras de comissão
DROP POLICY IF EXISTS "membros_veem_comissoes" ON regras_comissao;
-- gerente_gerencia_comissoes (FOR ALL) já cobre SELECT para gerente/dono/admin_f5

-- Restringir metas_vendedora: vendedoras não podem ver metas
DROP POLICY IF EXISTS "membros_veem_metas" ON metas_vendedora;
-- gerente_gerencia_metas (FOR ALL) já cobre SELECT para gerente/dono/admin_f5

-- Índices
CREATE INDEX IF NOT EXISTS idx_comissao_fixa_produto_loja ON comissao_fixa_produto(loja_id, produto_id, vendedora_id);
CREATE INDEX IF NOT EXISTS idx_comissao_fixa_produto_vendedora ON comissao_fixa_produto(vendedora_id);
