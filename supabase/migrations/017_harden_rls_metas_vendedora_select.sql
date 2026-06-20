-- Fase 6.4.5: adiciona SELECT de metas_vendedora para vendedora
-- Problema: policy existente (gerente_gerencia_metas ALL) restringe qualquer
--           acesso de vendedora, mesmo leitura da própria meta.
-- Solução:  adicionar policy SELECT para vendedora ler apenas a própria meta.
--           Dono/Gerente/Admin continuam operando via policy ALL existente.
-- Nota:     dashboard/page.tsx:213 já usava supabase (RLS client) para vendedora
--           com .eq('vendedora_id', user.id) — retornava vazio sem esta policy.

CREATE POLICY "vendedora_le_meta_propria" ON metas_vendedora
  FOR SELECT USING (
    metas_vendedora.loja_id IN (SELECT lojas_do_usuario())
    AND metas_vendedora.vendedora_id = auth.uid()
  );
