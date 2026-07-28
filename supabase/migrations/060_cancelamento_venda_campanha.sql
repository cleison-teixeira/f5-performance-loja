-- Migration 060 — Cancelamento de venda em campanha
-- Aplicar SOMENTE no staging (ynrffhacpjzohrhkpuiq). NÃO aplicar em produção.
-- Adiciona suporte a cancelamento/estorno de vendas vinculadas a campanhas:
--   1. Colunas de cancelamento em vendas
--   2. Status 'em_revisao' em campanhas_apuracao
--   3. RPC cancelar_venda_campanha_v1
--   4. RPC resolver_revisao_apuracao_v1
-- Rollback: ver seção final deste arquivo.
-- Aditiva: ALTER TABLE nullable + DROP/ADD constraint + CREATE FUNCTION.

-- ─── 1. Colunas de cancelamento em vendas ─────────────────────────────────────
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS cancelado_em    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_por   UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- ─── 2. Adicionar 'em_revisao' ao CHECK de campanhas_apuracao ─────────────────
ALTER TABLE public.campanhas_apuracao
  DROP CONSTRAINT IF EXISTS campanhas_apuracao_status_check;

ALTER TABLE public.campanhas_apuracao
  ADD CONSTRAINT campanhas_apuracao_status_check
    CHECK (status = ANY (ARRAY[
      'pendente', 'aprovado', 'pago', 'cancelado', 'em_revisao'
    ]));

-- ─── 3. RPC cancelar_venda_campanha_v1 ────────────────────────────────────────
-- Cancela uma venda e seus snapshots de campanha.
-- Antes do pagamento (pendente/aprovado): snapshot → cancelado, apuracao recalculada.
-- Após pagamento (pago): snapshot → estornado, apuracao → em_revisao para revisão manual.
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

  -- ── 2. Role na loja ──────────────────────────────────────────────────────────
  SELECT role INTO v_role
  FROM public.membros_loja
  WHERE perfil_id = v_user_id
    AND loja_id   = p_loja_id
    AND ativo     = true
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  END IF;

  -- ── 3. Buscar venda — pertence à loja ────────────────────────────────────────
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

  -- ── 4. Cancelar a venda ───────────────────────────────────────────────────────
  UPDATE public.vendas
  SET cancelado_em         = v_agora,
      cancelado_por        = v_user_id,
      motivo_cancelamento  = p_motivo
  WHERE id = p_venda_id;

  -- ── 5. Processar snapshots vinculados ────────────────────────────────────────
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
      -- Snapshot sem apuracao vinculada: apenas cancelar
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
      -- Cancelamento limpo: estornar da apuracao
      UPDATE public.campanhas_snapshot_regra
      SET status = 'cancelado'
      WHERE id = v_snap.snap_id;

      UPDATE public.campanhas_apuracao
      SET quantidade_apurada = GREATEST(0, quantidade_apurada - COALESCE(v_snap.quantidade, 0)),
          valor_apurado      = GREATEST(0, valor_apurado - COALESCE(v_snap.comissao_calculada, 0)),
          atualizado_em      = v_agora
      WHERE id = v_snap.apuracao_id;

    ELSIF v_apuracao.status = 'pago' THEN
      -- Pagamento já realizado: marcar para revisão manual
      UPDATE public.campanhas_snapshot_regra
      SET status = 'estornado'
      WHERE id = v_snap.snap_id;

      UPDATE public.campanhas_apuracao
      SET status        = 'em_revisao',
          observacao    = TRIM(COALESCE(observacao || E'\n', '') ||
                           'Venda ' || p_venda_id::TEXT || ' cancelada em ' ||
                           TO_CHAR(v_agora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
                           COALESCE('. Motivo: ' || p_motivo, '') || '.'),
          atualizado_em = v_agora
      WHERE id = v_snap.apuracao_id
        AND status = 'pago';

      v_requer_rev := true;
    END IF;
    -- status 'cancelado' / 'em_revisao' já tratados — ignorar
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'requer_revisao', v_requer_rev);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ─── 4. RPC resolver_revisao_apuracao_v1 ──────────────────────────────────────
-- Resolve uma apuracao em revisão após cancelamento pós-pagamento.
-- acao = 'aprovar': comissão fica paga; apuracao volta a 'pago'.
-- acao = 'estornar': comissão é estornada; apuracao vai a 'cancelado'.
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

  -- ── 2. Role — apenas gestores resolvem revisões ───────────────────────────────
  SELECT role INTO v_role
  FROM public.membros_loja
  WHERE perfil_id = v_user_id
    AND loja_id   = p_loja_id
    AND ativo     = true
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('dono', 'gerente', 'lider', 'admin_f5') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para resolver revisões.');
  END IF;

  -- ── 3. Verificar ação válida ─────────────────────────────────────────────────
  IF p_acao NOT IN ('aprovar', 'estornar') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ação inválida. Use ''aprovar'' ou ''estornar''.');
  END IF;

  -- ── 4. Buscar apuracao ───────────────────────────────────────────────────────
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

  -- ── 5. Resolver ──────────────────────────────────────────────────────────────
  UPDATE public.campanhas_apuracao
  SET status        = CASE p_acao
                        WHEN 'aprovar'   THEN 'pago'
                        WHEN 'estornar'  THEN 'cancelado'
                      END,
      responsavel_id = v_user_id,
      observacao     = TRIM(COALESCE(observacao || E'\n', '') ||
                        'Revisão ' || p_acao || 'da em ' ||
                        TO_CHAR(v_agora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
                        COALESCE(' por ' || v_user_id::TEXT, '') ||
                        COALESCE('. ' || p_observacao, '') || '.'),
      atualizado_em  = v_agora
  WHERE id = p_apuracao_id;

  RETURN jsonb_build_object('ok', true, 'status_final',
    CASE p_acao WHEN 'aprovar' THEN 'pago' ELSE 'cancelado' END);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ─── Permissões ───────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.cancelar_venda_campanha_v1(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancelar_venda_campanha_v1(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancelar_venda_campanha_v1(UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ─── SQL de rollback ─────────────────────────────────────────────────────────
-- Executar manualmente no staging se necessário reverter:
--
-- DROP FUNCTION IF EXISTS public.cancelar_venda_campanha_v1(UUID, UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.resolver_revisao_apuracao_v1(UUID, UUID, TEXT, TEXT);
-- ALTER TABLE public.campanhas_apuracao DROP CONSTRAINT IF EXISTS campanhas_apuracao_status_check;
-- ALTER TABLE public.campanhas_apuracao ADD CONSTRAINT campanhas_apuracao_status_check
--   CHECK (status = ANY (ARRAY['pendente','aprovado','pago','cancelado']));
-- ALTER TABLE public.vendas DROP COLUMN IF EXISTS cancelado_em;
-- ALTER TABLE public.vendas DROP COLUMN IF EXISTS cancelado_por;
-- ALTER TABLE public.vendas DROP COLUMN IF EXISTS motivo_cancelamento;
