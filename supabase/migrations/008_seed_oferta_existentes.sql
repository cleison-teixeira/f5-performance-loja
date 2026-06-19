-- Seed default oferta template for products with qtd_mensagens = 4 that have no ordem 4
INSERT INTO mensagens_produto (produto_id, ordem, tipo, texto, dias_apos_venda)
SELECT
  p.id,
  4,
  'oferta',
  'Oi {cliente}! Aqui é {vendedora} da {loja}. Temos uma novidade especial de {produto} para você. Quer saber mais?',
  45
FROM produtos p
WHERE p.qtd_mensagens = 4
  AND NOT EXISTS (
    SELECT 1 FROM mensagens_produto mp
    WHERE mp.produto_id = p.id AND mp.ordem = 4
  );
