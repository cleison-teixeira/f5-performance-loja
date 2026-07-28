-- Migration 059 — Edição transacional de campanhas
-- Aplicar SOMENTE no staging (ynrffhacpjzohrhkpuiq). NÃO aplicar em produção.
-- Cria editar_campanha_transacional_v1: RPC versionada que atualiza
-- campanhas_venda + itens + participantes + premiação em transação única.
-- Rollback: ver seção final deste arquivo.
-- Aditiva: apenas ALTER TABLE nullable e CREATE FUNCTION.

-- ─── Coluna de auditoria em campanhas_venda ───────────────────────────────────
-- Registra quem fez a última edição via wizard (audit trail).
ALTER TABLE public.campanhas_venda
  ADD COLUMN IF NOT EXISTS editado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL;

-- ─── RPC transacional ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.editar_campanha_transacional_v1(
  p_campanha_id       UUID,
  p_loja_id           UUID,
  p_campos            JSONB,
  p_itens             JSONB,
  p_participantes     JSONB,
  p_premiacao         JSONB   DEFAULT NULL,
  p_versao_esperada   TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    UUID;
  v_role       TEXT;
  v_status     TEXT;
  v_atualizado TIMESTAMPTZ;
  v_agora      TIMESTAMPTZ := NOW();
  v_item       JSONB;
  v_part       JSONB;
  v_faixa      JSONB;
  v_prod_ids   UUID[];
  v_perf_ids   UUID[];
  v_count      INTEGER;
  v_prem_id    UUID;
BEGIN
  -- ── 1. Usuário autenticado ─────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  -- ── 2. Role de gestor na loja ─────────────────────────────────────────────
  SELECT role INTO v_role
  FROM public.membros_loja
  WHERE perfil_id = v_user_id
    AND loja_id   = p_loja_id
    AND ativo     = true
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('dono','gerente','admin_f5','lider') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  END IF;

  -- ── 3. Campanha pertence à loja — buscar status e versão ──────────────────
  SELECT status, atualizado_em
  INTO v_status, v_atualizado
  FROM public.campanhas_venda
  WHERE id      = p_campanha_id
    AND loja_id = p_loja_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campanha não encontrada.');
  END IF;

  IF v_status IN ('encerrada','cancelada') THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Campanha encerrada ou cancelada não pode ser editada.');
  END IF;

  -- ── 4. Concorrência otimista ──────────────────────────────────────────────
  IF p_versao_esperada IS NOT NULL
     AND v_atualizado::TEXT <> p_versao_esperada THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Esta campanha foi alterada por outra pessoa. Atualize a página antes de salvar novamente.');
  END IF;

  -- ── 5. Produtos pertencem à loja ─────────────────────────────────────────
  IF jsonb_array_length(p_itens) > 0 THEN
    SELECT ARRAY(
      SELECT (x->>'produto_id')::UUID
      FROM jsonb_array_elements(p_itens) x
    ) INTO v_prod_ids;

    SELECT COUNT(*) INTO v_count
    FROM public.produtos
    WHERE id      = ANY(v_prod_ids)
      AND loja_id = p_loja_id
      AND ativo   = true;

    IF v_count <> array_length(v_prod_ids, 1) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'Um ou mais produtos não pertencem à loja.');
    END IF;
  END IF;

  -- ── 6. Participantes são membros ativos da loja ───────────────────────────
  IF jsonb_array_length(p_participantes) > 0 THEN
    SELECT ARRAY(
      SELECT (x->>'perfil_id')::UUID
      FROM jsonb_array_elements(p_participantes) x
    ) INTO v_perf_ids;

    SELECT COUNT(*) INTO v_count
    FROM public.membros_loja
    WHERE perfil_id = ANY(v_perf_ids)
      AND loja_id   = p_loja_id
      AND ativo     = true;

    IF v_count <> array_length(v_perf_ids, 1) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'Um ou mais participantes não são membros ativos desta loja.');
    END IF;
  END IF;

  -- ── 7. Atualizar cabeçalho (tipo e loja_id são imutáveis) ─────────────────
  UPDATE public.campanhas_venda SET
    nome              = TRIM(p_campos->>'nome'),
    descricao         = NULLIF(TRIM(COALESCE(p_campos->>'descricao', '')), ''),
    orientacao_equipe = NULLIF(TRIM(COALESCE(p_campos->>'orientacao_equipe', '')), ''),
    objetivo          = NULLIF(TRIM(COALESCE(p_campos->>'objetivo', '')), ''),
    data_inicio       = (p_campos->>'data_inicio')::DATE,
    data_fim          = (p_campos->>'data_fim')::DATE,
    meta_individual   = NULLIF(p_campos->>'meta_individual', '')::NUMERIC,
    meta_loja         = NULLIF(p_campos->>'meta_loja', '')::NUMERIC,
    periodicidade     = p_campos->>'periodicidade',
    unidade_meta      = p_campos->>'unidade_meta',
    editado_por       = v_user_id,
    atualizado_em     = v_agora
  WHERE id      = p_campanha_id
    AND loja_id = p_loja_id;

  -- ── 8. Upsert itens (nunca deletar — inativar para preservar histórico) ────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO public.campanhas_venda_itens (
      campanha_id, produto_id,
      quantidade_conteudo, unidade_conteudo,
      preco_campanha, preco_referencia,
      ciclo_recompra_dias, ativo, ordem, atualizado_em
    ) VALUES (
      p_campanha_id,
      (v_item->>'produto_id')::UUID,
      (v_item->>'quantidade_conteudo')::NUMERIC,
      v_item->>'unidade_conteudo',
      (v_item->>'preco_campanha')::NUMERIC,
      NULLIF(v_item->>'preco_referencia', '')::NUMERIC,
      NULLIF(v_item->>'ciclo_recompra_dias', '')::INTEGER,
      true,
      COALESCE((v_item->>'ordem')::SMALLINT, 0),
      v_agora
    )
    ON CONFLICT (campanha_id, produto_id) DO UPDATE SET
      quantidade_conteudo = EXCLUDED.quantidade_conteudo,
      unidade_conteudo    = EXCLUDED.unidade_conteudo,
      preco_campanha      = EXCLUDED.preco_campanha,
      preco_referencia    = EXCLUDED.preco_referencia,
      ciclo_recompra_dias = EXCLUDED.ciclo_recompra_dias,
      ativo               = true,
      ordem               = EXCLUDED.ordem,
      atualizado_em       = v_agora;
  END LOOP;

  -- Inativar produtos removidos (preservar campanha_item_id para snapshots)
  IF v_prod_ids IS NOT NULL AND array_length(v_prod_ids, 1) > 0 THEN
    UPDATE public.campanhas_venda_itens
    SET ativo = false, atualizado_em = v_agora
    WHERE campanha_id = p_campanha_id
      AND produto_id  <> ALL(v_prod_ids);
  ELSE
    UPDATE public.campanhas_venda_itens
    SET ativo = false, atualizado_em = v_agora
    WHERE campanha_id = p_campanha_id;
  END IF;

  -- ── 9. Substituir participantes (inativar existentes; reativar/inserir novos) ─
  UPDATE public.campanhas_venda_participantes
  SET ativo    = false,
      data_fim = v_agora::DATE
  WHERE campanha_id = p_campanha_id;

  FOR v_part IN SELECT * FROM jsonb_array_elements(p_participantes)
  LOOP
    INSERT INTO public.campanhas_venda_participantes (
      campanha_id, perfil_id, meta_individual, ativo, data_fim
    ) VALUES (
      p_campanha_id,
      (v_part->>'perfil_id')::UUID,
      NULLIF(v_part->>'meta_individual', '')::NUMERIC,
      true,
      NULL
    )
    ON CONFLICT (campanha_id, perfil_id) DO UPDATE SET
      meta_individual = EXCLUDED.meta_individual,
      ativo           = true,
      data_fim        = NULL;
  END LOOP;

  -- ── 10. Premiação (não altera snapshots nem apurações existentes) ──────────
  IF p_premiacao IS NOT NULL AND p_premiacao->>'tipo' IS DISTINCT FROM 'sem_premiacao' THEN

    INSERT INTO public.campanhas_premiacao (
      campanha_id, tipo, valor, percentual,
      meta_gatilho, progressiva_retroativa, ativo, atualizado_em
    ) VALUES (
      p_campanha_id,
      p_premiacao->>'tipo',
      NULLIF(p_premiacao->>'valor', '')::NUMERIC,
      NULLIF(p_premiacao->>'percentual', '')::NUMERIC,
      NULLIF(p_premiacao->>'meta_gatilho', '')::NUMERIC,
      COALESCE((p_premiacao->>'progressiva_retroativa')::BOOLEAN, false),
      true,
      v_agora
    )
    ON CONFLICT (campanha_id) DO UPDATE SET
      tipo                   = EXCLUDED.tipo,
      valor                  = EXCLUDED.valor,
      percentual             = EXCLUDED.percentual,
      meta_gatilho           = EXCLUDED.meta_gatilho,
      progressiva_retroativa = EXCLUDED.progressiva_retroativa,
      ativo                  = true,
      versao                 = public.campanhas_premiacao.versao + 1,
      atualizado_em          = v_agora
    RETURNING id INTO v_prem_id;

    -- Faixas progressivas: reconstruir (IDs efêmeros; snapshots gravam JSONB, não FK)
    IF p_premiacao->>'tipo' = 'faixa_progressiva'
       AND p_premiacao->'faixas' IS NOT NULL
       AND jsonb_array_length(p_premiacao->'faixas') > 0 THEN

      DELETE FROM public.campanhas_premiacao_faixas WHERE premiacao_id = v_prem_id;

      FOR v_faixa IN SELECT * FROM jsonb_array_elements(p_premiacao->'faixas')
      LOOP
        INSERT INTO public.campanhas_premiacao_faixas (
          premiacao_id, quantidade_de, quantidade_ate,
          valor_por_unidade, ordem
        ) VALUES (
          v_prem_id,
          (v_faixa->>'quantidade_de')::NUMERIC,
          NULLIF(v_faixa->>'quantidade_ate', '')::NUMERIC,
          (v_faixa->>'valor_por_unidade')::NUMERIC,
          COALESCE((v_faixa->>'ordem')::SMALLINT, 0)
        );
      END LOOP;
    END IF;

  ELSE
    -- Desativar regra existente (nunca deletar — pode ter snapshots vinculados)
    UPDATE public.campanhas_premiacao
    SET ativo = false, atualizado_em = v_agora
    WHERE campanha_id = p_campanha_id;
  END IF;

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  -- Qualquer exceção provoca rollback implícito de toda a função.
  -- O caller verifica ok=false e exibe error ao usuário.
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ─── Permissões ───────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.editar_campanha_transacional_v1(UUID,UUID,JSONB,JSONB,JSONB,JSONB,TEXT)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.editar_campanha_transacional_v1(UUID,UUID,JSONB,JSONB,JSONB,JSONB,TEXT)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.editar_campanha_transacional_v1(UUID,UUID,JSONB,JSONB,JSONB,JSONB,TEXT)
  TO authenticated;

-- ─── SQL de rollback ─────────────────────────────────────────────────────────
-- Executar manualmente no staging se necessário reverter:
--
-- DROP FUNCTION IF EXISTS public.editar_campanha_transacional_v1(UUID,UUID,JSONB,JSONB,JSONB,JSONB,TEXT);
-- ALTER TABLE public.campanhas_venda DROP COLUMN IF EXISTS editado_por;
