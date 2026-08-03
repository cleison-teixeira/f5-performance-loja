# PILOT-0006C — Gate 1.5 — Plano Consolidado de Execução

**Status:** **RETOMADO — EXECUÇÃO ATIVA EM SUPABASE PRO BRANCHING**

**Execution ID:** `PILOT-0006C-RUN-003`

**Estratégia:** Supabase Pro Branching — branch efêmera isolada, nunca
mesclada.

**Linha do tempo (resumo):**

1. `RUN-001` abortada — Branching indisponível no plano Free
   (`PaymentRequiredException`).
2. `RUN-002` encerrada — ambiente local via Podman inviável neste Mac
   (incompatibilidade arm64/macOS Ventura+; ver SEC-0005A).
3. SEC-0004 resolvida após upgrade da organização para Supabase Pro.
4. Ciclo `create_branch` → provisionamento saudável → `delete_branch`
   homologado num smoke test dedicado (branch de prova, descartada).
5. `RUN-003` aberto após reconfirmação integral dos artefatos congelados
   (Gate RUN-003.0).

**Resultado do RUN-003.0 (reconfirmação):**

- Migration 071 — SHA-256 `6da4cf96506da4645aa42bd1e30de7acae1ac954f5d59c85e24ff2a476d15109` — idêntico.
- README das fixtures — SHA-256 `819da9ff9e3be8dcb9674c4cd1774c0d24031f111193b9a1f05f2d6c45f7c397` — idêntico.
- 34/34 fixtures idênticas ao manifesto.
- Projeto pai: `ynrffhacpjzohrhkpuiq` (`f5-recompra-staging`, `ACTIVE_HEALTHY`).
- Produção proibida: `nhcppfovsxcsulyvwvgs` (não acessada).

Nenhuma branch do RUN-003 criada ainda, nenhuma migration aplicada, nenhum
dado gravado, nenhum teste executado. Matriz, manifesto, migration,
fixtures, protocolos C37/C38/C39, ordem dos 39 cenários e critérios de
encerramento permanecem exatamente como já congelados — nada disso foi
alterado nesta atualização.

Documentos relacionados: `docs/testing/pilot-0006c-gate-1.5-matriz.md` (39
cenários) e `docs/testing/pilot-0006c-gate-1.5-manifesto-hashes.md` (hashes
das fixtures e da migration 071).

---

## 1. Arquitetura — Camadas Oficiais do Motor Universal

```
Camada 1 — Contrato Universal de Venda
  Formato de entrada estável (JSON versionado, "contrato_versao").
  Não sabe nada sobre banco de dados nem sobre F5 internamente.

Camada 2 — Evento Bruto
  Preservação do payload como recebido, antes de qualquer interpretação
  (tabela eventos_venda_externa).

Camada 3 — Processamento
  Resolução de identidade (loja/vendedor/cliente/produto) e escrita
  atômica do resultado (venda + itens). É onde a RPC
  processar_evento_venda_externa_v1 vive hoje.

Camada 4 — Orquestração
  Motores que consomem a venda já criada sem alterá-la: Avisos,
  Recompra, Campanhas, Cashback, NPS, Analytics, Portal Indústria.
  Nenhum implementado nesta fatia (PILOT-0006C cobre só as Camadas 2 e 3).
```

Esta seção é só descritiva — não cria nenhuma tabela/função nova, não
altera a migration 071 nem a RPC.

### 1.1. Definição corrigida — Evento Bruto imutável (Camada 2)

A formulação anterior ("nunca é reescrito depois de gravado") estava
imprecisa: a linha de `eventos_venda_externa` **recebe atualizações
legítimas** durante o próprio pipeline da RPC aprovada (`status`,
`resultado`, `erro`, `processado_em`, `venda_f5_id`, todos escritos pela
própria `processar_evento_venda_externa_v1`, nunca por um motor externo).

**Definição correta:**

> O payload e a identidade originais do Evento Bruto são imutáveis. Apenas
> seus metadados de processamento podem evoluir durante o pipeline.

**Conteúdo bruto imutável** — depois do `INSERT` inicial, nunca alterado:

- `payload_original`
- `origem_sistema`
- `evento_externo_id`
- `loja_externa_id`
- `venda_externa_id`
- `tipo_evento`
- `contrato_versao`
- `recebido_em`

Esses campos representam o fato recebido e sua identidade original.

**Metadados operacionais mutáveis** — o pipeline pode atualizar:

- `status`
- `resultado`
- `erro`
- `processado_em`
- `venda_f5_id`

Esses campos representam o processamento do Evento Bruto, não uma
alteração do payload recebido.

Registrado explicitamente:

- Nenhum motor posterior (Camada 4) pode modificar `payload_original`.
- Nenhuma correção de produto, vendedor, cliente ou campanha pode
  reescrever o evento recebido.
- Reprocessamento (se vier a existir) atualiza somente os metadados
  operacionais listados acima — nunca o conteúdo bruto.

---

## 2. Regra Permanente de Congelamento

> Nenhuma etapa do Gate 1.5 inicia antes da etapa anterior estar
> formalmente congelada (documento revisado + hash conferido, quando
> aplicável). "Congelado" significa: nenhuma edição adicional é feita no
> artefato daquela etapa depois que a etapa seguinte começa. Se um
> problema for descoberto numa etapa já congelada, abre-se um mini-gate
> específico para corrigi-la — a execução das etapas posteriores para até
> esse mini-gate ser resolvido e a etapa recongelada.

Aplica-se a: esta matriz, o manifesto de hashes, a migration 071, a RPC,
as fixtures — todos já congelados nesta entrega.

---

## 3. Protocolo de congelamento da migration 071 (arquivo untracked)

`git status` mostrando `??` **não é prova de integridade** — só indica que
o arquivo não está no índice do git, nada sobre seu conteúdo ter mudado ou
não desde o último hash calculado. A única prova aceita é comparação de
SHA-256.

Passo obrigatório, imediatamente antes do `apply_migration` (passo 2 da
ordem operacional, seção 8):

1. Nome exato do arquivo: `supabase/migrations/071_pilot_0006c_evento_venda_externa.sql`.
2. Tamanho em bytes no momento da verificação.
3. SHA-256 de referência (congelado em
   `docs/testing/pilot-0006c-gate-1.5-manifesto-hashes.md`):
   `6da4cf96506da4645aa42bd1e30de7acae1ac954f5d59c85e24ff2a476d15109`.
4. SHA-256 recalculado (`shasum -a 256`) imediatamente antes do
   `apply_migration`.
5. Comparação byte a byte pelo hash (string igual = aprovado; qualquer
   diferença = divergência).
6. Horário da verificação (ISO 8601 com timezone), registrado no
   relatório final.

**Se o hash divergir:** parar. Não aplicar. Abrir mini-gate. Identificar a
mudança (diff contra a última versão conhecida). Revisar novamente antes
de prosseguir. **Nunca** atualizar silenciosamente o hash de referência
para fazer a comparação passar — isso descaracterizaria o próprio
propósito do congelamento.

O fato de o arquivo estar untracked não impede o teste — só exige que o
hash, não o git, seja tratado como identidade oficial do artefato nesta
execução.

---

## 4. Protocolo final do C39 (erro_parcial induzido)

### 4.1. Preflight de visibilidade do GUC (não destrutivo, roda antes de criar qualquer trigger)

```sql
BEGIN;
SET LOCAL pilot.force_error = 'true';
SELECT current_setting('pilot.force_error', true);
ROLLBACK;
```

Esperado: `true`. Este teste prova **apenas** que o GUC está disponível na
mesma transação SQL — nada além disso.

**Se o GUC não for visível:** não criar o trigger. Marcar C39 como **NÃO
EXECUTADO** na matriz. Reportar a limitação explicitamente no relatório
final. Não redesenhar o mecanismo silenciosamente durante a execução —
qualquer redesenho vira um mini-gate próprio, com nova apresentação antes
de seguir.

Proibido: adicionar `RAISE NOTICE` permanente à RPC aprovada
(`processar_evento_venda_externa_v1`) para fins de depuração deste
preflight — o preflight usa só `current_setting`, nunca toca a RPC.

### 4.2. Trigger temporário — segurança e ciclo de vida

```sql
-- TEMPORÁRIO — existe só na branch descartável, só na Fase 7/Grupo D,
-- nunca entra em migration, nunca é commitado.
CREATE OR REPLACE FUNCTION public._pilot_0006c_forcar_erro_parcial()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_execution_id text := TG_ARGV[0];
BEGIN
  IF current_setting('pilot.force_error', true) = 'true' THEN
    RAISE EXCEPTION 'PILOT_0006C_ERRO_INDUZIDO: falha técnica forçada (execution_id=%)', v_execution_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER _pilot_0006c_trigger_forcar_erro
  BEFORE INSERT ON public.itens_venda
  FOR EACH ROW
  EXECUTE FUNCTION public._pilot_0006c_forcar_erro_parcial('PILOT-0006C-RUN-001');
```

Garantias:

- Função e trigger existem **apenas** na branch descartável — nunca na
  branch principal, nunca em produção.
- Nomes com prefixo `_pilot_0006c` (evita colisão e facilita auditoria de
  remoção).
- Criado imediatamente antes do C39, não antes.
- Removido logo após o C39 — **mesmo se o cenário falhar de forma
  inesperada**.

Sequência operacional interna do C39 (não pode ser interrompida sem
completar a limpeza):

1. Criar trigger temporário.
2. Executar C39 (`SET LOCAL` + RPC, mesmo batch — ver 4.3).
3. Coletar evidências (resposta da RPC, linha de `eventos_venda_externa`).
4. `DROP TRIGGER _pilot_0006c_trigger_forcar_erro ON public.itens_venda;`
5. `DROP FUNCTION public._pilot_0006c_forcar_erro_parcial();`
6. Confirmar ausência no catálogo:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = '_pilot_0006c_trigger_forcar_erro';
   SELECT proname FROM pg_proc WHERE proname = '_pilot_0006c_forcar_erro_parcial';
   -- esperado: zero linhas nas duas consultas
   ```

**Se o C39 falhar antes da limpeza (passos 4–6), a próxima ação
obrigatória é completar a remoção dos objetos temporários — nunca seguir
para outro cenário com o trigger ainda presente no banco.**

O relatório final registra explicitamente a criação (passo 1) e a remoção
comprovada (passo 6).

### 4.3. Execução do C39 — mesmo batch/transação

```sql
BEGIN;
SET LOCAL pilot.force_error = 'true';
SELECT public.processar_evento_venda_externa_v1(<payload>::jsonb);
COMMIT;
```

**Obrigatório:** `SET LOCAL` e a chamada da RPC executam no mesmo
batch/transação (ex. via execução SQL direta na branch de teste). **Nunca**
em conexões ou requisições separadas — uma chamada via client de
aplicação (`supabase-js .rpc()`) não permite compor isso numa única
transação, portanto não é o caminho usado para o C39.

---

## 5. Snapshot de dados — protocolo de filtragem

Contagens "antes/depois" **nunca** usam apenas totais globais de tabela
para concluir que os testes não afetaram dados herdados da branch —
totais globais são só informação complementar.

A comparação principal é sempre filtrada por:

- Prefixo `TESTE_PILOT_0006C` (ou equivalente já usado nas fixtures, ex.
  `loja-teste-pilot0006c`, `evento-teste-pilot0006c-*`,
  `venda-teste-pilot0006c-*`), e/ou
- IDs capturados explicitamente no setup.

Registrar no relatório, quando aplicável:

- ID da loja fictícia.
- IDs dos clientes fictícios criados.
- IDs dos produtos fictícios criados.
- IDs das vendas criadas.
- IDs dos eventos criados.
- IDs dos vínculos em `mapeamento_lojas_externas` /
  `vendas_origem_externa`.

Nenhuma linha pessoal herdada da branch (dados pré-existentes não
relacionados a este teste) é exibida no relatório.

---

## 6. Policies, grants e owner — expectativa corrigida

A afirmação anterior ("só service_role com EXECUTE") era simplificada
demais — não considerava que o **owner** da função pode ter privilégios
implícitos e aparecer de forma diferente nas views de grants (não listado
em `information_schema.role_routine_grants` como um grant explícito, por
ser o dono).

**Expectativa correta, registrada separadamente:**

Privilégios explícitos (via `information_schema.role_routine_grants` /
`role_table_grants`):

- `PUBLIC` sem `EXECUTE`.
- `anon` sem `EXECUTE`.
- `authenticated` sem `EXECUTE`.
- `service_role` com `EXECUTE`.
- Nenhum outro role inesperado com `EXECUTE` explícito.

Privilégio do owner (via `pg_proc.proowner` / `pg_roles`):

- Owner identificado nominalmente no relatório (não presumido antes da
  consulta real).
- Owner preservado como o role de criação padrão do projeto — não é uma
  falha de segurança o owner ter privilégio implícito; é comportamento
  esperado do Postgres.

Consultas (já definidas na entrega anterior, mantidas sem alteração):

```sql
SELECT p.proname, n.nspname, p.prosecdef AS security_definer,
       p.proconfig AS config_settings,
       pg_get_function_identity_arguments(p.oid) AS assinatura,
       r.rolname AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.proname = 'processar_evento_venda_externa_v1';

SELECT grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = 'processar_evento_venda_externa_v1';
```

---

## 7. Regra de execution_id e reinício

- Esta tentativa é `PILOT-0006C-RUN-001`.
- Se a branch for criada e a execução for interrompida antes da
  conclusão, a **retomada na mesma branch, com os mesmos artefatos**,
  continua sendo `RUN-001`.
- Se a branch for descartada e uma nova execução completa começar, o
  próximo `execution_id` é `RUN-002`.
- `RUN-001` nunca é reutilizado para uma nova branch depois que a
  execução anterior for formalmente abandonada.

O relatório final registra o estado da execução em cada momento
relevante, usando exatamente um destes rótulos por evento:

- **iniciada**
- **pausada**
- **retomada**
- **abortada**
- **concluída**

---

## 8. Ordem operacional definitiva do Gate 1.5

Substitui integralmente a ordem resumida apresentada antes. Nenhuma
autorização cobre automaticamente o passo seguinte — cada passo abaixo
marcado como sensível pede aprovação própria, específica para aquele
passo.

1. Reconfirmar projeto pai (leitura).
2. Recalcular hashes dos artefatos congelados (migration 071 + fixtures)
   e comparar contra o manifesto (leitura).
3. **[autorização própria]** Solicitar autorização para criar branch.
4. **[autorização própria]** Criar branch (`create_branch`).
5. Identificar a branch criada e comparar refs com a branch pai
   (leitura).
6. Coletar snapshots iniciais (tabelas, `pg_policies`, `pg_proc`, grants,
   migrations aplicadas — seção 9).
7. Executar preflights (hash da migration recalculado nesta branch;
   preflight de visibilidade do GUC, seção 4.1).
8. Apresentar o resultado do Gate 1.5.0 (passos 1–7) para revisão.
9. **[autorização própria]** Solicitar autorização para aplicar
   migration.
10. **[autorização própria]** Aplicar exatamente uma migration (071).
11. Coletar snapshots pós-migration.
12. Validar RPC, RLS, grants e owner (seções 6 e 9) contra a expectativa
    documentada.
13. **[autorização própria]** Solicitar autorização para setup de dados
    fictícios.
14. **[autorização própria]** Executar setup fictício (loja mapeada,
    vendedor sintético, produtos conhecidos).
15. **[autorização própria]** Executar os casos sequenciais (Grupo A + B
    da seção 9 da matriz).
16. **[autorização própria]** Solicitar autorização para concorrência.
17. **[autorização própria]** Executar C37/C38 (Grupo C).
18. **[autorização própria]** Solicitar autorização para C39.
19. Executar preflight do GUC (seção 4.1, repetir nesta branch já com a
    migration aplicada).
20. Criar trigger temporário (seção 4.2, passo 1).
21. Executar C39 (seção 4.2, passos 2–3).
22. Remover trigger e função (seção 4.2, passos 4–5).
23. Provar remoção no catálogo (seção 4.2, passo 6).
24. Recalcular hashes finais das fixtures + migration, comparar contra os
    hashes iniciais (devem ser idênticos — nenhuma fixture ou migration é
    alterada durante a execução).
25. Produzir relatório final (39 linhas da matriz preenchidas, estados de
    execution_id, classificação de concorrência, snapshots antes/depois).
26. Congelar a branch sem novas escritas.
27. Aguardar revisão do relatório.
28. **[autorização própria]** Somente depois, solicitar autorização para
    `delete_branch`.

---

## 9. Grupos de execução — mapeamento exato para os 39 cenários

Substitui a menção genérica anterior ("C01–C06"), que era insuficiente e
contradizia a matriz completa. IDs conforme
`docs/testing/pilot-0006c-gate-1.5-matriz.md`.

### Grupo A — Casos locais e estáticos (não tocam o banco)

- Reconfirmar hashes (seção 3).
- Parse das 34 fixtures.
- Substituição de placeholders (`__VENDEDOR_ID_PLACEHOLDER__`) em
  memória, com validação de que nenhum placeholder restou no objeto
  enviado.
- Integridade dos arquivos (hash bate com o manifesto).

### Grupo B — Casos funcionais sequenciais (ordem importa; ver
"Pré-condição" na matriz)

Todos os cenários abaixo, na ordem em que aparecem na matriz (dependências
já registradas na coluna "Pré-condição"):

`C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14,
C15, C16, C17, C18, C19, C20, C21, C22, C23, C24, C25, C26, C27, C28,
C29, C30, C31, C32, C33, C34, C35, C36`

Cobrindo: fluxo feliz (C01), evento duplicado por reenvio literal (C02),
mesma venda com evento diferente (C03), cliente existente (C04), vários
itens válido/inválido (C05/C06), todos os `pendente_*`/`rejeitado`/
`nao_suportado_*` (C07–C11, C14–C17, C19, C21–C33), casos exploratórios de
data (C18, C20), produtos com setup específico — ambíguo e recorrente sem
ciclo (C12, C13), payload `{}` (C33), payload SQL `NULL` (C34), primeira e
segunda compras observadas — **somente como preparação de histórico,
nenhuma verificação de mensagem/aviso** (C35, C36).

### Grupo C — Concorrência

`C37, C38`

### Grupo D — Erro parcial

`C39`

### Regra de fechamento

Ao encerrar o Gate, **todas as 39 linhas da matriz** devem ter uma
classificação individual — exatamente uma de: **PASSOU**, **FALHOU**,
**NÃO EXECUTADO**. Nenhuma linha pode ficar sem resultado registrado,
inclusive C18/C20 (exploratórios, cujo resultado esperado só é confirmado
empiricamente) e qualquer cenário interrompido por um mini-gate (marcado
**NÃO EXECUTADO** com o motivo).

---

## 10. Regra de aprovação da concorrência (C37/C38)

Mantida a classificação de três estados do resultado observado —
**COMPROVADA**, **NÃO COMPROVADA**, **FALHOU** — mas separada em duas
conclusões distintas, que não podem ser fundidas numa única linha
PASSOU/FALHOU:

### 10.1. Idempotência sob duas requisições independentes

**Aprovada quando:**

- Duas requisições independentes são de fato disparadas (dois clientes
  Supabase distintos, `Promise.all`).
- Os invariantes finais da matriz passam (ex. C37: 1 linha de evento, ≤1
  venda; C38: 2 linhas de evento, 1 venda_f5_id compartilhado).
- Não há duplicação de venda.

Esta conclusão **não depende** de provar sobreposição real no servidor —
só depende do resultado final estar correto.

### 10.2. Sobreposição observada no servidor

**Comprovada somente se houver evidência adicional**, por exemplo:

- `pg_stat_activity` capturado durante a janela de execução mostrando as
  duas transações simultaneamente ativas.
- Logs com timestamps de início/fim sobrepostos.
- Duração sobreposta mensurável.
- Mecanismo de barreira explícito no script de teste.

### 10.3. Formato de relato

O relatório final declara as duas conclusões separadamente, por exemplo:

> "C37 — Idempotência passou sob duas requisições independentes;
> sobreposição interna no PostgreSQL não foi comprovada."

Isso é mais preciso do que reduzir o cenário a um único PASSOU/FALHOU, e é
o formato exigido para C37 e C38 no relatório final.

---

## 10.4. Plano de encerramento da branch (registrado antes do `create_branch`)

A branch `pilot-0006c-run-001-<timestamp>` tem custo horário recorrente
enquanto existir (US$ 0,01344/hora, confirmado via `get_cost` no Gate
1.5.0). Isso reforça — não substitui — a razão para o encerramento ser
determinístico e não depender de lembrete manual.

**Em qual etapa a branch é removida:** passo 28 da ordem operacional
(seção 8), o último passo do Gate 1.5 — só depois do passo 27 (aguardar
revisão do relatório) e nunca antes de C39 estar limpo (trigger/função
removidos e comprovados ausentes, seção 4.2).

**Comando usado:** `delete_branch`, uma única chamada, apontando para o
`branch_id`/`project_ref` retornado pelo `create_branch` desta execução —
nunca `merge_branch` (explicitamente descartado em toda a execução).
`delete_branch` exige autorização própria e específica, mesmo que o Gate
inteiro já tenha sido aprovado — não é coberta pela aprovação de
`create_branch`.

**Evidências coletadas antes da exclusão (passos 24–27, seção 8):**

1. **Hashes finais** — recalcular SHA-256 da migration 071 e das 34
   fixtures + README, comparar contra os hashes iniciais (seção 3 e
   manifesto). Devem ser **idênticos** aos hashes de entrada — nenhuma
   fixture ou migration foi alterada durante a execução. Preenche a seção
   "Hashes finais" do manifesto.
2. **Relatório final** — as 39 linhas da matriz classificadas
   individualmente como PASSOU/FALHOU/NÃO EXECUTADO (seção 9, regra de
   fechamento), com os estados de `execution_id` (iniciada → ... →
   concluída/abortada, seção 7) e a classificação de concorrência em duas
   conclusões (idempotência vs. sobreposição, seção 10).
3. **Confirmação de que nenhuma migration pendente permaneceu** — antes
   do `delete_branch`, consultar `supabase_migrations.schema_migrations`
   na branch e confirmar que a única migration aplicada foi a 071 (nenhuma
   migration adicional foi criada ou aplicada durante a execução, e
   nenhuma ficou em estado parcial/pendente).
4. Confirmação de que o trigger temporário do C39 e sua função foram
   removidos e ausentes do catálogo (`pg_trigger`/`pg_proc`, seção 4.2,
   passo 6) — pré-requisito já coberto pela sequência do C39, reafirmado
   aqui como condição de saída.

Só depois dessas quatro evidências estarem registradas no relatório final
é que o passo 28 (`delete_branch`) é solicitado — com uma nova
autorização explícita, específica para aquela chamada.

## 11. Confirmação

Nenhuma branch criada. Nenhuma migration aplicada. Nenhum dado gravado.
Nenhum teste executado. Nenhum acesso de escrita a staging/produção.
Nenhum commit, push ou PR.
