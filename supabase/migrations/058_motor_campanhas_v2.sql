-- Motor de Campanhas V2
-- Migration 058: estende o módulo de campanhas com premiação, snapshot de regra,
-- apuração, materiais e suporte a Produto do Mês / Lançamento.
-- Totalmente aditiva — sem DROP, sem ALTER tipo, sem remoção de colunas.

-- ─── Colunas adicionais em campanhas_venda ────────────────────────────────────
ALTER TABLE campanhas_venda
  ADD COLUMN IF NOT EXISTS objetivo         TEXT,
  ADD COLUMN IF NOT EXISTS parceiro_id      UUID REFERENCES parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS argumentos_venda TEXT;

-- ─── Premiação da campanha ────────────────────────────────────────────────────
-- Uma campanha pode ter zero ou uma regra de premiação por vendedora.
CREATE TABLE campanhas_premiacao (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id             UUID        NOT NULL REFERENCES campanhas_venda(id) ON DELETE CASCADE,
  tipo                    TEXT        NOT NULL DEFAULT 'sem_premiacao'
                                      CHECK (tipo IN (
                                        'fixo_unidade','percentual','bonus_meta',
                                        'faixa_progressiva','premio_fisico','sem_premiacao'
                                      )),
  valor                   NUMERIC(10,2),
  percentual              NUMERIC(6,4),
  meta_gatilho            NUMERIC(10,2),
  progressiva_retroativa  BOOLEAN     NOT NULL DEFAULT FALSE,
  versao                  INTEGER     NOT NULL DEFAULT 1,
  ativo                   BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campanha_id)
);

-- ─── Faixas progressivas (opcional, apenas para tipo = faixa_progressiva) ─────
CREATE TABLE campanhas_premiacao_faixas (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  premiacao_id        UUID           NOT NULL REFERENCES campanhas_premiacao(id) ON DELETE CASCADE,
  quantidade_de       NUMERIC(10,3)  NOT NULL,
  quantidade_ate      NUMERIC(10,3),
  valor_por_unidade   NUMERIC(10,4)  NOT NULL CHECK (valor_por_unidade >= 0),
  ordem               SMALLINT       NOT NULL DEFAULT 0,
  criado_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CHECK (quantidade_de >= 0),
  CHECK (quantidade_ate IS NULL OR quantidade_ate > quantidade_de)
);

-- ─── Snapshot de regra por item vendido ───────────────────────────────────────
-- Imutável após criação: preserva a regra no momento da venda para histórico e auditoria.
CREATE TABLE campanhas_snapshot_regra (
  id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id           UUID           NOT NULL REFERENCES campanhas_venda(id) ON DELETE RESTRICT,
  campanha_item_id      UUID           REFERENCES campanhas_venda_itens(id) ON DELETE SET NULL,
  venda_id              UUID           NOT NULL REFERENCES vendas(id) ON DELETE RESTRICT,
  item_venda_id         UUID           NOT NULL REFERENCES itens_venda(id) ON DELETE RESTRICT,
  loja_id               UUID           NOT NULL REFERENCES lojas(id) ON DELETE RESTRICT,
  vendedora_id          UUID           NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
  quantidade            NUMERIC(10,3)  NOT NULL,
  valor_unitario        NUMERIC(10,2)  NOT NULL,
  valor_total           NUMERIC(12,2)  NOT NULL,
  tipo_premiacao        TEXT           NOT NULL,
  valor_fixo_snapshot   NUMERIC(10,2),
  percentual_snapshot   NUMERIC(6,4),
  faixa_snapshot        JSONB,
  comissao_calculada    NUMERIC(10,2),
  versao_regra          INTEGER        NOT NULL DEFAULT 1,
  status                TEXT           NOT NULL DEFAULT 'ativo'
                                       CHECK (status IN ('ativo','cancelado','estornado')),
  apuracao_id           UUID,
  recalculado_em        TIMESTAMPTZ,
  recalculado_por       UUID           REFERENCES perfis(id) ON DELETE SET NULL,
  criado_em             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(item_venda_id)
);

-- ─── Apuração de pagamento por vendedora por período ─────────────────────────
CREATE TABLE campanhas_apuracao (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id         UUID           NOT NULL REFERENCES campanhas_venda(id) ON DELETE RESTRICT,
  loja_id             UUID           NOT NULL REFERENCES lojas(id) ON DELETE RESTRICT,
  vendedora_id        UUID           NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
  periodo_referencia  DATE           NOT NULL,
  periodicidade       TEXT           NOT NULL DEFAULT 'total'
                                     CHECK (periodicidade IN ('diaria','total')),
  quantidade_apurada  NUMERIC(10,3)  NOT NULL DEFAULT 0,
  valor_apurado       NUMERIC(12,2)  NOT NULL DEFAULT 0,
  valor_aprovado      NUMERIC(12,2),
  valor_pago          NUMERIC(12,2),
  status              TEXT           NOT NULL DEFAULT 'pendente'
                                     CHECK (status IN ('pendente','aprovado','pago','cancelado')),
  data_pagamento      DATE,
  forma_pagamento     TEXT,
  responsavel_id      UUID           REFERENCES perfis(id) ON DELETE SET NULL,
  observacao          TEXT,
  criado_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(campanha_id, vendedora_id, periodo_referencia)
);

-- FK retroativa: snapshot → apuracao (sem ciclicidade)
ALTER TABLE campanhas_snapshot_regra
  ADD CONSTRAINT fk_snapshot_apuracao
  FOREIGN KEY (apuracao_id) REFERENCES campanhas_apuracao(id) ON DELETE SET NULL;

-- ─── Log de recálculo ─────────────────────────────────────────────────────────
CREATE TABLE campanhas_recalculo_log (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id     UUID        NOT NULL REFERENCES campanhas_venda(id) ON DELETE RESTRICT,
  autorizado_por  UUID        NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
  motivo          TEXT,
  itens_afetados  INTEGER     NOT NULL DEFAULT 0,
  valor_delta     NUMERIC(12,2),
  versao_de       INTEGER,
  versao_para     INTEGER,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Materiais e argumentos vinculados à campanha ─────────────────────────────
CREATE TABLE campanhas_materiais (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id       UUID        NOT NULL REFERENCES campanhas_venda(id) ON DELETE CASCADE,
  biblioteca_item_id UUID       REFERENCES biblioteca_itens(id) ON DELETE SET NULL,
  tipo              TEXT        NOT NULL DEFAULT 'material'
                                CHECK (tipo IN ('material','treinamento','argumento')),
  titulo            TEXT        NOT NULL,
  conteudo          TEXT,
  url               TEXT,
  ordem             SMALLINT    NOT NULL DEFAULT 0,
  ativo             BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE campanhas_premiacao          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_premiacao_faixas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_snapshot_regra     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_apuracao           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_recalculo_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_materiais          ENABLE ROW LEVEL SECURITY;

-- campanhas_premiacao: membros da loja leem; gestores escrevem
CREATE POLICY "campanhas_premiacao_select" ON campanhas_premiacao
  FOR SELECT USING (
    campanha_id IN (SELECT id FROM campanhas_venda WHERE loja_id IN (SELECT lojas_do_usuario()))
  );

CREATE POLICY "campanhas_premiacao_write" ON campanhas_premiacao
  FOR ALL USING (
    campanha_id IN (
      SELECT id FROM campanhas_venda
      WHERE loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
    )
  );

-- campanhas_premiacao_faixas: via premiacao → campanha
CREATE POLICY "campanhas_premiacao_faixas_select" ON campanhas_premiacao_faixas
  FOR SELECT USING (
    premiacao_id IN (
      SELECT cp.id FROM campanhas_premiacao cp
      JOIN campanhas_venda cv ON cv.id = cp.campanha_id
      WHERE cv.loja_id IN (SELECT lojas_do_usuario())
    )
  );

CREATE POLICY "campanhas_premiacao_faixas_write" ON campanhas_premiacao_faixas
  FOR ALL USING (
    premiacao_id IN (
      SELECT cp.id FROM campanhas_premiacao cp
      JOIN campanhas_venda cv ON cv.id = cp.campanha_id
      WHERE cv.loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(cv.loja_id) IN ('dono','gerente','admin_f5')
    )
  );

-- campanhas_snapshot_regra: membros da loja leem; apenas sistema/admin escrevem
CREATE POLICY "campanhas_snapshot_select" ON campanhas_snapshot_regra
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "campanhas_snapshot_insert" ON campanhas_snapshot_regra
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5','lider','vendedora')
  );

CREATE POLICY "campanhas_snapshot_update" ON campanhas_snapshot_regra
  FOR UPDATE USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
  );

-- campanhas_apuracao: membros leem; gestores escrevem
CREATE POLICY "campanhas_apuracao_select" ON campanhas_apuracao
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "campanhas_apuracao_write" ON campanhas_apuracao
  FOR ALL USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
  );

-- campanhas_recalculo_log: apenas gestores leem e escrevem
CREATE POLICY "campanhas_recalculo_log_select" ON campanhas_recalculo_log
  FOR SELECT USING (
    campanha_id IN (
      SELECT id FROM campanhas_venda
      WHERE loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
    )
  );

CREATE POLICY "campanhas_recalculo_log_insert" ON campanhas_recalculo_log
  FOR INSERT WITH CHECK (
    campanha_id IN (
      SELECT id FROM campanhas_venda
      WHERE loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
    )
  );

-- campanhas_materiais: membros leem; gestores escrevem
CREATE POLICY "campanhas_materiais_select" ON campanhas_materiais
  FOR SELECT USING (
    campanha_id IN (SELECT id FROM campanhas_venda WHERE loja_id IN (SELECT lojas_do_usuario()))
  );

CREATE POLICY "campanhas_materiais_write" ON campanhas_materiais
  FOR ALL USING (
    campanha_id IN (
      SELECT id FROM campanhas_venda
      WHERE loja_id IN (SELECT lojas_do_usuario())
        AND role_na_loja(loja_id) IN ('dono','gerente','admin_f5')
    )
  );

-- ─── Índices de performance ───────────────────────────────────────────────────
CREATE INDEX idx_campanhas_venda_parceiro       ON campanhas_venda(parceiro_id) WHERE parceiro_id IS NOT NULL;
CREATE INDEX idx_cp_campanha                    ON campanhas_premiacao(campanha_id);
CREATE INDEX idx_cpf_premiacao_ordem            ON campanhas_premiacao_faixas(premiacao_id, ordem);
CREATE INDEX idx_csr_campanha                   ON campanhas_snapshot_regra(campanha_id);
CREATE INDEX idx_csr_venda                      ON campanhas_snapshot_regra(venda_id);
CREATE INDEX idx_csr_vendedora_campanha         ON campanhas_snapshot_regra(vendedora_id, campanha_id);
CREATE INDEX idx_csr_loja_status                ON campanhas_snapshot_regra(loja_id, status);
CREATE INDEX idx_csr_apuracao                   ON campanhas_snapshot_regra(apuracao_id) WHERE apuracao_id IS NOT NULL;
CREATE INDEX idx_cap_campanha_vendedora         ON campanhas_apuracao(campanha_id, vendedora_id);
CREATE INDEX idx_cap_loja_status                ON campanhas_apuracao(loja_id, status);
CREATE INDEX idx_crl_campanha                   ON campanhas_recalculo_log(campanha_id);
CREATE INDEX idx_cm_campanha_ordem              ON campanhas_materiais(campanha_id, ordem);
CREATE INDEX idx_cm_biblioteca_item             ON campanhas_materiais(biblioteca_item_id) WHERE biblioteca_item_id IS NOT NULL;
