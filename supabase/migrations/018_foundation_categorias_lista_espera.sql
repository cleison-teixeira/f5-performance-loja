-- Fase 7.3A: fundação de banco para Lista de Espera + Categorias
-- Problema: lista_espera existia como stub (id, loja_id, cliente_id NOT NULL,
--           produto_id NOT NULL, criado_em) com policy ALL ampla sem controle por role.
-- Solução:  DROP stub → CREATE lista_espera completa + CREATE categorias, ambas com
--           RLS por operação e separação dono/gerente vs vendedora.
-- Sem UI ainda — apenas schema + RLS.

-- ── categorias ────────────────────────────────────────────────────────────────

CREATE TABLE categorias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  ativa       BOOLEAN DEFAULT TRUE,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, nome)
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Todos os membros da loja veem categorias ativas
CREATE POLICY "categorias_select" ON categorias
  FOR SELECT USING (
    categorias.loja_id IN (SELECT lojas_do_usuario())
  );

-- Somente dono/gerente/admin_f5 criam categorias
CREATE POLICY "categorias_insert" ON categorias
  FOR INSERT WITH CHECK (
    categorias.loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(categorias.loja_id) IN ('dono', 'gerente', 'admin_f5')
  );

-- Somente dono/gerente/admin_f5 editam categorias
CREATE POLICY "categorias_update" ON categorias
  FOR UPDATE USING (
    categorias.loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(categorias.loja_id) IN ('dono', 'gerente', 'admin_f5')
  );

CREATE INDEX idx_categorias_loja ON categorias(loja_id) WHERE ativa = TRUE;

-- ── lista_espera ──────────────────────────────────────────────────────────────
-- DROP stub da migration 001 (0 linhas, sem dependentes externos)

DROP TABLE lista_espera;

CREATE TABLE lista_espera (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id            UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  cliente_id         UUID REFERENCES clientes(id),
  cliente_nome       TEXT NOT NULL,
  cliente_whatsapp   TEXT NOT NULL,
  produto_id         UUID REFERENCES produtos(id),
  produto_nome       TEXT NOT NULL,
  categoria_id       UUID REFERENCES categorias(id),
  categoria_nome     TEXT,
  vendedora_id       UUID NOT NULL REFERENCES perfis(id),
  loja_disponivel_id UUID REFERENCES lojas(id),
  valor_potencial    NUMERIC(10,2),
  quantidade         INTEGER DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'aguardando'
                       CHECK (status IN ('aguardando','encontrado_outra_loja','avisado','convertido','perdido')),
  observacao         TEXT,
  criado_em          TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;

-- SELECT: dono/gerente veem loja toda; vendedora vê apenas as próprias
CREATE POLICY "lista_espera_select" ON lista_espera
  FOR SELECT USING (
    lista_espera.loja_id IN (SELECT lojas_do_usuario())
    AND (
      role_na_loja(lista_espera.loja_id) IN ('dono', 'gerente', 'admin_f5')
      OR lista_espera.vendedora_id = auth.uid()
    )
  );

-- INSERT: vendedora insere apenas para si; dono/gerente inserem para qualquer vendedora
CREATE POLICY "lista_espera_insert" ON lista_espera
  FOR INSERT WITH CHECK (
    lista_espera.loja_id IN (SELECT lojas_do_usuario())
    AND (
      (
        role_na_loja(lista_espera.loja_id) = 'vendedora'
        AND lista_espera.vendedora_id = auth.uid()
      )
      OR role_na_loja(lista_espera.loja_id) = ANY(ARRAY['dono', 'gerente', 'admin_f5'])
    )
  );

-- UPDATE: mesma restrição de visibilidade do SELECT
CREATE POLICY "lista_espera_update" ON lista_espera
  FOR UPDATE USING (
    lista_espera.loja_id IN (SELECT lojas_do_usuario())
    AND (
      role_na_loja(lista_espera.loja_id) IN ('dono', 'gerente', 'admin_f5')
      OR lista_espera.vendedora_id = auth.uid()
    )
  );

-- DELETE: somente dono/gerente/admin_f5 (vendedora não deleta)
CREATE POLICY "lista_espera_delete" ON lista_espera
  FOR DELETE USING (
    lista_espera.loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(lista_espera.loja_id) IN ('dono', 'gerente', 'admin_f5')
  );

CREATE INDEX idx_lista_espera_loja_status ON lista_espera(loja_id, status);
CREATE INDEX idx_lista_espera_vendedora ON lista_espera(vendedora_id);
