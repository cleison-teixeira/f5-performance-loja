# Fixtures — PILOT-0006C, Gate 1.4 (documentação operacional)

Payloads fictícios do Contrato Universal de Venda V1, para testar
`public.processar_evento_venda_externa_v1` no Gate 1.5. Nenhum dado real,
nenhuma credencial, nenhum UUID real hardcoded.

## Convenções obrigatórias

- **`origem.sistema`**: `"teste_f5"` em todo cenário que depende do vendedor
  sintético (convenção exclusiva desta fatia — ver Gate 1, Decisão 1).
- **Loja**: `loja-teste-pilot0006c` é a única loja mapeada assumida. Setup
  do Gate 1.5 deve criar, antes dos testes, uma linha em
  `mapeamento_lojas_externas` (`origem_sistema='teste_f5'`,
  `loja_externa_id='loja-teste-pilot0006c'`, `status='ativo'`) apontando
  para uma loja fictícia de staging.
- **Vendedor**: `"__VENDEDOR_ID_PLACEHOLDER__"` em toda fixture que precisa
  de vendedor válido. **Nunca hardcodar UUID real no JSON versionado.**
  Estratégia obrigatória: ler o JSON do disco → substituir o placeholder
  **somente em memória** → validar que nenhum `__VENDEDOR_ID_PLACEHOLDER__`
  restou no objeto → chamar a RPC → descartar o objeto. Nenhum arquivo
  versionado é reescrito com UUID real.
- **Produtos conhecidos** que o setup do Gate 1.5 precisa cadastrar na loja
  de teste:
  - `"Creatina Monohidratada 300g"` — `recorrente=true`, vinculado a
    `biblioteca_item` com `ciclo_recompra_dias=30`.
  - `"Vitamina D3 60 cápsulas"` — produto conhecido adicional, usado só em
    `varios-itens-valido.json` (qualquer configuração de ciclo/recorrente
    é aceitável, contanto que seja resolvível pelo nome).
  - **Atenção a acentos:** a regra real da RPC é `lower(btrim(nome))` — não
    remove acento. `"Produto Ambíguo Teste Pilot0006C"` (com í) precisa ser
    cadastrado com o acento idêntico no setup, ou a busca não encontra
    nada (vira "não resolvido", não "ambíguo").
- **Cliente**: telefone fictício, nunca real. `venda-valida.json`,
  `mesma-venda-evento-diferente.json`, `varios-itens-valido.json` e
  `cliente-existente.json` compartilham deliberadamente o mesmo
  `(loja, telefone)` — só `venda-valida.json` (executado primeiro) chega a
  criar o cliente de fato; os demais dependem dele já existir (ver seção
  de pré-condições na tabela).

## Identidade do cliente nesta versão (Gate 1)

> **`cliente = loja + telefone`.** Esta é a única chave de identidade de
> cliente implementada nesta fatia. **Ainda NÃO existe:** identidade de
> cliente por rede (mesma pessoa em lojas diferentes), identidade nacional
> (CPF/documento), nem fusão/merge de clientes duplicados entre lojas. Um
> mesmo telefone em duas lojas diferentes gera dois registros de cliente
> distintos, propositalmente — isso é o comportamento atual do F5 (não uma
> lacuna desta RPC), documentado aqui para não ser confundido com bug.

## Diagrama — identidade em cascata (Evento ≠ Venda ≠ Aviso ≠ Campanha ≠ ROI)

```
Evento
  ↓   (identidade própria: origem_sistema + evento_externo_id)
Venda
  ↓   (identidade própria: origem_sistema + loja_externa_id + venda_externa_id)
Itens
  ↓
Avisos               ← etapa separada desta RPC, ainda não implementada
  ↓
Campanhas            ← consome a venda, não a altera
  ↓
ROI
  ↓
Portal da Indústria
```

Cada seta representa uma dependência de dados, **não** uma identidade
compartilhada: um Evento não é a Venda que ele gera (um evento pode
referenciar uma venda já existente, sem criar nada novo); uma Venda não é
um Aviso (uma venda pode existir sem nenhum aviso ainda gerado); um Aviso
não é uma Campanha; uma Campanha não é ROI; ROI não é sell-out. Cada etapa
só pode ser calculada depois que a anterior existir — mas nenhuma etapa
posterior volta e reescreve a anterior.

## Preparação para o Motor V2 (registrado, não implementado)

Depois que a venda é criada por esta RPC, existirão motores independentes
que **consomem** a venda sem modificá-la:

Motor de Avisos · Motor de Recompra · Motor de Campanhas · Motor de
Cashback · Motor de NPS · Motor Analytics · Motor Portal Indústria.

Nenhum desses motores é implementado nesta fatia. As fixtures
`primeira-compra-observada.json` e `segunda-compra-observada.json` (ver
tabela) são preparadas hoje especificamente para o futuro Gate do Motor de
Avisos — não fazem parte do escopo de execução do Gate 1.5.

## Regra de ouro (princípio arquitetural)

> **A venda é imutável. Motores posteriores apenas observam a venda.**

Precisão sobre "evento original": o **payload e a identidade** do Evento
Bruto (`payload_original`, `origem_sistema`, `evento_externo_id`,
`loja_externa_id`, `venda_externa_id`, `tipo_evento`, `contrato_versao`,
`recebido_em`) são imutáveis depois do `INSERT` inicial — nenhum motor
posterior os altera. Os **metadados de processamento** (`status`,
`resultado`, `erro`, `processado_em`, `venda_f5_id`) são atualizados
legitimamente pela própria RPC durante o pipeline; isso não é uma exceção
à regra, é o que a RPC já faz hoje. Definição completa em
`docs/testing/pilot-0006c-gate-1.5-plano.md`, seção 1.1.

## Tabela operacional completa

| Arquivo | Status esperado | Sucesso | Pode reprocessar | Evento bruto? | Cliente? | Venda? | Itens? | Mensagens futuras? | Limpeza | Pré-condições | Dependências |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `venda-valida.json` | aceito | true | false | sim | cria | cria | cria | sim (Gate Avisos) | apagar venda/cliente/evento ao final | loja+vendedor+produto cadastrados | — |
| *(reenvio literal de `venda-valida.json`)* | duplicado | true | false | não (reaproveita) | não | não | não | não | — | `venda-valida.json` já executado | executar depois dele |
| `mesma-venda-evento-diferente.json` | duplicado | true | false | cria (evento novo) | não | não | não | não | apagar evento | `venda-valida.json` já executado (mesma `venda_externa_id`) | executar depois dele |
| `cliente-existente.json` | aceito | true | false | sim | **reutiliza** (não duplica, nome original preservado) | cria (venda nova) | cria | sim (Gate Avisos) | apagar venda/evento | `venda-valida.json` já executado (mesmo telefone) | executar depois dele |
| `loja-nao-mapeada.json` | pendente_mapeamento | false | true | sim | não | não | não | não | apagar evento | — | — |
| `vendedor-ausente.json` | pendente_vendedor | false | true | sim | não | não | não | não | apagar evento | — | — |
| `vendedor-invalido.json` | pendente_vendedor | false | true | sim | não | não | não | não | apagar evento | — | — |
| `cliente-sem-telefone.json` | nao_suportado_sem_telefone | false | false | sim | não | não | não | não | apagar evento | — | — |
| `produto-nao-resolvido.json` | pendente_produto | false | true | sim | não | não | não | não | apagar evento | — | — |
| `produto-ambiguo.json` | pendente_produto | false | true | sim | não | não | não | não | apagar evento + 2 produtos de teste | **2 produtos ativos** com nome `"Produto Ambíguo Teste Pilot0006C"` | — |
| `produto-recorrente-sem-ciclo.json` | pendente_produto | false | true | sim | não | não | não | não | apagar evento + produto de teste | produto `"Produto Recorrente Sem Ciclo Teste"` (`recorrente=true`, sem ciclo válido) | — |
| `contrato-nao-suportado.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `tipo-evento-nao-suportado.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `data-invalida-formato.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `data-inexistente.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `data-ano-zero.json` | **exploratório** | ? | ? | sim | ? | ? | ? | não | apagar evento | — | documentar resultado real observado |
| `data-venda-ausente.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `data-venda-round-trip-invalido.json` | **exploratório — mesmo caso-limite de `data-ano-zero.json`** ("0000-01-01"); não tenho confirmação empírica de que este valor realmente exercita o round-trip em vez do cast | ? | ? | sim | ? | ? | ? | não | apagar evento | — | Gate 1.5 deve confirmar empiricamente qual verificação (cast ou round-trip) rejeita este valor, e ajustar a expectativa do teste conforme o resultado real |
| `itens-nao-array.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `itens-vazio.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `quantidade-invalida-string.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `quantidade-invalida-zero.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `quantidade-invalida-negativa.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `valor-unitario-invalido-string.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `valor-unitario-invalido-zero.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `valor-unitario-invalido-negativo.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `loja-externa-id-ausente.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `venda-externa-id-ausente.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `cliente-nome-ausente.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `produto-nome-origem-ausente.json` | rejeitado | false | false | sim | não | não | não | não | apagar evento | — | — |
| `varios-itens-valido.json` | aceito | true | false | sim | reutiliza (mesmo telefone) | cria | cria **2 itens** | sim (Gate Avisos) | apagar venda/itens/evento | produto `"Vitamina D3 60 cápsulas"` cadastrado; `venda-valida.json` já executado (mesmo telefone) | executar depois dele |
| `varios-itens-um-invalido.json` | rejeitado | false | false | sim | **não** | **não** | **não** — transação inteira revertida | não | apagar evento | — | — |
| `json-vazio.json` (`{}`) | rejeitado | false | false | sim (identidade ausente) | não | não | não | não | apagar evento | — | — |
| *(payload SQL `NULL` literal — não é arquivo)* | rejeitado | false | false | **não** (não há payload a preservar) | não | não | não | não | — | — | — |
| `primeira-compra-observada.json` | **reservado — não executar no Gate 1.5** | — | — | — | — | — | — | Gate futuro do Motor de Avisos: deve gerar boas-vindas | — | — | — |
| `segunda-compra-observada.json` | **reservado — não executar no Gate 1.5** | — | — | — | — | — | — | Gate futuro: não deve repetir boas-vindas; pode gerar agradecimento recorrente | — | mesmo telefone de `primeira-compra-observada.json` | executar depois dele, quando o Gate existir |

## Distinção SQL NULL vs. `{}` (reforçada)

- **SQL NULL** (chamar a função com o argumento `NULL` literal): não é um
  arquivo de fixture — é um caso de teste do Gate 1.5 chamando a RPC
  diretamente com `NULL`. Não cria nenhuma linha em
  `eventos_venda_externa` — não há payload para preservar.
- **JSON `{}`** (`json-vazio.json`): é um payload jsonb válido, só vazio.
  Cria uma linha em `eventos_venda_externa` (com todos os campos
  extraídos `NULL`) e só depois é marcada `rejeitado`. A linha é
  preservada para auditoria.

## Total e cobertura

34 arquivos JSON de fixture (32 para o Gate 1.5 + 2 reservados para o
futuro Gate do Motor de Avisos) + este README.
