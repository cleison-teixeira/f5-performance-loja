-- Drop and recreate vendas_origem_check to support 'lista_espera' as a valid sale origin
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_origem_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_origem_check CHECK (origem IN ('venda_manual', 'recompra', 'oferta', 'lista_espera'));
