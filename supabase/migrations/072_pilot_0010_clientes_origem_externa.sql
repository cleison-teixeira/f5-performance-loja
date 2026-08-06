-- PILOT-0010 — Fase 1: registrar vendas externas mesmo sem telefone.
--
-- Separa definitivamente "fato comercial" (venda) de "capacidade de
-- relacionamento" (Cliente F5 contatável). Cliente F5 (clientes)
-- continua significando exclusivamente uma pessoa contatável — sempre
-- possui whatsapp válido. Introduz a Identidade Externa do Cliente
-- (clientes_origem_externa) para reconhecer compras repetidas de quem
-- um ERP identificou, mesmo antes de existir telefone válido. Decisão
-- de domínio completa: PILOT-0010A (comparação de alternativas) e
-- PILOT-0010B (constituição do domínio). Revisão final de FKs e
-- comportamento de borda: PILOT-0010U, sobre a base já homologada
-- 10/10 em staging (commit 776ed0c).
--
-- Nenhum telefone é inventado. Nenhum identificador sintético é usado
-- em campo de contato real. Nenhum cliente é criado sem telefone
-- válido — a identidade sem contato fica em clientes_origem_externa,
-- nunca em clientes.
--
-- Jornada: esta migration não precisa de nenhum "bloqueio" explícito
-- para impedir aviso em venda sem contato — confirmado por leitura do
-- código (PILOT-0010C) que processar_evento_venda_externa_v1 nunca
-- gerou avisos para nenhuma venda externa (etapa separada, ainda não
-- construída), e que gerarParaVenda/planejarParaVenda só são chamados
-- pelos fluxos manuais de venda. Nada a bloquear nesta fatia.
--
-- Fora de escopo (não incluído nesta migration): reconciliação de
-- identidade entre ERPs diferentes sem telefone, produto pendente por
-- item, mapeamento universal de vendedor (PILOT-0006D), enriquecimento
-- automático, GET terceiros, card Dinheiro na Mesa, métricas,
-- promoção retroativa de vendas já existentes da mesma identidade
-- (essa migration só prepara a estrutura — ver comentário na PARTE B
-- e no Bloco B da RPC).

-- ============================================================
-- PARTE A — vendas.cliente_id passa a aceitar NULL
-- ============================================================
-- Preflight: aborta se a coluna não estiver no estado esperado (NOT
-- NULL) — mesma defesa contra drift de schema já usada na migration
-- 071 (SEC-0003): nunca presumir o estado real do banco.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendas'
      AND column_name = 'cliente_id' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'vendas.cliente_id não está NOT NULL como esperado — abortando para não presumir o estado do schema. Ver SEC-0003.';
  END IF;
END $$;

ALTER TABLE vendas ALTER COLUMN cliente_id DROP NOT NULL;

COMMENT ON COLUMN vendas.cliente_id IS
  'Cliente F5 contatável dono desta venda. NULL quando a venda tem origem externa (integracao_externa) e ainda não existe contato válido — ver clientes_origem_externa (PILOT-0010). Vendas de origem venda_manual/recompra/oferta/lista_espera sempre têm cliente_id preenchido — este relaxamento é aditivo, não retroativo.';

-- ============================================================
-- PARTE B — Identidade Externa do Cliente
-- ============================================================
-- DECISÃO DE DOMÍNIO (PILOT-0010A/B): Cliente F5 (clientes) representa
-- exclusivamente uma pessoa contatável. clientes_origem_externa
-- representa quem um sistema externo identificou como comprador,
-- independentemente de haver contato. Promovida a Cliente F5 somente
-- quando um telefone válido é confirmado — nunca ao contrário.
--
-- Chave natural: (origem_sistema, cliente_externo_id) — SEM loja_id.
-- Evidência real (PILOT-0009, Etapa 1D — consulta real à API do
-- VarejoOnline): o mesmo cliente_externo_id ("1", consumidor genérico)
-- apareceu em duas entidades/lojas diferentes na mesma conta
-- consultada — identificador de cliente de ERP não é loja-scoped, não
-- presumir unicidade por loja sem evidência.
--
-- PROMOÇÃO RETROATIVA (PILOT-0010U — comportamento explicitamente NÃO
-- implementado aqui): esta migration prepara a estrutura (a coluna
-- cliente_f5_id e o índice abaixo) para que uma futura RPC de
-- enriquecimento possa, ao promover uma identidade, atualizar em lote
-- todas as vendas antigas dessa mesma identidade. Essa RPC de
-- promoção retroativa NÃO existe ainda — só a proteção contra
-- despromoção acidental dentro de uma mesma chamada já está pronta
-- (ver COALESCE no Bloco B da RPC, mais abaixo). Não afirmar que
-- histórico é promovido automaticamente: hoje não é.
CREATE TABLE clientes_origem_externa (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  origem_sistema text NOT NULL,
  cliente_externo_id text NOT NULL,
  nome text NOT NULL,
  whatsapp text,
  cliente_f5_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origem_sistema, cliente_externo_id)
);

-- DECISÃO DE ON DELETE (PILOT-0010U, Fase 3A) — cliente_f5_id:
-- ON DELETE SET NULL, não RESTRICT. Justificativa: clientes_origem_externa
-- é, por desenho, permanente (nunca apagada — comentário da tabela
-- abaixo). Se um Cliente F5 algum dia for apagado por qualquer outro
-- fluxo do produto (hoje não existe essa funcionalidade, mas a FK não
-- deve presumir que nunca vai existir), a identidade externa não deve
-- travar essa exclusão nem ser apagada junto — ela volta ao estado
-- "não promovida" (cliente_f5_id = NULL) e preserva a trilha de
-- reconhecimento. Bloquear a exclusão do Cliente F5 (RESTRICT) apenas
-- por causa de um registro de auditoria seria inverter a prioridade:
-- a trilha de auditoria deve ceder, não o dado operacional do produto.
COMMENT ON TABLE clientes_origem_externa IS
  'Identidade Externa do Cliente (PILOT-0010B). Registra quem um sistema externo (origem_sistema) identificou como comprador, por cliente_externo_id, antes e independentemente de haver contato válido. Nunca é apagada — trilha de reconhecimento entre compras repetidas da mesma identidade, análoga em propósito a eventos_venda_externa. Promovida a Cliente F5 (clientes) quando um telefone válido é confirmado.';
COMMENT ON COLUMN clientes_origem_externa.origem_sistema IS
  'Mesmo valor usado em mapeamento_lojas_externas, eventos_venda_externa e vendas_origem_externa.';
COMMENT ON COLUMN clientes_origem_externa.cliente_externo_id IS
  'Identificador do cliente no sistema de origem. Junto com origem_sistema, é a chave de reconhecimento entre compras repetidas da mesma identidade — não é loja-scoped (ver evidência real acima).';
COMMENT ON COLUMN clientes_origem_externa.nome IS
  'Nome recebido do sistema de origem. Pode ser atualizado a cada nova venda da mesma identidade (não é uma correção silenciosa de dado do cliente — é o nome mais recente informado pelo ERP). Cobre tanto nome de pessoa real quanto rótulo de cliente genérico/não identificado do PDV de origem (ex.: "Consumidor") — em ambos os casos, o Contrato Universal já exige cliente.nome não-vazio antes de chegar aqui (validação inalterada na RPC); esta tabela nunca inventa um nome quando o payload não trouxe um.';
COMMENT ON COLUMN clientes_origem_externa.whatsapp IS
  'Telefone eventualmente já trazido pelo próprio sistema externo no cadastro do cliente. NULL na maioria dos casos nesta fase. Nunca inventado nem sintético — ausência real permanece NULL.';
COMMENT ON COLUMN clientes_origem_externa.cliente_f5_id IS
  'Cliente F5 correspondente, preenchido apenas no momento da promoção (telefone válido confirmado, via a mesma regra de unicidade de clientes.whatsapp). NULL enquanto não há contato. Nunca revertido de um valor não-nulo para NULL por uma venda seguinte sem telefone da mesma identidade (ver COALESCE no Bloco B da RPC) — mas pode voltar a NULL se o Cliente F5 referenciado for apagado por outro fluxo (ON DELETE SET NULL, ver decisão acima). Promoção retroativa de vendas antigas da mesma identidade não é implementada nesta migration.';

CREATE INDEX idx_clientes_origem_externa_cliente_f5
  ON clientes_origem_externa (cliente_f5_id) WHERE cliente_f5_id IS NOT NULL;

ALTER TABLE clientes_origem_externa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clientes_origem_externa FROM PUBLIC, anon, authenticated;

-- ============================================================
-- PARTE C — vendas_origem_externa ganha vínculo com a Identidade
-- Externa e status de contato mínimo (3 estados, PILOT-0010C)
-- ============================================================
-- DECISÃO DE ON DELETE (PILOT-0010U, Fase 3A) — clientes_origem_externa_id:
-- ON DELETE RESTRICT, não SET NULL. Justificativa: ao contrário do
-- Cliente F5 (que pode legitimamente ser apagado por outro fluxo do
-- produto no futuro), clientes_origem_externa é, por desenho, permanente
-- — não existe nenhum fluxo no produto que a apague. Se alguém tentar
-- apagar uma identidade externa que ainda tem venda vinculada, isso é
-- uma condição anômala que deve travar, não silenciar: perder esse
-- vínculo apagaria a prova de "quem o ERP disse que comprou" para uma
-- venda real já registrada — o lado mais crítico da rastreabilidade
-- desta migration.
ALTER TABLE vendas_origem_externa
  ADD COLUMN clientes_origem_externa_id uuid REFERENCES clientes_origem_externa(id) ON DELETE RESTRICT,
  ADD COLUMN status_contato text NOT NULL DEFAULT 'aguardando_enriquecimento'
    CHECK (status_contato IN ('aguardando_enriquecimento', 'contato_disponivel', 'sem_contato'));

COMMENT ON COLUMN vendas_origem_externa.clientes_origem_externa_id IS
  'Identidade Externa do cliente associada a esta venda, quando o payload trouxe cliente.identificador_externo. NULL quando o sistema de origem não forneceu identificador estável de cliente (degrada para: venda registrada, mas sem reconhecimento de recompra entre compras futuras). ON DELETE RESTRICT: clientes_origem_externa nunca é apagada por nenhum fluxo do produto — se essa exclusão for tentada por engano com uma venda ainda vinculada, deve falhar alto, não perder o vínculo silenciosamente.';
COMMENT ON COLUMN vendas_origem_externa.status_contato IS
  'Capacidade de contato desta venda no momento da ingestão: contato_disponivel (telefone válido confirmado, Cliente F5 já promovido) | sem_contato (sem telefone válido nesta venda). O default aguardando_enriquecimento existe só pela obrigatoriedade da coluna NOT NULL em linhas hipotéticas fora do caminho desta RPC — a RPC processar_evento_venda_externa_v1 sempre grava contato_disponivel ou sem_contato explicitamente, nunca deixa o default. Opt-out/bloqueio são tratados em clientes.nao_contatar* (já existente) após a promoção — não duplicados aqui, conforme PILOT-0010 Parte 3.';

-- ============================================================
-- PARTE D — RPC processar_evento_venda_externa_v1 (evolução aditiva)
-- ============================================================
-- Único breaking change intencional: o status 'nao_suportado_sem_telefone'
-- deixa de ser emitido para o caso "telefone ausente/inválido" — a
-- venda passa a ser registrada mesmo assim (status_contato='sem_contato'),
-- conforme decisão de produto do PILOT-0009A. O valor
-- 'nao_suportado_sem_telefone' permanece no CHECK de
-- eventos_venda_externa.status e nos caminhos que leem um evento já
-- existente (idempotência), por compatibilidade histórica com
-- qualquer linha anterior a esta migration — mesmo que não seja mais
-- produzido por este caminho a partir de agora.
--
-- Todo o restante do corpo é preservado exatamente como confirmado
-- pela leitura da definição real em staging homologado (PILOT-0010P,
-- 10/10 aprovado) e comparado byte-a-byte com a migration 071
-- atualmente versionada neste worktree (PILOT-0010U, Fase 1) — as
-- mudanças estão isoladas ao bloco de cliente e ao Bloco B de
-- persistência. Esta migration não depende de nenhum objeto além dos
-- já criados pela 071, todos confirmados existentes no staging
-- homologado antes desta escrita.
CREATE OR REPLACE FUNCTION public.processar_evento_venda_externa_v1(
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_origem_sistema text;
  v_evento_externo_id text;
  v_tipo_evento text;
  v_contrato_versao text;
  v_loja_externa_id text;
  v_venda_externa_id text;
  v_evento_id uuid;
  v_evento_original public.eventos_venda_externa%ROWTYPE;
  v_venda_existente public.vendas_origem_externa%ROWTYPE;
  v_loja_id uuid;
  v_vendedora_id uuid;
  v_cliente_id uuid;
  v_cliente_externo_id text;
  v_clientes_origem_externa_id uuid;
  v_status_contato text;
  v_venda_id uuid;
  v_produto_id uuid;
  v_recorrente boolean;
  v_comissionavel boolean;
  v_ciclo integer;
  v_data_venda_raw text;
  v_data_venda date;
  v_cliente_nome text;
  v_cliente_telefone text;
  v_item jsonb;
  v_nome_origem text;
  v_qtd numeric;
  v_valor numeric;
  v_valor_total numeric;
  v_itens_resolvidos jsonb := '[]'::jsonb;
  v_constraint_nome text;
  v_erro_msg text;
  v_sqlstate text;
  v_tabela text;
BEGIN
  -- GATE 1.3B — Achado 2 da auditoria (Gate 1.3A): payload SQL NULL não
  -- contém conteúdo algum para auditar. Isto é DIFERENTE de um JSON
  -- incompleto ou malformado — um objeto '{}' ou um payload com campos
  -- inválidos É armazenado normalmente como Evento Bruto e marcado
  -- rejeitado, preservando a linha para auditoria. Um argumento NULL
  -- não tem payload nenhum a preservar: não inserimos '{}' nem qualquer
  -- outro substituto (isso seria inventar dado que não existe). Por
  -- isso este é o ÚNICO caminho de rejeição desta função que não cria
  -- nenhuma linha em eventos_venda_externa — e precisa vir antes de
  -- qualquer tentativa de INSERT, porque payload_original é NOT NULL.
  IF payload IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false, 'status', 'rejeitado', 'evento_id', NULL,
      'venda_f5_id', NULL, 'etapa', 'validacao_payload',
      'motivo', 'payload ausente', 'pode_reprocessar', false,
      'contrato_versao', NULL, 'status_contato', NULL
    );
  END IF;

  -- ── ETAPA 0: extrair identidade (comparações/extrações de texto,
  -- nunca lançam exceção) ──
  v_origem_sistema     := payload->'origem'->>'sistema';
  v_evento_externo_id  := payload->'evento'->>'evento_externo_id';
  v_tipo_evento         := payload->'evento'->>'tipo_evento';
  v_contrato_versao     := payload->>'contrato_versao';
  v_loja_externa_id     := payload->'empresa_loja'->>'loja_externa_id';
  v_venda_externa_id    := payload->'venda'->>'venda_externa_id';
  -- PILOT-0010: identificador externo do cliente é opcional (evolução
  -- aditiva do Contrato Universal V1 — ver PILOT-0010C Parte 4). Sua
  -- ausência nunca rejeita a venda; só degrada para "sem reconhecimento
  -- de recompra entre compras futuras" (clientes_origem_externa_id fica
  -- NULL). Payloads antigos, homologados antes desta migration (H05-H09
  -- do PILOT-0007), nunca tinham este campo e continuam funcionando
  -- sem alteração — confirmado na regressão 10/10 (PILOT-0010S).
  v_cliente_externo_id := payload->'cliente'->>'identificador_externo';

  -- ══════════════════════════════════════════════════════════════
  -- BLOCO A — Evento Bruto
  -- ══════════════════════════════════════════════════════════════

  -- Caminho sequencial comum: evento já existe?
  IF v_origem_sistema IS NOT NULL AND v_evento_externo_id IS NOT NULL THEN
    SELECT * INTO v_evento_original FROM public.eventos_venda_externa
      WHERE origem_sistema = v_origem_sistema AND evento_externo_id = v_evento_externo_id
      FOR UPDATE;
    IF FOUND THEN
      IF v_evento_original.status IN ('processando','concluido') AND v_evento_original.venda_f5_id IS NOT NULL THEN
        RETURN jsonb_build_object('sucesso', true, 'status','duplicado',
          'evento_id', v_evento_original.id, 'venda_f5_id', v_evento_original.venda_f5_id,
          'motivo','evento já processado anteriormente', 'etapa', NULL,
          'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status = 'erro_parcial' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','erro_parcial',
          'evento_id', v_evento_original.id, 'venda_f5_id', v_evento_original.venda_f5_id,
          'motivo','evento já recebido; venda criada, mas avisos falharam — elegível a reprocessamento da etapa de avisos',
          'etapa', 'avisos', 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status = 'rejeitado' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','rejeitado',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento já recebido e rejeitado: '||COALESCE(v_evento_original.erro,''),
          'etapa', NULL, 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status = 'nao_suportado_sem_telefone' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','nao_suportado_sem_telefone',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento já recebido — cliente sem telefone, ainda não suportado',
          'etapa', 'cliente', 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status IN ('pendente_mapeamento','pendente_vendedor','pendente_produto') THEN
        RETURN jsonb_build_object('sucesso', false, 'status', v_evento_original.status,
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento já recebido, permanece em '||v_evento_original.status,
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSE
        RETURN jsonb_build_object('sucesso', false, 'status','recebido',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento ainda em processamento ou aguardando decisão — tente novamente',
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      END IF;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.eventos_venda_externa (
      origem_sistema, evento_externo_id, loja_externa_id, venda_externa_id,
      tipo_evento, contrato_versao, payload_original, status
    ) VALUES (
      v_origem_sistema, v_evento_externo_id, v_loja_externa_id, v_venda_externa_id,
      v_tipo_evento, v_contrato_versao, payload, 'recebido'
    ) RETURNING id INTO v_evento_id;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint_nome = CONSTRAINT_NAME;
    IF v_constraint_nome = 'eventos_venda_externa_identidade_evento_unique' THEN
      SELECT * INTO v_evento_original FROM public.eventos_venda_externa
        WHERE origem_sistema = v_origem_sistema AND evento_externo_id = v_evento_externo_id;
      IF v_evento_original.status IN ('processando','concluido') AND v_evento_original.venda_f5_id IS NOT NULL THEN
        RETURN jsonb_build_object('sucesso', true, 'status','duplicado',
          'evento_id', v_evento_original.id, 'venda_f5_id', v_evento_original.venda_f5_id,
          'motivo','evento processado concorrentemente', 'etapa', NULL,
          'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status = 'erro_parcial' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','erro_parcial',
          'evento_id', v_evento_original.id, 'venda_f5_id', v_evento_original.venda_f5_id,
          'motivo','evento processado concorrentemente; avisos falharam — elegível a reprocessamento',
          'etapa', 'avisos', 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status = 'rejeitado' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','rejeitado',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento processado concorrentemente e rejeitado: '||COALESCE(v_evento_original.erro,''),
          'etapa', NULL, 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status = 'nao_suportado_sem_telefone' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','nao_suportado_sem_telefone',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento processado concorrentemente — cliente sem telefone',
          'etapa', 'cliente', 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSIF v_evento_original.status IN ('pendente_mapeamento','pendente_vendedor','pendente_produto') THEN
        RETURN jsonb_build_object('sucesso', false, 'status', v_evento_original.status,
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento processado concorrentemente, permanece em '||v_evento_original.status,
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      ELSE
        RETURN jsonb_build_object('sucesso', false, 'status','recebido',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento ainda em processamento por outra chamada — tente novamente',
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao, 'status_contato', NULL);
      END IF;
    ELSE
      -- unique_violation em constraint diferente da esperada: condição
      -- anômala e inesperada. Não há v_evento_id (o INSERT falhou por
      -- completo), então não há linha para atualizar. Retorna erro
      -- genérico e seguro, sem expor detalhe interno.
      RETURN jsonb_build_object('sucesso', false, 'status','erro_parcial',
        'evento_id', NULL, 'venda_f5_id', NULL,
        'motivo','Erro interno inesperado ao registrar o evento.',
        'etapa','evento_bruto', 'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
    END IF;
  END;

  -- v_evento_id existe, status='recebido'. Sobrevive a qualquer
  -- exceção das etapas seguintes (savepoint de Bloco A já liberado).

  IF v_origem_sistema IS NULL OR v_evento_externo_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='identidade do evento ausente (origem.sistema ou evento.evento_externo_id)', processado_em=now()
      WHERE id = v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','identidade do evento ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- BLOCO DE VALIDAÇÃO DO PAYLOAD (status permanece 'recebido')
  -- Não escreve em cliente/venda/item. Toda conversão arriscada é
  -- protegida individualmente. Nunca um WHEN OTHERS genérico aqui.
  -- ══════════════════════════════════════════════════════════════

  IF v_contrato_versao IS DISTINCT FROM '1.0' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='contrato_versao não suportada: '||COALESCE(v_contrato_versao,'(ausente)'), processado_em=now()
      WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','contrato_versao não suportada','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  IF v_tipo_evento IS DISTINCT FROM 'venda_criada' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='tipo_evento ausente ou não suportado nesta fatia: '||COALESCE(v_tipo_evento,'(ausente)'), processado_em=now()
      WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','tipo_evento ausente ou não suportado nesta fatia','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  IF v_loja_externa_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='empresa_loja.loja_externa_id ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','empresa_loja.loja_externa_id ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  IF v_venda_externa_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.venda_externa_id ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.venda_externa_id ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  -- idempotência da VENDA (pré-checagem sequencial, distinta da
  -- idempotência do evento acima)
  SELECT * INTO v_venda_existente FROM public.vendas_origem_externa
    WHERE origem_sistema=v_origem_sistema AND loja_externa_id=v_loja_externa_id
      AND venda_externa_id=v_venda_externa_id
    FOR UPDATE;
  IF FOUND THEN
    UPDATE public.eventos_venda_externa SET status='concluido',
      venda_f5_id=v_venda_existente.venda_f5_id, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',true,'status','duplicado','evento_id',v_evento_id,
      'venda_f5_id', v_venda_existente.venda_f5_id,
      'motivo','venda já existe para esta identidade externa (evento novo, sem nova venda)',
      'etapa', NULL, 'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_venda_existente.status_contato);
  END IF;

  -- loja
  SELECT loja_id INTO v_loja_id FROM public.mapeamento_lojas_externas
    WHERE origem_sistema=v_origem_sistema AND loja_externa_id=v_loja_externa_id AND status='ativo';
  IF v_loja_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='pendente_mapeamento', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','pendente_mapeamento','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','loja_externa_id não mapeada','etapa','mapeamento_loja',
      'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;
  -- NÃO marca 'processando' aqui — permanece 'recebido' até o Bloco B
  -- terminar com sucesso (Gate 1.2, correção final).

  -- vendedor — convenção sintética exclusiva de origem_sistema='teste_f5'
  -- (temporária: NÃO é a solução universal de mapeamento de vendedor —
  -- ver PILOT-0006D. Fora de 'teste_f5', identificador_externo NUNCA é
  -- interpretado como UUID do F5.)
  v_vendedora_id := NULL;
  IF v_origem_sistema = 'teste_f5' THEN
    BEGIN
      v_vendedora_id := (payload->'vendedor_origem'->>'identificador_externo')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_vendedora_id := NULL;
    END;
    IF v_vendedora_id IS NOT NULL THEN
      PERFORM 1 FROM public.membros_loja
        WHERE perfil_id=v_vendedora_id AND loja_id=v_loja_id AND ativo=true;
      IF NOT FOUND THEN v_vendedora_id := NULL; END IF;
    END IF;
  END IF;
  IF v_vendedora_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='pendente_vendedor', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','pendente_vendedor','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','vendedor não mapeável nesta fatia','etapa','mapeamento_vendedor',
      'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  -- cliente — PILOT-0010: telefone deixa de ser pré-condição de
  -- existência da venda. nome continua obrigatório (é a única
  -- identificação mínima de quem comprou — mesmo sem contato, precisa
  -- saber quem comprou). Telefone ausente/inválido não bloqueia mais:
  -- define status_contato='sem_contato' e a venda segue para
  -- persistência sem Cliente F5 (ver Bloco B).
  --
  -- Comportamento explícito por caso (PILOT-0010U, Fase 3E):
  --   nome presente + telefone válido  -> contato_disponivel, promove.
  --   nome presente + telefone ausente -> sem_contato, venda registrada.
  --   nome ausente/vazio (qualquer telefone) -> rejeitado (inalterado).
  --   cliente genérico do PDV de origem (ex.: "Consumidor", sem
  --     telefone) -> mesmo caminho de "nome presente + telefone
  --     ausente": sem_contato, venda registrada, nenhum tratamento
  --     especial — a genericidade do nome não é detectada nem tratada
  --     à parte, fica indistinguível de qualquer outro cliente sem
  --     telefone nesta fatia.
  --   identificador_externo presente sem telefone -> mesmo caminho de
  --     sem_contato, adicionalmente cria/atualiza clientes_origem_externa
  --     (ver Bloco B) para permitir reconhecimento em compras futuras.
  v_cliente_nome := payload->'cliente'->>'nome';
  IF v_cliente_nome IS NULL OR btrim(v_cliente_nome) = '' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='cliente.nome ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','cliente.nome ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', NULL);
  END IF;

  v_cliente_telefone := regexp_replace(COALESCE(payload->'cliente'->>'telefone',''), '\D', '', 'g');
  IF length(v_cliente_telefone) >= 10 THEN
    v_status_contato := 'contato_disponivel';
  ELSE
    v_status_contato := 'sem_contato';
    v_cliente_telefone := NULL; -- nunca persiste telefone parcial/inválido como se fosse válido
  END IF;

  -- data_venda — GATE 1.3C: obrigatória (Contrato Universal V1),
  -- formato ESTRITO YYYY-MM-DD. timestamp_evento (com hora/timezone) é
  -- um campo diferente do envelope; data_venda é só data. Um cast
  -- direto text::date aceitaria e truncaria SILENCIOSAMENTE um
  -- timestamp (ex.: "2026-08-02T15:30:00"::date → 2026-08-02),
  -- aceitando payload fora do contrato sem avisar ninguém — proibido.
  -- Por isso: (1) validação de formato ancorada ANTES do cast, (2)
  -- cast protegido (inalterado), (3) checagem de round-trip DEPOIS do
  -- cast, garantindo que o texto recebido já era exatamente a forma
  -- canônica — nunca corrige/normaliza silenciosamente.
  v_data_venda_raw := payload->'venda'->>'data_venda';
  IF v_data_venda_raw IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='venda.data_venda ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.data_venda ausente (obrigatório no Contrato Universal V1)','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END IF;

  -- (1) formato ancorado — rejeita timestamp, hora, timezone, barra,
  -- DD-MM-YYYY, ausência de zero à esquerda, espaços, vazio, numérico
  -- puro. Roda ANTES do cast — nada disso deve sequer chegar a ::date.
  IF v_data_venda_raw !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.data_venda fora do formato YYYY-MM-DD: '||v_data_venda_raw, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.data_venda deve usar o formato YYYY-MM-DD','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END IF;

  -- (2) cast protegido — inalterado desde o Gate 1.3B/1.3A.
  BEGIN
    v_data_venda := v_data_venda_raw::date;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.data_venda inválida: '||v_data_venda_raw, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.data_venda inválida','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END;

  -- (3) defesa de round-trip — o texto recebido precisa ser
  -- exatamente a forma canônica que o Postgres devolveria para esta
  -- data. Não corrige nem normaliza: só rejeita se divergir.
  IF to_char(v_data_venda, 'YYYY-MM-DD') <> v_data_venda_raw THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.data_venda não é a representação canônica: '||v_data_venda_raw, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','formato ou valor de data não canônico','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END IF;

  -- itens — jsonb_typeof ANTES de jsonb_array_length (Postgres NÃO
  -- garante short-circuit em `A OR B`; dividir em IFs sequenciais evita
  -- chamar array_length numa estrutura que não é array).
  IF payload->'itens' IS NULL OR jsonb_typeof(payload->'itens') IS DISTINCT FROM 'array' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='itens ausente ou não é array', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','itens ausente ou não é array','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END IF;
  IF jsonb_array_length(payload->'itens') = 0 THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='itens vazio', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','itens vazio','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'itens') LOOP
    v_nome_origem := v_item->'produto'->>'nome_origem';
    IF COALESCE(btrim(v_nome_origem), '') = '' THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='produto.nome_origem ausente em algum item', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','produto.nome_origem ausente em algum item','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END IF;

    -- gate por tipo ANTES do cast (evita depender de exceção para o
    -- caso comum de campo ausente/tipo errado)
    IF jsonb_typeof(v_item->'quantidade') IS DISTINCT FROM 'number'
       OR jsonb_typeof(v_item->'valor_unitario') IS DISTINCT FROM 'number' THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='quantidade/valor_unitario ausente ou não-numérico em algum item', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','quantidade/valor_unitario ausente ou não-numérico em algum item','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END IF;

    -- defesa adicional: mesmo com typeof='number', um valor extremo
    -- pode estourar numeric_value_out_of_range no cast.
    BEGIN
      v_qtd := (v_item->>'quantidade')::numeric;
      v_valor := (v_item->>'valor_unitario')::numeric;
    EXCEPTION WHEN numeric_value_out_of_range THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='quantidade/valor_unitario fora do intervalo suportado', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','quantidade/valor_unitario fora do intervalo suportado','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END;

    IF v_qtd <= 0 OR v_valor <= 0 THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='quantidade/valor_unitario deve ser > 0', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','quantidade/valor_unitario deve ser > 0','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END IF;

    -- resolução de produto: GATE 1.3B — Achado 1 da auditoria (Gate
    -- 1.3A). A versão anterior fazia COUNT(*) e depois um segundo
    -- SELECT separado — sob READ COMMITTED, outra transação podia
    -- alterar produtos entre as duas consultas (cada uma enxerga o
    -- snapshot mais recente no momento em que roda, não um snapshot
    -- único da transação inteira), deixando v_produto_id NULL de forma
    -- silenciosa sem nunca cair em pendente_produto. Substituído por
    -- uma única consulta atômica com INTO STRICT: se retornar zero
    -- linhas ou mais de uma, o próprio Postgres lança a exceção
    -- correspondente — não há mais janela entre "contar" e "buscar".
    -- PILOT-0010: produto pendente por item permanece derrubando a
    -- venda inteira nesta fatia (fora de escopo — ver PILOT-0010C).
    BEGIN
      SELECT p.id, p.recorrente, p.comissionavel_recompra, bi.ciclo_recompra_dias
        INTO STRICT v_produto_id, v_recorrente, v_comissionavel, v_ciclo
        FROM public.produtos p
        LEFT JOIN public.biblioteca_itens bi ON bi.id = p.biblioteca_item_id
        WHERE p.loja_id=v_loja_id AND p.ativo=true AND lower(btrim(p.nome))=lower(btrim(v_nome_origem));
    EXCEPTION
      WHEN no_data_found THEN
        UPDATE public.eventos_venda_externa SET status='pendente_produto', erro='produto não resolvido: '||v_nome_origem, processado_em=now() WHERE id=v_evento_id;
        RETURN jsonb_build_object('sucesso',false,'status','pendente_produto','evento_id',v_evento_id,
          'venda_f5_id',NULL,'motivo','produto não resolvido: '||v_nome_origem,'etapa','produto',
          'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
      WHEN too_many_rows THEN
        UPDATE public.eventos_venda_externa SET status='pendente_produto', erro='produto ambíguo (mais de um ativo com o mesmo nome): '||v_nome_origem, processado_em=now() WHERE id=v_evento_id;
        RETURN jsonb_build_object('sucesso',false,'status','pendente_produto','evento_id',v_evento_id,
          'venda_f5_id',NULL,'motivo','produto ambíguo — mais de um produto ativo com o mesmo nome nesta loja','etapa','produto',
          'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END;

    -- Defesa explícita adicional: produto_id nunca pode seguir NULL a
    -- partir daqui. Com o INTO STRICT acima, isto não deveria ser
    -- alcançável — mas se ocorrer por qualquer condição inesperada,
    -- não permite item com produto_id NULL nesta fatia (nunca inventar
    -- produto).
    IF v_produto_id IS NULL THEN
      UPDATE public.eventos_venda_externa SET status='pendente_produto', erro='produto_id NULL após resolução (condição inesperada): '||v_nome_origem, processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','pendente_produto','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','produto não pôde ser resolvido com segurança','etapa','produto',
        'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END IF;

    IF v_recorrente = true AND (v_ciclo IS NULL OR v_ciclo <= 0) THEN
      UPDATE public.eventos_venda_externa SET status='pendente_produto', erro='produto recorrente sem ciclo de recompra válido: '||v_nome_origem, processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','pendente_produto','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','produto recorrente sem ciclo válido — sem fallback oculto de 30 dias','etapa','ciclo_produto',
        'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
    END IF;

    v_itens_resolvidos := v_itens_resolvidos || jsonb_build_object(
      'produto_id', v_produto_id, 'produto_nome', v_nome_origem,
      'quantidade', v_qtd, 'valor_unitario', v_valor, 'subtotal', v_qtd * v_valor,
      'recorrente', v_recorrente, 'comissionavel', v_comissionavel, 'ciclo_recompra_dias', v_ciclo
    );
  END LOOP;

  v_valor_total := (SELECT sum((i->>'subtotal')::numeric) FROM jsonb_array_elements(v_itens_resolvidos) i);

  -- ══════════════════════════════════════════════════════════════
  -- BLOCO B — Processamento de negócio
  -- A identidade da venda é a dona da transação: cliente, venda e
  -- itens só permanecem se o vínculo em vendas_origem_externa vencer.
  -- Sem comissão, sem campanha, sem envio de mensagem.
  --
  -- PILOT-0010: Cliente F5 só é criado/localizado quando há telefone
  -- válido (status_contato='contato_disponivel'). Sem telefone,
  -- v_cliente_id permanece NULL — a venda é registrada como fato
  -- comercial válido mesmo sem capacidade de contato. A Identidade
  -- Externa do Cliente é criada/atualizada independentemente de haver
  -- telefone, para reconhecer compras repetidas da mesma pessoa.
  --
  -- PROMOÇÃO RETROATIVA (PILOT-0010U): o COALESCE abaixo só impede que
  -- ESTA chamada desfaça uma promoção já feita. Ele NÃO promove vendas
  -- antigas da mesma identidade que ainda estejam com cliente_id NULL
  -- — isso exigiria uma RPC de enriquecimento separada, ainda não
  -- construída (ver comentário da PARTE B acima). Não afirmar aqui que
  -- promoção retroativa está implementada.
  -- ══════════════════════════════════════════════════════════════
  BEGIN
    v_cliente_id := NULL;
    IF v_status_contato = 'contato_disponivel' THEN
      INSERT INTO public.clientes (loja_id, nome, whatsapp)
        VALUES (v_loja_id, v_cliente_nome, v_cliente_telefone)
        ON CONFLICT (loja_id, whatsapp) DO NOTHING
        RETURNING id INTO v_cliente_id;
      IF v_cliente_id IS NULL THEN
        SELECT id INTO v_cliente_id FROM public.clientes WHERE loja_id=v_loja_id AND whatsapp=v_cliente_telefone;
      END IF;
    END IF;

    -- Identidade Externa do Cliente (PILOT-0010B): reconhece a mesma
    -- pessoa entre compras repetidas do mesmo sistema de origem, com
    -- ou sem contato. COALESCE em cliente_f5_id garante que uma
    -- promoção já efetivada nunca é revertida para NULL por uma venda
    -- seguinte sem telefone da mesma identidade.
    v_clientes_origem_externa_id := NULL;
    IF v_cliente_externo_id IS NOT NULL THEN
      INSERT INTO public.clientes_origem_externa (origem_sistema, cliente_externo_id, nome, cliente_f5_id)
        VALUES (v_origem_sistema, v_cliente_externo_id, v_cliente_nome, v_cliente_id)
        ON CONFLICT (origem_sistema, cliente_externo_id)
        DO UPDATE SET
          nome = EXCLUDED.nome,
          cliente_f5_id = COALESCE(public.clientes_origem_externa.cliente_f5_id, EXCLUDED.cliente_f5_id),
          atualizado_em = now()
        RETURNING id INTO v_clientes_origem_externa_id;
    END IF;

    INSERT INTO public.vendas (loja_id, cliente_id, vendedora_id, valor, data_compra, origem)
      VALUES (v_loja_id, v_cliente_id, v_vendedora_id, v_valor_total, v_data_venda, 'integracao_externa')
      RETURNING id INTO v_venda_id;

    INSERT INTO public.itens_venda (venda_id, produto_id, produto_nome, quantidade,
      valor_unitario, subtotal, recorrente, comissionavel, ciclo_recompra_dias)
      SELECT v_venda_id, (i->>'produto_id')::uuid, i->>'produto_nome',
        (i->>'quantidade')::numeric, (i->>'valor_unitario')::numeric, (i->>'subtotal')::numeric,
        (i->>'recorrente')::boolean, (i->>'comissionavel')::boolean, (i->>'ciclo_recompra_dias')::integer
      FROM jsonb_array_elements(v_itens_resolvidos) i;

    -- este é o INSERT que decide a corrida da IDENTIDADE DA VENDA:
    INSERT INTO public.vendas_origem_externa (venda_f5_id, origem_sistema, loja_externa_id, venda_externa_id,
      clientes_origem_externa_id, status_contato)
      VALUES (v_venda_id, v_origem_sistema, v_loja_externa_id, v_venda_externa_id,
        v_clientes_origem_externa_id, v_status_contato);

  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint_nome = CONSTRAINT_NAME;
      IF v_constraint_nome = 'vendas_origem_externa_identidade_unique' THEN
        -- Concorrência ESPERADA da identidade da venda, identificada
        -- com precisão. Cliente/venda/itens desta chamada já foram
        -- desfeitos pelo rollback automático ao savepoint deste Bloco B.
        SELECT * INTO v_venda_existente FROM public.vendas_origem_externa
          WHERE origem_sistema=v_origem_sistema AND loja_externa_id=v_loja_externa_id
            AND venda_externa_id=v_venda_externa_id;
        UPDATE public.eventos_venda_externa
          SET status='concluido', venda_f5_id=v_venda_existente.venda_f5_id, processado_em=now()
          WHERE id=v_evento_id;
        RETURN jsonb_build_object('sucesso',true,'status','duplicado','evento_id',v_evento_id,
          'venda_f5_id', v_venda_existente.venda_f5_id,
          'motivo','venda criada concorrentemente por outro evento','etapa',NULL,
          'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_venda_existente.status_contato);
      ELSE
        -- unique_violation em QUALQUER outra constraint: NÃO fingir
        -- duplicado. Detalhe técnico completo fica em erro (interno);
        -- motivo devolvido ao chamador é genérico e seguro.
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_erro_msg = MESSAGE_TEXT,
          v_tabela = TABLE_NAME, v_constraint_nome = CONSTRAINT_NAME;
        UPDATE public.eventos_venda_externa SET status='erro_parcial',
          erro = format('sqlstate=%s tabela=%s constraint=%s msg=%s',
            v_sqlstate, COALESCE(v_tabela,'-'), COALESCE(v_constraint_nome,'-'), v_erro_msg),
          processado_em=now() WHERE id=v_evento_id;
        RETURN jsonb_build_object('sucesso',false,'status','erro_parcial','evento_id',v_evento_id,
          'venda_f5_id',NULL,'motivo','Erro interno ao processar a venda. Evento registrado para reprocessamento.',
          'etapa','criacao_venda', 'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
      END IF;

    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_erro_msg = MESSAGE_TEXT,
        v_tabela = TABLE_NAME, v_constraint_nome = CONSTRAINT_NAME;
      UPDATE public.eventos_venda_externa SET status='erro_parcial',
        erro = format('sqlstate=%s tabela=%s constraint=%s msg=%s',
          v_sqlstate, COALESCE(v_tabela,'-'), COALESCE(v_constraint_nome,'-'), v_erro_msg),
        processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','erro_parcial','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','Erro interno ao processar a venda. Evento registrado para reprocessamento.',
        'etapa','criacao_venda', 'pode_reprocessar', true, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
  END;

  -- SÓ AQUI 'processando' é gravado pela primeira vez — nunca antes
  -- (Gate 1.2, correção final da semântica de processando).
  UPDATE public.eventos_venda_externa
    SET status='processando', venda_f5_id=v_venda_id, processado_em=now()
    WHERE id=v_evento_id;

  RETURN jsonb_build_object('sucesso',true,'status','aceito','evento_id',v_evento_id,
    'venda_f5_id', v_venda_id, 'motivo', NULL, 'etapa','avisos_pendentes',
    'pode_reprocessar', false, 'contrato_versao', v_contrato_versao, 'status_contato', v_status_contato);
END;
$$;

REVOKE ALL ON FUNCTION public.processar_evento_venda_externa_v1(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_evento_venda_externa_v1(jsonb) TO service_role;
