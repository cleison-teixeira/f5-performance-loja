-- 057_editar_recompra_transacional.sql
-- Adds optimistic locking column to vendas and creates the transactional RPC for editing recompras.

-- Deterministic: no IF NOT EXISTS — this migration must apply exactly once.
ALTER TABLE public.vendas
  ADD COLUMN versao integer NOT NULL DEFAULT 1;

-- Rollback: DROP FUNCTION public.editar_recompra_transacional(...); ALTER TABLE public.vendas DROP COLUMN versao;

CREATE OR REPLACE FUNCTION public.editar_recompra_transacional(
  p_actor_id        uuid,
  p_venda_id        uuid,
  p_vendedora_id    uuid,
  p_versao_esperada integer,
  p_itens           jsonb,
  p_avisos_futuros  jsonb,
  p_comissao        jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venda                   record;
  v_versao_atual            integer;
  v_recompra_id             uuid;
  v_valor_total             numeric;
  v_valor_base_comissao     numeric;
  v_item                    jsonb;
  v_aviso                   jsonb;
  v_ids_enviados            uuid[];
  v_ids_atuais              uuid[];
  v_ids_removidos           uuid[];
  v_item_id                 uuid;
  v_mensagem_id             uuid;
  v_produto_id_ancora       uuid;
  v_aviso_tipo              text;
  v_aviso_tipos             text[];
  v_aviso_tipo_date         text[];
  v_aviso_date              text;
  v_seen_ids                uuid[];
  v_final_ids               uuid[];
  v_count                   integer;
  v_count_itens_removidos   integer;
  v_count_itens_atualizados integer;
  v_count_itens_adicionados integer;
  v_count_avisos_removidos  integer;
  v_count_avisos_criados    integer;
BEGIN
  v_seen_ids                := '{}';
  v_final_ids               := '{}';
  v_aviso_tipos             := '{}';
  v_aviso_tipo_date         := '{}';
  v_count_itens_removidos   := 0;
  v_count_itens_atualizados := 0;
  v_count_itens_adicionados := 0;
  v_count_avisos_removidos  := 0;
  v_count_avisos_criados    := 0;

  -- ── 1. Lock the venda row ─────────────────────────────────────────────────
  SELECT id, versao, loja_id, cliente_id, vendedora_id, data_compra, origem
    INTO v_venda
    FROM public.vendas
   WHERE id = p_venda_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION:Venda não encontrada';
  END IF;

  IF v_venda.origem <> 'recompra' THEN
    RAISE EXCEPTION 'VALIDATION:Apenas recompras podem ser editadas por este endpoint';
  END IF;

  -- ── 2. Optimistic lock check ──────────────────────────────────────────────
  v_versao_atual := v_venda.versao;
  IF v_versao_atual <> p_versao_esperada THEN
    RAISE EXCEPTION 'CONFLICT:A recompra foi alterada por outro usuário. Recarregue e tente novamente.';
  END IF;

  -- ── 3. Validate actor and vendedora memberships ───────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = p_actor_id) THEN
    RAISE EXCEPTION 'VALIDATION:Usuário não encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.membros_loja
     WHERE perfil_id = p_actor_id
       AND loja_id   = v_venda.loja_id
       AND ativo     = true
  ) THEN
    RAISE EXCEPTION 'VALIDATION:Sem permissão para editar esta recompra';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.membros_loja
     WHERE perfil_id = p_vendedora_id
       AND loja_id   = v_venda.loja_id
       AND ativo     = true
  ) THEN
    RAISE EXCEPTION 'VALIDATION:Responsável não pertence à loja';
  END IF;

  -- ── 4. Validate payload structure ────────────────────────────────────────
  IF jsonb_typeof(p_itens) <> 'array' THEN
    RAISE EXCEPTION 'VALIDATION:Payload inválido: itens deve ser um array';
  END IF;

  IF jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'VALIDATION:A recompra precisa ter pelo menos um produto';
  END IF;

  IF jsonb_typeof(p_avisos_futuros) <> 'array' THEN
    RAISE EXCEPTION 'VALIDATION:Payload inválido: avisos_futuros deve ser um array';
  END IF;

  -- ── 5. Validate each item ────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    IF (v_item->>'item_venda_id') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Payload inválido: item sem ID';
    END IF;

    v_item_id := (v_item->>'item_venda_id')::uuid;

    IF v_item_id = ANY(v_seen_ids) THEN
      RAISE EXCEPTION 'VALIDATION:Payload inválido: IDs de item duplicados';
    END IF;

    IF TRIM(COALESCE(v_item->>'produto_nome', '')) = '' THEN
      RAISE EXCEPTION 'VALIDATION:Payload inválido: produto_nome não pode ser vazio';
    END IF;

    IF (v_item->>'quantidade')::integer < 1 THEN
      RAISE EXCEPTION 'VALIDATION:Payload inválido: quantidade deve ser >= 1';
    END IF;

    IF (v_item->>'preco_unitario')::numeric < 0 THEN
      RAISE EXCEPTION 'VALIDATION:Payload inválido: valor_unitario não pode ser negativo';
    END IF;

    IF NOT (v_item->>'is_novo')::boolean THEN
      -- Existing item must belong to this venda
      IF NOT EXISTS (
        SELECT 1 FROM public.itens_venda
         WHERE id       = v_item_id
           AND venda_id = p_venda_id
      ) THEN
        RAISE EXCEPTION 'VALIDATION:Item não pertence a esta recompra';
      END IF;
    ELSE
      -- New item UUID must not already exist
      IF EXISTS (SELECT 1 FROM public.itens_venda WHERE id = v_item_id) THEN
        RAISE EXCEPTION 'VALIDATION:ID de novo item já existe';
      END IF;
    END IF;

    v_seen_ids  := array_append(v_seen_ids, v_item_id);
    v_final_ids := array_append(v_final_ids, v_item_id);
  END LOOP;

  -- ── 6. Validate commission payload ───────────────────────────────────────
  IF (p_comissao->>'valor_comissao') IS NOT NULL
     AND (p_comissao->>'valor_comissao')::numeric < 0 THEN
    RAISE EXCEPTION 'VALIDATION:Payload inválido: valor_comissao não pode ser negativo';
  END IF;

  IF (p_comissao->>'percentual') IS NOT NULL
     AND (p_comissao->>'percentual')::numeric < 0 THEN
    RAISE EXCEPTION 'VALIDATION:Payload inválido: percentual não pode ser negativo';
  END IF;

  IF (p_comissao->>'valor_base') IS NOT NULL
     AND (p_comissao->>'valor_base')::numeric < 0 THEN
    RAISE EXCEPTION 'VALIDATION:Payload inválido: valor_base não pode ser negativo';
  END IF;

  -- ── 7. Validate each aviso (before any write) ────────────────────────────
  FOR v_aviso IN SELECT * FROM jsonb_array_elements(p_avisos_futuros)
  LOOP
    -- mensagem_id must be a non-null valid UUID
    IF (v_aviso->>'mensagem_id') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso sem mensagem_id';
    END IF;
    v_mensagem_id := (v_aviso->>'mensagem_id')::uuid;

    -- get anchor product_id from p_itens for this aviso's item_venda_id
    SELECT (elem->>'produto_id')::uuid
      INTO v_produto_id_ancora
      FROM jsonb_array_elements(p_itens) AS elem
     WHERE (elem->>'item_venda_id')::uuid = (v_aviso->>'item_venda_id')::uuid
     LIMIT 1;

    IF v_produto_id_ancora IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso referencia item sem produto_id definido';
    END IF;

    -- mensagem must exist in mensagens_produto AND belong to anchor product; capture its tipo
    SELECT tipo INTO v_aviso_tipo
      FROM public.mensagens_produto
     WHERE id         = v_mensagem_id
       AND produto_id = v_produto_id_ancora;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'VALIDATION:Mensagem não pertence ao produto âncora da sequência';
    END IF;

    -- tipo must not be agradecimento
    IF v_aviso_tipo = 'agradecimento' THEN
      RAISE EXCEPTION 'VALIDATION:Aviso de agradecimento não permitido em recompra';
    END IF;

    -- tipo must belong to allowed stages
    IF v_aviso_tipo NOT IN ('recompra', 'oferta', 'follow_up', 'relacionamento') THEN
      RAISE EXCEPTION 'VALIDATION:Tipo de aviso não permitido: %', v_aviso_tipo;
    END IF;

    -- texto_renderizado must not be empty
    IF TRIM(COALESCE(v_aviso->>'texto_renderizado', '')) = '' THEN
      RAISE EXCEPTION 'VALIDATION:Aviso com texto_renderizado vazio';
    END IF;

    -- data_aviso must be present and parseable as date
    IF (v_aviso->>'data_aviso') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso sem data_aviso';
    END IF;
    PERFORM (v_aviso->>'data_aviso')::date;

    -- item_venda_id must be in the set of final item IDs from p_itens
    IF (v_aviso->>'item_venda_id') IS NULL THEN
      RAISE EXCEPTION 'VALIDATION:Aviso sem item_venda_id';
    END IF;
    IF NOT ((v_aviso->>'item_venda_id')::uuid = ANY(v_final_ids)) THEN
      RAISE EXCEPTION 'VALIDATION:Aviso referencia item não incluído no payload';
    END IF;

    -- referenced item must be recorrente (checked against p_itens payload)
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_itens) AS elem
       WHERE (elem->>'item_venda_id')::uuid = (v_aviso->>'item_venda_id')::uuid
         AND (elem->>'recorrente')::boolean = true
    ) THEN
      RAISE EXCEPTION 'VALIDATION:Aviso referencia item não recorrente';
    END IF;

    -- no duplicate tipo within this payload
    IF v_aviso_tipo = ANY(v_aviso_tipos) THEN
      RAISE EXCEPTION 'VALIDATION:Payload contém mais de um aviso do tipo %', v_aviso_tipo;
    END IF;
    v_aviso_tipos := array_append(v_aviso_tipos, v_aviso_tipo);

    -- no duplicate tipo + data_aviso pair
    v_aviso_date := v_aviso_tipo || ':' || (v_aviso->>'data_aviso');
    IF v_aviso_date = ANY(v_aviso_tipo_date) THEN
      RAISE EXCEPTION 'VALIDATION:Aviso com tipo e data duplicados';
    END IF;
    v_aviso_tipo_date := array_append(v_aviso_tipo_date, v_aviso_date);

    -- previsao_comissao must be non-negative when present
    IF (v_aviso->>'previsao_comissao') IS NOT NULL
       AND (v_aviso->>'previsao_comissao')::numeric < 0 THEN
      RAISE EXCEPTION 'VALIDATION:previsao_comissao não pode ser negativa';
    END IF;
  END LOOP;

  -- ── 8. Identify removed items ─────────────────────────────────────────────
  SELECT ARRAY(
    SELECT id FROM public.itens_venda WHERE venda_id = p_venda_id
  ) INTO v_ids_atuais;

  SELECT ARRAY(
    SELECT (elem->>'item_venda_id')::uuid
      FROM jsonb_array_elements(p_itens) AS elem
     WHERE NOT (elem->>'is_novo')::boolean
  ) INTO v_ids_enviados;

  SELECT ARRAY(
    SELECT unnest(v_ids_atuais)
    EXCEPT
    SELECT unnest(v_ids_enviados)
  ) INTO v_ids_removidos;

  IF array_length(v_ids_removidos, 1) > 0 THEN
    -- ── 9. Desanchor historical avisos on removed items ────────────────────
    -- Historical = already acted on (sent, converted, etc.), not substitutable pending ones.
    -- Substitutable pending ones will be deleted in step 10 and won't be found by CASCADE.
    UPDATE public.avisos
       SET item_venda_id = NULL
     WHERE item_venda_id = ANY(v_ids_removidos)
       AND NOT (status IN ('pendente', 'reagendada') AND enviado_em IS NULL);
  END IF;

  -- ── 10. Delete all substitutable pending avisos for this venda ───────────
  -- Covers removed items AND existing items — all will be regenerated from new state.
  DELETE FROM public.avisos
   WHERE venda_id = p_venda_id
     AND status IN ('pendente', 'reagendada')
     AND enviado_em IS NULL;
  GET DIAGNOSTICS v_count_avisos_removidos = ROW_COUNT;

  -- ── 11. Delete removed itens_venda ───────────────────────────────────────
  -- After step 10, no substitutable pending avisos remain for these items,
  -- so CASCADE on delete will find no remaining rows.
  IF array_length(v_ids_removidos, 1) > 0 THEN
    DELETE FROM public.itens_venda WHERE id = ANY(v_ids_removidos);
    GET DIAGNOSTICS v_count_itens_removidos = ROW_COUNT;
  END IF;

  -- ── 12. Update existing itens_venda ──────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    CONTINUE WHEN (v_item->>'is_novo')::boolean;
    v_item_id := (v_item->>'item_venda_id')::uuid;
    UPDATE public.itens_venda
       SET produto_id          = CASE WHEN v_item->>'produto_id' IS NULL THEN NULL ELSE (v_item->>'produto_id')::uuid END,
           produto_nome        = v_item->>'produto_nome',
           quantidade          = (v_item->>'quantidade')::integer,
           valor_unitario      = (v_item->>'preco_unitario')::numeric,
           subtotal            = (v_item->>'quantidade')::integer * (v_item->>'preco_unitario')::numeric,
           recorrente          = (v_item->>'recorrente')::boolean,
           comissionavel       = (v_item->>'comissionavel')::boolean,
           ciclo_recompra_dias = CASE
             WHEN v_item->>'ciclo_recompra_dias' IS NULL THEN NULL
             ELSE (v_item->>'ciclo_recompra_dias')::integer
           END
     WHERE id       = v_item_id
       AND venda_id = p_venda_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      RAISE EXCEPTION 'VALIDATION:Item não encontrado para atualização';
    END IF;
    v_count_itens_atualizados := v_count_itens_atualizados + 1;
  END LOOP;

  -- ── 13. Insert new itens_venda with pre-generated UUIDs ──────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    CONTINUE WHEN NOT (v_item->>'is_novo')::boolean;
    INSERT INTO public.itens_venda (
      id, venda_id, produto_id, produto_nome,
      quantidade, valor_unitario, subtotal,
      recorrente, comissionavel, ciclo_recompra_dias
    ) VALUES (
      (v_item->>'item_venda_id')::uuid,
      p_venda_id,
      CASE WHEN v_item->>'produto_id' IS NULL THEN NULL ELSE (v_item->>'produto_id')::uuid END,
      v_item->>'produto_nome',
      (v_item->>'quantidade')::integer,
      (v_item->>'preco_unitario')::numeric,
      (v_item->>'quantidade')::integer * (v_item->>'preco_unitario')::numeric,
      (v_item->>'recorrente')::boolean,
      (v_item->>'comissionavel')::boolean,
      CASE
        WHEN v_item->>'ciclo_recompra_dias' IS NULL THEN NULL
        ELSE (v_item->>'ciclo_recompra_dias')::integer
      END
    );
    v_count_itens_adicionados := v_count_itens_adicionados + 1;
  END LOOP;

  -- ── 14. Recalculate totals from current state ────────────────────────────
  SELECT
    SUM(subtotal),
    SUM(CASE WHEN comissionavel THEN subtotal ELSE 0 END)
    INTO v_valor_total, v_valor_base_comissao
  FROM public.itens_venda
  WHERE venda_id = p_venda_id;

  -- ── 15. Update vendas header ──────────────────────────────────────────────
  UPDATE public.vendas
     SET valor        = COALESCE(v_valor_total, 0),
         vendedora_id = p_vendedora_id,
         versao       = v_versao_atual + 1
   WHERE id = p_venda_id;

  -- ── 16. Update recompras header ───────────────────────────────────────────
  SELECT id INTO v_recompra_id
    FROM public.recompras
   WHERE venda_id = p_venda_id
   LIMIT 1;

  IF v_recompra_id IS NOT NULL THEN
    UPDATE public.recompras
       SET valor_total         = COALESCE(v_valor_total, 0),
           valor_base_comissao = COALESCE(v_valor_base_comissao, 0),
           vendedora_id        = p_vendedora_id
     WHERE id = v_recompra_id;

    -- ── 17. Replace itens_recompra (no recorrente column) ─────────────────
    DELETE FROM public.itens_recompra WHERE recompra_id = v_recompra_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
    LOOP
      INSERT INTO public.itens_recompra (
        recompra_id, produto_id, produto_nome,
        comissionavel, quantidade, valor_unitario, subtotal
      ) VALUES (
        v_recompra_id,
        CASE WHEN v_item->>'produto_id' IS NULL THEN NULL ELSE (v_item->>'produto_id')::uuid END,
        v_item->>'produto_nome',
        (v_item->>'comissionavel')::boolean,
        (v_item->>'quantidade')::integer,
        (v_item->>'preco_unitario')::numeric,
        (v_item->>'quantidade')::integer * (v_item->>'preco_unitario')::numeric
      );
    END LOOP;
  END IF;

  -- ── 18. Replace comissao_venda ────────────────────────────────────────────
  -- comissao_venda has UNIQUE on venda_id — safe to DELETE + INSERT
  DELETE FROM public.comissao_venda WHERE venda_id = p_venda_id;

  IF COALESCE((p_comissao->>'valor_comissao')::numeric, 0) > 0
     OR COALESCE((p_comissao->>'valor_base')::numeric, 0) > 0 THEN
    INSERT INTO public.comissao_venda (
      venda_id, vendedora_id, valor_venda, percentual,
      valor_comissao, tipo_comissao, campanha_id, comissao_fixa_produto_id, recompra_id
    ) VALUES (
      p_venda_id,
      p_vendedora_id,
      COALESCE((p_comissao->>'valor_base')::numeric, 0),
      COALESCE((p_comissao->>'percentual')::numeric, 0),
      COALESCE((p_comissao->>'valor_comissao')::numeric, 0),
      NULLIF(p_comissao->>'tipo_comissao', ''),
      CASE WHEN p_comissao->>'campanha_id' IS NULL THEN NULL ELSE (p_comissao->>'campanha_id')::uuid END,
      CASE WHEN p_comissao->>'comissao_fixa_produto_id' IS NULL THEN NULL ELSE (p_comissao->>'comissao_fixa_produto_id')::uuid END,
      v_recompra_id
    );
  END IF;

  -- ── 19. Insert new avisos ─────────────────────────────────────────────────
  FOR v_aviso IN SELECT * FROM jsonb_array_elements(p_avisos_futuros)
  LOOP
    INSERT INTO public.avisos (
      venda_id, item_venda_id, loja_id, cliente_id, vendedora_id,
      mensagem_id, texto_renderizado, data_aviso, status, origem_recompra_id
    ) VALUES (
      (v_aviso->>'venda_id')::uuid,
      (v_aviso->>'item_venda_id')::uuid,
      (v_aviso->>'loja_id')::uuid,
      (v_aviso->>'cliente_id')::uuid,
      (v_aviso->>'vendedora_id')::uuid,
      (v_aviso->>'mensagem_id')::uuid,
      v_aviso->>'texto_renderizado',
      (v_aviso->>'data_aviso')::date,
      'pendente',
      CASE WHEN v_aviso->>'origem_recompra_id' IS NULL THEN NULL ELSE (v_aviso->>'origem_recompra_id')::uuid END
    );
    v_count_avisos_criados := v_count_avisos_criados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',                  true,
    'versao_anterior',     v_versao_atual,
    'versao_nova',         v_versao_atual + 1,
    'itens_removidos',     v_count_itens_removidos,
    'itens_adicionados',   v_count_itens_adicionados,
    'itens_atualizados',   v_count_itens_atualizados,
    'avisos_removidos',    v_count_avisos_removidos,
    'avisos_criados',      v_count_avisos_criados,
    'valor_total',         COALESCE(v_valor_total, 0),
    'valor_base_comissao', COALESCE(v_valor_base_comissao, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Security: only service_role can invoke this function
REVOKE ALL ON FUNCTION public.editar_recompra_transacional(
  uuid, uuid, uuid, integer, jsonb, jsonb, jsonb
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.editar_recompra_transacional(
  uuid, uuid, uuid, integer, jsonb, jsonb, jsonb
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.editar_recompra_transacional(
  uuid, uuid, uuid, integer, jsonb, jsonb, jsonb
) TO service_role;
