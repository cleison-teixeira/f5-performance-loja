CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  plano TEXT NOT NULL DEFAULT 'trial' CHECK (plano IN ('trial', 'basico', 'pro')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('ativa', 'inativa', 'trial')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lojas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  cidade TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  avatar_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE membros_loja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin_f5', 'dono', 'gerente', 'vendedora')),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, perfil_id)
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, whatsapp)
);

CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco_sugerido NUMERIC(10,2),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mensagens_produto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('agradecimento', 'relacionamento', 'recompra', 'oferta')),
  ordem SMALLINT NOT NULL CHECK (ordem IN (1, 2, 3)),
  texto TEXT NOT NULL,
  dias_apos_venda INT NOT NULL DEFAULT 7,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, ordem)
);

CREATE TABLE vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID NOT NULL REFERENCES lojas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  vendedora_id UUID NOT NULL REFERENCES perfis(id),
  valor NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE avisos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES lojas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  vendedora_id UUID NOT NULL REFERENCES perfis(id),
  mensagem_id UUID NOT NULL REFERENCES mensagens_produto(id),
  texto_renderizado TEXT NOT NULL,
  data_aviso DATE NOT NULL,
  enviado_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'ignorado')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lista_espera (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regras_comissao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  vendedora_id UUID NOT NULL REFERENCES perfis(id),
  percentual NUMERIC(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, vendedora_id)
);

CREATE TABLE comissao_venda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  vendedora_id UUID NOT NULL REFERENCES perfis(id),
  valor_venda NUMERIC(10,2) NOT NULL,
  percentual NUMERIC(5,2) NOT NULL,
  valor_comissao NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_membros_loja_perfil ON membros_loja(perfil_id);
CREATE INDEX idx_membros_loja_loja ON membros_loja(loja_id);
CREATE INDEX idx_clientes_loja ON clientes(loja_id);
CREATE INDEX idx_clientes_whatsapp ON clientes(whatsapp);
CREATE INDEX idx_vendas_loja ON vendas(loja_id);
CREATE INDEX idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX idx_avisos_loja_data ON avisos(loja_id, data_aviso);
CREATE INDEX idx_avisos_vendedora ON avisos(vendedora_id);
CREATE INDEX idx_avisos_status ON avisos(status);
CREATE INDEX idx_comissao_vendedora ON comissao_venda(vendedora_id);
