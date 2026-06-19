ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissao_venda ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION lojas_do_usuario()
RETURNS SETOF UUID AS $$
  SELECT loja_id FROM membros_loja
  WHERE perfil_id = auth.uid() AND ativo = TRUE
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION role_na_loja(p_loja_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM membros_loja
  WHERE perfil_id = auth.uid() AND loja_id = p_loja_id AND ativo = TRUE
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY "perfil_proprio" ON perfis
  FOR ALL USING (id = auth.uid());

CREATE POLICY "membros_mesma_loja_select" ON membros_loja
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "gerente_gerencia_membros" ON membros_loja
  FOR ALL USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

CREATE POLICY "membros_veem_loja" ON lojas
  FOR SELECT USING (id IN (SELECT lojas_do_usuario()));

CREATE POLICY "dono_edita_loja" ON lojas
  FOR UPDATE USING (
    id IN (SELECT lojas_do_usuario())
    AND role_na_loja(id) IN ('dono', 'admin_f5')
  );

CREATE POLICY "membros_acessam_clientes" ON clientes
  FOR ALL USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "membros_veem_produtos" ON produtos
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "gerente_gerencia_produtos" ON produtos
  FOR ALL USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

CREATE POLICY "membros_veem_mensagens" ON mensagens_produto
  FOR SELECT USING (
    produto_id IN (SELECT id FROM produtos WHERE loja_id IN (SELECT lojas_do_usuario()))
  );

CREATE POLICY "gerente_gerencia_mensagens" ON mensagens_produto
  FOR ALL USING (
    produto_id IN (
      SELECT id FROM produtos
      WHERE loja_id IN (SELECT lojas_do_usuario())
      AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
    )
  );

CREATE POLICY "membros_veem_vendas" ON vendas
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "vendedora_insere_venda" ON vendas
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT lojas_do_usuario())
    AND vendedora_id = auth.uid()
  );

CREATE POLICY "membros_veem_avisos" ON avisos
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "vendedora_atualiza_aviso" ON avisos
  FOR UPDATE USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND vendedora_id = auth.uid()
  );

CREATE POLICY "membros_acessam_espera" ON lista_espera
  FOR ALL USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "membros_veem_comissoes" ON regras_comissao
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "gerente_gerencia_comissoes" ON regras_comissao
  FOR ALL USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

CREATE POLICY "comissao_visibilidade" ON comissao_venda
  FOR SELECT USING (
    vendedora_id = auth.uid()
    OR venda_id IN (
      SELECT id FROM vendas
      WHERE loja_id IN (
        SELECT loja_id FROM membros_loja
        WHERE perfil_id = auth.uid()
        AND role IN ('gerente', 'dono', 'admin_f5')
        AND ativo = TRUE
      )
    )
  );
