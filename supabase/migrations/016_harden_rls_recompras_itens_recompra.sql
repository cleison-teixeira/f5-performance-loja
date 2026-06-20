-- Fase 6.4.3: hardening RLS de recompras e itens_recompra
-- Problema: policies ALL amplas por loja permitiam vendedora ver/inserir/atualizar
--           recompras alheias via API direta.
-- Solução:  Dono/Gerente/admin_f5 veem e operam loja inteira;
--           Vendedora opera somente as próprias.
--
-- Policies anteriores removidas:
--   recompras:       "recompras_loja_access"     ALL — loja_id IN lojas_do_usuario()
--   itens_recompra:  "itens_recompra_via_recompra" ALL — recompra_id IN (SELECT r.id …)
--
-- Nota: confirmarRecompra usa sessão RLS do usuário logado; dono/gerente podem inserir
--       recompra com vendedora_id de qualquer membro ativo da própria loja.

-- ── recompras ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "recompras_loja_access" ON recompras;

-- SELECT: dono/gerente veem loja toda; vendedora vê apenas as próprias
CREATE POLICY "recompras_select" ON recompras
  FOR SELECT USING (
    recompras.loja_id IN (SELECT lojas_do_usuario())
    AND (
      role_na_loja(recompras.loja_id) IN ('dono', 'gerente', 'admin_f5')
      OR recompras.vendedora_id = auth.uid()
    )
  );

-- INSERT: vendedora insere apenas para si; dono/gerente inserem para qualquer
--         membro ativo da própria loja (caso de gerente confirmar aviso alheio)
CREATE POLICY "recompras_insert" ON recompras
  FOR INSERT WITH CHECK (
    recompras.loja_id IN (SELECT lojas_do_usuario())
    AND (
      (
        role_na_loja(recompras.loja_id) = 'vendedora'
        AND recompras.vendedora_id = auth.uid()
      )
      OR (
        role_na_loja(recompras.loja_id) = ANY (ARRAY['dono', 'gerente', 'admin_f5'])
        AND recompras.vendedora_id IN (
          SELECT ml.perfil_id
          FROM membros_loja ml
          WHERE ml.loja_id = recompras.loja_id
            AND ml.ativo = true
        )
      )
    )
  );

-- UPDATE: mesma restrição de visibilidade do SELECT
CREATE POLICY "recompras_update" ON recompras
  FOR UPDATE USING (
    recompras.loja_id IN (SELECT lojas_do_usuario())
    AND (
      role_na_loja(recompras.loja_id) IN ('dono', 'gerente', 'admin_f5')
      OR recompras.vendedora_id = auth.uid()
    )
  );

-- ── itens_recompra ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "itens_recompra_via_recompra" ON itens_recompra;

-- SELECT: visibilidade herda da recompra pai
CREATE POLICY "itens_recompra_select" ON itens_recompra
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recompras r
      WHERE r.id = itens_recompra.recompra_id
        AND r.loja_id IN (SELECT lojas_do_usuario())
        AND (
          role_na_loja(r.loja_id) IN ('dono', 'gerente', 'admin_f5')
          OR r.vendedora_id = auth.uid()
        )
    )
  );

-- INSERT: permitido apenas se a recompra pai for acessível ao usuário
CREATE POLICY "itens_recompra_insert" ON itens_recompra
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recompras r
      WHERE r.id = itens_recompra.recompra_id
        AND r.loja_id IN (SELECT lojas_do_usuario())
        AND (
          role_na_loja(r.loja_id) IN ('dono', 'gerente', 'admin_f5')
          OR r.vendedora_id = auth.uid()
        )
    )
  );
