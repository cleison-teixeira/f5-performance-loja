-- Fase 6.4.2: hardening RLS SELECT de avisos
-- Problema: SELECT permitia qualquer membro da loja (inclusive vendedora) ver
--           todos os avisos da loja via API direta.
-- Solução:  Dono/Gerente/admin_f5 veem loja inteira; Vendedora vê só os próprios.
-- Nota:     Políticas UPDATE não alteradas — já estão corretas (vendedora atualiza
--           apenas aviso próprio; gerente/dono atualizam a loja toda).

DROP POLICY IF EXISTS "membros_veem_avisos" ON avisos;

CREATE POLICY "membros_veem_avisos" ON avisos
  FOR SELECT USING (
    avisos.loja_id IN (SELECT lojas_do_usuario())
    AND (
      role_na_loja(avisos.loja_id) IN ('dono', 'gerente', 'admin_f5')
      OR avisos.vendedora_id = auth.uid()
    )
  );
