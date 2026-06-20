-- Fase 6.2: hardening de comissao_venda
-- Remove duplicata conhecida (venda fe324ca1, cv duplicado 7279be5c)
-- e adiciona constraint única venda_id → no máximo 1 comissão por venda.

DELETE FROM comissao_venda
WHERE id = '7279be5c-e1df-45ca-83eb-6ff850ff3345';

ALTER TABLE comissao_venda
  ADD CONSTRAINT comissao_venda_venda_id_unique UNIQUE (venda_id);
