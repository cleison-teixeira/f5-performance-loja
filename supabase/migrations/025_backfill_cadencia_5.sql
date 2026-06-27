-- Migration 025: Backfill active recurring products to 5 messages cadence
--
-- 1. Normalizar campos vazios (estilo, tipo_incentivo) dos templates existentes
-- 2. Atualizar a quantidade padrão de mensagens nos produtos recorrentes ativos
-- 3. Backfill de templates faltantes (ordem 4 e 5) ou correção de offsets (dias_apos_venda) com base na fórmula oficial

BEGIN;

DO $$
DECLARE
    p_rec RECORD;
    v_dias_recompra INTEGER;
    v_ciclo INTEGER;
    v_dias_oferta INTEGER;
    v_dias_follow_up INTEGER;
    v_prod_count INTEGER := 0;
    v_msg_count INTEGER := 0;
BEGIN
    -- 1. Normalizar campos vazios dos templates existentes dos produtos recorrentes ativos
    UPDATE public.mensagens_produto
    SET estilo = COALESCE(NULLIF(TRIM(estilo), ''), 'clean'),
        tipo_incentivo = COALESCE(NULLIF(TRIM(tipo_incentivo), ''), 'nenhum')
    WHERE produto_id IN (SELECT id FROM public.produtos WHERE recorrente = true AND ativo = true);

    -- 2. Atualizar a quantidade padrão de mensagens nos produtos recorrentes ativos
    WITH updated_prods AS (
        UPDATE public.produtos
        SET qtd_mensagens = 5
        WHERE recorrente = true 
          AND ativo = true 
          AND (qtd_mensagens IS NULL OR qtd_mensagens < 5)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_prod_count FROM updated_prods;

    -- 3. Loop pelos produtos recorrentes ativos para inserir templates de ordem 4 e 5 faltantes ou corrigir dias_apos_venda
    FOR p_rec IN (
        SELECT id FROM public.produtos WHERE recorrente = true AND ativo = true
    ) LOOP
        -- Tenta obter o dias_apos_venda da mensagem de recompra (ordem 3)
        v_dias_recompra := NULL;
        SELECT dias_apos_venda INTO v_dias_recompra
        FROM public.mensagens_produto
        WHERE produto_id = p_rec.id AND ordem = 3
        LIMIT 1;

        -- Fallback seguro se não existir
        IF v_dias_recompra IS NULL OR v_dias_recompra <= 0 THEN
            v_dias_recompra := 25;
        END IF;

        -- ciclo = recompra + 5
        v_ciclo := v_dias_recompra + 5;
        
        -- Cálculo da cadência inteligente baseada na fórmula oficial
        v_dias_oferta := v_ciclo - 1;       -- recompra + 4
        v_dias_follow_up := v_ciclo + 2;    -- recompra + 7

        -- Garantir ordem 4 (oferta)
        IF NOT EXISTS (
            SELECT 1 FROM public.mensagens_produto 
            WHERE produto_id = p_rec.id AND ordem = 4
        ) THEN
            INSERT INTO public.mensagens_produto (
                produto_id, 
                ordem, 
                tipo, 
                dias_apos_venda, 
                texto, 
                estilo, 
                tipo_incentivo
            )
            VALUES (
                p_rec.id, 
                4, 
                'oferta', 
                v_dias_oferta, 
                'Oi {cliente}! Aqui é {vendedora} da {loja}. Temos uma novidade especial de {produto} para você. Quer saber mais?',
                'clean',
                'nenhum'
            );
            v_msg_count := v_msg_count + 1;
        ELSE
            -- Se já existe, corrigir dias_apos_venda se estiver fora da fórmula
            UPDATE public.mensagens_produto
            SET dias_apos_venda = v_dias_oferta
            WHERE produto_id = p_rec.id AND ordem = 4 AND dias_apos_venda <> v_dias_oferta;
        END IF;

        -- Garantir ordem 5 (follow_up)
        IF NOT EXISTS (
            SELECT 1 FROM public.mensagens_produto 
            WHERE produto_id = p_rec.id AND ordem = 5
        ) THEN
            INSERT INTO public.mensagens_produto (
                produto_id, 
                ordem, 
                tipo, 
                dias_apos_venda, 
                texto, 
                estilo, 
                tipo_incentivo
            )
            VALUES (
                p_rec.id, 
                5, 
                'follow_up', 
                v_dias_follow_up, 
                'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe o {produto}. Posso deixar reservado para você até o fim do dia?',
                'clean',
                'nenhum'
            );
            v_msg_count := v_msg_count + 1;
        ELSE
            -- Se já existe, corrigir dias_apos_venda se estiver fora da fórmula
            UPDATE public.mensagens_produto
            SET dias_apos_venda = v_dias_follow_up
            WHERE produto_id = p_rec.id AND ordem = 5 AND dias_apos_venda <> v_dias_follow_up;
        END IF;
    END LOOP;

    RAISE NOTICE 'Backfill finalizado. % produtos atualizados para 5 mensagens. % novos templates de cadência criados.', v_prod_count, v_msg_count;
END $$;

-- 4. Bloco de validação pós-migration com testes exatos de conformidade
DO $$
DECLARE
    v_count_prods_less_5 INTEGER;
    v_count_missing_any_ordem INTEGER;
    v_count_invalid_oferta INTEGER;
    v_count_invalid_follow_up INTEGER;
BEGIN
    -- Validar que todos os produtos recorrentes ativos têm qtd_mensagens = 5
    SELECT COUNT(*) INTO v_count_prods_less_5
    FROM public.produtos
    WHERE recorrente = true AND ativo = true AND (qtd_mensagens IS NULL OR qtd_mensagens < 5);

    -- Validar que todos os produtos recorrentes ativos tenham ordens 1, 2, 3, 4 e 5
    SELECT COUNT(DISTINCT p.id) INTO v_count_missing_any_ordem
    FROM public.produtos p
    CROSS JOIN generate_series(1, 5) o(ordem_num)
    WHERE p.recorrente = true AND p.ativo = true
      AND NOT EXISTS (
          SELECT 1 
          FROM public.mensagens_produto m 
          WHERE m.produto_id = p.id AND m.ordem = o.ordem_num
      );

    -- Oferta (ordem 4) deve ter dias_apos_venda = recompra (ordem 3) + 4
    SELECT COUNT(*) INTO v_count_invalid_oferta
    FROM public.mensagens_produto m4
    JOIN public.mensagens_produto m3 ON m3.produto_id = m4.produto_id AND m3.ordem = 3
    JOIN public.produtos p ON p.id = m4.produto_id
    WHERE p.recorrente = true AND p.ativo = true AND m4.ordem = 4
      AND m4.dias_apos_venda <> (m3.dias_apos_venda + 4);

    -- Follow-up (ordem 5) deve ser maior que oferta (ordem 4)
    SELECT COUNT(*) INTO v_count_invalid_follow_up
    FROM public.mensagens_produto m5
    JOIN public.mensagens_produto m3 ON m3.produto_id = m5.produto_id AND m3.ordem = 3
    JOIN public.produtos p ON p.id = m5.produto_id
    WHERE p.recorrente = true AND p.ativo = true AND m5.ordem = 5
      AND m5.dias_apos_venda <> (m3.dias_apos_venda + 7);

    IF v_count_prods_less_5 > 0 THEN
        RAISE EXCEPTION 'Erro de Validação: Existem produtos recorrentes ativos com qtd_mensagens < 5';
    END IF;

    IF v_count_missing_any_ordem > 0 THEN
        RAISE EXCEPTION 'Erro de Validação: Existem produtos recorrentes ativos com mensagens incompletas (faltando ordens de 1 a 5)';
    END IF;

    IF v_count_invalid_oferta > 0 THEN
        RAISE EXCEPTION 'Erro de Validação: Existem templates de oferta fora da fórmula oficial (recompra + 4)';
    END IF;

    IF v_count_invalid_follow_up > 0 THEN
        RAISE EXCEPTION 'Erro de Validação: Existem templates de follow-up fora da fórmula oficial (recompra + 7)';
    END IF;
END $$;

COMMIT;
