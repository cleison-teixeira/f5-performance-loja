-- Adiciona grupo_pedido_id para agrupar múltiplos produtos do mesmo pedido
-- Adiciona snapshot de recorrência/ciclo/mensagens por item (capturado no momento do cadastro)
ALTER TABLE lista_espera
  ADD COLUMN IF NOT EXISTS grupo_pedido_id UUID,
  ADD COLUMN IF NOT EXISTS recorrente BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ciclo_recompra_dias INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS qtd_mensagens INTEGER NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_lista_espera_grupo_pedido
  ON lista_espera(grupo_pedido_id)
  WHERE grupo_pedido_id IS NOT NULL;
