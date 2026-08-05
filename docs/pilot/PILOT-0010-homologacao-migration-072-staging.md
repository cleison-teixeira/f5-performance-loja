# PILOT-0010 — Homologação funcional da Migration 072 em Staging

**Data da execução:** 2026-08-05

**Ambiente:** `f5-recompra-staging` — Project ID `ynrffhacpjzohrhkpuiq`

**Migration aplicada:** `supabase/migrations/072_pilot_0010_clientes_origem_externa.sql`

**SHA-256:** `e16baaa4b96ae9a982a88c76f6fcd46a52870219c4200943857c7690741d2a93`

## 1. Validação estrutural

**22/22 PASSOU.** Cobertura: migration registrada uma única vez; `vendas.cliente_id` aceita NULL; tabela `clientes_origem_externa` criada com chave única `(origem_sistema, cliente_externo_id)` — sem `loja_id`; `cliente_f5_id` nullable com `ON DELETE SET NULL`; índice parcial em `cliente_f5_id`; `vendas_origem_externa.clientes_origem_externa_id` com `ON DELETE RESTRICT`; `status_contato` com `CHECK` restrito a `aguardando_enriquecimento` / `contato_disponivel` / `sem_contato`; RLS habilitada em `clientes_origem_externa`, sem grants a `anon`/`authenticated`/`PUBLIC`; função `SECURITY DEFINER`, `search_path=''`, grant exclusivo a `service_role`; função contém os 3 marcadores aditivos da 072 (`status_contato`, `clientes_origem_externa`, `identificador_externo`); seed oficial de homologação permaneceu íntegro após a aplicação.

## 2. Matriz funcional T01–T15

**15/15 PASSOU.**

| Teste | Cenário | HTTP | Status |
|---|---|---|---|
| T01 | Venda com telefone válido | 200 | aceito |
| T02 | Venda sem telefone e sem identificador | 200 | aceito |
| T03 | Venda sem telefone com identificador externo | 200 | aceito |
| T04 | Segunda venda, mesma identidade, sem telefone | 200 | aceito |
| T05 | Mesma identidade, agora com telefone | 200 | aceito |
| T06 | Reenvio literal do evento de T01 | 200 | duplicado |
| T07 | Mesma venda de T01, evento externo diferente | 200 | duplicado |
| T08 | Cliente genérico ("Consumidor") sem telefone | 200 | aceito |
| T09 | Nome ausente | 400 | rejeitado |
| T10 | Telefone inválido | 200 | aceito |
| T11 | Produto pendente | 422 | pendente_produto |
| T12 | Vendedor pendente | 422 | pendente_vendedor |
| T13 | Loja pendente | 422 | pendente_mapeamento |
| T14 | Payload antigo (sem identificador_externo) | 200 | aceito |
| T15 | Regressão H01–H10 | — | 10/10 |

## 3. Regressão H01–H10

**10/10 PASSOU** — H01=401, H02=401, H03=400, H04=400, H05=200 aceito, H06=200 duplicado, H07=400 rejeitado, H08=422 pendente_produto, H09=422 pendente_vendedor, H10=413. Nenhuma divergência do contrato congelado em PILOT-0007.

## 4. Provas específicas

- **Venda com telefone (T01/T05/T14):** `status_contato='contato_disponivel'`, `vendas.cliente_id` sempre preenchido.
- **Venda sem telefone (T02/T03/T04/T08/T10):** `status_contato='sem_contato'`, `vendas.cliente_id` sempre `NULL`.
- **Identidade externa (T03/T04/T05):** as três vendas apontam para a **mesma** linha em `clientes_origem_externa` (nenhuma segunda linha criada para o identificador repetido).
- **Promoção em T05:** ao chegar telefone válido para a identidade já criada em T03, `clientes_origem_externa.cliente_f5_id` é preenchido e `vendas.cliente_id` de T05 aponta para o mesmo Cliente F5.
- **Ausência de promoção retroativa:** consultado após T05 — `vendas.cliente_id` de T03 e T04 permanecem `NULL`. A promoção não altera vendas já registradas da mesma identidade.
- **Idempotência (T06/T07):** T06 (mesmo evento) retorna o mesmo `evento_id`/`venda_f5_id` de T01, sem nova linha. T07 (evento novo, mesma venda) retorna `duplicado` apontando para a venda de T01, sem nova venda. Contagem de linhas em `eventos_venda_externa` para a rodada: 13 para 14 requisições — exatamente o esperado, pois T06 reutilizou o `evento_externo_id` de T01 e não gerou linha nova.
- **Ausência de avisos:** zero avisos vinculados a qualquer venda de origem externa criada na rodada, com ou com sem contato.
- **Ausência de escrita fora do fluxo:** zero linhas em `comissao_venda` e zero itens de venda vinculados a campanha para as vendas da rodada.

## 5. Riscos não bloqueantes (herdados do Migration Impact Review)

1. Ausência de índice em `vendas_origem_externa.clientes_origem_externa_id`.
2. Política first-write-wins de `clientes_origem_externa.cliente_f5_id` (telefone diferente da mesma identidade não religa a promoção).
3. Ausência de prova absoluta sobre automações externas não versionadas no repositório.
4. Necessidade futura de guarda em `gerarParaVenda`/`planejarParaVenda` caso vendas externas venham a gerar jornada.
5. Rollback completo fica mais caro a partir da primeira venda real com `cliente_id NULL`.

Nenhum desses riscos se manifestou durante a homologação.

## 6. Confirmações

- Produção (`nhcppfovsxcsulyvwvgs`) não foi acessada em nenhum momento desta homologação.
- Nenhum segredo, token, header de autenticação ou valor de ambiente está registrado neste documento.
- Nenhum dado pessoal real foi utilizado — somente dados sintéticos (`origem.sistema='teste_f5'`, produtos com namespace `F5 HOMOLOGACAO -`, loja `homologacao-integracoes`, telefones fictícios no padrão `119999800XX`).
