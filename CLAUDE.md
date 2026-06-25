# F5 Recompra — Regras permanentes para Claude Code

## Produto

F5 Recompra é um micro SaaS para lojas recuperarem recompras de clientes que já compraram produtos recorrentes.

O produto NÃO é ERP, PDV, CRM completo, financeiro ou sistema de comissão.

O 80/20 do MVP é:

1. Registrar compra recorrente.
2. Gerar avisos automáticos.
3. Fila de Recompra.
4. Relacionamento.
5. Confirmar recompra.
6. Reagendar.
7. Cliente não quer mais.
8. Dashboard de dinheiro na mesa.

## Modelo comercial

O MVP usa:

* Acesso Loja
* Acesso Dono Multi-loja
* Admin F5

Não vender por usuário/vendedora/gerente.

Vendedora e gerente são perfis técnicos, mas comercialmente viram Acesso Loja.

## Definições

Oportunidade de Recompra = cliente + produto + venda de origem, preferencialmente dedup por venda_id + produto_id/item_venda_id.

Aviso = mensagem/tentativa de contato dentro da oportunidade.

Fila de Recompra = somente tipos recompra/oferta.

Relacionamento = somente tipos agradecimento/relacionamento.

## Regras técnicas críticas

Antes de qualquer alteração:

* Rodar git status.
* Não sobrescrever mudanças pendentes.
* Não criar migration sem autorização explícita.
* Não alterar RLS sem autorização explícita.
* Não deletar dados sem autorização explícita.
* Não resetar banco/seed sem autorização explícita.
* Não mudar regra de cálculo aprovada sem explicar impacto.

Sempre rodar:
npm run build

Antes de commit.

## Segurança

Quando usar admin client:

* Validar auth.
* Validar pertencimento à loja.
* Validar escopo de loja.
* Nunca expor dados de loja que o usuário não pertence.

## UI/Produto

Evitar linguagem de comissão no MVP.
Evitar linguagem de ERP.
Priorizar:

* dinheiro na mesa;
* recompra em aberto;
* recuperado;
* cliente para acionar;
* responsável pela ação;
* loja/unidade.

## Acesso Loja

Vendedora e gerente devem operar a loja inteira.
A rastreabilidade vem do campo responsável, não necessariamente do usuário logado.

## Multi-loja

Dono deve ver consolidado das lojas vinculadas.
Dashboard de dono/multi-loja deve somar todas as lojas permitidas, não apenas a loja ativa.

## Relatórios finais

Ao finalizar uma fase, responder curto:

1. Arquivos alterados
2. O que mudou
3. O que não foi alterado
4. Build
5. Commit/push
6. Testes recomendados

Evitar relatórios longos demais.
