-- Tabela de metas de adoção por loja — usada pelo Admin F5 para acompanhar execução.
-- Conecta-se à tabela lojas existente via loja_id. Não altera nenhuma tabela existente.

-- Função auxiliar de updated_at (padrão do projeto, análoga à existente no schema storage)
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TABLE lojas_metas_adocao (
  id                              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id                         UUID          NOT NULL UNIQUE REFERENCES lojas(id) ON DELETE CASCADE,
  vendas_mes_estimadas            INTEGER,
  percentual_recorrente_estimado  NUMERIC(5,2),
  meta_recorrentes_mes            INTEGER,
  ticket_medio_estimado           NUMERIC(10,2),
  responsavel_loja_nome           TEXT,
  responsavel_loja_whatsapp       TEXT,
  origem_meta                     TEXT          DEFAULT 'manual'
    CHECK (origem_meta IN ('manual','conversa_whatsapp','landing_page','onboarding','importacao','outro')),
  data_inicio_acompanhamento      DATE,
  observacoes                     TEXT,
  status                          TEXT          DEFAULT 'ativo'
    CHECK (status IN ('ativo','pausado','sem_meta')),
  criado_por                      UUID,
  atualizado_por                  UUID,
  criado_em                       TIMESTAMPTZ   DEFAULT now(),
  atualizado_em                   TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_lma_loja_id ON lojas_metas_adocao (loja_id);
CREATE INDEX idx_lma_status  ON lojas_metas_adocao (status);

CREATE TRIGGER trg_lma_atualizado_em
  BEFORE UPDATE ON lojas_metas_adocao
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

ALTER TABLE lojas_metas_adocao ENABLE ROW LEVEL SECURITY;

-- Admin F5: acesso total (SELECT/INSERT/UPDATE/DELETE)
CREATE POLICY "admin_f5_gerencia_metas_adocao" ON lojas_metas_adocao
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membros_loja
      WHERE perfil_id = auth.uid()
        AND role = 'admin_f5'
        AND ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM membros_loja
      WHERE perfil_id = auth.uid()
        AND role = 'admin_f5'
        AND ativo = true
    )
  );

-- Dono/Gerente/Vendedora: somente leitura da própria loja
CREATE POLICY "membros_leem_meta_adocao" ON lojas_metas_adocao
  FOR SELECT
  USING (loja_id IN (SELECT lojas_do_usuario()));
