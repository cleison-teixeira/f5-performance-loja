# PILOT-0006C — RUN-003 — Relatório Final do Gate 1.5

**Status:** HOMOLOGAÇÃO FUNCIONAL CONCLUÍDA — BRANCH EXCLUÍDA — RUN-003 ENCERRADO

**Exclusão da branch (RUN-003.10):**

- Horário UTC da exclusão: `2026-08-02T19:40Z` (aprox., imediatamente após a aprovação).
- `branch_id` excluído: `c1205247-8198-4adc-b9e8-86ddc90b171e`.
- `project_ref` excluído: `gikpvrppsprsmpagdsep`.
- `delete_branch` retornou `{"success": true}`; `list_branches` pós-exclusão confirma **apenas** a branch `main` do staging (`ynrffhacpjzohrhkpuiq`, `ACTIVE_HEALTHY`) — a branch do RUN-003 não aparece mais.
- Cobrança horária da branch encerrada (recurso não existe mais).
- Staging preservado e saudável; produção (`nhcppfovsxcsulyvwvgs`) nunca acessada em toda a execução do RUN-003.
- `merge_branch` nunca foi chamado em nenhum momento do RUN-003.

**Verificação de integridade final (RUN-003.9), UTC:** `2026-08-02T19:35Z` (aprox.)

- Migration 071: SHA-256 `6da4cf96506da4645aa42bd1e30de7acae1ac954f5d59c85e24ff2a476d15109`, 56210 bytes — **IDÊNTICO** ao valor congelado.
- README das fixtures: SHA-256 `819da9ff9e3be8dcb9674c4cd1774c0d24031f111193b9a1f05f2d6c45f7c397`, 11980 bytes — **IDÊNTICO**.
- 34/34 fixtures JSON — **IDÊNTICAS** ao manifesto congelado.
- Catálogo da branch: 0 triggers/funções `_pilot_0006c*` residuais; 3 tabelas presentes; RPC presente; migration `pilot_0006c_evento_venda_externa` registrada.
- Branch confirmada saudável (`FUNCTIONS_DEPLOYED`/`ACTIVE_HEALTHY`), isolada (`project_ref gikpvrppsprsmpagdsep` ≠ staging `ynrffhacpjzohrhkpuiq` ≠ produção `nhcppfovsxcsulyvwvgs`), `is_default=false`, `persistent=false`.
- **Branch pronta para exclusão** — `delete_branch` ainda não executado, aguardando autorização específica.

**Execution ID:** `PILOT-0006C-RUN-003`

## 1. Estado da execução

**Estado:** CONCLUÍDA FUNCIONALMENTE — AGUARDANDO HASHES FINAIS E EXCLUSÃO DA BRANCH

**Linha do tempo:**

1. `RUN-001` — abortada por Branching indisponível no plano Free (SEC-0004).
2. `RUN-002` — encerrada por inviabilidade do ambiente local via Podman neste Mac (SEC-0005A).
3. `RUN-003` — executada com sucesso em Supabase Pro Branching, branch `pilot-0006c-run-003-20260802-1807` (`branch_id c1205247-8198-4adc-b9e8-86ddc90b171e`, `project_ref gikpvrppsprsmpagdsep`), filha de `f5-recompra-staging` (`ynrffhacpjzohrhkpuiq`).
4. Migration 071 aplicada **somente na branch** — staging e produção (`nhcppfovsxcsulyvwvgs`) nunca acessados com escrita.
5. 39 cenários concluídos (C01–C39).

## 2. Matriz final — 39 linhas

`execution_id` de todas as linhas: `PILOT-0006C-RUN-003`.

| # | Cenário | Fixture | Expectativa | Observado | Classificação | evento_id | venda_f5_id |
|---|---|---|---|---|---|---|---|
| C01 | Fluxo feliz | venda-valida.json | aceito | aceito | PASSOU | 56631ad6... | f1a7534f... |
| C02 | Reenvio literal | venda-valida.json | duplicado | duplicado | PASSOU | 56631ad6... | f1a7534f... |
| C03 | Mesma venda, evento diferente | mesma-venda-evento-diferente.json | duplicado | duplicado (concluido) | PASSOU | ab590e46... | f1a7534f... |
| C04 | Cliente existente | cliente-existente.json | aceito, nome preservado | aceito, nome preservado | PASSOU | c03d0e45... | c5ee7fb8... |
| C05 | Vários itens válido | varios-itens-valido.json | aceito, 2 itens | aceito, 2 itens | PASSOU | 6476e8ce... | 172aea84... |
| C06 | Vários itens, 1 inválido | varios-itens-um-invalido.json | rejeitado, rollback total | rejeitado | PASSOU | 5dd2216b... | null |
| C07 | Loja não mapeada | loja-nao-mapeada.json | pendente_mapeamento | pendente_mapeamento | PASSOU | 46e02d94... | null |
| C08 | Vendedor ausente | vendedor-ausente.json | pendente_vendedor | pendente_vendedor | PASSOU | 8eb673c5... | null |
| C09 | Vendedor inválido | vendedor-invalido.json | pendente_vendedor | pendente_vendedor | PASSOU | db985978... | null |
| C10 | Cliente sem telefone | cliente-sem-telefone.json | nao_suportado_sem_telefone | nao_suportado_sem_telefone | PASSOU | 4f535375... | null |
| C11 | Produto não resolvido | produto-nao-resolvido.json | pendente_produto | pendente_produto | PASSOU | d007331e... | null |
| C12 | Produto ambíguo | produto-ambiguo.json | pendente_produto (too_many_rows) | pendente_produto | PASSOU | 8a5482c4... | null |
| C13 | Produto sem ciclo | produto-recorrente-sem-ciclo.json | pendente_produto | pendente_produto | PASSOU | 579751e9... | null |
| C14 | Contrato não suportado | contrato-nao-suportado.json | rejeitado | rejeitado | PASSOU | 75cd5b6f... | null |
| C15 | Tipo evento não suportado | tipo-evento-nao-suportado.json | rejeitado | rejeitado | PASSOU | 7ad52c64... | null |
| C16 | Data inválida (formato) | data-invalida-formato.json | rejeitado | rejeitado | PASSOU | b0634632... | null |
| C17 | Data inexistente | data-inexistente.json | rejeitado | rejeitado | PASSOU | b17a9dbe... | null |
| C18 | Data ano zero (exploratório) | data-ano-zero.json | exploratório | rejeitado no cast | PASSOU | b15f5d0b... | null |
| C19 | Data venda ausente | data-venda-ausente.json | rejeitado | rejeitado | PASSOU | c53df8b2... | null |
| C20 | Round-trip inválido (exploratório) | data-venda-round-trip-invalido.json | exploratório | rejeitado no cast (idêntico a C18) | PASSOU | 5e2d2640... | null |
| C21 | Itens não é array | itens-nao-array.json | rejeitado | rejeitado | PASSOU | 04c80338... | null |
| C22 | Itens vazio | itens-vazio.json | rejeitado | rejeitado | PASSOU | 71815f9d... | null |
| C23 | Quantidade string | quantidade-invalida-string.json | rejeitado | rejeitado | PASSOU | 499e7943... | null |
| C24 | Quantidade zero | quantidade-invalida-zero.json | rejeitado | rejeitado | PASSOU | 450a14bd... | null |
| C25 | Quantidade negativa | quantidade-invalida-negativa.json | rejeitado | rejeitado | PASSOU | 2f99749b... | null |
| C26 | Valor unitário string | valor-unitario-invalido-string.json | rejeitado | rejeitado | PASSOU | 93abe038... | null |
| C27 | Valor unitário zero | valor-unitario-invalido-zero.json | rejeitado | rejeitado | PASSOU | d70fd3c0... | null |
| C28 | Valor unitário negativo | valor-unitario-invalido-negativo.json | rejeitado | rejeitado | PASSOU | d88e1a04... | null |
| C29 | Loja externa id ausente | loja-externa-id-ausente.json | rejeitado | rejeitado | PASSOU | 55df1f96... | null |
| C30 | Venda externa id ausente | venda-externa-id-ausente.json | rejeitado | rejeitado | PASSOU | d1b0dda2... | null |
| C31 | Cliente nome ausente | cliente-nome-ausente.json | rejeitado | rejeitado | PASSOU | 9be3cc18... | null |
| C32 | Produto nome_origem ausente | produto-nome-origem-ausente.json | rejeitado | rejeitado | PASSOU | 7a18dd53... | null |
| C33 | JSON vazio `{}` | json-vazio.json | rejeitado, identidade ausente | rejeitado, payload preservado | PASSOU | eceff83c... | null |
| C34 | Payload SQL NULL | (sem arquivo) | rejeitado, sem Evento Bruto | rejeitado, 0 linhas criadas | PASSOU | null | null |
| C35 | Primeira compra observada | primeira-compra-observada.json | aceito | aceito, cliente novo | PASSOU | f3692ace... | 5ef152ba... |
| C36 | Segunda compra observada | segunda-compra-observada.json | aceito | aceito, cliente reaproveitado | PASSOU | 802c8ffd... | 17f32152... |
| C37 | Concorrência de evento | (sintética, IDs exclusivos C37) | idempotência funcional comprovada | idempotência funcional COMPROVADA; sobreposição real NÃO COMPROVADA | PASSOU | 6d35ff1c... | 3b029ef6... |
| C38 | Concorrência de venda | (sintética, IDs exclusivos C38) | idempotência funcional comprovada | idempotência funcional COMPROVADA; sobreposição real NÃO COMPROVADA | PASSOU | 0e9174d7.../6efd8601... | 9f5170b5... |
| C39 | Erro parcial induzido | (sintética, GUC `pilot.force_error`) | erro_parcial comprovado | erro_parcial COMPROVADO; zero órfãos; limpeza confirmada | PASSOU | 188d1821... | null |

**Totais: PASSOU: 39 · FALHOU: 0 · NÃO EXECUTADO: 0.**

## 3. Resultados consolidados

### Migration 071

Aplicada com sucesso na branch isolada; registrada no histórico remoto como `pilot_0006c_evento_venda_externa` (versão `20260802182612`); 3 tabelas criadas (`mapeamento_lojas_externas`, `eventos_venda_externa`, `vendas_origem_externa`); RPC `processar_evento_venda_externa_v1` criada; índices/constraints criados (`eventos_venda_externa_identidade_evento_unique`, `vendas_origem_externa_identidade_unique`, `avisos_item_mensagem_unique`); RLS habilitado nas 3 tabelas, zero policies, zero grants de `anon`/`authenticated`; `SECURITY DEFINER` + `search_path=""` confirmados; `EXECUTE` restrito a `service_role` (+ owner `postgres`); dados anteriores (5 vendas, 2 clientes pré-existentes do setup) permaneceram intactos.

### C01–C36

36/36 PASSOU. 34 Eventos Brutos criados (C02 reaproveitou a linha de C01). 5 vendas de integração. 2 clientes. 6 itens. 5 vínculos externos. 0 avisos. 8 chaves presentes em todos os 36 retornos. Evento Bruto preservado em todos os casos aplicáveis, inclusive `{}` (C33). Nenhum efeito indevido em nenhum dos 22 caminhos rejeitados/pendentes (21 rejeitado + 7 pendente/não suportado, com sobreposição correta somando 34 no total de eventos).

### C37

Idempotência do evento comprovada. 1 evento, 1 venda, 1 vínculo, nenhum órfão. Sobreposição real não comprovada (execução sequencial, gap de ~6,5s entre as duas chamadas).

### C38

Idempotência da venda comprovada. 2 eventos, 1 venda, 1 vínculo, nenhum órfão. Sobreposição real não comprovada (gap de ~14s).

### C39

GUC técnico validado (`pilot.force_error='true'`). `erro_parcial` comprovado, com detalhe técnico completo persistido internamente (`erro`) e motivo externo genérico e seguro na resposta. Evento Bruto preservado. Zero efeitos órfãos (cliente/venda/itens revertidos ao savepoint do Bloco B). Trigger e função temporários removidos; catálogo final confirmado limpo (`0` objetos `_pilot_0006c*`).

## 4. Achados e ressalvas

### Drift de migrations (não bloqueante)

Migrations remotas não versionadas em `origin/main` foram encontradas na branch (herdadas do staging pai): `000_staging_schema_baseline`, `058_motor_campanhas_v2`, `staging_001_corrections_avisos_lojas_produtos`, `seed_rede_verde_essencial_v2`, `059_editar_campanha_transacional`, `060_cancelamento_venda_campanha`, `061_hardening_campanhas_financeiro_mensagens`, `062_staging_parity_production_baseline`. A `062` existe no staging remoto sem nunca ter sido versionada em nenhuma branch git pesquisada — corrige uma conclusão anterior da SEC-0003 que a classificava como "numeração não usada". Há também divergência de nome entre os arquivos locais `067`–`070` e seus nomes rastreados remotamente (sem prefixo numérico). Este achado **não bloqueou** a aplicação da 071, porque o catálogo real (não a lista de migrations) foi usado como fonte da verdade nos preflights (RUN-003.2). Correção/investigação futura pertence à governança da SEC-0003, não ao escopo do PILOT-0006C.

### Metodologia de evidência (correção de protocolo, não da RPC)

Durante C01, uma tentativa de validar RPC e evidência na mesma instrução SQL (via CTE) produziu leitura inconsistente por visibilidade de snapshot dentro do mesmo comando — não por reexecução da função (confirmado: só 1 evento existia). A partir de C02, RPC e evidência foram executadas em consultas sempre separadas. Isso foi uma correção do protocolo de teste, não um defeito da RPC.

### Datas exploratórias (lacuna de fixture, não falha do Gate)

`data-ano-zero.json` e `data-venda-round-trip-invalido.json` usam o mesmo valor `"0000-01-01"`; ambas falharam no **cast** (`::date`), nunca exercitando empiricamente a defesa de round-trip (item 3 da validação de data). Registrado como lacuna futura das fixtures, não como falha do Gate 1.5.

### Concorrência (classificação precisa, não presumida)

Duas requisições independentes foram executadas em cada um de C37/C38 (conexões separadas via `execute_sql`, despachadas em paralelo). A idempotência funcional foi comprovada em ambos — resultado final correto, sem duplicidade. Os timestamps capturados mostraram execução **sequencial** (sem sobreposição), portanto a sobreposição real no servidor permanece **NÃO COMPROVADA**. Não se declara um teste de corrida real concluído — apenas a garantia de idempotência sob despacho independente.

## 5. Decisão arquitetural

O Contrato Universal V1 foi **homologado funcionalmente** em banco PostgreSQL real, em branch Supabase isolada, para os 39 cenários definidos.

**A homologação comprova:**
- Ingestão do Evento Bruto (inclusive payloads malformados/vazios/NULL).
- Validação de payload em todas as dimensões definidas (contrato, tipo de evento, identidade, data, itens, valores).
- Idempotência sequencial de evento (C01–C03, C37).
- Idempotência sequencial de venda (C04, C38).
- Tratamento seguro de rejeições e pendências (21 rejeitados + 7 pendentes/não suportados).
- Rollback de efeitos parciais no Bloco B (C06, C39).
- Persistência de `erro_parcial` com detalhe técnico interno e resposta externa segura (C39).
- Segurança de RLS/grants/RPC (`SECURITY DEFINER`, `search_path` vazio, zero policies, zero grants indevidos).
- Ausência de efeitos indevidos em todos os 39 cenários.

**A homologação NÃO comprova ainda:**
- Sobreposição real simultânea no servidor (C37/C38 — NÃO COMPROVADA).
- Integração com ERP/TOV real.
- Endpoint HTTP (PILOT-0007, Gate 0 já auditado, implementação não iniciada).
- Autenticação de integração real.
- Mapeamento universal de vendedores (PILOT-0006D, pendência formal já registrada na migration 071).
- Motor de avisos (fora de escopo desta RPC, por decisão arquitetural registrada).
- Comportamento de primeira compra no motor de avisos (C35/C36 validaram só a preparação de histórico, não mensagens).

## 6. Confirmações finais

- Nenhuma nova chamada funcional (RPC/fixture) ocorreu durante a consolidação deste relatório.
- Nenhuma migration, RPC ou fixture foi alterada.
- Nenhum acesso de escrita a staging ou produção.
- Catálogo da branch confirmado limpo de objetos `_pilot_0006c*` residuais.
- Hashes finais **ainda não recalculados** — pendência da próxima etapa (RUN-003.9).
- Branch `pilot-0006c-run-003-20260802-1807` **não excluída** — permanece ativa para revisão.
- Nenhum commit ou push realizado.
