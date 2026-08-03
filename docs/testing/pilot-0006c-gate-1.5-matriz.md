# PILOT-0006C — Gate 1.5 — Matriz de Execução (39 cenários)

Documento de planejamento/execução. `resultado real`, `PASSOU/FALHOU/NÃO
EXECUTADO`, `evidência`, `horário início/fim` e `duração` ficam **em
branco** até a execução real — nenhum resultado é presumido aqui.

## Identificação da execução

- **execution_id:** `PILOT-0006C-RUN-001`
- **Branch proposta:** `pilot-0006c-run-001-<timestamp>` (timestamp definido
  no momento da criação, Gate 1.5.0)
- Se a execução for abortada e reiniciada do zero, o próximo `execution_id`
  é `PILOT-0006C-RUN-002` — `RUN-001` nunca é reutilizado silenciosamente.
- Hash das fixtures: ver `docs/testing/pilot-0006c-gate-1.5-manifesto-hashes.md`
  (não repetido linha a linha aqui para não duplicar 34 hashes completos —
  a tabela abaixo referencia o arquivo, o hash integral vive só no manifesto).

## Convenções de verificação (referenciadas por código na tabela)

- **VQ1** — `SELECT status, sucesso... FROM eventos_venda_externa WHERE origem_sistema=... AND evento_externo_id=...` (linha do evento).
- **VQ2** — `SELECT count(*) FROM vendas_origem_externa WHERE origem_sistema=... AND loja_externa_id=... AND venda_externa_id=...` (idempotência de venda).
- **VQ3** — `SELECT count(*) FROM clientes WHERE loja_id=... AND whatsapp=...` (cliente único, não duplicado).
- **VQ4** — `SELECT count(*) FROM itens_venda WHERE venda_id=...` (número de itens).
- **VQ5** — `SELECT count(*) FROM comissao_venda WHERE venda_id=...` (deve ser 0 sempre).
- **VQ6** — `SELECT campanha_venda_id, campanha_venda_item_id FROM itens_venda WHERE venda_id=...` (devem ser NULL sempre).
- **VQ7** — `SELECT nome FROM clientes WHERE id=...` (nome não sobrescrito).

Todo `execution_id` registrado nos artefatos desta execução é
`PILOT-0006C-RUN-001` (constante — por isso não repetido em cada uma das
39 linhas da tabela, para não inflar o documento com um valor idêntico
repetido; fica declarado uma única vez aqui).

## Tabela

| ID | Fixture/Cenário | Fase | Pré-condição | Placeholder | Chamada | Status esp. | Sucesso esp. | pode_reprocessar esp. | Evento Bruto | Cliente | Venda | Nº itens | venda_f5_id | Verificação | Limpeza | Horário início | Horário fim | Duração | Resultado real | PASSOU/FALHOU/NÃO EXEC. | Evidência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | venda-valida.json | Fase 5.1 | setup base (Fase 1b) | sim | RPC | aceito | true | false | sim | cria | cria | 1 | presente | VQ1,VQ3,VQ4,VQ5,VQ6 | apagar via branch | | | | | | |
| C02 | reenvio literal venda-valida.json | Fase 5.2 | C01 executado | sim | RPC (2ª vez) | duplicado | true | false | reaproveita | não | não | — | igual a C01 | VQ1 (mesma linha) | — | | | | | | |
| C03 | mesma-venda-evento-diferente.json | Fase 5.3 | C01 executado | sim | RPC | duplicado | true | false | cria (evento novo) | não | não | — | igual a C01 | VQ1,VQ2 | apagar evento | | | | | | |
| C04 | cliente-existente.json | Fase 5.4 | C01 executado | sim | RPC | aceito | true | false | sim | reutiliza | cria (nova) | 1 | nova, distinta de C01 | VQ1,VQ3,VQ7 | apagar via branch | | | | | | |
| C05 | varios-itens-valido.json | Fase 5.5 | C01 executado; produto "Vitamina D3..." cadastrado | sim | RPC | aceito | true | false | sim | reutiliza | cria | 2 | nova | VQ1,VQ4,VQ5,VQ6 | apagar via branch | | | | | | |
| C06 | varios-itens-um-invalido.json | Fase 5.6 | produto conhecido cadastrado | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1,VQ3,VQ4 (tudo 0/ausente) | apagar evento | | | | | | |
| C07 | loja-nao-mapeada.json | Fase 2 | — | sim | RPC | pendente_mapeamento | false | true | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C08 | vendedor-ausente.json | Fase 2 | — | não (null) | RPC | pendente_vendedor | false | true | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C09 | vendedor-invalido.json | Fase 2 | — | não (string inválida) | RPC | pendente_vendedor | false | true | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C10 | cliente-sem-telefone.json | Fase 2 | — | sim | RPC | nao_suportado_sem_telefone | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C11 | produto-nao-resolvido.json | Fase 2 | — | sim | RPC | pendente_produto | false | true | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C12 | produto-ambiguo.json | Fase 4.1 | criar 2 produtos "Produto Ambíguo Teste Pilot0006C" | sim | RPC | pendente_produto | false | true | sim | não | não | 0 | NULL | VQ1 | apagar evento + 2 produtos | | | | | | |
| C13 | produto-recorrente-sem-ciclo.json | Fase 4.2 | criar produto recorrente sem ciclo | sim | RPC | pendente_produto | false | true | sim | não | não | 0 | NULL | VQ1 | apagar evento + produto | | | | | | |
| C14 | contrato-nao-suportado.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C15 | tipo-evento-nao-suportado.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C16 | data-invalida-formato.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C17 | data-inexistente.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C18 | data-ano-zero.json | Fase 3 | — | sim | RPC | **exploratório** | ? | ? | sim | ? | ? | ? | ? | VQ1 (registrar SQLSTATE real) | apagar evento | | | | | | |
| C19 | data-venda-ausente.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C20 | data-venda-round-trip-invalido.json | Fase 3 | — | sim | RPC | **exploratório** | ? | ? | sim | ? | ? | ? | ? | VQ1 (registrar SQLSTATE real) | apagar evento | | | | | | |
| C21 | itens-nao-array.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C22 | itens-vazio.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C23 | quantidade-invalida-string.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C24 | quantidade-invalida-zero.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C25 | quantidade-invalida-negativa.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C26 | valor-unitario-invalido-string.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C27 | valor-unitario-invalido-zero.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C28 | valor-unitario-invalido-negativo.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C29 | loja-externa-id-ausente.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C30 | venda-externa-id-ausente.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C31 | cliente-nome-ausente.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C32 | produto-nome-origem-ausente.json | Fase 2 | — | sim | RPC | rejeitado | false | false | sim | não | não | 0 | NULL | VQ1 | apagar evento | | | | | | |
| C33 | json-vazio.json (`{}`) | Fase 2 | — | n/a | RPC | rejeitado | false | false | sim (identidade NULL) | não | não | 0 | NULL | VQ1 (buscar por id retornado) | apagar evento | | | | | | |
| C34 | payload SQL NULL literal | Fase 2 | — | n/a | RPC(`NULL`) | rejeitado | false | false | **não** (nenhuma linha) | não | não | 0 | NULL | contagem geral de eventos antes/depois (deve ser igual) | — | | | | | | |
| C35 | primeira-compra-observada.json | Fase 8 | — | sim | RPC | aceito | true | false | sim | cria | cria | 1 | presente | VQ1,VQ3,VQ4 — **sem checar mensagem/aviso** | apagar via branch | | | | | | |
| C36 | segunda-compra-observada.json | Fase 8 | C35 executado | sim | RPC | aceito | true | false | sim | reutiliza | cria (nova) | 1 | nova | VQ1,VQ3,VQ7 — **sem checar mensagem/aviso** | apagar via branch | | | | | | |
| C37 | concorrência de evento (payload em memória, id novo) | Fase 6.1 | setup base | sim | 2 RPCs simultâneas (script `.mjs`, `Promise.all`, 2 conexões independentes) | 1×aceito + 1×duplicado | — | — | 1 linha de evento | não duplicado | ≤1 | ≤1 | 1 venda_f5_id | VQ1 (1 linha),VQ2,VQ3 | apagar via branch | | | | | | |
| C38 | concorrência de venda (2 eventos, mesma identidade de venda) | Fase 6.2 | setup base | sim | 2 RPCs simultâneas (script `.mjs`, `Promise.all`, 2 conexões independentes) | 1×aceito + 1×duplicado | — | — | 2 linhas de evento | não duplicado, não órfão | 1 | ≤1 conjunto | 1 venda_f5_id (mesma para ambos) | VQ1 (2 linhas),VQ2 (1 linha),VQ3,VQ4 | apagar via branch | | | | | | |
| C39 | erro_parcial induzido (GUC `pilot.force_error`, trigger técnico temporário) | Fase 7 | trigger temporário criado (SQL na seção 2 do plano) | sim | `SET LOCAL pilot.force_error='true'` + RPC, mesma transação | erro_parcial | false | true | sim | não (revertido) | não (revertido) | 0 | NULL | VQ1, `erro` contém detalhe técnico, `motivo` da resposta é genérico | apagar evento + drop trigger/função | | | | | | |

Total: **39 cenários**. Classificação de concorrência (C37/C38) a
registrar no relatório final como **COMPROVADA** / **NÃO COMPROVADA** /
**FALHOU**, nunca presumida.
