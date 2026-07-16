-- Campanhas de Venda — MVP
-- Migration 055: cria o módulo de campanhas de venda.
-- Aditiva: todas as colunas novas em itens_venda são nullable (não quebra registros existentes).
-- Tipo 'acao_granel' é o único funcional no MVP; outros tipos podem ser ativados no futuro.

-- ─── Tabela principal ────────────────────────────────────────────────────────
CREATE TABLE campanhas_venda (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id           UUID        NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  tipo              TEXT        NOT NULL DEFAULT 'acao_granel'
                                CHECK (tipo IN ('acao_granel','produto_mes','lancamento','desafio_vendas')),
  nome              TEXT        NOT NULL,
  descricao         TEXT,
  orientacao_equipe TEXT,
  status            TEXT        NOT NULL DEFAULT 'rascunho'
                                CHECK (status IN ('rascunho','programada','ativa','pausada','encerrada','cancelada')),
  data_inicio       DATE        NOT NULL,
  data_fim          DATE        NOT NULL,
  meta_individual   NUMERIC(10,2),
  meta_loja         NUMERIC(10,2),
  periodicidade     TEXT        NOT NULL DEFAULT 'diaria'
                                CHECK (periodicidade IN ('diaria','total')),
  unidade_meta      TEXT        NOT NULL DEFAULT 'pacote'
                                CHECK (unidade_meta IN ('pacote','unidade')),
  criado_por        UUID        NOT NULL REFERENCES perfis(id),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ativado_em        TIMESTAMPTZ,
  encerrado_em      TIMESTAMPTZ,
  CHECK (data_fim >= data_inicio)
);

-- ─── SKUs/Itens participantes ─────────────────────────────────────────────────
CREATE TABLE campanhas_venda_itens (
  id                   UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id          UUID           NOT NULL REFERENCES campanhas_venda(id) ON DELETE CASCADE,
  produto_id           UUID           NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade_conteudo  NUMERIC(10,3)  NOT NULL CHECK (quantidade_conteudo > 0),
  unidade_conteudo     TEXT           NOT NULL DEFAULT 'g'
                                      CHECK (unidade_conteudo IN ('g','kg','ml','L','unidade')),
  preco_campanha       NUMERIC(10,2)  NOT NULL CHECK (preco_campanha >= 0),
  preco_referencia     NUMERIC(10,2),
  ciclo_recompra_dias  INTEGER        CHECK (ciclo_recompra_dias IS NULL OR ciclo_recompra_dias > 0),
  ativo                BOOLEAN        NOT NULL DEFAULT TRUE,
  ordem                SMALLINT       NOT NULL DEFAULT 0,
  criado_em            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(campanha_id, produto_id)
);

-- ─── Participantes ────────────────────────────────────────────────────────────
CREATE TABLE campanhas_venda_participantes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     UUID        NOT NULL REFERENCES campanhas_venda(id) ON DELETE CASCADE,
  perfil_id       UUID        NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  meta_individual NUMERIC(10,2),
  ativo           BOOLEAN     NOT NULL DEFAULT TRUE,
  data_inicio     DATE,
  data_fim        DATE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campanha_id, perfil_id)
);

-- ─── Extensão de itens_venda (nullable — backward compatible) ─────────────────
ALTER TABLE itens_venda
  ADD COLUMN IF NOT EXISTS campanha_venda_id      UUID REFERENCES campanhas_venda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campanha_venda_item_id UUID REFERENCES campanhas_venda_itens(id) ON DELETE SET NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE campanhas_venda              ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_venda_itens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_venda_participantes ENABLE ROW LEVEL SECURITY;

-- campanhas_venda: membros da loja leem; gestores (dono/gerente/admin_f5) escrevem
CREATE POLICY "campanhas_venda_select" ON campanhas_venda
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "campanhas_venda_insert" ON campanhas_venda
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
  );

CREATE POLICY "campanhas_venda_update" ON campanhas_venda
  FOR UPDATE USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
  );

-- campanhas_venda_itens: acesso via campanha
CREATE POLICY "campanhas_venda_itens_select" ON campanhas_venda_itens
  FOR SELECT USING (
    campanha_id IN (SELECT id FROM campanhas_venda WHERE loja_id IN (SELECT lojas_do_usuario()))
  );

CREATE POLICY "campanhas_venda_itens_write" ON campanhas_venda_itens
  FOR ALL USING (
    campanha_id IN (
      SELECT id FROM campanhas_venda
      WHERE loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
    )
  );

-- campanhas_venda_participantes: acesso via campanha
CREATE POLICY "campanhas_venda_participantes_select" ON campanhas_venda_participantes
  FOR SELECT USING (
    campanha_id IN (SELECT id FROM campanhas_venda WHERE loja_id IN (SELECT lojas_do_usuario()))
  );

CREATE POLICY "campanhas_venda_participantes_write" ON campanhas_venda_participantes
  FOR ALL USING (
    campanha_id IN (
      SELECT id FROM campanhas_venda
      WHERE loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
    )
  );

-- ─── Índices de performance ───────────────────────────────────────────────────
CREATE INDEX idx_campanhas_venda_loja_status ON campanhas_venda(loja_id, status);
CREATE INDEX idx_campanhas_venda_loja_datas  ON campanhas_venda(loja_id, data_inicio, data_fim);
CREATE INDEX idx_cvi_campanha                ON campanhas_venda_itens(campanha_id);
CREATE INDEX idx_cvi_produto_ativo           ON campanhas_venda_itens(produto_id) WHERE ativo;
CREATE INDEX idx_cvp_campanha                ON campanhas_venda_participantes(campanha_id);
CREATE INDEX idx_cvp_perfil                  ON campanhas_venda_participantes(perfil_id);
CREATE INDEX idx_itens_venda_campanha_v      ON itens_venda(campanha_venda_id)      WHERE campanha_venda_id IS NOT NULL;
CREATE INDEX idx_itens_venda_campanha_v_item ON itens_venda(campanha_venda_item_id) WHERE campanha_venda_item_id IS NOT NULL;
