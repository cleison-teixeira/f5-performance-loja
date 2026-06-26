-- ============================================================
-- SEED DEMO: CIA CIDADE AZUL — 3 Lojas Isoladas
-- ============================================================
-- Tabelas: lojas (3), auth.users (6), auth.identities (6), perfis (6),
--   membros_loja (8), regras_comissao (4), produtos (24),
--   mensagens_produto (72), clientes (26), vendas (36),
--   itens_venda (36), avisos (36), recompras (5),
--   itens_recompra (5)
--
-- ✗ Nenhum DELETE   ✗ Nenhum UPDATE em dados existentes
-- Idempotente: INSERT … ON CONFLICT DO NOTHING
--
-- Usuários demo (senha: Demo@2024)
--   demo.dono@f5recompra.com.br    → dono (3 lojas)
--   demo.gerente@f5recompra.com.br → gerente (ANGELONI)
--   demo.ana@f5recompra.com.br     → vendedora (ANGELONI)
--   demo.carla@f5recompra.com.br   → vendedora (ANGELONI)
--   demo.debora@f5recompra.com.br  → vendedora (KOMPRÃO SJ)
--   demo.elaine@f5recompra.com.br  → vendedora (KOMPRÃO CENTRO)
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- 1. LOJAS DEMO
-- ════════════════════════════════════════════════════════════
INSERT INTO public.lojas (id, empresa_id, nome, cidade, ativa) VALUES
  ('b2000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'CIA CIDADE AZUL - ANGELONI', 'Florianópolis', true),
  ('b2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001',
   'CIA CIDADE AZUL - KOMPRÃO SÃO JOÃO', 'São José', true),
  ('b2000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000001',
   'CIA CIDADE AZUL - KOMPRÃO CENTRO', 'Florianópolis', true)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 2. AUTH USERS DEMO  (senha: Demo@2024)
-- ════════════════════════════════════════════════════════════
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change_confirm_status, email_change,
  created_at, updated_at, is_super_admin, is_sso_user
) VALUES
  ('d1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.dono@f5recompra.com.br',
   extensions.crypt('Demo@2024', extensions.gen_salt('bf', 10)),
   now(), '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', 0, '', now(), now(), false, false),
  ('d1000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.gerente@f5recompra.com.br',
   extensions.crypt('Demo@2024', extensions.gen_salt('bf', 10)),
   now(), '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', 0, '', now(), now(), false, false),
  ('d1000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.ana@f5recompra.com.br',
   extensions.crypt('Demo@2024', extensions.gen_salt('bf', 10)),
   now(), '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', 0, '', now(), now(), false, false),
  ('d1000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.carla@f5recompra.com.br',
   extensions.crypt('Demo@2024', extensions.gen_salt('bf', 10)),
   now(), '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', 0, '', now(), now(), false, false),
  ('d1000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.debora@f5recompra.com.br',
   extensions.crypt('Demo@2024', extensions.gen_salt('bf', 10)),
   now(), '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', 0, '', now(), now(), false, false),
  ('d1000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.elaine@f5recompra.com.br',
   extensions.crypt('Demo@2024', extensions.gen_salt('bf', 10)),
   now(), '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', 0, '', now(), now(), false, false)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 2b. AUTH IDENTITIES DEMO  (provider email — obrigatório para login)
-- ════════════════════════════════════════════════════════════
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  ('e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'demo.dono@f5recompra.com.br',
   '{"sub":"d1000000-0000-0000-0000-000000000001","email":"demo.dono@f5recompra.com.br","email_verified":true,"phone_verified":false}',
   'email', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'demo.gerente@f5recompra.com.br',
   '{"sub":"d1000000-0000-0000-0000-000000000002","email":"demo.gerente@f5recompra.com.br","email_verified":true,"phone_verified":false}',
   'email', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000003',
   'demo.ana@f5recompra.com.br',
   '{"sub":"d1000000-0000-0000-0000-000000000003","email":"demo.ana@f5recompra.com.br","email_verified":true,"phone_verified":false}',
   'email', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000004',
   'd1000000-0000-0000-0000-000000000004',
   'demo.carla@f5recompra.com.br',
   '{"sub":"d1000000-0000-0000-0000-000000000004","email":"demo.carla@f5recompra.com.br","email_verified":true,"phone_verified":false}',
   'email', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000005',
   'd1000000-0000-0000-0000-000000000005',
   'demo.debora@f5recompra.com.br',
   '{"sub":"d1000000-0000-0000-0000-000000000005","email":"demo.debora@f5recompra.com.br","email_verified":true,"phone_verified":false}',
   'email', now(), now(), now()),
  ('e1000000-0000-0000-0000-000000000006',
   'd1000000-0000-0000-0000-000000000006',
   'demo.elaine@f5recompra.com.br',
   '{"sub":"d1000000-0000-0000-0000-000000000006","email":"demo.elaine@f5recompra.com.br","email_verified":true,"phone_verified":false}',
   'email', now(), now(), now())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 3. PERFIS DEMO
-- ════════════════════════════════════════════════════════════
INSERT INTO public.perfis (id, nome, whatsapp) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Fábio Cardoso',     '48988000101'),
  ('d1000000-0000-0000-0000-000000000002', 'Patrícia Andrade',  '48988000102'),
  ('d1000000-0000-0000-0000-000000000003', 'Ana Beatriz Costa', '48988000103'),
  ('d1000000-0000-0000-0000-000000000004', 'Carla Menezes',     '48988000104'),
  ('d1000000-0000-0000-0000-000000000005', 'Débora Santos',     '48988000105'),
  ('d1000000-0000-0000-0000-000000000006', 'Elaine Ferreira',   '48988000106')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, whatsapp = EXCLUDED.whatsapp;

-- ════════════════════════════════════════════════════════════
-- 4. MEMBROS_LOJA DEMO
-- ════════════════════════════════════════════════════════════
INSERT INTO public.membros_loja (id, loja_id, perfil_id, role, ativo) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'dono',      true),
  ('aa000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'dono',      true),
  ('aa000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'dono',      true),
  ('aa000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'gerente',   true),
  ('aa000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 'vendedora', true),
  ('aa000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'vendedora', true),
  ('aa000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005', 'vendedora', true),
  ('aa000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000006', 'vendedora', true)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 5. REGRAS DE COMISSÃO (8% para todas as vendedoras demo)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.regras_comissao (id, loja_id, vendedora_id, percentual, ativo) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 8, true),
  ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 8, true),
  ('b3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005', 8, true),
  ('b3000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000006', 8, true)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 6. PRODUTOS — 8 por loja (24 total, recorrente=true)
-- ════════════════════════════════════════════════════════════

-- ANGELONI
INSERT INTO public.produtos (id, loja_id, nome, preco_sugerido, ativo, qtd_mensagens, recorrente, comissionavel_recompra) VALUES
  ('ea000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Creme Premium Antissinais',   89.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'Sérum Vitamina C 30ml',        67.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'Base Líquida HD',              54.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001', 'Paleta de Sombras Glamour',   129.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', 'Batom Matte Duradouro',        34.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000001', 'Máscara de Cílios Volume',     44.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000001', 'Hidratante Facial FPS 30',     79.90, true, 3, true, true),
  ('ea000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000001', 'Esfoliante Corporal Rose',     59.90, true, 3, true, true)
ON CONFLICT (id) DO NOTHING;

-- KOMPRÃO SÃO JOÃO
INSERT INTO public.produtos (id, loja_id, nome, preco_sugerido, ativo, qtd_mensagens, recorrente, comissionavel_recompra) VALUES
  ('eb000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002', 'Creme Premium Antissinais',   89.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'Sérum Vitamina C 30ml',        67.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 'Base Líquida HD',              54.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', 'Paleta de Sombras Glamour',   129.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000002', 'Batom Matte Duradouro',        34.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000002', 'Máscara de Cílios Volume',     44.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000002', 'Hidratante Facial FPS 30',     79.90, true, 3, true, true),
  ('eb000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000002', 'Esfoliante Corporal Rose',     59.90, true, 3, true, true)
ON CONFLICT (id) DO NOTHING;

-- KOMPRÃO CENTRO
INSERT INTO public.produtos (id, loja_id, nome, preco_sugerido, ativo, qtd_mensagens, recorrente, comissionavel_recompra) VALUES
  ('ec000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000003', 'Creme Premium Antissinais',   89.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000003', 'Sérum Vitamina C 30ml',        67.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', 'Base Líquida HD',              54.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000003', 'Paleta de Sombras Glamour',   129.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000003', 'Batom Matte Duradouro',        34.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000003', 'Máscara de Cílios Volume',     44.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000003', 'Hidratante Facial FPS 30',     79.90, true, 3, true, true),
  ('ec000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000003', 'Esfoliante Corporal Rose',     59.90, true, 3, true, true)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 7. MENSAGENS_PRODUTO — ANGELONI (3 × 8 = 24)
--    Ciclos: Creme/Hidratante=60d, Sérum=45d, Base/Batom/Máscara=90d
--            Paleta=180d, Esfoliante=30d
-- ════════════════════════════════════════════════════════════
INSERT INTO public.mensagens_produto (id, produto_id, tipo, ordem, dias_apos_venda, texto) VALUES
  -- Creme (ea001) dias 2,30,58
  ('fa010000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000001','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar o Creme Premium Antissinais! Qualquer dúvida, me chama. 😊'),
  ('fa010000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000001','relacionamento',2,30,
   'Oi {cliente_nome}! Como está a pele com o Creme Premium Antissinais? Já dá pra ver diferença? 🌟 Estou por aqui se precisar!'),
  ('fa010000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000001','recompra',3,58,
   'Oi {cliente_nome}! Seu Creme Premium Antissinais já deve estar quase no fim. 🧴 Que tal garantir o próximo antes que acabe? Posso reservar pra você!'),
  -- Sérum (ea002) dias 2,22,43
  ('fa020000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000002','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Fico feliz que você escolheu o Sérum Vitamina C! ✨ Qualquer dúvida me chama.'),
  ('fa020000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000002','relacionamento',2,22,
   'Oi {cliente_nome}! Já faz 3 semanas com o Sérum Vitamina C. Como está vendo a diferença na pele? 🍋'),
  ('fa020000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000002','recompra',3,43,
   'Oi {cliente_nome}! O Sérum Vitamina C costuma durar 45 dias com uso diário. Quer garantir o próximo? Posso reservar na {loja_nome}! 🍋'),
  -- Base (ea003) dias 2,45,88
  ('fa030000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000003','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar a Base Líquida HD! 💄 Qualquer dúvida, me chama!'),
  ('fa030000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000003','relacionamento',2,45,
   'Oi {cliente_nome}! Já faz um mês e meio com a Base Líquida HD. Você está gostando? 💄'),
  ('fa030000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000003','recompra',3,88,
   'Oi {cliente_nome}! Sua Base Líquida HD deve estar chegando no fim. 💄 Posso separar outra pra você na {loja_nome}?'),
  -- Paleta (ea004) dias 2,90,178
  ('fa040000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000004','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome}. Que escolha incrível a Paleta de Sombras Glamour! 🎨 Qualquer dúvida, me chama.'),
  ('fa040000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000004','relacionamento',2,90,
   'Oi {cliente_nome}! Já faz 3 meses com a Paleta Glamour. Ainda usando bastante? Temos novidades chegando na {loja_nome}! 🎨'),
  ('fa040000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000004','recompra',3,178,
   'Oi {cliente_nome}! Sua Paleta de Sombras Glamour já deve estar bem usada. 😍 Quer ver as novidades que chegaram na {loja_nome}?'),
  -- Batom (ea005) dias 2,45,88
  ('fa050000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000005','agradecimento',1,2,
   'Olá {cliente_nome}! Obrigada por levar o Batom Matte Duradouro! 💋 Vai arrasar! Me chama se precisar.'),
  ('fa050000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000005','relacionamento',2,45,
   'Oi {cliente_nome}! Você está amando o Batom Matte Duradouro? 💋 Tenho cores novas chegando na {loja_nome}!'),
  ('fa050000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000005','recompra',3,88,
   'Oi {cliente_nome}! Seu Batom Matte Duradouro vai acabar em breve. 💄 Posso reservar o mesmo ou quer experimentar uma cor nova?'),
  -- Máscara (ea006) dias 2,45,88
  ('fa060000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000006','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome}. Você vai amar a Máscara de Cílios Volume! 👁️ Qualquer dúvida, me chama!'),
  ('fa060000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000006','relacionamento',2,45,
   'Oi {cliente_nome}! Como está a Máscara de Cílios Volume? O efeito está incrível, né? 👁️✨'),
  ('fa060000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000006','recompra',3,88,
   'Oi {cliente_nome}! Sua Máscara de Cílios Volume vai acabar em breve. Posso reservar outra pra você! 👁️'),
  -- Hidratante (ea007) dias 2,30,58
  ('fa070000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000007','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar o Hidratante Facial FPS 30! ☀️ Qualquer dúvida, me chama!'),
  ('fa070000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000007','relacionamento',2,30,
   'Oi {cliente_nome}! Um mês usando o Hidratante Facial FPS 30. Está sentindo a pele mais protegida? ☀️'),
  ('fa070000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000007','recompra',3,58,
   'Oi {cliente_nome}! O Hidratante Facial FPS 30 já deve estar no final. ☀️ Posso reservar um novo pra você?'),
  -- Esfoliante (ea008) dias 2,15,28
  ('fa080000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000008','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome}. Que ótima escolha o Esfoliante Corporal Rose! 🌹 Vai adorar o resultado!'),
  ('fa080000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000008','relacionamento',2,15,
   'Oi {cliente_nome}! Já 15 dias com o Esfoliante Corporal Rose. A pele está mais suave? 🌹'),
  ('fa080000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000008','recompra',3,28,
   'Oi {cliente_nome}! O Esfoliante Corporal Rose vai acabar em breve! Posso reservar um novo na {loja_nome}? 🌹')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 8. MENSAGENS_PRODUTO — KOMPRÃO SÃO JOÃO (3 × 8 = 24)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.mensagens_produto (id, produto_id, tipo, ordem, dias_apos_venda, texto) VALUES
  ('fb010000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000001','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar o Creme Premium Antissinais! 😊'),
  ('fb010000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000001','relacionamento',2,30,
   'Oi {cliente_nome}! Como está a pele com o Creme Premium Antissinais? Já dá pra ver diferença? 🌟'),
  ('fb010000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000001','recompra',3,58,
   'Oi {cliente_nome}! Seu Creme Premium Antissinais já deve estar quase no fim. 🧴 Posso reservar pra você?'),
  ('fb020000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000002','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Fico feliz que você escolheu o Sérum Vitamina C! ✨'),
  ('fb020000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000002','relacionamento',2,22,
   'Oi {cliente_nome}! Já faz 3 semanas com o Sérum Vitamina C. Como está vendo a diferença? 🍋'),
  ('fb020000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000002','recompra',3,43,
   'Oi {cliente_nome}! O Sérum Vitamina C costuma durar 45 dias. Quer garantir o próximo na {loja_nome}? 🍋'),
  ('fb030000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000003','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar a Base Líquida HD! 💄'),
  ('fb030000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000003','relacionamento',2,45,
   'Oi {cliente_nome}! Já faz um mês e meio com a Base Líquida HD. Como você está gostando? 💄'),
  ('fb030000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000003','recompra',3,88,
   'Oi {cliente_nome}! Sua Base Líquida HD deve estar chegando no fim. Posso separar outra? 💄'),
  ('fb040000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000004','agradecimento',1,2,
   'Olá {cliente_nome}! Que escolha incrível a Paleta de Sombras Glamour! 🎨 Qualquer dúvida, me chama.'),
  ('fb040000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000004','relacionamento',2,90,
   'Oi {cliente_nome}! Já faz 3 meses com a Paleta Glamour. Ainda usando bastante? 🎨'),
  ('fb040000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000004','recompra',3,178,
   'Oi {cliente_nome}! Que tal dar uma olhada nas novidades da {loja_nome}? 😍'),
  ('fb050000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000005','agradecimento',1,2,
   'Olá {cliente_nome}! Obrigada por levar o Batom Matte Duradouro! 💋 Vai arrasar!'),
  ('fb050000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000005','relacionamento',2,45,
   'Oi {cliente_nome}! Você está amando o Batom Matte Duradouro? 💋 Temos cores novas chegando!'),
  ('fb050000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000005','recompra',3,88,
   'Oi {cliente_nome}! Seu Batom Matte Duradouro vai acabar em breve. Posso reservar? 💄'),
  ('fb060000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000006','agradecimento',1,2,
   'Olá {cliente_nome}! Você vai amar a Máscara de Cílios Volume! 👁️'),
  ('fb060000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000006','relacionamento',2,45,
   'Oi {cliente_nome}! Como está a Máscara de Cílios Volume? 👁️✨'),
  ('fb060000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000006','recompra',3,88,
   'Oi {cliente_nome}! Sua Máscara de Cílios Volume vai acabar. Posso reservar outra? 👁️'),
  ('fb070000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000007','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar o Hidratante Facial FPS 30! ☀️'),
  ('fb070000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000007','relacionamento',2,30,
   'Oi {cliente_nome}! Um mês usando o Hidratante Facial FPS 30. Está sentindo a pele mais protegida? ☀️'),
  ('fb070000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000007','recompra',3,58,
   'Oi {cliente_nome}! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo? ☀️'),
  ('fb080000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000008','agradecimento',1,2,
   'Olá {cliente_nome}! Que ótima escolha o Esfoliante Corporal Rose! 🌹'),
  ('fb080000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000008','relacionamento',2,15,
   'Oi {cliente_nome}! Já 15 dias com o Esfoliante Corporal Rose. A pele está mais suave? 🌹'),
  ('fb080000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000008','recompra',3,28,
   'Oi {cliente_nome}! O Esfoliante Corporal Rose vai acabar em breve. Posso reservar? 🌹')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 9. MENSAGENS_PRODUTO — KOMPRÃO CENTRO (3 × 8 = 24)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.mensagens_produto (id, produto_id, tipo, ordem, dias_apos_venda, texto) VALUES
  ('fc010000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000001','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar o Creme Premium Antissinais! 😊'),
  ('fc010000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000001','relacionamento',2,30,
   'Oi {cliente_nome}! Como está a pele com o Creme Premium Antissinais? Já dá pra ver diferença? 🌟'),
  ('fc010000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000001','recompra',3,58,
   'Oi {cliente_nome}! Seu Creme Premium Antissinais já deve estar quase no fim. 🧴 Posso reservar pra você?'),
  ('fc020000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000002','agradecimento',1,2,
   'Olá {cliente_nome}! Fico feliz que você escolheu o Sérum Vitamina C! ✨'),
  ('fc020000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000002','relacionamento',2,22,
   'Oi {cliente_nome}! Como está o Sérum Vitamina C? Já dá pra ver diferença na pele? 🍋'),
  ('fc020000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000002','recompra',3,43,
   'Oi {cliente_nome}! O Sérum Vitamina C costuma durar 45 dias. Quer garantir o próximo? 🍋'),
  ('fc030000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000003','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada pela Base Líquida HD! 💄'),
  ('fc030000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000003','relacionamento',2,45,
   'Oi {cliente_nome}! Como está a Base Líquida HD? Alguma dúvida sobre a cobertura? 💄'),
  ('fc030000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000003','recompra',3,88,
   'Oi {cliente_nome}! Sua Base Líquida HD deve estar chegando no fim. Posso separar outra? 💄'),
  ('fc040000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000004','agradecimento',1,2,
   'Olá {cliente_nome}! Que escolha incrível a Paleta de Sombras Glamour! 🎨'),
  ('fc040000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000004','relacionamento',2,90,
   'Oi {cliente_nome}! 3 meses com a Paleta Glamour. Ainda usando bastante? 🎨'),
  ('fc040000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000004','recompra',3,178,
   'Oi {cliente_nome}! Que tal ver as novidades da {loja_nome}? 😍'),
  ('fc050000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000005','agradecimento',1,2,
   'Olá {cliente_nome}! Obrigada por levar o Batom Matte Duradouro! 💋'),
  ('fc050000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000005','relacionamento',2,45,
   'Oi {cliente_nome}! Você está amando o Batom Matte Duradouro? 💋'),
  ('fc050000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000005','recompra',3,88,
   'Oi {cliente_nome}! Seu Batom Matte vai acabar em breve. Posso reservar? 💄'),
  ('fc060000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000006','agradecimento',1,2,
   'Olá {cliente_nome}! Você vai amar a Máscara de Cílios Volume! 👁️'),
  ('fc060000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000006','relacionamento',2,45,
   'Oi {cliente_nome}! Como está a Máscara de Cílios Volume? 👁️✨'),
  ('fc060000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000006','recompra',3,88,
   'Oi {cliente_nome}! Sua Máscara de Cílios Volume vai acabar. Posso reservar? 👁️'),
  ('fc070000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000007','agradecimento',1,2,
   'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. Obrigada por levar o Hidratante Facial FPS 30! ☀️'),
  ('fc070000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000007','relacionamento',2,30,
   'Oi {cliente_nome}! Um mês com o Hidratante Facial FPS 30. Está sentindo a pele protegida? ☀️'),
  ('fc070000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000007','recompra',3,58,
   'Oi {cliente_nome}! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo? ☀️'),
  ('fc080000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000008','agradecimento',1,2,
   'Olá {cliente_nome}! Que ótima escolha o Esfoliante Corporal Rose! 🌹'),
  ('fc080000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000008','relacionamento',2,15,
   'Oi {cliente_nome}! 15 dias com o Esfoliante Corporal Rose. A pele está mais suave? 🌹'),
  ('fc080000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000008','recompra',3,28,
   'Oi {cliente_nome}! O Esfoliante Corporal Rose vai acabar em breve. Posso reservar? 🌹')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 10. CLIENTES — 10 ANGELONI + 8 SJ + 8 CENTRO
-- ════════════════════════════════════════════════════════════
INSERT INTO public.clientes (id, loja_id, nome, whatsapp) VALUES
  ('ca000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Maria Aparecida Silva',  '48991000001'),
  ('ca000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','Joana Rodrigues Lima',   '48991000002'),
  ('ca000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001','Ana Paula Ferreira',     '48991000003'),
  ('ca000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000001','Fernanda Oliveira',      '48991000004'),
  ('ca000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001','Priscila Souza Mendes',  '48991000005'),
  ('ca000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000001','Carolina Nascimento',    '48991000006'),
  ('ca000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000001','Beatriz Santos Alves',   '48991000007'),
  ('ca000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000001','Juliana Pereira Costa',  '48991000008'),
  ('ca000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000001','Rafaela Martins Gomes',  '48991000009'),
  ('ca000000-0000-0000-0000-000000000010','b2000000-0000-0000-0000-000000000001','Vanessa Torres Nunes',   '48991000010')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clientes (id, loja_id, nome, whatsapp) VALUES
  ('cb000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002','Marta Cristina Vieira',  '48992000001'),
  ('cb000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','Luciana Barros Pinto',   '48992000002'),
  ('cb000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000002','Sandra Cardoso Ramos',   '48992000003'),
  ('cb000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000002','Roberta Lima Sousa',     '48992000004'),
  ('cb000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000002','Claudia Fonseca Dias',   '48992000005'),
  ('cb000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000002','Denise Alves Moura',     '48992000006'),
  ('cb000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000002','Patricia Costa Braga',   '48992000007'),
  ('cb000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000002','Silvia Mendes Cruz',     '48992000008')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clientes (id, loja_id, nome, whatsapp) VALUES
  ('cc000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000003','Adriana Costa Neves',    '48993000001'),
  ('cc000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000003','Simone Ribeiro Lima',    '48993000002'),
  ('cc000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000003','Monica Pereira Luz',     '48993000003'),
  ('cc000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000003','Leticia Campos Araújo',  '48993000004'),
  ('cc000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000003','Camila Duarte Melo',     '48993000005'),
  ('cc000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000003','Renata Souza Borges',    '48993000006'),
  ('cc000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000003','Isabela Gomes Rocha',    '48993000007'),
  ('cc000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000003','Amanda Vieira Lopes',    '48993000008')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 11. VENDAS + ITENS_VENDA
-- Aviso states por vendedora:
--   Ana:    4 atrasados, 2 hoje, 3 próx7, 4 enviados → 2 recompras
--   Carla:  3 atrasados, 1 hoje, 2 próx7, 3 enviados → 1 recompra
--   Débora: 2 atrasados, 1 hoje, 2 próx7, 2 enviados → 1 recompra
--   Elaine: 1 atrasado,  1 hoje, 1 próx7, 3 enviados → 1 recompra
-- ════════════════════════════════════════════════════════════

-- ── ANA (vendedora d1000003, loja ANGELONI b2000001) ────────
INSERT INTO public.vendas (id, loja_id, cliente_id, produto_id, vendedora_id, valor, data_compra, origem) VALUES
  -- 4 vendas → avisos ATRASADOS
  ('da000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000003', 89.90, CURRENT_DATE - 63, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003', 67.90, CURRENT_DATE - 46, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000003', 79.90, CURRENT_DATE - 60, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000004','ea000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000003', 59.90, CURRENT_DATE - 30, 'venda_manual'),
  -- 2 vendas → avisos HOJE
  ('da000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000005','ea000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000003', 89.90, CURRENT_DATE - 58, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000006','ea000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003', 67.90, CURRENT_DATE - 43, 'venda_manual'),
  -- 3 vendas → avisos PRÓXIMOS 7 DIAS
  ('da000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000007','ea000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003', 54.90, CURRENT_DATE - 87, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000008','ea000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000003', 79.90, CURRENT_DATE - 55, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000009','ea000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000003', 89.90, CURRENT_DATE - 52, 'venda_manual'),
  -- 5 vendas → avisos ENVIADOS (últimas 2 geram recompras)
  ('da000000-0000-0000-0000-000000000010','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000003', 59.90, CURRENT_DATE - 18, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000011','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000003',129.90, CURRENT_DATE - 92, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000012','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000003', 44.90, CURRENT_DATE - 15, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000013','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000004','ea000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000003', 34.90, CURRENT_DATE - 95, 'venda_manual'),
  ('da000000-0000-0000-0000-000000000014','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000010','ea000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003', 67.90, CURRENT_DATE -130, 'venda_manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.itens_venda (id, venda_id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel) VALUES
  ('ba000000-0000-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90,  89.90, true, true),
  ('ba000000-0000-0000-0000-000000000002','da000000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     1, 67.90,  67.90, true, true),
  ('ba000000-0000-0000-0000-000000000003','da000000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000007','Hidratante Facial FPS 30',  1, 79.90,  79.90, true, true),
  ('ba000000-0000-0000-0000-000000000004','da000000-0000-0000-0000-000000000004','ea000000-0000-0000-0000-000000000008','Esfoliante Corporal Rose',  1, 59.90,  59.90, true, true),
  ('ba000000-0000-0000-0000-000000000005','da000000-0000-0000-0000-000000000005','ea000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90,  89.90, true, true),
  ('ba000000-0000-0000-0000-000000000006','da000000-0000-0000-0000-000000000006','ea000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     1, 67.90,  67.90, true, true),
  ('ba000000-0000-0000-0000-000000000007','da000000-0000-0000-0000-000000000007','ea000000-0000-0000-0000-000000000003','Base Líquida HD',           1, 54.90,  54.90, true, true),
  ('ba000000-0000-0000-0000-000000000008','da000000-0000-0000-0000-000000000008','ea000000-0000-0000-0000-000000000007','Hidratante Facial FPS 30',  1, 79.90,  79.90, true, true),
  ('ba000000-0000-0000-0000-000000000009','da000000-0000-0000-0000-000000000009','ea000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90,  89.90, true, true),
  ('ba000000-0000-0000-0000-000000000010','da000000-0000-0000-0000-000000000010','ea000000-0000-0000-0000-000000000008','Esfoliante Corporal Rose',  1, 59.90,  59.90, true, true),
  ('ba000000-0000-0000-0000-000000000011','da000000-0000-0000-0000-000000000011','ea000000-0000-0000-0000-000000000004','Paleta de Sombras Glamour', 1,129.90, 129.90, true, true),
  ('ba000000-0000-0000-0000-000000000012','da000000-0000-0000-0000-000000000012','ea000000-0000-0000-0000-000000000006','Máscara de Cílios Volume',  1, 44.90,  44.90, true, true),
  ('ba000000-0000-0000-0000-000000000013','da000000-0000-0000-0000-000000000013','ea000000-0000-0000-0000-000000000005','Batom Matte Duradouro',     1, 34.90,  34.90, true, true),
  ('ba000000-0000-0000-0000-000000000014','da000000-0000-0000-0000-000000000014','ea000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     1, 67.90,  67.90, true, true)
ON CONFLICT (id) DO NOTHING;

-- ── CARLA (vendedora d1000004, loja ANGELONI b2000001) ──────
INSERT INTO public.vendas (id, loja_id, cliente_id, produto_id, vendedora_id, valor, data_compra, origem) VALUES
  ('db000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000005','ea000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000004', 89.90, CURRENT_DATE - 65, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000006','ea000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000004', 79.90, CURRENT_DATE - 62, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000007','ea000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000004', 59.90, CURRENT_DATE - 29, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000008','ea000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004', 67.90, CURRENT_DATE - 43, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000009','ea000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000004', 54.90, CURRENT_DATE - 83, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000010','ea000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000004', 89.90, CURRENT_DATE - 55, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000004',129.90, CURRENT_DATE - 12, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000004', 34.90, CURRENT_DATE - 50, 'venda_manual'),
  ('db000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000001','ca000000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000004', 44.90, CURRENT_DATE -100, 'venda_manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.itens_venda (id, venda_id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel) VALUES
  ('bb000000-0000-0000-0000-000000000001','db000000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90,  89.90, true, true),
  ('bb000000-0000-0000-0000-000000000002','db000000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000007','Hidratante Facial FPS 30',  1, 79.90,  79.90, true, true),
  ('bb000000-0000-0000-0000-000000000003','db000000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000008','Esfoliante Corporal Rose',  1, 59.90,  59.90, true, true),
  ('bb000000-0000-0000-0000-000000000004','db000000-0000-0000-0000-000000000004','ea000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     1, 67.90,  67.90, true, true),
  ('bb000000-0000-0000-0000-000000000005','db000000-0000-0000-0000-000000000005','ea000000-0000-0000-0000-000000000003','Base Líquida HD',           1, 54.90,  54.90, true, true),
  ('bb000000-0000-0000-0000-000000000006','db000000-0000-0000-0000-000000000006','ea000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90,  89.90, true, true),
  ('bb000000-0000-0000-0000-000000000007','db000000-0000-0000-0000-000000000007','ea000000-0000-0000-0000-000000000004','Paleta de Sombras Glamour', 1,129.90, 129.90, true, true),
  ('bb000000-0000-0000-0000-000000000008','db000000-0000-0000-0000-000000000008','ea000000-0000-0000-0000-000000000005','Batom Matte Duradouro',     1, 34.90,  34.90, true, true),
  ('bb000000-0000-0000-0000-000000000009','db000000-0000-0000-0000-000000000009','ea000000-0000-0000-0000-000000000006','Máscara de Cílios Volume',  1, 44.90,  44.90, true, true)
ON CONFLICT (id) DO NOTHING;

-- ── DÉBORA (vendedora d1000005, loja SJ b2000002) ───────────
INSERT INTO public.vendas (id, loja_id, cliente_id, produto_id, vendedora_id, valor, data_compra, origem) VALUES
  ('dc000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000005', 89.90, CURRENT_DATE - 64, 'venda_manual'),
  ('dc000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000005', 79.90, CURRENT_DATE - 61, 'venda_manual'),
  ('dc000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000005', 67.90, CURRENT_DATE - 43, 'venda_manual'),
  ('dc000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000004','eb000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000005', 59.90, CURRENT_DATE - 24, 'venda_manual'),
  ('dc000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000005','eb000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000005', 89.90, CURRENT_DATE - 53, 'venda_manual'),
  ('dc000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000006','eb000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000005', 54.90, CURRENT_DATE - 20, 'venda_manual'),
  ('dc000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000002','cb000000-0000-0000-0000-000000000007','eb000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000005', 34.90, CURRENT_DATE - 93, 'venda_manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.itens_venda (id, venda_id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel) VALUES
  ('bc000000-0000-0000-0000-000000000001','dc000000-0000-0000-0000-000000000001','eb000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90, 89.90, true, true),
  ('bc000000-0000-0000-0000-000000000002','dc000000-0000-0000-0000-000000000002','eb000000-0000-0000-0000-000000000007','Hidratante Facial FPS 30',  1, 79.90, 79.90, true, true),
  ('bc000000-0000-0000-0000-000000000003','dc000000-0000-0000-0000-000000000003','eb000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     1, 67.90, 67.90, true, true),
  ('bc000000-0000-0000-0000-000000000004','dc000000-0000-0000-0000-000000000004','eb000000-0000-0000-0000-000000000008','Esfoliante Corporal Rose',  1, 59.90, 59.90, true, true),
  ('bc000000-0000-0000-0000-000000000005','dc000000-0000-0000-0000-000000000005','eb000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90, 89.90, true, true),
  ('bc000000-0000-0000-0000-000000000006','dc000000-0000-0000-0000-000000000006','eb000000-0000-0000-0000-000000000003','Base Líquida HD',           1, 54.90, 54.90, true, true),
  ('bc000000-0000-0000-0000-000000000007','dc000000-0000-0000-0000-000000000007','eb000000-0000-0000-0000-000000000005','Batom Matte Duradouro',     1, 34.90, 34.90, true, true)
ON CONFLICT (id) DO NOTHING;

-- ── ELAINE (vendedora d1000006, loja CENTRO b2000003) ───────
INSERT INTO public.vendas (id, loja_id, cliente_id, produto_id, vendedora_id, valor, data_compra, origem) VALUES
  ('dd000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000006', 89.90, CURRENT_DATE - 62, 'venda_manual'),
  ('dd000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000006', 79.90, CURRENT_DATE - 58, 'venda_manual'),
  ('dd000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000006', 67.90, CURRENT_DATE - 40, 'venda_manual'),
  ('dd000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000004','ec000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000006', 59.90, CURRENT_DATE - 10, 'venda_manual'),
  ('dd000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000005','ec000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000006', 54.90, CURRENT_DATE - 92, 'venda_manual'),
  ('dd000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000006','ec000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000006', 44.90, CURRENT_DATE - 20, 'venda_manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.itens_venda (id, venda_id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel) VALUES
  ('bd000000-0000-0000-0000-000000000001','dd000000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000001','Creme Premium Antissinais', 1, 89.90, 89.90, true, true),
  ('bd000000-0000-0000-0000-000000000002','dd000000-0000-0000-0000-000000000002','ec000000-0000-0000-0000-000000000007','Hidratante Facial FPS 30',  1, 79.90, 79.90, true, true),
  ('bd000000-0000-0000-0000-000000000003','dd000000-0000-0000-0000-000000000003','ec000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     1, 67.90, 67.90, true, true),
  ('bd000000-0000-0000-0000-000000000004','dd000000-0000-0000-0000-000000000004','ec000000-0000-0000-0000-000000000008','Esfoliante Corporal Rose',  1, 59.90, 59.90, true, true),
  ('bd000000-0000-0000-0000-000000000005','dd000000-0000-0000-0000-000000000005','ec000000-0000-0000-0000-000000000003','Base Líquida HD',           1, 54.90, 54.90, true, true),
  ('bd000000-0000-0000-0000-000000000006','dd000000-0000-0000-0000-000000000006','ec000000-0000-0000-0000-000000000006','Máscara de Cílios Volume',  1, 44.90, 44.90, true, true)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 12. AVISOS (36 total — com previsao_comissao = 8% do valor)
-- ════════════════════════════════════════════════════════════

-- ── ANA ─────────────────────────────────────────────────────
INSERT INTO public.avisos (id, venda_id, loja_id, cliente_id, vendedora_id, mensagem_id, item_venda_id,
  texto_renderizado, data_aviso, status, previsao_comissao) VALUES
  -- ATRASADOS
  ('a1000000-0000-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000003',
   'fa010000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000001',
   'Oi Maria! Seu Creme Premium Antissinais já deve estar quase no fim. Que tal garantir o próximo antes que acabe? Posso reservar pra você! 🧴',
   CURRENT_DATE - 5, 'pendente', 7.19),
  ('a1000000-0000-0000-0000-000000000002','da000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003',
   'fa020000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000002',
   'Oi Joana! O Sérum Vitamina C costuma durar 45 dias com uso diário. Quer garantir o próximo? Posso reservar na CIA CIDADE AZUL - ANGELONI! 🍋',
   CURRENT_DATE - 3, 'pendente', 5.43),
  ('a1000000-0000-0000-0000-000000000003','da000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003',
   'fa070000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000003',
   'Oi Ana Paula! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo pra você? ☀️',
   CURRENT_DATE - 2, 'pendente', 6.39),
  ('a1000000-0000-0000-0000-000000000004','da000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000003',
   'fa080000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000004',
   'Oi Fernanda! O Esfoliante Corporal Rose vai acabar em breve! Posso reservar um novo pra você na CIA CIDADE AZUL - ANGELONI? 🌹',
   CURRENT_DATE - 2, 'pendente', 4.79),
  -- HOJE
  ('a1000000-0000-0000-0000-000000000005','da000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000003',
   'fa010000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000005',
   'Oi Priscila! Seu Creme Premium Antissinais já deve estar quase no fim. Que tal garantir o próximo antes que acabe? Posso reservar pra você! 🧴',
   CURRENT_DATE, 'pendente', 7.19),
  ('a1000000-0000-0000-0000-000000000006','da000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000003',
   'fa020000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000006',
   'Oi Carolina! O Sérum Vitamina C costuma durar 45 dias com uso diário. Quer garantir o próximo? Posso reservar! 🍋',
   CURRENT_DATE, 'pendente', 5.43),
  -- PRÓXIMOS 7 DIAS
  ('a1000000-0000-0000-0000-000000000007','da000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000003',
   'fa030000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000007',
   'Oi Beatriz! Sua Base Líquida HD deve estar chegando no fim. Posso separar outra pra você na CIA CIDADE AZUL - ANGELONI? 💄',
   CURRENT_DATE + 1, 'pendente', 4.39),
  ('a1000000-0000-0000-0000-000000000008','da000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000003',
   'fa070000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000008',
   'Oi Juliana! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo pra você? ☀️',
   CURRENT_DATE + 3, 'pendente', 6.39),
  ('a1000000-0000-0000-0000-000000000009','da000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000009','d1000000-0000-0000-0000-000000000003',
   'fa010000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000009',
   'Oi Rafaela! Seu Creme Premium Antissinais já deve estar quase no fim. Que tal garantir o próximo antes que acabe? 🧴',
   CURRENT_DATE + 6, 'pendente', 7.19),
  -- ENVIADOS
  ('a1000000-0000-0000-0000-000000000010','da000000-0000-0000-0000-000000000010','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000003',
   'fa080000-0000-0000-0000-000000000001','ba000000-0000-0000-0000-000000000010',
   'Olá Maria! Aqui é Ana Beatriz Costa da CIA CIDADE AZUL - ANGELONI. Que ótima escolha o Esfoliante Corporal Rose! Vai adorar o resultado! 🌹',
   CURRENT_DATE - 16, 'enviado', 4.79),
  ('a1000000-0000-0000-0000-000000000011','da000000-0000-0000-0000-000000000011','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003',
   'fa040000-0000-0000-0000-000000000002','ba000000-0000-0000-0000-000000000011',
   'Oi Joana! Já faz 3 meses desde que você levou a Paleta Glamour. Ainda usando bastante? Temos novidades chegando na CIA CIDADE AZUL - ANGELONI! 🎨',
   CURRENT_DATE - 2, 'enviado', 10.39),
  ('a1000000-0000-0000-0000-000000000012','da000000-0000-0000-0000-000000000012','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003',
   'fa060000-0000-0000-0000-000000000001','ba000000-0000-0000-0000-000000000012',
   'Olá Ana Paula! Aqui é Ana Beatriz Costa. Você vai amar a Máscara de Cílios Volume! Qualquer dúvida, me chama! 👁️',
   CURRENT_DATE - 13, 'enviado', 3.59),
  ('a1000000-0000-0000-0000-000000000013','da000000-0000-0000-0000-000000000013','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000003',
   'fa050000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000013',
   'Oi Fernanda! Seu Batom Matte Duradouro vai acabar em breve. Posso reservar o mesmo ou quer experimentar uma cor nova? 💄',
   CURRENT_DATE - 7, 'enviado', 2.79),
  ('a1000000-0000-0000-0000-000000000014','da000000-0000-0000-0000-000000000014','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000003',
   'fa020000-0000-0000-0000-000000000003','ba000000-0000-0000-0000-000000000014',
   'Oi Vanessa! O Sérum Vitamina C costuma durar 45 dias com uso diário. Quer garantir o próximo? Posso reservar na CIA CIDADE AZUL - ANGELONI! 🍋',
   CURRENT_DATE - 87, 'enviado', 5.43)
ON CONFLICT (id) DO NOTHING;

-- ── CARLA ────────────────────────────────────────────────────
INSERT INTO public.avisos (id, venda_id, loja_id, cliente_id, vendedora_id, mensagem_id, item_venda_id,
  texto_renderizado, data_aviso, status, previsao_comissao) VALUES
  -- ATRASADOS
  ('a2000000-0000-0000-0000-000000000001','db000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000004',
   'fa010000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000001',
   'Oi Priscila! Seu Creme Premium Antissinais já deve estar quase no fim. Que tal garantir o próximo antes que acabe? Posso reservar pra você! 🧴',
   CURRENT_DATE - 7, 'pendente', 7.19),
  ('a2000000-0000-0000-0000-000000000002','db000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000004',
   'fa070000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000002',
   'Oi Carolina! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo pra você? ☀️',
   CURRENT_DATE - 4, 'pendente', 6.39),
  ('a2000000-0000-0000-0000-000000000003','db000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000004',
   'fa080000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000003',
   'Oi Beatriz! O Esfoliante Corporal Rose vai acabar em breve! Posso reservar um novo na CIA CIDADE AZUL - ANGELONI? 🌹',
   CURRENT_DATE - 1, 'pendente', 4.79),
  -- HOJE
  ('a2000000-0000-0000-0000-000000000004','db000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000004',
   'fa020000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000004',
   'Oi Juliana! O Sérum Vitamina C costuma durar 45 dias com uso diário. Quer garantir o próximo? Posso reservar! 🍋',
   CURRENT_DATE, 'pendente', 5.43),
  -- PRÓXIMOS 7 DIAS
  ('a2000000-0000-0000-0000-000000000005','db000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000009','d1000000-0000-0000-0000-000000000004',
   'fa030000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000005',
   'Oi Rafaela! Sua Base Líquida HD deve estar chegando no fim. Posso separar outra pra você? 💄',
   CURRENT_DATE + 5, 'pendente', 4.39),
  ('a2000000-0000-0000-0000-000000000006','db000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000004',
   'fa010000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000006',
   'Oi Vanessa! Seu Creme Premium Antissinais já deve estar quase no fim. Que tal garantir o próximo? 🧴',
   CURRENT_DATE + 3, 'pendente', 7.19),
  -- ENVIADOS
  ('a2000000-0000-0000-0000-000000000007','db000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000004',
   'fa040000-0000-0000-0000-000000000001','bb000000-0000-0000-0000-000000000007',
   'Olá Maria! Aqui é Carla Menezes. Que escolha incrível a Paleta de Sombras Glamour! Qualquer dúvida, me chama. 🎨',
   CURRENT_DATE - 10, 'enviado', 10.39),
  ('a2000000-0000-0000-0000-000000000008','db000000-0000-0000-0000-000000000008','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004',
   'fa050000-0000-0000-0000-000000000002','bb000000-0000-0000-0000-000000000008',
   'Oi Joana! Você está amando o Batom Matte Duradouro? Tenho cores novas chegando na CIA CIDADE AZUL - ANGELONI! 💋',
   CURRENT_DATE - 5, 'enviado', 2.79),
  ('a2000000-0000-0000-0000-000000000009','db000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000004',
   'fa060000-0000-0000-0000-000000000003','bb000000-0000-0000-0000-000000000009',
   'Oi Ana Paula! Sua Máscara de Cílios Volume vai acabar em breve. Posso reservar outra pra você! 👁️',
   CURRENT_DATE - 12, 'enviado', 3.59)
ON CONFLICT (id) DO NOTHING;

-- ── DÉBORA ───────────────────────────────────────────────────
INSERT INTO public.avisos (id, venda_id, loja_id, cliente_id, vendedora_id, mensagem_id, item_venda_id,
  texto_renderizado, data_aviso, status, previsao_comissao) VALUES
  -- ATRASADOS
  ('a3000000-0000-0000-0000-000000000001','dc000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000005',
   'fb010000-0000-0000-0000-000000000003','bc000000-0000-0000-0000-000000000001',
   'Oi Marta! Seu Creme Premium Antissinais já deve estar quase no fim. Posso reservar pra você? 🧴',
   CURRENT_DATE - 6, 'pendente', 7.19),
  ('a3000000-0000-0000-0000-000000000002','dc000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000005',
   'fb070000-0000-0000-0000-000000000003','bc000000-0000-0000-0000-000000000002',
   'Oi Luciana! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo? ☀️',
   CURRENT_DATE - 3, 'pendente', 6.39),
  -- HOJE
  ('a3000000-0000-0000-0000-000000000003','dc000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000005',
   'fb020000-0000-0000-0000-000000000003','bc000000-0000-0000-0000-000000000003',
   'Oi Sandra! O Sérum Vitamina C costuma durar 45 dias. Quer garantir o próximo na CIA CIDADE AZUL - KOMPRÃO SÃO JOÃO? 🍋',
   CURRENT_DATE, 'pendente', 5.43),
  -- PRÓXIMOS 7 DIAS
  ('a3000000-0000-0000-0000-000000000004','dc000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000005',
   'fb080000-0000-0000-0000-000000000003','bc000000-0000-0000-0000-000000000004',
   'Oi Roberta! O Esfoliante Corporal Rose vai acabar em breve. Posso reservar? 🌹',
   CURRENT_DATE + 4, 'pendente', 4.79),
  ('a3000000-0000-0000-0000-000000000005','dc000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000005',
   'fb010000-0000-0000-0000-000000000003','bc000000-0000-0000-0000-000000000005',
   'Oi Claudia! Seu Creme Premium Antissinais já deve estar quase no fim. Posso reservar pra você? 🧴',
   CURRENT_DATE + 5, 'pendente', 7.19),
  -- ENVIADOS
  ('a3000000-0000-0000-0000-000000000006','dc000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000005',
   'fb030000-0000-0000-0000-000000000001','bc000000-0000-0000-0000-000000000006',
   'Olá Denise! Aqui é Débora Santos da CIA CIDADE AZUL - KOMPRÃO SÃO JOÃO. Obrigada por levar a Base Líquida HD! 💄',
   CURRENT_DATE - 18, 'enviado', 4.39),
  ('a3000000-0000-0000-0000-000000000007','dc000000-0000-0000-0000-000000000007','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000005',
   'fb050000-0000-0000-0000-000000000003','bc000000-0000-0000-0000-000000000007',
   'Oi Patricia! Seu Batom Matte Duradouro vai acabar em breve. Posso reservar o mesmo ou quer experimentar uma cor nova? 💄',
   CURRENT_DATE - 5, 'enviado', 2.79)
ON CONFLICT (id) DO NOTHING;

-- ── ELAINE ───────────────────────────────────────────────────
INSERT INTO public.avisos (id, venda_id, loja_id, cliente_id, vendedora_id, mensagem_id, item_venda_id,
  texto_renderizado, data_aviso, status, previsao_comissao) VALUES
  -- ATRASADO
  ('a4000000-0000-0000-0000-000000000001','dd000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000006',
   'fc010000-0000-0000-0000-000000000003','bd000000-0000-0000-0000-000000000001',
   'Oi Adriana! Seu Creme Premium Antissinais já deve estar quase no fim. Posso reservar pra você? 🧴',
   CURRENT_DATE - 4, 'pendente', 7.19),
  -- HOJE
  ('a4000000-0000-0000-0000-000000000002','dd000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000006',
   'fc070000-0000-0000-0000-000000000003','bd000000-0000-0000-0000-000000000002',
   'Oi Simone! O Hidratante Facial FPS 30 já deve estar no final. Posso reservar um novo? ☀️',
   CURRENT_DATE, 'pendente', 6.39),
  -- PRÓXIMO 7 DIAS
  ('a4000000-0000-0000-0000-000000000003','dd000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000006',
   'fc020000-0000-0000-0000-000000000003','bd000000-0000-0000-0000-000000000003',
   'Oi Monica! O Sérum Vitamina C costuma durar 45 dias. Quer garantir o próximo na CIA CIDADE AZUL - KOMPRÃO CENTRO? 🍋',
   CURRENT_DATE + 3, 'pendente', 5.43),
  -- ENVIADOS
  ('a4000000-0000-0000-0000-000000000004','dd000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000006',
   'fc080000-0000-0000-0000-000000000001','bd000000-0000-0000-0000-000000000004',
   'Olá Leticia! Aqui é Elaine Ferreira da CIA CIDADE AZUL - KOMPRÃO CENTRO. Que ótima escolha o Esfoliante Corporal Rose! 🌹',
   CURRENT_DATE - 8, 'enviado', 4.79),
  ('a4000000-0000-0000-0000-000000000005','dd000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000006',
   'fc030000-0000-0000-0000-000000000003','bd000000-0000-0000-0000-000000000005',
   'Oi Camila! Sua Base Líquida HD deve estar chegando no fim. Posso separar outra pra você? 💄',
   CURRENT_DATE - 4, 'enviado', 4.39),
  ('a4000000-0000-0000-0000-000000000006','dd000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000006',
   'fc060000-0000-0000-0000-000000000001','bd000000-0000-0000-0000-000000000006',
   'Olá Renata! Aqui é Elaine Ferreira. Você vai amar a Máscara de Cílios Volume! Qualquer dúvida, me chama! 👁️',
   CURRENT_DATE - 18, 'enviado', 3.59)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 13. RECOMPRAS (5 — oriundas de avisos enviados)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.recompras (id, loja_id, cliente_id, vendedora_id, aviso_id, venda_original_id, valor_total, valor_base_comissao) VALUES
  ('c0000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000013','da000000-0000-0000-0000-000000000013',
   34.90, 34.90),
  ('c0000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000014','da000000-0000-0000-0000-000000000014',
   67.90, 67.90),
  ('c0000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000004',
   'a2000000-0000-0000-0000-000000000009','db000000-0000-0000-0000-000000000009',
   44.90, 44.90),
  ('c0000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000002',
   'cb000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000005',
   'a3000000-0000-0000-0000-000000000007','dc000000-0000-0000-0000-000000000007',
   34.90, 34.90),
  ('c0000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000003',
   'cc000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000006',
   'a4000000-0000-0000-0000-000000000005','dd000000-0000-0000-0000-000000000005',
   54.90, 54.90)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 14. ITENS_RECOMPRA
-- ════════════════════════════════════════════════════════════
INSERT INTO public.itens_recompra (id, recompra_id, produto_id, produto_nome, comissionavel, quantidade, valor_unitario, subtotal) VALUES
  ('c1000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','ea000000-0000-0000-0000-000000000005','Batom Matte Duradouro',     true, 1, 34.90, 34.90),
  ('c1000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','ea000000-0000-0000-0000-000000000002','Sérum Vitamina C 30ml',     true, 1, 67.90, 67.90),
  ('c1000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003','ea000000-0000-0000-0000-000000000006','Máscara de Cílios Volume',  true, 1, 44.90, 44.90),
  ('c1000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000004','eb000000-0000-0000-0000-000000000005','Batom Matte Duradouro',     true, 1, 34.90, 34.90),
  ('c1000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000005','ec000000-0000-0000-0000-000000000003','Base Líquida HD',           true, 1, 54.90, 54.90)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ════════════════════════════════════════════════════════════
-- RESUMO DO QUE FOI INSERIDO
-- ════════════════════════════════════════════════════════════
-- ✅ 3 lojas demo (b2000000-...-001/002/003)
-- ✅ 6 auth users + 6 auth.identities demo (d1000000-...-001 a 006)
-- ✅ 6 perfis demo (d1000000-...-001 a 006)
-- ✅ 8 membros_loja (dono×3, gerente×1, vendedoras×4)
-- ✅ 4 regras_comissao (8% para cada vendedora demo)
-- ✅ 24 produtos (8 × 3 lojas, todos recorrente=true)
-- ✅ 72 mensagens_produto (3 × 24 produtos)
-- ✅ 26 clientes (10 ANGELONI + 8 SJ + 8 CENTRO)
-- ✅ 36 vendas + 36 itens_venda
-- ✅ 36 avisos:
--      Ana:    4 atrasados, 2 hoje, 3 próx7, 5 enviados
--      Carla:  3 atrasados, 1 hoje, 2 próx7, 3 enviados
--      Débora: 2 atrasados, 1 hoje, 2 próx7, 2 enviados
--      Elaine: 1 atrasado,  1 hoje, 1 próx7, 3 enviados
-- ✅ 5 recompras + 5 itens_recompra
-- ✗ Nenhum DELETE executado
-- ✗ Nenhum UPDATE em dados existentes
-- ════════════════════════════════════════════════════════════
