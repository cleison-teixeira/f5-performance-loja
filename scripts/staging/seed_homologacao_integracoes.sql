-- ============================================================
-- F5 — Seed Oficial de Homologação de Integrações
-- ============================================================
-- Propósito: infraestrutura permanente de dados sintéticos para
-- homologar o Endpoint Universal (POST /api/v1/eventos/venda) e
-- qualquer conector externo futuro. Não específico de nenhum ERP.
--
-- AMBIENTE AUTORIZADO: f5-recompra-staging (ynrffhacpjzohrhkpuiq).
-- PRODUÇÃO EXPRESSAMENTE PROIBIDA (nhcppfovsxcsulyvwvgs) — o preflight
-- abaixo se recusa a rodar se não conseguir provar tecnicamente que
-- está em staging, sem depender de quem o executa.
--
-- Este arquivo NUNCA é uma migration: não fica em supabase/migrations/,
-- não tem prefixo numérico de sequência, nunca deve ser aplicado via
-- apply_migration. Mecanismo de execução autorizado: Supabase MCP
-- execute_sql, exclusivamente no projeto de staging acima.
--
-- Atomicidade: todo o arquivo é UMA ÚNICA instrução executável
-- (DO $$ ... $$;) — preflights e criação de dados no mesmo bloco
-- PL/pgSQL. Uma instrução única é atômica por natureza no Postgres,
-- independente de como o cliente/ferramenta a envia — não depende de
-- BEGIN/COMMIT explícitos nem de qualquer suposição sobre o
-- comportamento transacional de execute_sql.
--
-- Idempotente e reaplicável: rodar este arquivo mais de uma vez nunca
-- duplica dado nem sobrescreve silenciosamente — qualquer divergência
-- do estado esperado aborta a instrução inteira (falha fechada).
--
-- Cria: 1 mapeamento de loja externa, 1 produto válido + 1
-- biblioteca_item, 2 produtos ambíguos.
-- Reaproveita (não cria): Loja Angeloni Teste, Vend1 Teste Angeloni,
-- Biblioteca F5 Geral — pertencem a outra iniciativa de seed; o
-- preflight aborta caso deixem de existir ou de estar ativos.
--
-- Rollback documentado (não executado) ao final deste arquivo.
-- ============================================================

DO $$
DECLARE
  v_loja_id uuid;
  v_vendedor_ativo boolean;
  v_biblioteca_id uuid;
  v_biblioteca_item_id uuid;
BEGIN
  -- ============================================================
  -- PREFLIGHT — falha fechada antes de qualquer INSERT
  -- ============================================================

  -- 1) Marcador técnico de staging — não confia no nome informado por
  -- quem executa. 062_staging_parity_production_baseline só existe em
  -- staging (confirmado por consulta real nesta mesma investigação).
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE name = '062_staging_parity_production_baseline'
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: marcador técnico de staging ausente — este ambiente pode não ser staging. Abortando sem inserir nada.';
  END IF;

  -- 2) Migration 071 aplicada (RPC existe)
  IF to_regprocedure('public.processar_evento_venda_externa_v1(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: processar_evento_venda_externa_v1 ausente — migration 071 não aplicada neste ambiente.';
  END IF;

  -- 3) Tabelas obrigatórias presentes
  IF to_regclass('public.mapeamento_lojas_externas') IS NULL
     OR to_regclass('public.eventos_venda_externa') IS NULL
     OR to_regclass('public.vendas_origem_externa') IS NULL
     OR to_regclass('public.lojas') IS NULL
     OR to_regclass('public.membros_loja') IS NULL
     OR to_regclass('public.perfis') IS NULL
     OR to_regclass('public.produtos') IS NULL
     OR to_regclass('public.biblioteca_itens') IS NULL
     OR to_regclass('public.bibliotecas') IS NULL
  THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: uma ou mais tabelas obrigatórias estão ausentes neste ambiente.';
  END IF;

  -- 4) Loja Angeloni Teste — reaproveitada, não pertence a este seed.
  -- lojas.id é PRIMARY KEY (confirmado via schema real) — a consulta
  -- por id é estruturalmente incapaz de retornar mais de uma linha.
  SELECT id INTO v_loja_id FROM public.lojas
    WHERE id = 'f5feed00-0000-0000-0001-000000000001' AND ativa = true;
  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: Loja Angeloni Teste ausente ou inativa — dependência de outra iniciativa de seed foi quebrada.';
  END IF;

  -- 5) Vend1 Teste Angeloni — reaproveitado, não pertence a este seed.
  -- membros_loja não possui UNIQUE em (perfil_id, loja_id, role) — usa-se
  -- INTO STRICT (mesmo padrão já homologado na resolução de produto da
  -- RPC 071) para nunca escolher uma linha arbitrariamente: exige
  -- exatamente 1 resultado, falha fechado em 0 ou em >1 linhas. Os dois
  -- handlers abaixo sempre relançam exceção — nunca absorvem o erro
  -- para permitir continuação parcial.
  BEGIN
    SELECT ativo INTO STRICT v_vendedor_ativo FROM public.membros_loja
      WHERE perfil_id = 'f5feed00-0000-0000-0002-000000000003'
        AND loja_id = 'f5feed00-0000-0000-0001-000000000001'
        AND role = 'vendedora';
  EXCEPTION
    WHEN no_data_found THEN
      RAISE EXCEPTION 'PREFLIGHT FALHOU: Vend1 Teste Angeloni ausente (zero linhas em membros_loja para perfil_id/loja_id/role esperados) — dependência de outra iniciativa de seed foi quebrada.';
    WHEN too_many_rows THEN
      RAISE EXCEPTION 'PREFLIGHT FALHOU: mais de uma linha em membros_loja para o vendedor esperado — divergência inesperada, não corrigida automaticamente.';
  END;
  IF v_vendedor_ativo IS NOT TRUE THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: Vend1 Teste Angeloni encontrado, mas inativo.';
  END IF;

  -- 6) Biblioteca F5 Geral — reaproveitada, não pertence a este seed.
  -- bibliotecas.id é PRIMARY KEY (confirmado via schema real).
  SELECT id INTO v_biblioteca_id FROM public.bibliotecas
    WHERE id = '26c4e5d3-4711-4d88-9ea2-2a8ea58b1e23';
  IF v_biblioteca_id IS NULL THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: Biblioteca F5 Geral ausente.';
  END IF;

  -- 7) Namespace não usado com estrutura divergente (mapeamento)
  IF EXISTS (
    SELECT 1 FROM public.mapeamento_lojas_externas
    WHERE origem_sistema = 'teste_f5' AND loja_externa_id = 'homologacao-integracoes'
      AND (loja_id <> 'f5feed00-0000-0000-0001-000000000001' OR status <> 'ativo')
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: mapeamento homologacao-integracoes já existe apontando para outra loja ou com status divergente. Não sobrescrever silenciosamente.';
  END IF;

  -- 8) Seed parcial: produto válido com estrutura divergente
  IF EXISTS (
    SELECT 1 FROM public.produtos
    WHERE loja_id = 'f5feed00-0000-0000-0001-000000000001'
      AND nome = 'F5 HOMOLOGACAO - PRODUTO VALIDO'
      AND (biblioteca_item_id IS NULL OR ativo IS DISTINCT FROM true OR recorrente IS DISTINCT FROM true)
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: produto válido já existe com estrutura divergente (sem biblioteca_item vinculado, inativo, ou não-recorrente). Abortando.';
  END IF;

  -- 9) Seed parcial: contagem de produto ambíguo fora de {0, 2}
  IF (SELECT count(*) FROM public.produtos
        WHERE loja_id = 'f5feed00-0000-0000-0001-000000000001'
          AND nome = 'F5 HOMOLOGACAO - PRODUTO AMBIGUO') NOT IN (0, 2) THEN
    RAISE EXCEPTION 'PREFLIGHT FALHOU: contagem de produto ambíguo fora do esperado (deve ser 0 ou 2) — seed parcial ou divergência de execução anterior. Abortando.';
  END IF;

  -- ============================================================
  -- CRIAÇÃO IDEMPOTENTE — só a partir daqui, todo preflight passou
  -- ============================================================

  -- 1) Mapeamento de loja externa — exatamente 1 linha
  -- Sem alias legado: origem_sistema fica travado em 'teste_f5' porque
  -- a RPC 071 hardcoda essa condição para a resolução sintética de
  -- vendedor — não é escolha de namespace, é restrição técnica.
  IF NOT EXISTS (
    SELECT 1 FROM public.mapeamento_lojas_externas
    WHERE origem_sistema = 'teste_f5' AND loja_externa_id = 'homologacao-integracoes'
  ) THEN
    INSERT INTO public.mapeamento_lojas_externas (origem_sistema, loja_externa_id, loja_id, status)
    VALUES ('teste_f5', 'homologacao-integracoes', 'f5feed00-0000-0000-0001-000000000001', 'ativo');
  END IF;

  -- 2) Produto válido + biblioteca_item — exatamente 1 de cada.
  -- As duas inserções ficam no mesmo IF: se a segunda falhar, a
  -- primeira é desfeita junto — a instrução inteira é uma transação
  -- implícita única, sem savepoint isolando uma da outra.
  IF NOT EXISTS (
    SELECT 1 FROM public.produtos
    WHERE loja_id = 'f5feed00-0000-0000-0001-000000000001'
      AND nome = 'F5 HOMOLOGACAO - PRODUTO VALIDO'
  ) THEN
    INSERT INTO public.biblioteca_itens (biblioteca_id, nome, ciclo_recompra_dias, recorrente, ativo)
    VALUES ('26c4e5d3-4711-4d88-9ea2-2a8ea58b1e23', 'F5 HOMOLOGACAO - PRODUTO VALIDO', 30, true, true)
    RETURNING id INTO v_biblioteca_item_id;

    INSERT INTO public.produtos (loja_id, nome, ativo, recorrente, biblioteca_item_id)
    VALUES ('f5feed00-0000-0000-0001-000000000001', 'F5 HOMOLOGACAO - PRODUTO VALIDO', true, true, v_biblioteca_item_id);
  END IF;

  -- 3) Produtos ambíguos — exatamente 2 linhas com nome idêntico.
  -- recorrente fica no valor padrão (true) deliberadamente — a RPC
  -- nunca chega a avaliar recorrente/ciclo para este produto, pois a
  -- ambiguidade (too_many_rows) é detectada antes dessa checagem.
  -- As duas linhas nascem do mesmo INSERT — entram as duas ou nenhuma.
  IF (SELECT count(*) FROM public.produtos
        WHERE loja_id = 'f5feed00-0000-0000-0001-000000000001'
          AND nome = 'F5 HOMOLOGACAO - PRODUTO AMBIGUO') = 0 THEN
    INSERT INTO public.produtos (loja_id, nome, ativo)
    VALUES
      ('f5feed00-0000-0000-0001-000000000001', 'F5 HOMOLOGACAO - PRODUTO AMBIGUO', true),
      ('f5feed00-0000-0000-0001-000000000001', 'F5 HOMOLOGACAO - PRODUTO AMBIGUO', true);
  END IF;
END $$;

-- ============================================================
-- ROLLBACK — DOCUMENTADO, NÃO EXECUTADO
-- ============================================================
-- Remove estritamente o que este seed cria. Nunca remove Loja
-- Angeloni Teste, Vend1 Teste Angeloni, perfis, membros_loja,
-- bibliotecas reaproveitadas, clientes, vendas ou eventos — nenhum
-- desses é criado por este arquivo. Nenhum DELETE amplo, nenhum
-- TRUNCATE. Ordem segura (filho → pai):
--
-- DELETE FROM public.produtos
--   WHERE loja_id = 'f5feed00-0000-0000-0001-000000000001'
--     AND nome = 'F5 HOMOLOGACAO - PRODUTO AMBIGUO';
--
-- DELETE FROM public.produtos
--   WHERE loja_id = 'f5feed00-0000-0000-0001-000000000001'
--     AND nome = 'F5 HOMOLOGACAO - PRODUTO VALIDO';
--
-- DELETE FROM public.biblioteca_itens
--   WHERE biblioteca_id = '26c4e5d3-4711-4d88-9ea2-2a8ea58b1e23'
--     AND nome = 'F5 HOMOLOGACAO - PRODUTO VALIDO';
--
-- DELETE FROM public.mapeamento_lojas_externas
--   WHERE origem_sistema = 'teste_f5'
--     AND loja_externa_id = 'homologacao-integracoes';
--
-- Eventos e vendas eventualmente gerados ao rodar H05-H09 contra este
-- seed NÃO fazem parte deste rollback — são efeito da execução dos
-- testes, não do seed em si, e devem permanecer como trilha de
-- auditoria (mesma decisão já registrada no PILOT-0010H/I).
