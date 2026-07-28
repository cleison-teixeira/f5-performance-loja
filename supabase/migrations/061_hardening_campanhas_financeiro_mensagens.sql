-- Migration 061 — Hardening: motivo obrigatório em cancelamento e resolução
-- Aplicar SOMENTE no staging (ynrffhacpjzohrhkpuiq). NÃO aplicar em produção.
-- Substitui cancelar_venda_campanha_v1 e resolver_revisao_apuracao_v1 com validação
-- de motivo/observação não vazia. Nenhuma alteração de schema — apenas funções.
-- Rollback: recriar as funções do arquivo 060 (ver seção final).

-- ─── cancelar_venda_campanha_v1 (v2 — motivo obrigatório) ────────────────────
CREATE OR REPLACE FUNCTION public.cancelar_venda_campanha_v1(
  p_venda_id UUID,
  p_loja_id  UUID,
  p_motivo   TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id     UUID;
  v_role        TEXT;
  v_vendedora   UUID;
  v_cancelado   TIMESTAMPTZ;
  v_agora       TIMESTAMPTZ := NOW();
  v_snap        RECORD;
  v_apuracao    RECORD;
  v_requer_rev  BOOLEAN := false;
BEGIN
  -- ── 1. Autenticação ──────────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  -- ── 2. Motivo obrigatório ─────────────────────────────────────────────────────
  IF BTRIM(COALESCE(p_motivo, '')) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O motivo do cancelamento é obrigatório.');
  END IF;

  -- ── 3. Role na loja ──────────────────────────────────────────────────────────
  SELECT role INTO v_role
  FROM public.membros_loja
  WHERE perfil_id = v_user_id
    AND loja_id   = p_loja_id
    AND ativo     = true
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  END IF;

  -- ── 4. Buscar venda — pertence à loja ────────────────────────────────────────
  SELECT vendedora_id, cancelado_em
  INTO v_vendedora, v_cancelado
  FROM public.vendas
  WHERE id      = p_venda_id
    AND loja_id = p_loja_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  END IF;

  IF v_cancelado IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda já cancelada.');
  END IF;

  -- Vendedora só pode cancelar a própria venda; gestores cancelam qualquer uma
  IF v_role = 'vendedora' AND v_vendedora <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para cancelar esta venda.');
  END IF;

  -- ── 5. Cancelar a venda ───────────────────────────────────────────────────────
  UPDATE public.vendas
  SET cancelado_em         = v_agora,
      cancelado_por        = v_user_id,
      motivo_cancelamento  = BTRIM(p_motivo)
  WHERE id = p_venda_id;

  -- ── 6. Processar snapshots vinculados ────────────────────────────────────────
  FOR v_snap IN
    SELECT s.id AS snap_id,
           s.quantidade,
           s.comissao_calculada,
           s.apuracao_id
    FROM public.campanhas_snapshot_regra s
    WHERE s.venda_id  = p_venda_id
      AND s.loja_id   = p_loja_id
      AND s.status    = 'ativo'
  LOOP
    IF v_snap.apuracao_id IS NULL THEN
      UPDATE public.campanhas_snapshot_regra
      SET status = 'cancelado'
      WHERE id = v_snap.snap_id;
      CONTINUE;
    END IF;

    SELECT status, quantidade_apurada, valor_apurado
    INTO v_apuracao
    FROM public.campanhas_apuracao
    WHERE id = v_snap.apuracao_id;

    IF v_apuracao.status IN ('pendente', 'aprovado') THEN
      UPDATE public.campanhas_snapshot_regra
      SET status = 'cancelado'
      WHERE id = v_snap.snap_id;

      UPDATE public.campanhas_apuracao
      SET quantidade_apurada = GREATEST(0, quantidade_apurada - COALESCE(v_snap.quantidade, 0)),
          valor_apurado      = GREATEST(0, valor_apurado - COALESCE(v_snap.comissao_calculada, 0)),
          atualizado_em      = v_agora
      WHERE id = v_snap.apuracao_id;

    ELSIF v_apuracao.status = 'pago' THEN
      UPDATE public.campanhas_snapshot_regra
      SET status = 'estornado'
      WHERE id = v_snap.snap_id;

      UPDATE public.campanhas_apuracao
      SET status        = 'em_revisao',
          observacao    = TRIM(COALESCE(observacao || E'\n', '') ||
                           'Venda ' || p_venda_id::TEXT || ' cancelada em ' ||
                           TO_CHAR(v_agora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
                           '. Motivo: ' || BTRIM(p_motivo) || '.'),
          atualizado_em = v_agora
      WHERE id = v_snap.apuracao_id
        AND status = 'pago';

      v_requer_rev := true;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'requer_revisao', v_requer_rev);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ─── resolver_revisao_apuracao_v1 (v2 — observação obrigatória) ──────────────
CREATE OR REPLACE FUNCTION public.resolver_revisao_apuracao_v1(
  p_apuracao_id UUID,
  p_loja_id     UUID,
  p_acao        TEXT,   -- 'aprovar' | 'estornar'
  p_observacao  TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_role    TEXT;
  v_status  TEXT;
  v_agora   TIMESTAMPTZ := NOW();
BEGIN
  -- ── 1. Autenticação ──────────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  -- ── 2. Observação obrigatória ─────────────────────────────────────────────────
  IF BTRIM(COALESCE(p_observacao, '')) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O motivo da decisão é obrigatório.');
  END IF;

  -- ── 3. Role — apenas gestores resolvem revisões ───────────────────────────────
  SELECT role INTO v_role
  FROM public.membros_loja
  WHERE perfil_id = v_user_id
    AND loja_id   = p_loja_id
    AND ativo     = true
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('dono', 'gerente', 'lider', 'admin_f5') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para resolver revisões.');
  END IF;

  -- ── 4. Verificar ação válida ─────────────────────────────────────────────────
  IF p_acao NOT IN ('aprovar', 'estornar') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ação inválida. Use ''aprovar'' ou ''estornar''.');
  END IF;

  -- ── 5. Buscar apuracao ───────────────────────────────────────────────────────
  SELECT status INTO v_status
  FROM public.campanhas_apuracao
  WHERE id      = p_apuracao_id
    AND loja_id = p_loja_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apuração não encontrada.');
  END IF;

  IF v_status <> 'em_revisao' THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Esta apuração não está em revisão (status atual: ' || v_status || ').');
  END IF;

  -- ── 6. Resolver ──────────────────────────────────────────────────────────────
  UPDATE public.campanhas_apuracao
  SET status        = CASE p_acao
                        WHEN 'aprovar'   THEN 'pago'
                        WHEN 'estornar'  THEN 'cancelado'
                      END,
      responsavel_id = v_user_id,
      observacao     = TRIM(COALESCE(observacao || E'\n', '') ||
                        'Revisão ' || p_acao || 'da em ' ||
                        TO_CHAR(v_agora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
                        '. ' || BTRIM(p_observacao) || '.'),
      atualizado_em  = v_agora
  WHERE id = p_apuracao_id;

  RETURN jsonb_build_object('ok', true, 'status_final',
    CASE p_acao WHEN 'aprovar' THEN 'pago' ELSE 'cancelado' END);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ─── Permissões (reafirmar após CREATE OR REPLACE) ───────────────────────────
REVOKE ALL ON FUNCTION public.cancelar_venda_campanha_v1(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancelar_venda_campanha_v1(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancelar_venda_campanha_v1(UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ─── SQL de rollback ─────────────────────────────────────────────────────────
-- Para reverter ao comportamento opcional do motivo (migration 060):
-- Recriar as funções com p_motivo DEFAULT NULL sem a validação BTRIM.
-- Ver supabase/migrations/060_cancelamento_venda_campanha.sql
