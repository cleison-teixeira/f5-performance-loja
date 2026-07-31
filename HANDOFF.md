# HANDOFF — PILOT-0001: Cadastro rápido de produto na confirmação de recompra

> Arquivo criado nesta tarefa. Não existia anteriormente.

## Resumo

Bug reportado: no modal "Confirmar Recompra" (Fila de Recompra → Confirmar recompra), só era possível selecionar produtos já cadastrados. Quando o cliente levava um produto inexistente no catálogo, não havia como cadastrá-lo sem sair do modal.

Solução: reaproveitado o mesmo fluxo de cadastro rápido já usado em "Registrar Venda" — busca com texto livre (`ProdutoSearchInput`) + resolução/criação do produto no servidor (`resolverOuCriarProduto`) no momento da confirmação. Nenhum componente novo de cadastro foi criado.

## O que mudou

- `components/produtos/ProdutoSearchInput.tsx` — componente movido de `app/(app)/vendas/nova/`, agora compartilhado. Adicionado prop opcional `hintNovoProduto` (mensagem de "novo produto" customizável por tela).
- `app/(app)/vendas/nova/FormNovaVenda.tsx` — só o caminho de import atualizado.
- `app/(app)/avisos/page.tsx` — campo `recorrente` adicionado ao catálogo de produtos passado ao modal (necessário pelo tipo do componente compartilhado).
- `app/(app)/avisos/ConfirmarRecompraModal.tsx` — `<select>` de produto trocado por `<ProdutoSearchInput>`.
- `app/(app)/avisos/actions.ts` (`confirmarRecompra`) — para itens sem `produto_id`, resolve ou cria o produto via `resolverOuCriarProduto` (mesmo find-or-create de Registrar Venda) antes de montar o payload da RPC transacional (`confirmar_recompra_transacional`, migration 064). Nenhuma lógica de cadastro foi duplicada.

## Como testar

1. Login (`dono@teste-rvessencial.internal` em staging, ou conta de teste equivalente).
2. `/avisos` → abrir "Confirmar recompra" de qualquer cliente.
3. No campo de produto, digitar um nome que não exista no catálogo da loja.
4. Confirmar que aparece "Novo produto será criado nesta loja ao confirmar a recompra."
5. Preencher preço/quantidade e confirmar.
6. Produto deve aparecer em Produtos e em Registrar Venda depois.

## Testes automatizados cobertos

- `vitest`: 123/123.
- Homologação end-to-end em staging (Playwright): produto novo criado (loja correta, recorrente, comissionável, 5 mensagens), venda/recompra/comissão/4 avisos futuros gerados corretamente, quantidade/preço preservados ao trocar de produto no meio do preenchimento, produto repetido reconhecido como já existente (sem duplicar), fluxo original de Registrar Venda com produto novo continua funcionando.

## Estado no momento deste handoff

- Branch `feat/cadastro-rapido-produto-recompra` mergeada em `main` (fast-forward).
- Deploy de produção: ver STATE.md / relatório final desta conversa para hash exato.
- Nenhuma migration foi necessária. Nenhuma regra de negócio (comissão, cadência, mensagens) foi alterada.

## Dados fictícios deixados em staging (não removidos)

- Clientes: "Cliente Cadastro Rapido", "Cliente Cadastro Rapido Dois", "Cliente Regressao Registrar Venda", "Cliente Homologacao Manual".
- Produtos: "Vitamina D3 Teste 999", "Produto Novo Regressao 777".
- Loja: "Loja Angeloni Teste" (`f5feed00-0000-0000-0001-000000000001`), ambiente de staging (`ynrffhacpjzohrhkpuiq`) — não afeta produção.

## Pendências / próximos passos

- Nenhuma pendência de código para este piloto.
- Limpeza de dados fictícios de staging (aqui e de pilotos anteriores) não foi solicitada; segue como item de organização futura.
- Retomada das Fases 2b/3/4 do F5 OS depende de autorização explícita separada — não incluída neste piloto.
