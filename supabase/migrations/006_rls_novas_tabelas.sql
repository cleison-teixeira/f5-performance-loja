-- RLS: produtos_modelo (templates globais)
ALTER TABLE produtos_modelo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_veem_modelos_ativos" ON produtos_modelo
  FOR SELECT USING (ativo = TRUE);

CREATE POLICY "admin_gerencia_modelos" ON produtos_modelo
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM membros_loja
      WHERE perfil_id = auth.uid()
        AND role = 'admin_f5'
        AND ativo = TRUE
    )
  );

-- RLS: metas_vendedora
ALTER TABLE metas_vendedora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_veem_metas" ON metas_vendedora
  FOR SELECT USING (loja_id IN (SELECT lojas_do_usuario()));

CREATE POLICY "gerente_gerencia_metas" ON metas_vendedora
  FOR ALL USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

-- RLS: campanhas_produto
ALTER TABLE campanhas_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_veem_campanhas" ON campanhas_produto
  FOR SELECT USING (
    (loja_id IS NOT NULL AND loja_id IN (SELECT lojas_do_usuario()))
    OR (empresa_id IS NOT NULL AND empresa_id IN (
      SELECT l.empresa_id FROM lojas l WHERE l.id IN (SELECT lojas_do_usuario())
    ))
  );

CREATE POLICY "gerente_gerencia_campanhas_loja" ON campanhas_produto
  FOR ALL USING (
    loja_id IS NOT NULL
    AND loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

CREATE POLICY "dono_gerencia_campanhas_empresa" ON campanhas_produto
  FOR ALL USING (
    loja_id IS NULL
    AND empresa_id IS NOT NULL
    AND empresa_id IN (
      SELECT l.empresa_id FROM lojas l
      JOIN membros_loja ml ON ml.loja_id = l.id
      WHERE ml.perfil_id = auth.uid()
        AND ml.role IN ('dono', 'admin_f5')
        AND ml.ativo = TRUE
    )
  );

-- RLS: treinamentos
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_veem_treinamentos" ON treinamentos
  FOR SELECT USING (
    ativo = TRUE
    AND (
      (loja_id IS NOT NULL AND loja_id IN (SELECT lojas_do_usuario()))
      OR (empresa_id IS NOT NULL AND empresa_id IN (
        SELECT l.empresa_id FROM lojas l WHERE l.id IN (SELECT lojas_do_usuario())
      ))
    )
  );

CREATE POLICY "gerente_gerencia_treinamentos_loja" ON treinamentos
  FOR ALL USING (
    loja_id IS NOT NULL
    AND loja_id IN (SELECT lojas_do_usuario())
    AND role_na_loja(loja_id) IN ('gerente', 'dono', 'admin_f5')
  );

CREATE POLICY "dono_gerencia_treinamentos_empresa" ON treinamentos
  FOR ALL USING (
    loja_id IS NULL
    AND empresa_id IS NOT NULL
    AND empresa_id IN (
      SELECT l.empresa_id FROM lojas l
      JOIN membros_loja ml ON ml.loja_id = l.id
      WHERE ml.perfil_id = auth.uid()
        AND ml.role IN ('dono', 'admin_f5')
        AND ml.ativo = TRUE
    )
  );
