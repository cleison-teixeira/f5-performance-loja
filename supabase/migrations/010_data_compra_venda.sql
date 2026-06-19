-- Adiciona data_compra à tabela vendas para suporte a datas retroativas de compra
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_compra DATE NOT NULL DEFAULT CURRENT_DATE;
