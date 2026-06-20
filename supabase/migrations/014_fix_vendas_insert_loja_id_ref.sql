-- Fase 6.4.2: corrige referência de loja_id no subquery da policy INSERT de vendas
-- Problema: migration 013 usou `ml.loja_id = loja_id` dentro de um subquery,
--           mas PostgreSQL resolveu `loja_id` como `ml.loja_id` (tautologia persiste).
-- Solução:  usar `vendas.loja_id` para referenciar explicitamente a coluna da
--           linha sendo inserida, forçando a referência correta via correlation.

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
          WHERE ml.loja_id = vendas.loja_id
            AND ml.ativo = true
        )
      )
    )
  );
