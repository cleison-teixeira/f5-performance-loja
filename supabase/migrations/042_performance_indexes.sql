-- Fase Performance 10k: indexes críticos de frequência alta
-- Diagnóstico: tabelas com > 30% seq scans e ausência de indexes compostos

-- 1. itens_venda: zero index em venda_id (40k seq scans)
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id
  ON itens_venda(venda_id);

-- 2. produtos: sem index em loja_id (13k seq scans)
--    Composto (loja_id, ativo) cobre queries só por loja_id via prefix scan
CREATE INDEX IF NOT EXISTS idx_produtos_loja_ativo
  ON produtos(loja_id, ativo);

-- 3. recompras: sem nenhum index funcional além do pkey (10% idx usage)
--    Composto cobre queries só por loja_id via prefix scan
CREATE INDEX IF NOT EXISTS idx_recompras_loja_criado_em
  ON recompras(loja_id, criado_em DESC);

-- 4. avisos: index isolado em status não ajuda queries com loja_id
--    Composto 3 colunas cobre (loja_id), (loja_id, status) e (loja_id, status, data_aviso)
CREATE INDEX IF NOT EXISTS idx_avisos_loja_status_data
  ON avisos(loja_id, status, data_aviso);

-- 5. vendas: index composto por loja + criado_em (dashboard, comissões)
CREATE INDEX IF NOT EXISTS idx_vendas_loja_criado_em
  ON vendas(loja_id, criado_em DESC);

-- 6. vendas: index composto por loja + data_compra (relatórios, metas, extrato)
CREATE INDEX IF NOT EXISTS idx_vendas_loja_data_compra
  ON vendas(loja_id, data_compra DESC);

-- comissao_venda: não possui coluna loja_id; já tem unique index em venda_id — sem novo index necessário

-- Atualiza estatísticas das tabelas afetadas
ANALYZE itens_venda;
ANALYZE produtos;
ANALYZE recompras;
ANALYZE avisos;
ANALYZE vendas;
ANALYZE comissao_venda;
-- comissao_venda incluída no ANALYZE pois participa de JOINs frequentes com vendas
