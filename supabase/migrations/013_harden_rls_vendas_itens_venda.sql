-- Fase 6.4.1: hardening RLS de vendas e itens_venda
-- Problema: SELECT de vendas e itens_venda permitia qualquer membro da loja
--           (inclusive vendedora) ver todas as vendas via API direta.
-- Solução:  Dono/Gerente veem loja inteira; Vendedora vê só as próprias vendas.
-- Bônus:   Corrige bug no INSERT de vendas (ml.loja_id = ml.loja_id → loja_id).

-- ── vendas SELECT ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "membros_veem_vendas" ON vendas;

CREATE POLICY "membros_veem_vendas" ON vendas
  FOR SELECT USING (
    loja_id IN (SELECT lojas_do_usuario())
    AND (
      role_na_loja(loja_id) IN ('dono', 'gerente', 'admin_f5')
      OR vendedora_id = auth.uid()
    )
  );

-- ── itens_venda SELECT ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "itens_venda_select" ON itens_venda;

CREATE POLICY "itens_venda_select" ON itens_venda
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM vendas v
      JOIN membros_loja ml ON ml.loja_id = v.loja_id
      WHERE v.id = itens_venda.venda_id
        AND ml.perfil_id = auth.uid()
        AND ml.ativo = true
        AND (
          ml.role IN ('dono', 'gerente', 'admin_f5')
          OR v.vendedora_id = auth.uid()
        )
    )
  );

-- ── vendas INSERT — corrige auto-comparação ml.loja_id = ml.loja_id ─────────
-- Bug original: o subselect usava ml.loja_id = ml.loja_id (sempre verdadeiro),
-- permitindo dono/gerente inserir venda com vendedora_id de qualquer loja.
-- Correção: ml.loja_id = loja_id (referencia a coluna da venda sendo inserida).

DROP POLICY IF EXISTS "membros_inserem_venda" ON vendas;

CREATE POLICY "membros_inserem_venda" ON vendas
  FOR INSERT WITH CHECK (
    loja_id IN (SELECT lojas_do_usuario())
    AND (
      (
        role_na_loja(loja_id) = 'vendedora'
        AND vendedora_id = auth.uid()
      )
      OR (
        role_na_loja(loja_id) = ANY (ARRAY['gerente', 'dono', 'admin_f5'])
        AND vendedora_id IN (
          SELECT ml.perfil_id
          FROM membros_loja ml
          WHERE ml.loja_id = loja_id
            AND ml.ativo = true
        )
      )
    )
  );
