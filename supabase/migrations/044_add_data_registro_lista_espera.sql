-- Adiciona data_registro (DATE editável) à lista_espera
-- Contexto: criado_em é TIMESTAMPTZ auto-gerenciado pelo banco; para que a loja
-- possa registrar e corrigir a data real do pedido, precisamos de uma coluna separada.
ALTER TABLE lista_espera
  ADD COLUMN IF NOT EXISTS data_registro DATE DEFAULT CURRENT_DATE;

-- Backfill: preservar a data original de cada registro existente
UPDATE lista_espera
  SET data_registro = (criado_em AT TIME ZONE 'America/Sao_Paulo')::DATE
  WHERE data_registro IS NULL;

CREATE INDEX IF NOT EXISTS idx_lista_espera_data_registro
  ON lista_espera (loja_id, data_registro DESC);
