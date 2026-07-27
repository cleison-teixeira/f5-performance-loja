-- Limpeza do seed de teste: Rede Verde Essencial Teste
-- Todos os registros seed têm id::text LIKE 'f5feed00-%'
-- Execute este script no projeto de staging (ynrffhacpjzohrhkpuiq) via Supabase SQL Editor.
-- NUNCA executar em produção.

-- Ordem reversa das dependências (FK)
DELETE FROM public.campanhas_snapshot_regra       WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_apuracao             WHERE campanha_id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_recalculo_log        WHERE campanha_id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_materiais            WHERE campanha_id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_premiacao_faixas
  WHERE premiacao_id IN (
    SELECT id FROM public.campanhas_premiacao WHERE id::text LIKE 'f5feed00%'
  );
DELETE FROM public.campanhas_premiacao            WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_venda_participantes  WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_venda_itens          WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.itens_venda                    WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.vendas                         WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.campanhas_venda                WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.recompras                      WHERE loja_id::text LIKE 'f5feed00%';
DELETE FROM public.avisos                         WHERE loja_id::text LIKE 'f5feed00%';
DELETE FROM public.clientes                       WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.produtos                       WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.membros_loja                   WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.lojas                          WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.perfis                         WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.grupos_rede                    WHERE id::text LIKE 'f5feed00%';
DELETE FROM public.empresas                       WHERE id::text LIKE 'f5feed00%';
DELETE FROM auth.users                            WHERE id::text LIKE 'f5feed00%';
