# PILOT-0006C — Regra de Negócio: Primeira Compra Observada (Motor de Avisos)

**Status:** decisão registrada, **não implementada**. Aplica-se à futura
etapa idempotente de geração de avisos (fora do escopo da RPC
`processar_evento_venda_externa_v1`, já aprovada e implementada). Nenhuma
migration, RPC ou fixture foi alterada para registrar esta decisão.

## 1. Regra formal de primeira compra observada

```
primeira_compra_observada(loja_id, cliente_id) =
  NÃO existe nenhuma venda válida, anterior e não cancelada,
  para o mesmo (loja_id, cliente_id).
```

A venda que está sendo processada no momento **nunca** conta como "compra
anterior" durante essa verificação — a checagem olha só para o que já
existia **antes** dela.

**Identidade usada:** `loja_id + cliente_id`. Explicitamente **não**
considerada: primeira compra do produto, primeira compra da marca,
primeira compra da campanha, primeiro evento da integração — nenhum desses
é o critério.

## 2. Dois tipos de mensagem, não um

Separação conceitual obrigatória — nunca reutilizar uma única mensagem com
as duas semânticas:

| Tipo | Quando dispara | Conteúdo característico |
|---|---|---|
| `boas_vindas_primeira_compra` | `primeira_compra_observada = true` | Apresentação da loja + pedido para salvar o número. Ex.: "Olá, aqui é da Verde Natural. Obrigado pela sua compra. Salve nosso número..." |
| `agradecimento_nova_compra` | `primeira_compra_observada = false` (opcional, conforme configuração futura da loja) | Agradecimento por comprar novamente, **sem** se apresentar como primeiro contato, **sem** repetir o pedido de salvar o número. Ex.: "Olá, Maria! Obrigado por comprar novamente com a Verde Natural." |

## 3. Limitação do histórico — primeira compra real vs. observada

`primeira_compra_observada` reflete o que o **F5** enxerga, não
necessariamente a vida real do cliente naquela loja. Quando uma loja
começa a usar o F5 (ou integra um ERP) sem importar histórico anterior, a
"primeira compra observada pelo F5" pode não ser a primeira compra real.
Essa distinção — **primeira compra real** vs. **primeira compra observada
pelo F5** — deve ficar explícita em qualquer mensagem/log gerado por essa
regra. Uma carga histórica futura do ERP poderia melhorar essa precisão,
mas isso está fora de escopo aqui.

## 4. O que não conta como compra anterior

Evento duplicado · venda que não chegou a ser criada · venda cancelada
(quando cancelamento existir) · evento rejeitado · evento pendente · venda
órfã ou inválida. Reenviar o mesmo evento nunca pode gerar uma segunda
mensagem de boas-vindas.

## 5. Independência dos quatro papéis operacionais

A condição de primeira compra é avaliada **independentemente** de
`vendedor_origem`, `remetente_mensagem`, responsável pelo disparo e
responsável pelo atendimento (mesma separação já registrada na
arquitetura do Motor Universal). Nos três modos operacionais já aprovados:

- **Pessoal:** a mensagem pode citar o nome da vendedora ("Olá, aqui é a
  Silvana, da Verde Natural...").
- **Institucional:** só o nome da loja ("Olá, aqui é da Verde Natural...").
- **Híbrido:** a loja escolhe incluir ou não o nome da vendedora.

## 6. Impacto no PILOT-0006C (RPC de entrada da venda)

**Nenhum.** A RPC `processar_evento_venda_externa_v1` continua responsável
só por: receber o Evento Bruto, criar cliente, criar venda, criar itens, e
deixar o evento em `processando` aguardando avisos. A decisão sobre
primeira compra pertence exclusivamente à futura etapa de avisos, que
deverá consultar o histórico transacionalmente:

```
SE primeira_compra_observada = true:
  gerar boas_vindas_primeira_compra
SE primeira_compra_observada = false:
  não gerar boas-vindas
  opcionalmente gerar agradecimento_nova_compra, conforme configuração
```

## 7. Testes futuros obrigatórios (critérios de aceite da etapa de avisos)

- **A — primeira compra:** cliente sem venda anterior na loja → uma única
  `boas_vindas_primeira_compra`, pode incluir pedido para salvar número.
- **B — segunda compra:** mesmo cliente/loja → não repete boas-vindas nem
  o pedido de salvar número; pode gerar `agradecimento_nova_compra` com
  conteúdo diferente.
- **C — outro produto:** cliente já comprou antes na loja, agora compra
  produto diferente → continua não sendo primeira compra.
- **D — outra loja:** mesmo cliente em loja diferente → regra avaliada no
  contexto da nova loja; comportamento entre lojas da mesma rede depende
  de decisão futura sobre identidade de relacionamento por loja ou por
  rede (ver item 8).
- **E — evento duplicado:** reenviar o mesmo evento → zero mensagens
  adicionais.
- **F — concorrência:** duas vendas concorrentes do primeiro cliente → no
  máximo uma mensagem de boas-vindas; a garantia **não pode depender
  apenas de `SELECT` seguido de `INSERT`** — precisa de idempotência real
  no banco (constraint/índice único ou equivalente), mesmo padrão já
  usado na RPC atual para evento e venda.

## 8-A. Decisão de escopo — Gate 1.5 do PILOT-0006C (RPC principal)

Esta regra **não altera** o escopo nem os critérios do Gate 1.5 (testes da
RPC `processar_evento_venda_externa_v1`). Registrado explicitamente:

- `primeira-compra-observada.json` e `segunda-compra-observada.json`
  permanecem fixtures **preparatórias**.
- No Gate 1.5 atual, o único objetivo dessas duas fixtures é validar que
  as duas vendas são criadas corretamente e que o histórico de
  cliente/loja fica coerente entre elas (mesmo `cliente_id` reaproveitado,
  duas vendas distintas) — **nada relacionado a mensagem é exigido ou
  verificado agora**.
- Nenhuma geração de boas-vindas ou agradecimento é exigida nesta etapa.
- A RPC principal e a migration 071 não são alteradas por esta decisão.
- O Motor de Avisos não é implementado nesta etapa.

## 8-B. Princípios registrados (resumo de rastreabilidade)

1. Boas-vindas e pedido para salvar o número: somente na primeira compra
   observada do cliente naquela loja.
2. Compras seguintes: não repetem boas-vindas nem o pedido para salvar o
   número.
3. Agradecimento por nova compra: poderá existir, com mensagem diferente
   e configuração própria da loja.
4. A condição de primeira compra pertence ao Motor de Avisos — nunca à
   RPC de entrada da venda.
5. Reenvio de evento duplicado nunca pode gerar nova mensagem.

## 8. Pendência registrada para decisão futura

Calcular primeira compra **por loja** ou **por grupo/rede**? Para o MVP
atual, adotado **provisoriamente: por loja**. Regra por rede **não** é
implementada nesta etapa nem nesta decisão.
