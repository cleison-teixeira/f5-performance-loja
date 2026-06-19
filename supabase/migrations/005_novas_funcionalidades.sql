-- produtos_modelo: templates globais de distribuidoras (ex: PiuVitta)
CREATE TABLE IF NOT EXISTS produtos_modelo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  preco_sugerido  NUMERIC(10,2),
  categoria       TEXT,
  distribuidor    TEXT,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- produtos: referência ao modelo de origem (opcional)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS modelo_id UUID REFERENCES produtos_modelo(id);

-- metas_vendedora: meta mensal com comissão dupla
CREATE TABLE IF NOT EXISTS metas_vendedora (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id         UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  vendedora_id    UUID NOT NULL REFERENCES perfis(id),
  mes             DATE NOT NULL,               -- sempre dia 1 do mês
  valor_meta      NUMERIC(10,2) NOT NULL,
  comissao_base   NUMERIC(5,2)  NOT NULL DEFAULT 1,
  comissao_meta   NUMERIC(5,2)  NOT NULL DEFAULT 2,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, vendedora_id, mes)
);

-- campanhas_produto: comissão fixa por venda (empresa ou loja)
-- Prioridade: loja > empresa quando ambas ativas para o mesmo produto
CREATE TABLE IF NOT EXISTS campanhas_produto (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  loja_id         UUID REFERENCES lojas(id) ON DELETE CASCADE,
  produto_id      UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  comissao_fixa   NUMERIC(10,2) NOT NULL,      -- R$ fixo por venda, não %
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (empresa_id IS NOT NULL OR loja_id IS NOT NULL)
);

-- treinamentos: conteúdo por empresa ou por loja
CREATE TABLE IF NOT EXISTS treinamentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  loja_id         UUID REFERENCES lojas(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  link_video      TEXT,
  link_material   TEXT,
  produto_id      UUID REFERENCES produtos(id),
  categoria       TEXT,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_por      UUID NOT NULL REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (empresa_id IS NOT NULL OR loja_id IS NOT NULL)
);

-- comissao_venda: rastrear qual regra foi aplicada
ALTER TABLE comissao_venda
  ADD COLUMN IF NOT EXISTS tipo_comissao TEXT
    CHECK (tipo_comissao IN ('campanha', 'meta_batida', 'base', 'padrao')),
  ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES campanhas_produto(id);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_metas_vendedora_loja ON metas_vendedora(loja_id, vendedora_id, mes);
CREATE INDEX IF NOT EXISTS idx_campanhas_produto_produto ON campanhas_produto(produto_id, data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_treinamentos_empresa ON treinamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_treinamentos_loja ON treinamentos(loja_id);
