-- Add venda_id to link waitlist items to their converted sales
ALTER TABLE lista_espera ADD COLUMN venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL;
