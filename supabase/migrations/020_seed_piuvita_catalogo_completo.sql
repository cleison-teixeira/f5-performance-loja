-- Fase 8.6E — Seed Catálogo Completo PiùVita · Recway
-- loja_id: b1000000-0000-0000-0000-000000000001 (Cia Cidade Azul Angeloni)
-- Coletado em: 2026-06-21 · Fonte: ngpiuvita.com.br (auditoria 8.6D)
--
-- NÃO EXECUTAR sem aprovação do Cleison.
-- Script idempotente: pode ser re-executado sem duplicar dados.
--
-- Base futura para:
--   - Biblioteca de Produtos Parceiros PiùVita
--   - Importação de produtos para lojas parceiras
--   - Treinamentos de fornecedores na Academia Recway
--   - Mensagens de recompra prontas por linha de produto
--   - Futuro pedido B2B para parceiros dentro do Recway
--
-- Escopo desta migration:
--   - 19 produtos PiùVita faltantes (Formulados + Isolados + Creatinas)
--   - 57 mensagens (3 por produto)
--   - Normalização do Piùfort Antiox pré-existente

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRODUTOS — 19 novos (foto_url = null: site retornou empty.png / imagens
--    a confirmar e hospedar no Supabase Storage antes do deploy da demo)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Grupo A · Formulados C/30 (ciclo 30 dias | msg3: 28 dias — 2 dias antes) ─

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu NAC Pro 200mg Sachê C/30', 85.40, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu NAC Pro 200mg Sachê C/30')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Energy 2 C/30', 83.30, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Energy 2 C/30')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Cuore C/30', 95.20, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Cuore C/30')
);

-- ── Grupo B · Formulados C/60 (ciclo 60 dias | msg3: 58 dias — 2 dias antes) ─

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Brain C/60', 201.50, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Brain C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Zen C/60', 107.10, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Zen C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Multi Mulher C/60', 75.70, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Multi Mulher C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Multi AZ C/60', 83.30, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Multi AZ C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu MAG + Magnésio C/60', 101.10, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu MAG + Magnésio C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Energy 1 C/60', 124.90, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Energy 1 C/60')
);

-- ── Grupo C · Isolados C/60 (ciclo 60 dias | msg3: 58 dias — 2 dias antes) ──

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Cúrcuma C/60', 70.70, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Cúrcuma C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Ácido Fólico C/60', 56.40, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Ácido Fólico C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'B12 + Metilfolato C/60', 65.20, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('B12 + Metilfolato C/60')
);

-- ── Grupo D · Creatinas (msg3: 28 dias — decisão de antecipar 2 dias do
--    ciclo estimado de 30 dias, consistente com demais produtos C/30) ─────────

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Uva 360g', 89.80, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Uva 360g')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Uva 180g', 74.80, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Uva 180g')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Uva 150g', 84.00, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Uva 150g')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Natural 360g', 89.80, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Natural 360g')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Natural 150g', 84.00, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Natural 150g')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Maçã Verde 360g', 89.80, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Maçã Verde 360g')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Creatina Efervescente Maçã Verde 180g', 74.80, true, true, null, 3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Creatina Efervescente Maçã Verde 180g')
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. MENSAGENS — 57 mensagens (3 por produto)
--    Padrão: ON CONFLICT (produto_id, ordem) DO NOTHING — idempotente.
--    Nenhuma mensagem faz promessa terapêutica, diagnóstico ou alegação de cura.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- Grupo A · Formulados C/30
-- Template: Formulados gerais | dias: 2 / 14 / 28
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Piu NAC Pro 200mg Sachê C/30 ─────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu NAC Pro 200mg Sachê C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu NAC Pro 200mg Sachê C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu NAC Pro 200mg Sachê C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu Energy 2 C/30 ────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Energy 2 C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Energy 2 C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Energy 2 C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu Cuore C/30 ───────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Cuore C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Cuore C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Cuore C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Grupo B · Formulados C/60
-- Template: Formulados gerais | dias: 2 / 30 / 58
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Piu Brain C/60 ───────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Brain C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Brain C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Brain C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu Zen C/60 ─────────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Zen C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Zen C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Zen C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu Multi Mulher C/60 ────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Multi Mulher C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Multi Mulher C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Multi Mulher C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu Multi AZ C/60 ────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Multi AZ C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Multi AZ C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Multi AZ C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu MAG + Magnésio C/60 ──────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu MAG + Magnésio C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu MAG + Magnésio C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu MAG + Magnésio C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Piu Energy 1 C/60 ────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato, vou te acompanhar por aqui se precisar de ajuda.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Energy 1 C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Qualquer dúvida sobre reposição ou continuidade, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Energy 1 C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu deixe uma nova unidade separada para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Energy 1 C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Grupo C · Isolados C/60
-- Template: Isolados C/60 | dias: 2 / 30 / 58
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Cúrcuma C/60 ─────────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato para quando precisar repor ou tirar dúvidas.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Cúrcuma C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está sua rotina com o {produto_nome}. Se precisar de ajuda para organizar a reposição, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Cúrcuma C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar próximo do fim. Quer que eu confira disponibilidade e deixe separado para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Cúrcuma C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Ácido Fólico C/60 ────────────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato para quando precisar repor ou tirar dúvidas.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Ácido Fólico C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está sua rotina com o {produto_nome}. Se precisar de ajuda para organizar a reposição, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Ácido Fólico C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar próximo do fim. Quer que eu confira disponibilidade e deixe separado para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Ácido Fólico C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── B12 + Metilfolato C/60 ───────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Salve meu contato para quando precisar repor ou tirar dúvidas.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('B12 + Metilfolato C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está sua rotina com o {produto_nome}. Se precisar de ajuda para organizar a reposição, me chama por aqui.',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('B12 + Metilfolato C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar próximo do fim. Quer que eu confira disponibilidade e deixe separado para você?',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('B12 + Metilfolato C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Grupo D · Creatinas
-- Template: Creatinas | dias: 2 / 14 / 28
-- (antecipação de 2 dias do ciclo de ~30 dias — consistente com C/30 gerais)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Creatina Efervescente Uva 360g ───────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Creatina Efervescente Uva 180g ───────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 180g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 180g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 180g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Creatina Efervescente Uva 150g ───────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 150g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 150g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Uva 150g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Creatina Efervescente Natural 360g ───────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Natural 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Natural 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Natural 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Creatina Efervescente Natural 150g ───────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Natural 150g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Natural 150g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Natural 150g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Creatina Efervescente Maçã Verde 360g ────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Maçã Verde 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Maçã Verde 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Maçã Verde 360g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Creatina Efervescente Maçã Verde 180g ────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá {cliente_nome}, aqui é {vendedora_nome} da {loja_nome}. Obrigado pela sua compra do {produto_nome}. Qualquer dúvida sobre reposição, pode me chamar por aqui.',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Maçã Verde 180g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi {cliente_nome}, passando para saber como está indo com o {produto_nome}. Se quiser, posso te avisar quando estiver perto da hora de repor.',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Maçã Verde 180g')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi {cliente_nome}, seu {produto_nome} pode estar chegando perto do fim. Quer que eu confira disponibilidade para você repor?',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Creatina Efervescente Maçã Verde 180g')
ON CONFLICT (produto_id, ordem) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NORMALIZAÇÃO PIÙFORT ANTIOX
--    Produto pré-existente com mensagens no formato de variáveis antigas e
--    msg3 com dias_apos_venda = 25 (correto: 30).
--    Esta seção corrige apenas o produto Piùfort Antiox da loja alvo.
-- ─────────────────────────────────────────────────────────────────────────────

-- Garantir campos corretos no produto
UPDATE produtos
SET
  preco_sugerido       = 149.90,
  qtd_mensagens        = 3,
  recorrente           = true,
  comissionavel_recompra = true
WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(nome) = lower('Piùfort Antiox');

-- Normalizar msg1: dias e texto com variáveis atuais
UPDATE mensagens_produto
SET
  dias_apos_venda = 2,
  texto = 'Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌'
WHERE produto_id = (
  SELECT id FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Antiox')
  LIMIT 1
)
AND ordem = 1
AND tipo = 'agradecimento';

-- Normalizar msg2: dias e texto com variáveis atuais
UPDATE mensagens_produto
SET
  dias_apos_venda = 14,
  texto = 'Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿'
WHERE produto_id = (
  SELECT id FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Antiox')
  LIMIT 1
)
AND ordem = 2
AND tipo = 'relacionamento';

-- Normalizar msg3: corrigir dias de 25 para 30 e texto com variáveis atuais
UPDATE mensagens_produto
SET
  dias_apos_venda = 30,
  texto = 'Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊'
WHERE produto_id = (
  SELECT id FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Antiox')
  LIMIT 1
)
AND ordem = 3
AND tipo = 'recompra';


COMMIT;
