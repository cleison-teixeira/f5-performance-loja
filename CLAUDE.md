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

## Contexto de loja

Cookie `f5_loja_ctx` guarda a loja selecionada pelo dono (UUID) ou vazio para "Toda a rede".

Helper `getContextoLoja(userId, multiLoja)` em `lib/loja/contexto.ts`:
- Retorna `{ lojas, lojaId, escopo: 'rede'|'loja', lojaIds, lojaNome }`
- Para usuários single-loja: sempre `escopo = 'loja'`
- Para multi-loja sem cookie: `escopo = 'rede'`, `lojaIds = [todas]`

Regra de telas:
- Dashboard / Fila / Relacionamento: aceitam `escopo = 'rede'` (agrega tudo)
- Registrar Compra / Equipe / Produtos: requerem loja específica — mostrar aviso se `escopo = 'rede'`

O seletor global `SeletorLojaGlobal` fica no layout, abaixo do Header, visível apenas para dono/admin_f5 com mais de 1 loja.

## Testes no navegador — regra permanente

É proibido utilizar contas, lojas, vendedores ou clientes reais em testes.

Antes de qualquer ação de escrita no navegador:

1. Identificar o usuário logado (email visível na tela ou via Supabase auth.users).
2. Identificar o perfil_id.
3. Identificar a loja selecionada no contexto.
4. Comparar com a allowlist de contas de teste abaixo.
5. Se não estiver na allowlist, abortar imediatamente. Não clicar em salvar. Não preencher formulários. Fazer logout.

Contas reais — NUNCA usar em testes:

* Fábio (fabiomedeirosmagalhaes@gmail.com)
* Júlia, Carla, Débora, Juçara e demais gestores e vendedores reais
* Qualquer conta de loja operacional (Cia Cidade Azul, etc.)
* Qualquer cliente real

Contas controladas — permitidas somente com autorização explícita:

* cleisonimarketing+dono2@gmail.com
* cleisonimarketing+loja2@gmail.com
* Outros perfis fictícios da Rede Verde Essencial ou lojas de teste claramente identificadas

Condições obrigatórias para gravar dados em produção via browser:

1. Conta na allowlist.
2. Loja fictícia/controlada.
3. Cliente fictício.
4. Produtos de teste.
5. Autorização explícita do usuário para aquela gravação específica.

Sem todas as cinco condições, realizar somente smoke test de leitura (navegação visual, sem submissão de formulários).

Em caso de dúvida: abortar, fazer logout, auditar banco antes de continuar.

## Relatórios finais

Ao finalizar uma fase, responder curto:

1. Arquivos alterados
2. O que mudou
3. O que não foi alterado
4. Build
5. Commit/push
6. Testes recomendados

Evitar relatórios longos demais.
