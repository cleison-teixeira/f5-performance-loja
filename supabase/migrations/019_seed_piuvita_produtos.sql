-- Fase 8.6B — Seed PiùVita · Cia Cidade Azul Angeloni
-- loja_id: b1000000-0000-0000-0000-000000000001
-- Coletado em: 2026-06-20 · Fonte: ngpiuvita.com.br
--
-- NÃO EXECUTAR sem aprovação do Cleison.
-- Script idempotente: pode ser re-executado sem duplicar dados.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRODUTOS
-- ─────────────────────────────────────────────────────────────────────────────

-- Grupo A · Linha Piùfort (ciclo 30 dias, imagens confirmadas)

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piùfort Antiox', 149.90, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_antiox_177_1_64b6371e485d0a1131e39130941eb9b4.jpg',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Antiox')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piùfort Slim', 109.90, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_slim_185_1_b4595e7ff997dbf85c55d71f925e1bc1.jpg',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Slim')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piùfort Woman', 99.90, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_woman_183_1_64142bf4bc769ac2bc1b0459c0a21a94.jpg',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Woman')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piùfort Imune', 99.90, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_imune_181_1_f7c354d5edaa20f73c9b6e418fecdcf6.jpg',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Imune')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piùfort Gestan', 197.00, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_gestan_179_1_1fa6d7bc258379b312651101db101f6e.jpg',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piùfort Gestan')
);

-- Grupo B · Piu AminoMix Sachê C/30 (ciclo 30 dias, imagem confirmada)

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu AminoMix Sachê C/30', 95.90, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piu_aminomix_sache_c_30_123_1_c457b99753b198020103b929f2347e4d.png',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu AminoMix Sachê C/30')
);

-- Grupo C · Piu Max Colágeno C/30 (ciclo 30 dias, imagem confirmada)

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Max Colágeno C/30', 101.10, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piu_max_colageno_c_30_137_1_608279a27c4121f4eeb8d2ed03c0c5bb.png',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Max Colágeno C/30')
);

-- Grupo D · Piu Cuore D3 C/30 (ciclo 30 dias, imagem confirmada)

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Piu Cuore D3 C/30', 106.60, true, true,
  'https://images.tcdn.com.br/img/img_prod/1357905/90_piu_cuore_d3_c_30_127_1_346cb0d18380ddf93869446314c98c82.png',
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Piu Cuore D3 C/30')
);

-- Grupo E · Isolados (ciclo 60 dias, sem imagem disponível no site)

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Melatonina C/60', 48.80, true, true,
  null,
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Melatonina C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Coenzima Q10 C/60', 100.50, true, true,
  null,
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Coenzima Q10 C/60')
);

INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, foto_url, qtd_mensagens, comissionavel_recompra)
SELECT 'b1000000-0000-0000-0000-000000000001', 'Complexo B C/60', 48.80, true, true,
  null,
  3, true
WHERE NOT EXISTS (
  SELECT 1 FROM produtos
  WHERE loja_id = 'b1000000-0000-0000-0000-000000000001'
    AND lower(nome) = lower('Complexo B C/60')
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. MENSAGENS POR PRODUTO
-- ─────────────────────────────────────────────────────────────────────────────
-- Padrão: ON CONFLICT (produto_id, ordem) DO NOTHING — idempotente.
-- Nenhuma mensagem faz promessa terapêutica, diagnóstico ou alegação de cura.

-- ── Grupo A · Piùfort Antiox ─────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Antiox')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Antiox')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Antiox')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo A · Piùfort Slim ───────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Slim')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Slim')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Slim')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo A · Piùfort Woman ──────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Woman')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Woman')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Woman')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo A · Piùfort Imune ──────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Imune')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Imune')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Imune')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo A · Piùfort Gestan ─────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Gestan')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Gestan')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piùfort Gestan')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo B · Piu AminoMix Sachê C/30 ───────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Oi, {cliente_nome}! 👋 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do Piu AminoMix!
Lembre-se: um sachê por dia para aproveitar melhor. 💪',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu AminoMix Sachê C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo certo?

Já na metade da caixinha do AminoMix! Como está indo?
Qualquer dúvida, pode chamar. 😊',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu AminoMix Sachê C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! 💪 Aqui é {vendedora_nome} da {loja_nome}.

Seus sachês do AminoMix devem estar acabando — quer garantir o próximo?

Me chame aqui ou passe na {loja_nome}! 🙌',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu AminoMix Sachê C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo C · Piu Max Colágeno C/30 ─────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do Piu Max Colágeno!
Lembre-se de tomar diariamente para manter a regularidade. 🌿',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Max Colágeno C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Você já está na metade do Piu Max Colágeno — está gostando?
Qualquer dúvida, pode me chamar! 💬',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Max Colágeno C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 🌿

Seu Piu Max Colágeno deve estar chegando no final!
Quer garantir o próximo? Me chame ou passe na loja. 😊',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Max Colágeno C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo D · Piu Cuore D3 C/30 ─────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do Piu Cuore D3!
É um produto de uso diário — uma cápsula por dia é o suficiente. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Cuore D3 C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já na metade do Piu Cuore D3 — como está sendo?
Fico à disposição se tiver alguma dúvida. 💬',
  14
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Cuore D3 C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 💊

Seu Piu Cuore D3 deve estar acabando em breve!
Quer garantir o próximo antes de interromper o uso? Me chame aqui. 😊',
  28
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Piu Cuore D3 C/30')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo E · Melatonina C/60 ────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Qualquer dúvida sobre o produto, pode me chamar. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Melatonina C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz um mês desde que você levou o {produto_nome} — está gostando?
Se precisar de alguma coisa, estou por aqui. 🌿',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Melatonina C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 😊

Seu {produto_nome} deve estar quase no fim —
quer garantir o próximo antes de acabar? Me chame aqui ou passe na loja! 🙌',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Melatonina C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo E · Coenzima Q10 C/60 ─────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Qualquer dúvida sobre o produto, pode me chamar. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Coenzima Q10 C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz um mês desde que você levou o {produto_nome} — está gostando?
Se precisar de alguma coisa, estou por aqui. 🌿',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Coenzima Q10 C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 😊

Seu {produto_nome} deve estar quase no fim —
quer garantir o próximo antes de acabar? Me chame aqui ou passe na loja! 🙌',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Coenzima Q10 C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

-- ── Grupo E · Complexo B C/60 ────────────────────────────────────────────────

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'agradecimento', 1,
  'Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Qualquer dúvida sobre o produto, pode me chamar. 🙌',
  2
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Complexo B C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'relacionamento', 2,
  'Oi, {cliente_nome}! Tudo bem?

Já faz um mês desde que você levou o {produto_nome} — está gostando?
Se precisar de alguma coisa, estou por aqui. 🌿',
  30
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Complexo B C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;

INSERT INTO mensagens_produto (produto_id, tipo, ordem, texto, dias_apos_venda)
SELECT p.id, 'recompra', 3,
  'Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 😊

Seu {produto_nome} deve estar quase no fim —
quer garantir o próximo antes de acabar? Me chame aqui ou passe na loja! 🙌',
  58
FROM produtos p
WHERE p.loja_id = 'b1000000-0000-0000-0000-000000000001'
  AND lower(p.nome) = lower('Complexo B C/60')
ON CONFLICT (produto_id, ordem) DO NOTHING;


COMMIT;
