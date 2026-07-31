-- 065_fix_templates_legado_plural.sql
--
-- Corrige exclusivamente o texto-fonte em mensagens_produto para os
-- templates padrão "clean"/"nenhum" que ficaram com concordância no
-- singular hardcoded (sem os placeholders produto_artigo/produto_devem/
-- produto_proximos/produto_possessivo) antes da correção de concordância
-- (commit 02b6f03). Não corrige avisos já gerados — decisão de produto:
-- não reescrever histórico. Efeito é somente para avisos gerados a partir
-- de agora.
--
-- Critério de elegibilidade: IGUALDADE EXATA de texto, caractere por
-- caractere. Nunca LIKE/ILIKE/REPLACE/correspondência parcial. Restrito a
-- tipo IN ('recompra','follow_up') + estilo='clean' + tipo_incentivo='nenhum'.
-- Qualquer diferença de um único caractere (personalização real do
-- lojista) permanece intocada.
--
-- Fora de escopo (backlog separado, não incluído aqui):
--   avisos.texto_renderizado já gerados
--   estilos consultivo/persuasivo/incentivo e overrides de incentivo
--
-- Não cria tabela de rollback permanente (decisão de produto). Rollback
-- manual, se necessário: reaplicar os mesmos três UPDATEs abaixo com
-- textos de origem/destino trocados (texto_novo -> texto_antigo),
-- resultado idêntico ao estado pré-migration, pois o critério de
-- igualdade exata garante que nenhuma linha fora do conjunto original
-- pode ter sido alcançada.
--
-- Idempotente: reexecutar após aplicado não altera nada (nenhuma linha
-- mais casa com o texto antigo).

DO $$
DECLARE
  v_esperado_recompra      integer;
  v_esperado_followup      integer;
  v_esperado_followup_db   integer;
  v_atualizado_recompra    integer;
  v_atualizado_followup    integer;
  v_atualizado_followup_db integer;
BEGIN
  -- ── 1. Quantidade esperada — mesmo predicado exato do UPDATE ────────────
  SELECT count(*) INTO v_esperado_recompra
    FROM public.mensagens_produto
   WHERE tipo = 'recompra' AND estilo = 'clean' AND tipo_incentivo = 'nenhum'
     AND texto = 'Oi {cliente}! Aqui é {vendedora} da {loja}. Seu {produto} deve estar acabando em breve! Quer garantir já o próximo?';

  SELECT count(*) INTO v_esperado_followup
    FROM public.mensagens_produto
   WHERE tipo = 'follow_up' AND estilo = 'clean' AND tipo_incentivo = 'nenhum'
     AND texto = 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe o {produto}. Posso deixar reservado para você até o fim do dia?';

  SELECT count(*) INTO v_esperado_followup_db
    FROM public.mensagens_produto
   WHERE tipo = 'follow_up' AND estilo = 'clean' AND tipo_incentivo = 'nenhum'
     AND texto = 'Oi {{cliente}}, passando só para confirmar se você ainda quer que eu separe o {{produto}}. Posso deixar reservado para você até o fim do dia?';

  -- ── 2. UPDATE por igualdade exata (nunca LIKE/REPLACE) ──────────────────
  UPDATE public.mensagens_produto
     SET texto = 'Oi {cliente}! Aqui é {vendedora} da {loja}. {produto_artigo} {produto} {produto_devem} estar acabando em breve! Quer garantir já {produto_proximos}?'
   WHERE tipo = 'recompra' AND estilo = 'clean' AND tipo_incentivo = 'nenhum'
     AND texto = 'Oi {cliente}! Aqui é {vendedora} da {loja}. Seu {produto} deve estar acabando em breve! Quer garantir já o próximo?';
  GET DIAGNOSTICS v_atualizado_recompra = ROW_COUNT;

  UPDATE public.mensagens_produto
     SET texto = 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe {produto_possessivo} {produto}. Posso deixar reservado para você até o fim do dia?'
   WHERE tipo = 'follow_up' AND estilo = 'clean' AND tipo_incentivo = 'nenhum'
     AND texto = 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe o {produto}. Posso deixar reservado para você até o fim do dia?';
  GET DIAGNOSTICS v_atualizado_followup = ROW_COUNT;

  UPDATE public.mensagens_produto
     SET texto = 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe {produto_possessivo} {produto}. Posso deixar reservado para você até o fim do dia?'
   WHERE tipo = 'follow_up' AND estilo = 'clean' AND tipo_incentivo = 'nenhum'
     AND texto = 'Oi {{cliente}}, passando só para confirmar se você ainda quer que eu separe o {{produto}}. Posso deixar reservado para você até o fim do dia?';
  GET DIAGNOSTICS v_atualizado_followup_db = ROW_COUNT;

  -- ── 3. Verificação — qualquer divergência aborta a transação inteira ────
  IF v_atualizado_recompra <> v_esperado_recompra
     OR v_atualizado_followup <> v_esperado_followup
     OR v_atualizado_followup_db <> v_esperado_followup_db THEN
    RAISE EXCEPTION 'Divergência — esperado (recompra=%, follow_up=%, follow_up_chave_dupla=%) atualizado (%,%,%). Migration abortada, nada persistido.',
      v_esperado_recompra, v_esperado_followup, v_esperado_followup_db,
      v_atualizado_recompra, v_atualizado_followup, v_atualizado_followup_db;
  END IF;

  RAISE NOTICE 'Migration 065 OK — recompra: %, follow_up: %, follow_up (chave dupla): %',
    v_atualizado_recompra, v_atualizado_followup, v_atualizado_followup_db;
END $$;
