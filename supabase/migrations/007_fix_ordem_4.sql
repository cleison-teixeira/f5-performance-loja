-- Allow ordem 4 (oferta) in mensagens_produto
ALTER TABLE mensagens_produto
  DROP CONSTRAINT mensagens_produto_ordem_check;

ALTER TABLE mensagens_produto
  ADD CONSTRAINT mensagens_produto_ordem_check CHECK (ordem IN (1, 2, 3, 4));
