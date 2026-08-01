-- PiùVita — seed idempotente do catálogo completo (30 itens)
-- Fonte: data/bibliotecas/piuvita-produtos.csv (planilha oficial "Biblioteca de
-- Produtos Piu Vita.xlsx", já versionada no repo, confirmada semanticamente
-- idêntica ao public.biblioteca_itens de PRODUÇÃO — diff programático sem
-- nenhuma divergência de nome, preço, ciclo, qtd_mensagens ou foto_url).
--
-- Aplicar SOMENTE em staging. Não aplicar em produção (produção já tem estes
-- dados). Idempotente: pode ser reexecutado sem duplicar.
--
-- Os 5 itens fictícios criados durante o PILOT-0005 original (Piùfort Imune,
-- Piùfort Antiox, Complexo B C/60, Coenzima Q10 C/60, Piu Multi AZ C/60) já
-- tinham nome/preço/ciclo corretos, só com foto_url placeholder — por isso
-- são normalizados via UPDATE (mesmo id, preserva biblioteca_item_id de
-- produtos já instalados em Loja Angeloni Teste / Loja Combo Teste / Loja
-- Terceira Teste), não recriados.

BEGIN;


-- Ácido Fólico C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 56.4,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/acido_folico_c_60_89_1_872571d0d07a47b9d6515da56fcd6cb4.png',
  categoria = 'Saúde feminina / Gestante',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Ácido Fólico C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Ácido Fólico C/60', 56.4, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/acido_folico_c_60_89_1_872571d0d07a47b9d6515da56fcd6cb4.png', 'Saúde feminina / Gestante', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Ácido Fólico C/60')
);

-- B12 + Metilfolato C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 65.2,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/b12_metilfolato_c_60_93_1_30efcb1fa065a286d881a801e417f79b.png',
  categoria = 'Vitaminas e minerais',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('B12 + Metilfolato C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'B12 + Metilfolato C/60', 65.2, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/b12_metilfolato_c_60_93_1_30efcb1fa065a286d881a801e417f79b.png', 'Vitaminas e minerais', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('B12 + Metilfolato C/60')
);

-- Coenzima Q10 C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 100.5,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/coenzima_q10_c_60_99_1_f8bdda9a4c868b8adf164b5124204be9.png',
  categoria = 'Saúde cardiovascular',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Coenzima Q10 C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Coenzima Q10 C/60', 100.5, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/coenzima_q10_c_60_99_1_f8bdda9a4c868b8adf164b5124204be9.png', 'Saúde cardiovascular', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Coenzima Q10 C/60')
);

-- Complexo B C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 48.8,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/complexo_b_c_60_101_1_56af43b27a9b70c7f6d562341437b982.png',
  categoria = 'Vitaminas e minerais',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Complexo B C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Complexo B C/60', 48.8, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/complexo_b_c_60_101_1_56af43b27a9b70c7f6d562341437b982.png', 'Vitaminas e minerais', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Complexo B C/60')
);

-- Creatina Efervescente Maçã Verde 180g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 74.8,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_maca_verde_180_gr_187_1_3f4f8c0770caef2d7262702c4e307816.jpg',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Maçã Verde 180g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Maçã Verde 180g', 74.8, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_maca_verde_180_gr_187_1_3f4f8c0770caef2d7262702c4e307816.jpg', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Maçã Verde 180g')
);

-- Creatina Efervescente Maçã Verde 360g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 89.8,
  ciclo_recompra_dias = 44,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_maca_verde_360_gr_189_1_4e4f65668cc07be535692d7fc6a5c513.jpg',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Maçã Verde 360g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Maçã Verde 360g', 89.8, 44, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_maca_verde_360_gr_189_1_4e4f65668cc07be535692d7fc6a5c513.jpg', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Maçã Verde 360g')
);

-- Creatina Efervescente Natural 150g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 84,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_natural_150_gr_105_1_008b2ed55163664d7fd6be3e696801c6.png',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Natural 150g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Natural 150g', 84, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_natural_150_gr_105_1_008b2ed55163664d7fd6be3e696801c6.png', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Natural 150g')
);

-- Creatina Efervescente Natural 360g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 89.8,
  ciclo_recompra_dias = 44,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_natural_360_gr_191_1_5bf95502eab048729f874774eb6f510e.jpg',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Natural 360g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Natural 360g', 89.8, 44, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_natural_360_gr_191_1_5bf95502eab048729f874774eb6f510e.jpg', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Natural 360g')
);

-- Creatina Efervescente Uva 150g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 84,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_uva_150_gr_107_1_6507d50c8bedd1cc6a9c1b74642f0675.png',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Uva 150g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Uva 150g', 84, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_uva_150_gr_107_1_6507d50c8bedd1cc6a9c1b74642f0675.png', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Uva 150g')
);

-- Creatina Efervescente Uva 180g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 74.8,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_uva_180_gr_193_1_4ccc8d7aedd953425b0a999d6c3cee47.jpg',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Uva 180g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Uva 180g', 74.8, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_uva_180_gr_193_1_4ccc8d7aedd953425b0a999d6c3cee47.jpg', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Uva 180g')
);

-- Creatina Efervescente Uva 360g
UPDATE public.biblioteca_itens SET
  preco_sugerido = 89.8,
  ciclo_recompra_dias = 44,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_uva_360_gr_195_1_05bf7c9e7e5d0ee5928f054a5d6ba676.jpg',
  categoria = 'Creatinas',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Creatina Efervescente Uva 360g');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Creatina Efervescente Uva 360g', 89.8, 44, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/creatina_efervescente_uva_360_gr_195_1_05bf7c9e7e5d0ee5928f054a5d6ba676.jpg', 'Creatinas', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Creatina Efervescente Uva 360g')
);

-- Cúrcuma C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 70.7,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/curcuma_c_60_109_1_8f3195b3613d3f98b28794e8fb999763.png',
  categoria = 'Fitoterápicos / Naturais',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Cúrcuma C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Cúrcuma C/60', 70.7, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/curcuma_c_60_109_1_8f3195b3613d3f98b28794e8fb999763.png', 'Fitoterápicos / Naturais', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Cúrcuma C/60')
);

-- Melatonina C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 48.8,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/melatonina_c_60_117_1_f0a2f8af9ad1aaa21e4015bc99444823.png',
  categoria = 'Sono / Relaxamento',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Melatonina C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Melatonina C/60', 48.8, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/melatonina_c_60_117_1_f0a2f8af9ad1aaa21e4015bc99444823.png', 'Sono / Relaxamento', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Melatonina C/60')
);

-- Piu AminoMix Sachê C/30
UPDATE public.biblioteca_itens SET
  preco_sugerido = 95.9,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_aminomix_sache_c_30_123_1_c457b99753b198020103b929f2347e4d.png',
  categoria = 'Aminoácidos',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu AminoMix Sachê C/30');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu AminoMix Sachê C/30', 95.9, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_aminomix_sache_c_30_123_1_c457b99753b198020103b929f2347e4d.png', 'Aminoácidos', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu AminoMix Sachê C/30')
);

-- Piu Brain C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 201.5,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_brain_c_60_91_1_1019bd60368304e6ce7f6fa1f9eb02ad.png',
  categoria = 'Cérebro / Foco / Cognição',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Brain C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Brain C/60', 201.5, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_brain_c_60_91_1_1019bd60368304e6ce7f6fa1f9eb02ad.png', 'Cérebro / Foco / Cognição', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Brain C/60')
);

-- Piu Cuore C/30
UPDATE public.biblioteca_itens SET
  preco_sugerido = 95.2,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_cuore_c_30_125_1_661f4b1ba4b7e551365d4492e747cbc3.png',
  categoria = 'Saúde cardiovascular',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Cuore C/30');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Cuore C/30', 95.2, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_cuore_c_30_125_1_661f4b1ba4b7e551365d4492e747cbc3.png', 'Saúde cardiovascular', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Cuore C/30')
);

-- Piu Cuore D3 C/30
UPDATE public.biblioteca_itens SET
  preco_sugerido = 106.6,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_cuore_d3_c_30_127_1_346cb0d18380ddf93869446314c98c82.png',
  categoria = 'Saúde cardiovascular',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Cuore D3 C/30');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Cuore D3 C/30', 106.6, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_cuore_d3_c_30_127_1_346cb0d18380ddf93869446314c98c82.png', 'Saúde cardiovascular', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Cuore D3 C/30')
);

-- Piu Energy 1 C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 124.9,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_energy_1_c_60_129_1_84c81866d406cc5494b578e6faaca7a6.png',
  categoria = 'Pré-treino / Energia',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Energy 1 C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Energy 1 C/60', 124.9, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_energy_1_c_60_129_1_84c81866d406cc5494b578e6faaca7a6.png', 'Pré-treino / Energia', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Energy 1 C/60')
);

-- Piu Energy 2 C/30
UPDATE public.biblioteca_itens SET
  preco_sugerido = 83.3,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_energy_2_c_30_131_1_9d133931e9bac6b8229a7644ec69f55b.png',
  categoria = 'Pré-treino / Energia',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Energy 2 C/30');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Energy 2 C/30', 83.3, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_energy_2_c_30_131_1_9d133931e9bac6b8229a7644ec69f55b.png', 'Pré-treino / Energia', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Energy 2 C/30')
);

-- Piu MAG + Magnésio C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 101.1,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_mag_magnesio_c_60_135_1_32021e81ff9e1ac8f5637af413210680.png',
  categoria = 'Vitaminas e minerais',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu MAG + Magnésio C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu MAG + Magnésio C/60', 101.1, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_mag_magnesio_c_60_135_1_32021e81ff9e1ac8f5637af413210680.png', 'Vitaminas e minerais', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu MAG + Magnésio C/60')
);

-- Piu Max Colágeno C/30
UPDATE public.biblioteca_itens SET
  preco_sugerido = 101.1,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_max_colageno_c_30_137_1_608279a27c4121f4eeb8d2ed03c0c5bb.png',
  categoria = 'Colágeno / Articulações',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Max Colágeno C/30');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Max Colágeno C/30', 101.1, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_max_colageno_c_30_137_1_608279a27c4121f4eeb8d2ed03c0c5bb.png', 'Colágeno / Articulações', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Max Colágeno C/30')
);

-- Piu Multi AZ C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 83.3,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_multi_az_c_60_139_1_9644f52f84f7bd54089ddd1d1cdadc52.png',
  categoria = 'Vitaminas e minerais',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Multi AZ C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Multi AZ C/60', 83.3, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_multi_az_c_60_139_1_9644f52f84f7bd54089ddd1d1cdadc52.png', 'Vitaminas e minerais', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Multi AZ C/60')
);

-- Piu Multi Mulher C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 75.7,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_multi_mulher_c_60_141_1_a9832cd803579810b3d550c017d6cf52.png',
  categoria = 'Saúde feminina / Gestante',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Multi Mulher C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Multi Mulher C/60', 75.7, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_multi_mulher_c_60_141_1_a9832cd803579810b3d550c017d6cf52.png', 'Saúde feminina / Gestante', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Multi Mulher C/60')
);

-- Piu NAC Pro 200mg Sachê C/30
UPDATE public.biblioteca_itens SET
  preco_sugerido = 85.4,
  ciclo_recompra_dias = 28,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_nac_pro_200mg_sache_c_30_143_1_d89b7badad7dcbf8c71c9dba53f5b4cd.png',
  categoria = 'Fígado / Detox / Antioxidantes',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu NAC Pro 200mg Sachê C/30');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu NAC Pro 200mg Sachê C/30', 85.4, 28, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_nac_pro_200mg_sache_c_30_143_1_d89b7badad7dcbf8c71c9dba53f5b4cd.png', 'Fígado / Detox / Antioxidantes', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu NAC Pro 200mg Sachê C/30')
);

-- Piu Zen C/60
UPDATE public.biblioteca_itens SET
  preco_sugerido = 107.1,
  ciclo_recompra_dias = 58,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piu_zen_c_60_161_1_4eb02e3877835dbd8175949be56b0386.png',
  categoria = 'Sono / Relaxamento',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piu Zen C/60');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piu Zen C/60', 107.1, 58, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piu_zen_c_60_161_1_4eb02e3877835dbd8175949be56b0386.png', 'Sono / Relaxamento', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piu Zen C/60')
);

-- Piùfort Antiox
UPDATE public.biblioteca_itens SET
  preco_sugerido = 149.9,
  ciclo_recompra_dias = 30,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_antiox_177_1_64b6371e485d0a1131e39130941eb9b4.jpg',
  categoria = 'Fígado / Detox / Antioxidantes',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piùfort Antiox');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piùfort Antiox', 149.9, 30, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_antiox_177_1_64b6371e485d0a1131e39130941eb9b4.jpg', 'Fígado / Detox / Antioxidantes', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piùfort Antiox')
);

-- Piùfort Gestan
UPDATE public.biblioteca_itens SET
  preco_sugerido = 197,
  ciclo_recompra_dias = 30,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_gestan_179_1_1fa6d7bc258379b312651101db101f6e.jpg',
  categoria = 'Saúde feminina / Gestante',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piùfort Gestan');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piùfort Gestan', 197, 30, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_gestan_179_1_1fa6d7bc258379b312651101db101f6e.jpg', 'Saúde feminina / Gestante', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piùfort Gestan')
);

-- Piùfort Imune
UPDATE public.biblioteca_itens SET
  preco_sugerido = 99.9,
  ciclo_recompra_dias = 30,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_imune_181_1_f7c354d5edaa20f73c9b6e418fecdcf6.jpg',
  categoria = 'Imunidade',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piùfort Imune');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piùfort Imune', 99.9, 30, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_imune_181_1_f7c354d5edaa20f73c9b6e418fecdcf6.jpg', 'Imunidade', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piùfort Imune')
);

-- Piùfort Slim
UPDATE public.biblioteca_itens SET
  preco_sugerido = 109.9,
  ciclo_recompra_dias = 30,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_slim_185_1_b4595e7ff997dbf85c55d71f925e1bc1.jpg',
  categoria = 'Metabolismo / Controle de peso',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piùfort Slim');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piùfort Slim', 109.9, 30, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_slim_185_1_b4595e7ff997dbf85c55d71f925e1bc1.jpg', 'Metabolismo / Controle de peso', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piùfort Slim')
);

-- Piùfort Woman
UPDATE public.biblioteca_itens SET
  preco_sugerido = 99.9,
  ciclo_recompra_dias = 30,
  qtd_mensagens = 5,
  foto_url = 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_woman_183_1_64142bf4bc769ac2bc1b0459c0a21a94.jpg',
  categoria = 'Saúde feminina / Gestante',
  nicho = 'Suplementos / Produtos naturais',
  tipo_acordo = 'livre',
  ativo = true
WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
  AND lower(nome) = lower('Piùfort Woman');

INSERT INTO public.biblioteca_itens
  (biblioteca_id, nome, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, foto_url, categoria, nicho, parceiro_id, tipo_acordo, recorrente, comissionavel, ativo)
SELECT
  (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita'),
  'Piùfort Woman', 99.9, 30, 5, 'https://images.tcdn.com.br/img/img_prod/1357905/piufort_woman_183_1_64142bf4bc769ac2bc1b0459c0a21a94.jpg', 'Saúde feminina / Gestante', 'Suplementos / Produtos naturais',
  (SELECT id FROM public.parceiros WHERE nome = 'PiùVita'), 'livre', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.biblioteca_itens
  WHERE biblioteca_id = (SELECT id FROM public.bibliotecas WHERE slug = 'piuvita')
    AND lower(nome) = lower('Piùfort Woman')
);


COMMIT;
