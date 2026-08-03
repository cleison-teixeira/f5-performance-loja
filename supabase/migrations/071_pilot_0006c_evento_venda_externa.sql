-- PILOT-0006C — Motor Universal de Vendas, Gate 1.1
-- Escopo aprovado: infraestrutura mínima para ingestão idempotente de
-- eventos de venda de origem externa (evento sintético nesta fase —
-- nenhuma integração real com TOV/ERP). Vendedor obrigatório e mapeável
-- nesta fatia (sem placeholder/perfil técnico); cliente sem telefone
-- ainda NÃO suportado (fica para tarefa futura). Ver Gate 1 — decisões
-- de implementação registradas na sessão do PILOT-0006C.
--
-- PENDÊNCIA FORMAL REGISTRADA (não desenhada, não implementada aqui):
--   PILOT-0006D — Mapeamento Universal de Vendedores
--   Objetivo: resolver a identidade do vendedor entre sistemas externos
--   e o F5, de forma análoga a mapeamento_lojas_externas (Parte B).
--   Nesta fatia (Gate 1), a ausência desse mecanismo significa que só
--   eventos com um vendedor já mapeável no F5 são aceitos — sem
--   vendedor placeholder/técnico (Decisão 1 do Gate 1).

-- ============================================================
-- PARTE A — Alteração mínima em tabela existente: vendas.origem
-- ============================================================
-- DECISÃO ARQUITETURAL:
-- O valor 'integracao_externa' representa somente a categoria interna da
-- origem da venda dentro do F5. Nunca armazenar aqui nomes específicos de
-- sistemas, como: tov, varejo_online, trier, sistema_cia, cielo, bling,
-- tiny, linx, shopify, woocommerce, ou qualquer outro ERP/PDV/canal. A
-- origem específica permanece exclusivamente nas tabelas de
-- rastreabilidade externa (Parte B), por meio de origem_sistema,
-- loja_externa_id, venda_externa_id e evento_externo_id. Este CHECK NÃO
-- deve crescer com um valor por integração.

-- Preflight: aborta se a constraint atual não estiver exatamente no
-- estado esperado (defesa contra o tipo de drift documentado na SEC-0003
-- — não presumir que o schema é o que as migrations anteriores dizem).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendas_origem_check'
      AND conrelid = 'vendas'::regclass
      AND pg_get_constraintdef(oid) = 'CHECK ((origem = ANY (ARRAY[''venda_manual''::text, ''recompra''::text, ''oferta''::text, ''lista_espera''::text])))'
  ) THEN
    RAISE EXCEPTION 'vendas_origem_check não está no estado esperado (4 valores: venda_manual/recompra/oferta/lista_espera) — abortando para não sobrescrever uma alteração não prevista. Ver SEC-0003.';
  END IF;
END $$;

ALTER TABLE vendas DROP CONSTRAINT vendas_origem_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_origem_check
  CHECK (origem IN ('venda_manual', 'recompra', 'oferta', 'lista_espera', 'integracao_externa'));

COMMENT ON CONSTRAINT vendas_origem_check ON vendas IS
  'DECISÃO ARQUITETURAL (PILOT-0006C): integracao_externa é só a categoria interna de origem da venda no F5. Nunca armazenar aqui nomes específicos de sistema (tov, varejo_online, trier, sistema_cia, cielo, bling, tiny, linx, shopify, woocommerce, etc.) — isso fica em vendas_origem_externa.origem_sistema. Este CHECK não deve crescer com um valor por integração.';

-- ROLLBACK desta parte (documentado, não executado por esta migration):
--   Antes de existir qualquer vendas.origem = 'integracao_externa':
--     ALTER TABLE vendas DROP CONSTRAINT vendas_origem_check;
--     ALTER TABLE vendas ADD CONSTRAINT vendas_origem_check
--       CHECK (origem IN ('venda_manual','recompra','oferta','lista_espera'));
--   Depois de existir alguma linha com origem = 'integracao_externa':
--     NÃO reverter a constraint sem antes decidir o que fazer com essas
--     linhas — mudar a origem delas para outro valor destruiria a
--     rastreabilidade que esta migration existe para preservar.

-- ============================================================
-- IDEMPOTÊNCIA — visão geral (3 camadas)
-- ============================================================
-- A) eventos_venda_externa_identidade_evento_unique — índice único
--    PARCIAL em (origem_sistema, evento_externo_id), válido só quando
--    ambos não são NULL (Parte B) → impede processar o mesmo evento
--    duas vezes, sem impedir o armazenamento de payloads malformados
--    sem identidade (Gate 1.1.1).
-- B) vendas_origem_externa UNIQUE (origem_sistema, loja_externa_id,
--    venda_externa_id) → impede criar uma segunda venda F5 para a
--    mesma identidade externa de venda (distinta da idempotência do
--    evento — ver seção RASTREABILIDADE abaixo).
-- C) avisos_item_mensagem_unique (item_venda_id, mensagem_id)
--    → impede gerar o mesmo aviso duas vezes (Parte C).
-- D) [REQUISITO OBRIGATÓRIO DO GATE 1.2 — NÃO IMPLEMENTADO NESTA
--    MIGRATION, SÓ REGISTRADO COMO EXIGÊNCIA] A RPC
--    processar_evento_venda_externa_v1 deverá ser, como um todo,
--    idempotente: se uma exceção inesperada interromper o
--    processamento, reexecutar o mesmo evento (mesmo evento_externo_id)
--    não pode produzir efeitos colaterais adicionais além dos já
--    efetivados. As camadas A, B e C são a base dessa garantia; o
--    Gate 1.2 precisa desenhar o restante do fluxo (validações, criação
--    de venda/cliente/itens) respeitando essa propriedade.

-- ============================================================
-- RASTREABILIDADE — identidade do evento vs. identidade da venda
-- ============================================================
-- Uma mesma venda pode receber vários eventos ao longo do tempo (venda
-- criada, venda alterada, venda cancelada, venda reprocessada, etc.).
-- Cada evento tem identidade própria (origem_sistema + evento_externo_id,
-- em eventos_venda_externa); cada venda tem identidade própria
-- (origem_sistema + loja_externa_id + venda_externa_id, em
-- vendas_origem_externa). São conceitos independentes: NUNCA usar
-- venda_externa_id como identificador de evento, e NUNCA usar
-- evento_externo_id como identificador de venda.

-- ============================================================
-- PARTE B — Tabelas novas (rastreabilidade externa)
-- ============================================================

CREATE TABLE mapeamento_lojas_externas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  origem_sistema text NOT NULL,
  loja_externa_id text NOT NULL,
  loja_id uuid NOT NULL REFERENCES lojas(id),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origem_sistema, loja_externa_id)
);

COMMENT ON TABLE mapeamento_lojas_externas IS
  'Vincula uma loja identificada por um sistema externo a uma loja interna do F5. Não contém regra de negócio de recompra. Usada exclusivamente para resolver o contexto multi-loja da integração.';
COMMENT ON COLUMN mapeamento_lojas_externas.origem_sistema IS
  'Identificador do sistema de origem (ex.: tov, trier, sistema_cia) — texto livre, sem enum fechado, para não exigir migration a cada nova integração.';
COMMENT ON COLUMN mapeamento_lojas_externas.loja_externa_id IS
  'Identificador da loja no sistema de origem — combinado com origem_sistema, forma a chave de mapeamento para lojas.id.';
COMMENT ON COLUMN mapeamento_lojas_externas.status IS
  'ativo = mapeamento válido para uso; inativo = mapeamento desativado, eventos para esta loja externa devem cair em pendente_mapeamento.';

-- PREPARAÇÃO PARA EVENTOS FUTUROS (documental — não implementado):
-- O modelo (payload_original em jsonb + tipo_evento validado por CHECK)
-- foi desenhado para suportar, no futuro, tipos adicionais de evento —
-- ex.: troca, confirmação, sincronização — além dos 4 já previstos no
-- Contrato Universal V1 (venda_criada, venda_atualizada, venda_cancelada,
-- venda_devolucao_parcial), sem exigir alteração na estrutura das
-- tabelas. Adicionar um novo tipo_evento no futuro continuará exigindo
-- uma migration pontual no CHECK (mesmo padrão desta migration para
-- vendas.origem), mas nunca uma tabela nova.
-- GATE 1.1.1 — REVISÃO POR DESCOBERTA: um Evento Bruto imutável e
-- rastreável precisa ser armazenável mesmo quando o payload é inválido
-- ou incompleto — inclusive quando faltam os próprios campos de
-- identidade. Por isso, só id/payload_original/status/recebido_em são
-- obrigatórios; os campos extraídos do payload (origem_sistema,
-- evento_externo_id, loja_externa_id, venda_externa_id, tipo_evento,
-- contrato_versao) aceitam NULL. A UNIQUE de idempotência do evento
-- deixa de ser uma constraint de tabela e vira um índice único PARCIAL
-- (abaixo), válido só quando origem_sistema e evento_externo_id não são
-- nulos — sem isso, um payload sem identidade não poderia nem ser
-- inserido. Eventos malformados sem evento_externo_id podem gerar mais
-- de um registro bruto em tentativas diferentes: não há identidade
-- externa confiável para deduplicá-los, e isso é esperado, não um bug.
CREATE TABLE eventos_venda_externa (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  origem_sistema text,
  evento_externo_id text,
  loja_externa_id text,
  venda_externa_id text,
  tipo_evento text CHECK (tipo_evento IS NULL OR tipo_evento IN (
    'venda_criada', 'venda_atualizada', 'venda_cancelada', 'venda_devolucao_parcial'
  )),
  contrato_versao text,
  payload_original jsonb NOT NULL,
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN (
    'recebido', 'rejeitado', 'pendente_mapeamento', 'pendente_vendedor',
    'pendente_produto', 'nao_suportado_sem_telefone', 'processando',
    'concluido', 'erro_parcial'
  )),
  recebido_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz,
  resultado jsonb,
  erro text,
  venda_f5_id uuid REFERENCES vendas(id)
);

-- Idempotência do EVENTO: índice único PARCIAL (não mais UNIQUE de
-- tabela), porque origem_sistema/evento_externo_id agora podem ser NULL
-- para payloads sem identidade suficiente — um NULL não deve "colidir"
-- com outro NULL nem impedir múltiplos registros brutos malformados.
CREATE UNIQUE INDEX eventos_venda_externa_identidade_evento_unique
  ON eventos_venda_externa (origem_sistema, evento_externo_id)
  WHERE origem_sistema IS NOT NULL AND evento_externo_id IS NOT NULL;

COMMENT ON INDEX eventos_venda_externa_identidade_evento_unique IS
  'Garante idempotência do EVENTO (origem_sistema + evento_externo_id) apenas quando ambos estão presentes. Eventos sem identidade suficiente (payload malformado) não são deduplicados por este índice — cada tentativa gera um registro bruto próprio, o que é esperado.';

-- MÁQUINA DE ESTADOS de eventos_venda_externa.status:
--
--   recebido
--     ↓
--   processando
--     ↓
--   concluido
--
--   OU  recebido ↓ pendente_mapeamento
--   OU  recebido ↓ pendente_vendedor
--   OU  recebido ↓ pendente_produto
--   OU  recebido ↓ nao_suportado_sem_telefone
--   OU  recebido ↓ rejeitado
--   OU  recebido ↓ erro_parcial
--
-- Estados terminais (não avançam mais nesta fatia): rejeitado,
-- pendente_mapeamento, pendente_vendedor, pendente_produto,
-- nao_suportado_sem_telefone. concluido também é terminal no sentido de
-- "este evento específico não precisa de mais processamento" — inclui
-- tanto o caso de venda criada com sucesso quanto o caso de evento novo
-- referenciando uma venda que já existia (idempotência da venda).
-- Estado transitório: processando (venda F5 já criada, avisos ainda
-- pendentes de confirmação).
-- Nota: erro_parcial não é estritamente terminal nem transitório — é
-- reprocessável (um reprocessamento bem-sucedido o move para
-- concluido), diferente dos demais estados "terminais" listados acima,
-- que só mudam via uma nova decisão (ex.: mapeamento cadastrado depois).
-- Nenhum evento retorna para 'recebido' depois de sair desse estado.
-- pendente_produto: produto do evento não foi resolvido (não encontrado
-- por nome na loja, ou encontrado mas sem ciclo de recompra válido para
-- o cenário recorrente) — não é o mesmo que 'rejeitado' (payload/dados
-- inválidos): o payload em si é válido, só o vínculo de produto não pôde
-- ser resolvido com segurança. Nenhum produto e nenhum ciclo são
-- inventados.
COMMENT ON TABLE eventos_venda_externa IS
  'Armazena o evento bruto recebido de uma origem externa. Preserva o payload original, mantém status, resultado, erro e vínculo com a venda F5. Funciona como trilha de auditoria e base de reprocessamento. Não é a venda oficial do F5.';
COMMENT ON COLUMN eventos_venda_externa.origem_sistema IS
  'Identificador do sistema de origem do evento — mesmo valor usado em mapeamento_lojas_externas e vendas_origem_externa. NULL quando o payload não trouxe esse campo (evento ainda assim é armazenado, com status=rejeitado).';
COMMENT ON COLUMN eventos_venda_externa.evento_externo_id IS
  'Identidade do EVENTO (não da venda) — junto com origem_sistema, é a chave de idempotência (ver eventos_venda_externa_identidade_evento_unique) que impede reprocessar o mesmo evento duas vezes. Ver vendas_origem_externa para a identidade da venda, que é um conceito distinto. NULL quando o payload não trouxe esse campo — nesse caso não há como deduplicar, e o evento é armazenado como rejeitado.';
COMMENT ON COLUMN eventos_venda_externa.loja_externa_id IS
  'Identificador da loja no sistema de origem, usado para resolver loja_id via mapeamento_lojas_externas. NULL quando o payload não trouxe esse campo.';
COMMENT ON COLUMN eventos_venda_externa.venda_externa_id IS
  'Identidade comercial da venda no sistema de origem — parte da chave de idempotência da VENDA (distinta da chave de idempotência do evento), replicada em vendas_origem_externa. NULL quando o payload não trouxe esse campo.';
COMMENT ON COLUMN eventos_venda_externa.tipo_evento IS
  'Tipo do evento (venda_criada/venda_atualizada/venda_cancelada/venda_devolucao_parcial). NULL quando o payload não trouxe esse campo ou trouxe um valor fora do vocabulário — evento ainda assim é armazenado, com status=rejeitado.';
COMMENT ON COLUMN eventos_venda_externa.contrato_versao IS
  'Identifica EXCLUSIVAMENTE a versão do Contrato Universal de Venda usada para interpretar este payload (ex.: "1.0"). NÃO representa versão de API, NÃO representa versão da integração/conector, NÃO representa versão do ERP de origem. O Contrato Universal pode evoluir (V1.0.x/V1.1/V2) independentemente de qualquer integração específica. NULL quando ausente do payload — nunca um default silencioso: ausência é tratada como rejeição explícita, não como "versão 1.0 presumida".';
COMMENT ON COLUMN eventos_venda_externa.payload_original IS
  'Payload exatamente como recebido, conforme o Contrato Universal de Venda (ver contrato_versao). Nunca é alterado após o insert — é a trilha de auditoria/replay.';
COMMENT ON COLUMN eventos_venda_externa.status IS
  'Estado do processamento do evento: recebido (inicial) | rejeitado (payload/dados inválidos ou sem identidade suficiente — nenhuma venda criada) | pendente_mapeamento (loja externa não mapeada) | pendente_vendedor (vendedor não mapeável — Gate 1, decisão 1: nesta fatia não se cria vendedor placeholder) | pendente_produto (produto do evento não resolvido, ou resolvido sem ciclo de recompra válido — payload válido, só o vínculo de produto não pôde ser resolvido; nenhum produto/ciclo inventado) | nao_suportado_sem_telefone (cliente sem telefone — Gate 1, decisão 3: funcionalidade completa fica para tarefa futura) | processando (venda F5 criada, avisos ainda pendentes) | concluido (venda criada com sucesso, OU evento novo referenciando uma venda que já existia — idempotência da venda) | erro_parcial (venda criada, avisos falharam — reprocessável). NÃO existe status "duplicado" persistido: nem a idempotência do evento nem a da venda criam uma segunda linha — "duplicado" só existe como valor de resposta ao chamador (ver eventos_venda_externa_identidade_evento_unique e vendas_origem_externa).';
COMMENT ON COLUMN eventos_venda_externa.resultado IS
  'Resposta formatada devolvida ao conector (aceito/duplicado/pendente_mapeamento/rejeitado/erro_parcial), conforme o Contrato Universal.';
COMMENT ON COLUMN eventos_venda_externa.erro IS
  'Mensagem de erro, quando status indica rejeição ou falha parcial.';
COMMENT ON COLUMN eventos_venda_externa.venda_f5_id IS
  'Venda oficial do F5 criada a partir deste evento, quando aplicável. Nulo se o evento não chegou a criar uma venda (rejeitado/pendente_mapeamento).';

CREATE TABLE vendas_origem_externa (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_f5_id uuid NOT NULL REFERENCES vendas(id),
  origem_sistema text NOT NULL,
  loja_externa_id text NOT NULL,
  venda_externa_id text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendas_origem_externa_identidade_unique
    UNIQUE (origem_sistema, loja_externa_id, venda_externa_id)
);

-- GATE 1.1.2 — nome explícito, não automático (decisão deliberada):
-- esta constraint representa a identidade comercial única da venda
-- externa dentro do F5 (origem_sistema + loja_externa_id +
-- venda_externa_id). O nome explícito é parte do CONTRATO TÉCNICO da
-- RPC processar_evento_venda_externa_v1: ela usa
-- GET STACKED DIAGNOSTICS ... CONSTRAINT_NAME para distinguir, dentro
-- do handler de unique_violation, a concorrência ESPERADA da
-- identidade da venda (quando CONSTRAINT_NAME =
-- 'vendas_origem_externa_identidade_unique') de qualquer outra
-- violação UNIQUE inesperada (que deve seguir para erro_parcial, nunca
-- ser tratada como duplicidade de venda). Renomear esta constraint no
-- futuro exige revisão da RPC — não é um nome cosmético.
COMMENT ON CONSTRAINT vendas_origem_externa_identidade_unique ON vendas_origem_externa IS
  'Identidade comercial única da venda externa (origem_sistema + loja_externa_id + venda_externa_id). Nome explícito é contrato técnico da RPC processar_evento_venda_externa_v1 — ela depende deste nome exato via GET STACKED DIAGNOSTICS CONSTRAINT_NAME para diferenciar concorrência esperada de outras violações UNIQUE. Não renomear sem revisar a RPC.';

COMMENT ON TABLE vendas_origem_externa IS
  'Vincula uma venda interna do F5 à sua identidade comercial no sistema externo. Garante idempotência da venda — diferente da idempotência do evento (ver eventos_venda_externa). Uma mesma venda pode receber vários eventos externos ao longo do tempo.';
COMMENT ON COLUMN vendas_origem_externa.venda_f5_id IS
  'Venda oficial do F5 correspondente a esta identidade externa.';
COMMENT ON COLUMN vendas_origem_externa.origem_sistema IS
  'Identificador do sistema de origem — mesmo valor usado em eventos_venda_externa e mapeamento_lojas_externas.';
COMMENT ON COLUMN vendas_origem_externa.loja_externa_id IS
  'Identificador da loja no sistema de origem, parte da identidade da venda.';
COMMENT ON COLUMN vendas_origem_externa.venda_externa_id IS
  'Identidade comercial da venda no sistema de origem — junto com origem_sistema e loja_externa_id, garante que a mesma venda externa nunca gera uma segunda venda F5.';

CREATE INDEX idx_eventos_venda_externa_status
  ON eventos_venda_externa(status);
CREATE INDEX idx_eventos_venda_externa_venda_f5
  ON eventos_venda_externa(venda_f5_id) WHERE venda_f5_id IS NOT NULL;
CREATE INDEX idx_vendas_origem_externa_venda_f5
  ON vendas_origem_externa(venda_f5_id);

-- ============================================================
-- PARTE C — Idempotência de avisos (aditivo, reaproveitável por
-- qualquer chamador, não específico deste pipeline)
-- ============================================================

-- Preflight: aborta se já existirem duplicatas de (item_venda_id,
-- mensagem_id) em avisos — mesma lição da migration 012
-- (comissao_venda). Verificado manualmente em staging antes desta
-- migration (zero duplicatas); este bloco torna a migration
-- autoverificável também, em vez de depender só da checagem manual.
DO $$
DECLARE
  v_duplicatas integer;
BEGIN
  SELECT count(*) INTO v_duplicatas
  FROM (
    SELECT item_venda_id, mensagem_id
    FROM avisos
    WHERE item_venda_id IS NOT NULL
    GROUP BY item_venda_id, mensagem_id
    HAVING count(*) > 1
  ) dup;

  IF v_duplicatas > 0 THEN
    RAISE EXCEPTION 'Encontradas % combinações duplicadas de (item_venda_id, mensagem_id) em avisos — resolva antes de criar avisos_item_mensagem_unique', v_duplicatas;
  END IF;
END $$;

-- DECISÃO ARQUITETURAL: este índice existe para garantir idempotência da
-- geração de avisos. Reprocessar um evento (ou só a etapa de avisos de
-- uma venda) NUNCA pode gerar o mesmo aviso duas vezes. A proteção é
-- garantida pelo próprio banco — inclusive sob concorrência (duas
-- execuções simultâneas do reprocessamento não criam condição de
-- corrida) — e não depende apenas de uma consulta prévia na aplicação
-- ("SELECT antes de INSERT"). O chamador deve usar
-- INSERT ... ON CONFLICT (item_venda_id, mensagem_id) DO NOTHING.
CREATE UNIQUE INDEX avisos_item_mensagem_unique
  ON avisos (item_venda_id, mensagem_id)
  WHERE item_venda_id IS NOT NULL;

COMMENT ON INDEX avisos_item_mensagem_unique IS
  'Garante idempotência da geração de avisos: reprocessar uma venda/evento nunca cria o mesmo aviso (item_venda_id + mensagem_id) duas vezes. Proteção no banco, válida sob concorrência — não depende de checagem prévia na aplicação. Usar INSERT ... ON CONFLICT DO NOTHING.';

-- ============================================================
-- PARTE D — RLS e grants (tabelas novas apenas)
-- ============================================================

ALTER TABLE mapeamento_lojas_externas ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_venda_externa ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_origem_externa ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON mapeamento_lojas_externas FROM PUBLIC, anon, authenticated;
REVOKE ALL ON eventos_venda_externa FROM PUBLIC, anon, authenticated;
REVOKE ALL ON vendas_origem_externa FROM PUBLIC, anon, authenticated;

-- ============================================================
-- PARTE E — RPC processar_evento_venda_externa_v1 (Gate 1.3)
-- ============================================================
-- Processa o primeiro Evento Universal de Venda (V1) sintético,
-- criando a venda F5 correspondente com segurança. Não gera avisos
-- (etapa separada), não calcula comissão, não vincula campanha, não
-- envia mensagem. Owner: quem aplicar esta migration (padrão do
-- projeto, mesmo comportamento das RPCs 057/064) — nenhuma
-- transferência de ownership é feita aqui.
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
      'contrato_versao', NULL
    );
  END IF;

  -- ── ETAPA 0: extrair identidade (comparações/extrações de texto,
  -- nunca lançam exceção) ──
  v_origem_sistema    := payload->'origem'->>'sistema';
  v_evento_externo_id := payload->'evento'->>'evento_externo_id';
  v_tipo_evento        := payload->'evento'->>'tipo_evento';
  v_contrato_versao    := payload->>'contrato_versao';
  v_loja_externa_id    := payload->'empresa_loja'->>'loja_externa_id';
  v_venda_externa_id   := payload->'venda'->>'venda_externa_id';

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
          'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status = 'erro_parcial' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','erro_parcial',
          'evento_id', v_evento_original.id, 'venda_f5_id', v_evento_original.venda_f5_id,
          'motivo','evento já recebido; venda criada, mas avisos falharam — elegível a reprocessamento da etapa de avisos',
          'etapa', 'avisos', 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status = 'rejeitado' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','rejeitado',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento já recebido e rejeitado: '||COALESCE(v_evento_original.erro,''),
          'etapa', NULL, 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status = 'nao_suportado_sem_telefone' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','nao_suportado_sem_telefone',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento já recebido — cliente sem telefone, ainda não suportado',
          'etapa', 'cliente', 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status IN ('pendente_mapeamento','pendente_vendedor','pendente_produto') THEN
        RETURN jsonb_build_object('sucesso', false, 'status', v_evento_original.status,
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento já recebido, permanece em '||v_evento_original.status,
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao);
      ELSE
        RETURN jsonb_build_object('sucesso', false, 'status','recebido',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento ainda em processamento ou aguardando decisão — tente novamente',
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao);
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
          'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status = 'erro_parcial' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','erro_parcial',
          'evento_id', v_evento_original.id, 'venda_f5_id', v_evento_original.venda_f5_id,
          'motivo','evento processado concorrentemente; avisos falharam — elegível a reprocessamento',
          'etapa', 'avisos', 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status = 'rejeitado' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','rejeitado',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento processado concorrentemente e rejeitado: '||COALESCE(v_evento_original.erro,''),
          'etapa', NULL, 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status = 'nao_suportado_sem_telefone' THEN
        RETURN jsonb_build_object('sucesso', false, 'status','nao_suportado_sem_telefone',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento processado concorrentemente — cliente sem telefone',
          'etapa', 'cliente', 'pode_reprocessar', false, 'contrato_versao', v_evento_original.contrato_versao);
      ELSIF v_evento_original.status IN ('pendente_mapeamento','pendente_vendedor','pendente_produto') THEN
        RETURN jsonb_build_object('sucesso', false, 'status', v_evento_original.status,
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento processado concorrentemente, permanece em '||v_evento_original.status,
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao);
      ELSE
        RETURN jsonb_build_object('sucesso', false, 'status','recebido',
          'evento_id', v_evento_original.id, 'venda_f5_id', NULL,
          'motivo','evento ainda em processamento por outra chamada — tente novamente',
          'etapa', NULL, 'pode_reprocessar', true, 'contrato_versao', v_evento_original.contrato_versao);
      END IF;
    ELSE
      -- unique_violation em constraint diferente da esperada: condição
      -- anômala e inesperada. Não há v_evento_id (o INSERT falhou por
      -- completo), então não há linha para atualizar. Retorna erro
      -- genérico e seguro, sem expor detalhe interno.
      RETURN jsonb_build_object('sucesso', false, 'status','erro_parcial',
        'evento_id', NULL, 'venda_f5_id', NULL,
        'motivo','Erro interno inesperado ao registrar o evento.',
        'etapa','evento_bruto', 'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
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
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
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
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  IF v_tipo_evento IS DISTINCT FROM 'venda_criada' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='tipo_evento ausente ou não suportado nesta fatia: '||COALESCE(v_tipo_evento,'(ausente)'), processado_em=now()
      WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','tipo_evento ausente ou não suportado nesta fatia','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  IF v_loja_externa_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='empresa_loja.loja_externa_id ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','empresa_loja.loja_externa_id ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  IF v_venda_externa_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.venda_externa_id ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.venda_externa_id ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
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
      'etapa', NULL, 'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  -- loja
  SELECT loja_id INTO v_loja_id FROM public.mapeamento_lojas_externas
    WHERE origem_sistema=v_origem_sistema AND loja_externa_id=v_loja_externa_id AND status='ativo';
  IF v_loja_id IS NULL THEN
    UPDATE public.eventos_venda_externa SET status='pendente_mapeamento', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','pendente_mapeamento','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','loja_externa_id não mapeada','etapa','mapeamento_loja',
      'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
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
      'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
  END IF;

  -- cliente — telefone obrigatório nesta fatia
  v_cliente_nome := payload->'cliente'->>'nome';
  v_cliente_telefone := regexp_replace(COALESCE(payload->'cliente'->>'telefone',''), '\D', '', 'g');
  IF length(v_cliente_telefone) < 10 THEN
    UPDATE public.eventos_venda_externa SET status='nao_suportado_sem_telefone', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','nao_suportado_sem_telefone','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','cliente sem telefone válido — ainda não suportado nesta fatia','etapa','cliente',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;
  IF v_cliente_nome IS NULL OR btrim(v_cliente_nome) = '' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='cliente.nome ausente', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','cliente.nome ausente','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
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
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  -- (1) formato ancorado — rejeita timestamp, hora, timezone, barra,
  -- DD-MM-YYYY, ausência de zero à esquerda, espaços, vazio, numérico
  -- puro. Roda ANTES do cast — nada disso deve sequer chegar a ::date.
  IF v_data_venda_raw !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.data_venda fora do formato YYYY-MM-DD: '||v_data_venda_raw, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.data_venda deve usar o formato YYYY-MM-DD','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  -- (2) cast protegido — inalterado desde o Gate 1.3B/1.3A.
  BEGIN
    v_data_venda := v_data_venda_raw::date;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.data_venda inválida: '||v_data_venda_raw, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','venda.data_venda inválida','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END;

  -- (3) defesa de round-trip — o texto recebido precisa ser
  -- exatamente a forma canônica que o Postgres devolveria para esta
  -- data. Não corrige nem normaliza: só rejeita se divergir.
  IF to_char(v_data_venda, 'YYYY-MM-DD') <> v_data_venda_raw THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado',
      erro='venda.data_venda não é a representação canônica: '||v_data_venda_raw, processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','formato ou valor de data não canônico','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  -- itens — jsonb_typeof ANTES de jsonb_array_length (Postgres NÃO
  -- garante short-circuit em `A OR B`; dividir em IFs sequenciais evita
  -- chamar array_length numa estrutura que não é array).
  IF payload->'itens' IS NULL OR jsonb_typeof(payload->'itens') IS DISTINCT FROM 'array' THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='itens ausente ou não é array', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','itens ausente ou não é array','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;
  IF jsonb_array_length(payload->'itens') = 0 THEN
    UPDATE public.eventos_venda_externa SET status='rejeitado', erro='itens vazio', processado_em=now() WHERE id=v_evento_id;
    RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
      'venda_f5_id',NULL,'motivo','itens vazio','etapa','validacao_payload',
      'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'itens') LOOP
    v_nome_origem := v_item->'produto'->>'nome_origem';
    IF COALESCE(btrim(v_nome_origem), '') = '' THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='produto.nome_origem ausente em algum item', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','produto.nome_origem ausente em algum item','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
    END IF;

    -- gate por tipo ANTES do cast (evita depender de exceção para o
    -- caso comum de campo ausente/tipo errado)
    IF jsonb_typeof(v_item->'quantidade') IS DISTINCT FROM 'number'
       OR jsonb_typeof(v_item->'valor_unitario') IS DISTINCT FROM 'number' THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='quantidade/valor_unitario ausente ou não-numérico em algum item', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','quantidade/valor_unitario ausente ou não-numérico em algum item','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
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
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
    END;

    IF v_qtd <= 0 OR v_valor <= 0 THEN
      UPDATE public.eventos_venda_externa SET status='rejeitado', erro='quantidade/valor_unitario deve ser > 0', processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','rejeitado','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','quantidade/valor_unitario deve ser > 0','etapa','validacao_payload',
        'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
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
          'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
      WHEN too_many_rows THEN
        UPDATE public.eventos_venda_externa SET status='pendente_produto', erro='produto ambíguo (mais de um ativo com o mesmo nome): '||v_nome_origem, processado_em=now() WHERE id=v_evento_id;
        RETURN jsonb_build_object('sucesso',false,'status','pendente_produto','evento_id',v_evento_id,
          'venda_f5_id',NULL,'motivo','produto ambíguo — mais de um produto ativo com o mesmo nome nesta loja','etapa','produto',
          'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
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
        'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
    END IF;

    IF v_recorrente = true AND (v_ciclo IS NULL OR v_ciclo <= 0) THEN
      UPDATE public.eventos_venda_externa SET status='pendente_produto', erro='produto recorrente sem ciclo de recompra válido: '||v_nome_origem, processado_em=now() WHERE id=v_evento_id;
      RETURN jsonb_build_object('sucesso',false,'status','pendente_produto','evento_id',v_evento_id,
        'venda_f5_id',NULL,'motivo','produto recorrente sem ciclo válido — sem fallback oculto de 30 dias','etapa','ciclo_produto',
        'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
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
  -- ══════════════════════════════════════════════════════════════
  BEGIN
    INSERT INTO public.clientes (loja_id, nome, whatsapp)
      VALUES (v_loja_id, v_cliente_nome, v_cliente_telefone)
      ON CONFLICT (loja_id, whatsapp) DO NOTHING
      RETURNING id INTO v_cliente_id;
    IF v_cliente_id IS NULL THEN
      SELECT id INTO v_cliente_id FROM public.clientes WHERE loja_id=v_loja_id AND whatsapp=v_cliente_telefone;
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
    INSERT INTO public.vendas_origem_externa (venda_f5_id, origem_sistema, loja_externa_id, venda_externa_id)
      VALUES (v_venda_id, v_origem_sistema, v_loja_externa_id, v_venda_externa_id);

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
          'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
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
          'etapa','criacao_venda', 'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
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
        'etapa','criacao_venda', 'pode_reprocessar', true, 'contrato_versao', v_contrato_versao);
  END;

  -- SÓ AQUI 'processando' é gravado pela primeira vez — nunca antes
  -- (Gate 1.2, correção final da semântica de processando).
  UPDATE public.eventos_venda_externa
    SET status='processando', venda_f5_id=v_venda_id, processado_em=now()
    WHERE id=v_evento_id;

  RETURN jsonb_build_object('sucesso',true,'status','aceito','evento_id',v_evento_id,
    'venda_f5_id', v_venda_id, 'motivo', NULL, 'etapa','avisos_pendentes',
    'pode_reprocessar', false, 'contrato_versao', v_contrato_versao);
END;
$$;

REVOKE ALL ON FUNCTION public.processar_evento_venda_externa_v1(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_evento_venda_externa_v1(jsonb) TO service_role;
