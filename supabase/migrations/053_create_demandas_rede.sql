-- Demandas entre lojas da mesma rede (empresa)
-- Permite que uma loja solicite um produto às outras lojas do grupo.
-- LGPD: dados do cliente (nome, whatsapp) NÃO são armazenados aqui.

CREATE TABLE demandas_rede (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID        NOT NULL,
  loja_origem_id          UUID        NOT NULL,
  loja_origem_nome        TEXT        NOT NULL,
  responsavel_origem_id   UUID,
  responsavel_origem_nome TEXT,
  lista_espera_id         UUID,
  produto_id              UUID,
  produto_nome            TEXT        NOT NULL,
  quantidade              INTEGER     NOT NULL DEFAULT 1,
  observacao_operacional  TEXT,
  status                  TEXT        NOT NULL DEFAULT 'em_busca',
  criado_por              UUID,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvido_em            TIMESTAMPTZ,
  cancelado_em            TIMESTAMPTZ,
  CONSTRAINT demandas_rede_status_valido
    CHECK (status IN ('em_busca', 'encontrado', 'separado', 'resolvido', 'cancelado'))
);

CREATE TABLE demandas_rede_respostas (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id            UUID        NOT NULL REFERENCES demandas_rede(id) ON DELETE CASCADE,
  loja_resposta_id      UUID        NOT NULL,
  loja_resposta_nome    TEXT        NOT NULL,
  usuario_resposta_id   UUID,
  usuario_resposta_nome TEXT,
  tipo_resposta         TEXT        NOT NULL,
  quantidade_disponivel INTEGER,
  observacao            TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT demandas_rede_respostas_tipo_valido
    CHECK (tipo_resposta IN ('tenho_estoque', 'posso_separar'))
);

CREATE INDEX idx_demandas_rede_empresa       ON demandas_rede(empresa_id);
CREATE INDEX idx_demandas_rede_loja_origem   ON demandas_rede(loja_origem_id);
CREATE INDEX idx_demandas_rede_status        ON demandas_rede(status);
CREATE INDEX idx_demandas_rede_lista_espera  ON demandas_rede(lista_espera_id)
  WHERE lista_espera_id IS NOT NULL;
CREATE INDEX idx_demandas_rede_respostas     ON demandas_rede_respostas(demanda_id);

ALTER TABLE demandas_rede          ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas_rede_respostas ENABLE ROW LEVEL SECURITY;

-- Membros de qualquer loja da mesma empresa podem ler demandas da rede
CREATE POLICY "demandas_rede_select" ON demandas_rede
  FOR SELECT USING (
    empresa_id IN (
      SELECT l.empresa_id FROM lojas l WHERE l.id IN (SELECT lojas_do_usuario())
    )
  );

-- Apenas membros da loja de origem podem criar demandas
CREATE POLICY "demandas_rede_insert" ON demandas_rede
  FOR INSERT WITH CHECK (
    loja_origem_id IN (SELECT lojas_do_usuario())
  );

-- Apenas membros da loja de origem podem atualizar status
CREATE POLICY "demandas_rede_update" ON demandas_rede
  FOR UPDATE USING (
    loja_origem_id IN (SELECT lojas_do_usuario())
  );

-- Membros de qualquer loja da mesma empresa podem ler respostas
CREATE POLICY "demandas_rede_respostas_select" ON demandas_rede_respostas
  FOR SELECT USING (
    demanda_id IN (
      SELECT dr.id FROM demandas_rede dr
      WHERE dr.empresa_id IN (
        SELECT l.empresa_id FROM lojas l WHERE l.id IN (SELECT lojas_do_usuario())
      )
    )
  );

-- Membros de qualquer loja da rede podem responder (exceto a própria loja de origem — validado no action)
CREATE POLICY "demandas_rede_respostas_insert" ON demandas_rede_respostas
  FOR INSERT WITH CHECK (
    loja_resposta_id IN (SELECT lojas_do_usuario())
  );
