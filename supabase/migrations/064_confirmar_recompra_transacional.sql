-- 064_confirmar_recompra_transacional.sql
--
-- Bug 2: condição de corrida em confirmarRecompra (app/(app)/avisos/actions.ts).
-- O guard de idempotência atual faz um SELECT e só depois escreve — duas
-- confirmações quase simultâneas do mesmo aviso podiam ambas ler "pendente"
-- antes de qualquer uma gravar recompra_id, gerando venda/recompra/comissão/
-- avisos futuros duplicados. Não há transação cobrindo as ~8 escritas hoje.
--
-- Esta migration cria uma função RPC que reserva o aviso âncora com
-- SELECT ... FOR UPDATE e executa toda a escrita numa única transação —
-- mesmo padrão arquitetural já usado em 057_editar_recompra_transacional.sql.
--
-- Divisão de responsabilidades (decidida na auditoria do Bug 2):
--   TypeScript: autenticação, autorização, validações de UX, cálculo de
--     comissão (calcularComissaoSemGravar), planejamento dos avisos futuros
--     (gerarAvisosParaVenda), montagem do payload.
--   RPC (esta função): fonte autoritativa de integridade — lock do aviso,
--     revalidação de aviso/venda/loja/cliente/produtos/itens, recomputação de
--     totais aritméticos, todas as escritas, fechamento dos avisos da
--     oportunidade original, idempotência, rollback automático em qualquer
--     falha.
--
-- Autorização não é duplicada aqui propositalmente: a função só é executável
-- por service_role (grants abaixo), inatingível por anon/authenticated — a
-- checagem de pertencimento à loja já foi feita em TS antes de chamar a RPC.
--
-- Não altera nenhuma tabela — só cria a função e ajusta grants.
--
-- Sobre o índice único em recompras.aviso_id (defesa em profundidade
-- cogitada na proposta): auditoria read-only feita antes desta migration —
--   staging (ynrffhacpjzohrhkpuiq): zero duplicidades.
--   produção (nhcppfovsxcsulyvwvgs): 5 aviso_id com 2 recompras cada, mas em
--     todos os casos uma delas tem id no padrão sintético c0000000-...,
--     venda_id NULL e o mesmo criado_em nas 5 (2026-06-23 19:00:48) —
--     inserção em lote de dado de seed/demo, não um incidente real da
--     condição de corrida (a outra recompra de cada par é real, com venda
--     vinculada, criada dias depois). Mesmo assim, por existir duplicidade,
--     o índice único NÃO é criado nesta migration — só o FOR UPDATE protege
--     por enquanto. Revisitar depois de uma limpeza específica do dado de
--     seed em produção, como migration separada.
--
-- Rollback: DROP FUNCTION public.confirmar_recompra_transacional(uuid, uuid, uuid, uuid, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.confirmar_recompra_transacional(
  p_actor_id       uuid,
  p_aviso_id       uuid,
  p_vendedora_id   uuid,
  p_nova_venda_id  uuid,
  p_itens          jsonb,
  p_avisos_futuros jsonb,
  p_comissao       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_aviso                       record;
  v_tipo_ancora                 text;
  v_recompra_existente          record;
  v_item                        jsonb;
  v_aviso_item                  jsonb;
  v_ids_recebidos               uuid[] := '{}';
  v_itens_para_fechar           uuid[];
  v_avisos_para_fechar          uuid[];
  v_valor_total                 numeric := 0;
  v_valor_base_comissao         numeric := 0;
  v_recompra_id                 uuid;
  v_item_venda_id_original      uuid;
  v_produto_id                  uuid;
  v_ancora_produto_id           uuid;
  v_produto_original_preservado boolean := false;
  v_agora                       timestamptz := now();
  v_count_avisos_encerrados     integer := 0;
  v_count_avisos_futuros        integer := 0;
BEGIN
  -- ── 1. Lock do aviso âncora — único registro travado nesta transação ──────
  SELECT id, venda_id, loja_id, cliente_id, item_venda_id, status, recompra_id, mensagem_id
    INTO v_aviso
    FROM public.avisos
   WHERE id = p_aviso_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION:Aviso não encontrado';
  END IF;

  -- ── 2. Idempotência: já confirmado — retorna dados reais, sem nova escrita ──
  -- Uma segunda chamada concorrente bloqueia no FOR UPDATE acima até a primeira
  -- commitar; ao acordar, cai exatamente aqui e nunca observa estado parcial.
  IF v_aviso.status = 'convertida' OR v_aviso.recompra_id IS NOT NULL THEN
    IF v_aviso.recompra_id IS NULL THEN
      RAISE EXCEPTION 'INTERNAL:Aviso convertido sem recompra vinculada';
    END IF;

    SELECT r.id, r.venda_id, r.valor_total, r.valor_base_comissao,
           cv.valor_comissao, cv.percentual, cv.tipo_comissao
      INTO v_recompra_existente
      FROM public.recompras r
      LEFT JOIN public.comissao_venda cv ON cv.venda_id = r.venda_id
     WHERE r.id = v_aviso.recompra_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INTERNAL:Recompra vinculada não encontrada';
    END IF;

    -- Aproximação razoável para o caminho idempotente: não temos mais o
    -- payload da chamada vencedora, só o que foi persistido. "Preservado"
    -- aqui significa "a venda final contém algum item com o mesmo produto do
    -- item âncora original", checado puramente a partir de dado gravado.
    IF v_aviso.item_venda_id IS NOT NULL THEN
      SELECT produto_id INTO v_ancora_produto_id
        FROM public.itens_venda WHERE id = v_aviso.item_venda_id;

      SELECT EXISTS (
        SELECT 1 FROM public.itens_venda
         WHERE venda_id = v_recompra_existente.venda_id
           AND produto_id IS NOT DISTINCT FROM v_ancora_produto_id
      ) INTO v_produto_original_preservado;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'ja_confirmada', true,
      'recompra_id', v_recompra_existente.id,
      'venda_id', v_recompra_existente.venda_id,
      'valor_total', v_recompra_existente.valor_total,
      'valor_base_comissao', v_recompra_existente.valor_base_comissao,
      'valor_comissao', COALESCE(v_recompra_existente.valor_comissao, 0),
      'percentual', COALESCE(v_recompra_existente.percentual, 0),
      'tipo_comissao', v_recompra_existente.tipo_comissao,
      'produto_original_preservado', v_produto_original_preservado,
      'avisos_encerrados', 0,
      'avisos_futuros_criados', 0
    );
  END IF;

  -- ── 3. Tipo elegível do aviso âncora ───────────────────────────────────────
  IF v_aviso.mensagem_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION:Este aviso não representa uma oportunidade de recompra';
  END IF;

  SELECT tipo INTO v_tipo_ancora FROM public.mensagens_produto WHERE id = v_aviso.mensagem_id;
  IF v_tipo_ancora IS NULL OR v_tipo_ancora NOT IN ('recompra', 'oferta', 'follow_up') THEN
    RAISE EXCEPTION 'VALIDATION:Este aviso não representa uma oportunidade de recompra';
  END IF;

  -- ── 4. Validar payload de itens (estrutura + pertencimento) ───────────────
  IF jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'VALIDATION:A recompra precisa ter pelo menos um produto';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    IF (v_item->>'item_venda_id_novo') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Item sem identificador';
    END IF;

    v_item_venda_id_original := NULLIF(v_item->>'item_venda_id_original', '')::uuid;

    IF v_item_venda_id_original IS NOT NULL THEN
      IF v_item_venda_id_original = ANY(v_ids_recebidos) THEN
        RAISE EXCEPTION 'VALIDATION:Produto duplicado na confirmação';
      END IF;
      v_ids_recebidos := array_append(v_ids_recebidos, v_item_venda_id_original);

      -- Precisa pertencer à MESMA venda do aviso âncora e ser recorrente —
      -- impede reaproveitar item_venda_id de outra venda/loja/cliente. O
      -- produto anexado pode ter sido substituído (Bug 1): não exigimos que
      -- bata com o produto originalmente gravado.
      IF NOT EXISTS (
        SELECT 1 FROM public.itens_venda
         WHERE id = v_item_venda_id_original
           AND venda_id = v_aviso.venda_id
           AND recorrente = true
      ) THEN
        RAISE EXCEPTION 'VALIDATION:Um dos produtos não pertence a esta oportunidade de recompra';
      END IF;
    END IF;

    v_produto_id := NULLIF(v_item->>'produto_id', '')::uuid;
    IF v_produto_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.produtos WHERE id = v_produto_id AND loja_id = v_aviso.loja_id
    ) THEN
      RAISE EXCEPTION 'VALIDATION:Um dos produtos não existe nesta loja';
    END IF;

    IF TRIM(COALESCE(v_item->>'produto_nome', '')) = '' THEN
      RAISE EXCEPTION 'VALIDATION:Produto sem nome';
    END IF;

    IF (v_item->>'quantidade')::numeric < 1 THEN
      RAISE EXCEPTION 'VALIDATION:Quantidade deve ser >= 1';
    END IF;

    IF (v_item->>'preco_unitario')::numeric < 0 THEN
      RAISE EXCEPTION 'VALIDATION:Preço não pode ser negativo';
    END IF;
  END LOOP;

  -- ── 5. Recomputar totais — aritmética determinística, não regra de negócio ──
  SELECT
    SUM((elem->>'quantidade')::numeric * (elem->>'preco_unitario')::numeric),
    SUM(CASE WHEN (elem->>'comissionavel')::boolean
             THEN (elem->>'quantidade')::numeric * (elem->>'preco_unitario')::numeric
             ELSE 0 END)
    INTO v_valor_total, v_valor_base_comissao
  FROM jsonb_array_elements(p_itens) AS elem;

  -- ── 6. Venda + itens_venda (IDs pré-gerados em TS, mesmo padrão de
  --        057_editar_recompra_transacional.sql para itens novos) ───────────
  INSERT INTO public.vendas (id, loja_id, cliente_id, vendedora_id, valor, data_compra, origem)
  VALUES (p_nova_venda_id, v_aviso.loja_id, v_aviso.cliente_id, p_vendedora_id, v_valor_total, CURRENT_DATE, 'recompra');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO public.itens_venda (
      id, venda_id, produto_id, produto_nome, recorrente, comissionavel,
      quantidade, valor_unitario, subtotal, ciclo_recompra_dias
    ) VALUES (
      (v_item->>'item_venda_id_novo')::uuid,
      p_nova_venda_id,
      NULLIF(v_item->>'produto_id', '')::uuid,
      v_item->>'produto_nome',
      true,
      (v_item->>'comissionavel')::boolean,
      (v_item->>'quantidade')::numeric,
      (v_item->>'preco_unitario')::numeric,
      (v_item->>'quantidade')::numeric * (v_item->>'preco_unitario')::numeric,
      NULLIF(v_item->>'ciclo_recompra_dias', '')::integer
    );
  END LOOP;

  -- ── 7. Recompra + itens_recompra ───────────────────────────────────────────
  INSERT INTO public.recompras (
    loja_id, cliente_id, vendedora_id, aviso_id, venda_original_id, valor_total, valor_base_comissao, venda_id
  ) VALUES (
    v_aviso.loja_id, v_aviso.cliente_id, p_vendedora_id, p_aviso_id, v_aviso.venda_id, v_valor_total, v_valor_base_comissao, p_nova_venda_id
  )
  RETURNING id INTO v_recompra_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO public.itens_recompra (
      recompra_id, produto_id, produto_nome, comissionavel, quantidade, valor_unitario, subtotal
    ) VALUES (
      v_recompra_id,
      NULLIF(v_item->>'produto_id', '')::uuid,
      v_item->>'produto_nome',
      (v_item->>'comissionavel')::boolean,
      (v_item->>'quantidade')::numeric,
      (v_item->>'preco_unitario')::numeric,
      (v_item->>'quantidade')::numeric * (v_item->>'preco_unitario')::numeric
    );
  END LOOP;

  -- ── 8. Comissão — já calculada em TS (calcularComissaoSemGravar); a RPC só
  --        grava o resultado, sem recalcular regra de negócio ─────────────────
  IF COALESCE((p_comissao->>'valor_comissao')::numeric, 0) > 0
     OR COALESCE((p_comissao->>'valor_base')::numeric, 0) > 0 THEN
    INSERT INTO public.comissao_venda (
      venda_id, vendedora_id, valor_venda, percentual, valor_comissao,
      tipo_comissao, campanha_id, comissao_fixa_produto_id, recompra_id
    ) VALUES (
      p_nova_venda_id,
      p_vendedora_id,
      COALESCE((p_comissao->>'valor_base')::numeric, 0),
      COALESCE((p_comissao->>'percentual')::numeric, 0),
      COALESCE((p_comissao->>'valor_comissao')::numeric, 0),
      NULLIF(p_comissao->>'tipo_comissao', ''),
      NULLIF(p_comissao->>'campanha_id', '')::uuid,
      NULLIF(p_comissao->>'comissao_fixa_produto_id', '')::uuid,
      v_recompra_id
    );
  END IF;

  -- ── 9. Encerrar avisos da oportunidade original, por IDs exatos ───────────
  -- Conjunto: o próprio aviso âncora (sempre, inclusive caso legado com
  -- item_venda_id nulo) + o item âncora (sempre — mesmo se substituído ou
  -- removido da seleção final, ver Bug 1) + qualquer item original mantido.
  v_itens_para_fechar := v_ids_recebidos;
  IF v_aviso.item_venda_id IS NOT NULL THEN
    v_itens_para_fechar := array_append(v_itens_para_fechar, v_aviso.item_venda_id);
  END IF;

  SELECT ARRAY(
    SELECT id FROM public.avisos
     WHERE venda_id = v_aviso.venda_id
       AND loja_id = v_aviso.loja_id
       AND cliente_id = v_aviso.cliente_id
       AND recompra_id IS NULL
       AND status IN ('pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada')
       AND item_venda_id = ANY(v_itens_para_fechar)
  ) INTO v_avisos_para_fechar;

  -- O aviso âncora recebe enviado_em (é o aviso efetivamente "acionado").
  UPDATE public.avisos
     SET status = 'convertida', enviado_em = v_agora, encerrado_em = v_agora,
         encerrado_por = p_vendedora_id, updated_at = v_agora, recompra_id = v_recompra_id
   WHERE id = p_aviso_id;
  v_count_avisos_encerrados := 1;

  IF array_length(v_avisos_para_fechar, 1) > 0 THEN
    UPDATE public.avisos
       SET status = 'convertida', encerrado_em = v_agora,
           encerrado_por = p_vendedora_id, updated_at = v_agora, recompra_id = v_recompra_id
     WHERE id = ANY(v_avisos_para_fechar)
       AND id <> p_aviso_id;
    GET DIAGNOSTICS v_count_avisos_encerrados = ROW_COUNT;
    v_count_avisos_encerrados := v_count_avisos_encerrados + 1;
  END IF;

  -- ── 10. Avisos futuros — já planejados em TS (gerarAvisosParaVenda).
  --         loja_id/cliente_id vêm do aviso âncora travado; vendedora_id vem
  --         do parâmetro; nenhum desses três é lido do jsonb do navegador ────
  FOR v_aviso_item IN SELECT * FROM jsonb_array_elements(p_avisos_futuros)
  LOOP
    IF (v_aviso_item->>'item_venda_id') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso futuro sem item_venda_id';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_itens) AS elem
       WHERE (elem->>'item_venda_id_novo')::uuid = (v_aviso_item->>'item_venda_id')::uuid
    ) THEN
      RAISE EXCEPTION 'VALIDATION:Aviso futuro referencia item fora da venda';
    END IF;
    IF (v_aviso_item->>'mensagem_id') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso futuro sem mensagem_id';
    END IF;
    IF TRIM(COALESCE(v_aviso_item->>'texto_renderizado', '')) = '' THEN
      RAISE EXCEPTION 'VALIDATION:Aviso futuro sem texto';
    END IF;
    IF (v_aviso_item->>'data_aviso') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso futuro sem data';
    END IF;
    PERFORM (v_aviso_item->>'data_aviso')::date;

    -- origem_recompra_id NÃO vem do payload: a recompra ainda não existia
    -- quando o TS planejou este array (v_recompra_id só passa a existir no
    -- passo 7, dentro desta mesma transação) — a RPC preenche com o valor
    -- real que ela mesma acabou de gerar.
    INSERT INTO public.avisos (
      venda_id, item_venda_id, loja_id, cliente_id, vendedora_id,
      mensagem_id, texto_renderizado, data_aviso, status, previsao_comissao, origem_recompra_id
    ) VALUES (
      p_nova_venda_id,
      (v_aviso_item->>'item_venda_id')::uuid,
      v_aviso.loja_id,
      v_aviso.cliente_id,
      p_vendedora_id,
      (v_aviso_item->>'mensagem_id')::uuid,
      v_aviso_item->>'texto_renderizado',
      (v_aviso_item->>'data_aviso')::date,
      'pendente',
      NULLIF(v_aviso_item->>'previsao_comissao', '')::numeric,
      v_recompra_id
    );
    v_count_avisos_futuros := v_count_avisos_futuros + 1;
  END LOOP;

  -- ── 11. Traço informativo: produto de origem preservado ou substituído? ────
  IF v_aviso.item_venda_id IS NOT NULL THEN
    SELECT produto_id INTO v_ancora_produto_id
      FROM public.itens_venda WHERE id = v_aviso.item_venda_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
    LOOP
      IF NULLIF(v_item->>'item_venda_id_original', '')::uuid = v_aviso.item_venda_id
         AND NULLIF(v_item->>'produto_id', '')::uuid IS NOT DISTINCT FROM v_ancora_produto_id THEN
        v_produto_original_preservado := true;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ja_confirmada', false,
    'recompra_id', v_recompra_id,
    'venda_id', p_nova_venda_id,
    'valor_total', v_valor_total,
    'valor_base_comissao', v_valor_base_comissao,
    'valor_comissao', COALESCE((p_comissao->>'valor_comissao')::numeric, 0),
    'percentual', COALESCE((p_comissao->>'percentual')::numeric, 0),
    'tipo_comissao', NULLIF(p_comissao->>'tipo_comissao', ''),
    'produto_original_preservado', v_produto_original_preservado,
    'avisos_encerrados', v_count_avisos_encerrados,
    'avisos_futuros_criados', v_count_avisos_futuros
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Segurança: só service_role pode invocar — inatingível por anon/authenticated,
-- mesmo padrão de 057_editar_recompra_transacional.sql.
REVOKE ALL ON FUNCTION public.confirmar_recompra_transacional(
  uuid, uuid, uuid, uuid, jsonb, jsonb, jsonb
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirmar_recompra_transacional(
  uuid, uuid, uuid, uuid, jsonb, jsonb, jsonb
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_recompra_transacional(
  uuid, uuid, uuid, uuid, jsonb, jsonb, jsonb
) TO service_role;
