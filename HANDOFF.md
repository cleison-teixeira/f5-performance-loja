# HANDOFF — F5 Recompra (pilotos F5 OS)

> Arquivo criado no PILOT-0001. Atualizado no PILOT-0002.

## PILOT-0001 — Cadastro rápido de produto na confirmação de recompra

### Resumo

Bug reportado: no modal "Confirmar Recompra" (Fila de Recompra → Confirmar recompra), só era possível selecionar produtos já cadastrados. Quando o cliente levava um produto inexistente no catálogo, não havia como cadastrá-lo sem sair do modal.

Solução: reaproveitado o mesmo fluxo de cadastro rápido já usado em "Registrar Venda" — busca com texto livre (`ProdutoSearchInput`) + resolução/criação do produto no servidor (`resolverOuCriarProduto`) no momento da confirmação. Nenhum componente novo de cadastro foi criado.

### O que mudou

- `components/produtos/ProdutoSearchInput.tsx` — componente movido de `app/(app)/vendas/nova/`, agora compartilhado. Adicionado prop opcional `hintNovoProduto` (mensagem de "novo produto" customizável por tela).
- `app/(app)/vendas/nova/FormNovaVenda.tsx` — só o caminho de import atualizado.
- `app/(app)/avisos/page.tsx` — campo `recorrente` adicionado ao catálogo de produtos passado ao modal (necessário pelo tipo do componente compartilhado).
- `app/(app)/avisos/ConfirmarRecompraModal.tsx` — `<select>` de produto trocado por `<ProdutoSearchInput>`.
- `app/(app)/avisos/actions.ts` (`confirmarRecompra`) — para itens sem `produto_id`, resolve ou cria o produto via `resolverOuCriarProduto` (mesmo find-or-create de Registrar Venda) antes de montar o payload da RPC transacional (`confirmar_recompra_transacional`, migration 064). Nenhuma lógica de cadastro foi duplicada.

### Como testar

1. Login (`dono@teste-rvessencial.internal` em staging, ou conta de teste equivalente).
2. `/avisos` → abrir "Confirmar recompra" de qualquer cliente.
3. No campo de produto, digitar um nome que não exista no catálogo da loja.
4. Confirmar que aparece "Novo produto será criado nesta loja ao confirmar a recompra."
5. Preencher preço/quantidade e confirmar.
6. Produto deve aparecer em Produtos e em Registrar Venda depois.

### Testes automatizados cobertos

- `vitest`: 123/123.
- Homologação end-to-end em staging (Playwright): produto novo criado (loja correta, recorrente, comissionável, 5 mensagens), venda/recompra/comissão/4 avisos futuros gerados corretamente, quantidade/preço preservados ao trocar de produto no meio do preenchimento, produto repetido reconhecido como já existente (sem duplicar), fluxo original de Registrar Venda com produto novo continua funcionando.

### Estado no momento deste handoff

- Branch `feat/cadastro-rapido-produto-recompra` mergeada em `main` (fast-forward).
- Deploy de produção: ver STATE.md / relatório final desta conversa para hash exato.
- Nenhuma migration foi necessária. Nenhuma regra de negócio (comissão, cadência, mensagens) foi alterada.

### Dados fictícios deixados em staging (não removidos)

- Clientes: "Cliente Cadastro Rapido", "Cliente Cadastro Rapido Dois", "Cliente Regressao Registrar Venda", "Cliente Homologacao Manual".
- Produtos: "Vitamina D3 Teste 999", "Produto Novo Regressao 777".
- Loja: "Loja Angeloni Teste" (`f5feed00-0000-0000-0001-000000000001`), ambiente de staging (`ynrffhacpjzohrhkpuiq`) — não afeta produção.

### Pendências / próximos passos

- Nenhuma pendência de código para este piloto.
- Limpeza de dados fictícios de staging (aqui e de pilotos anteriores) não foi solicitada; segue como item de organização futura.
- Retomada das Fases 2b/3/4 do F5 OS depende de autorização explícita separada — não incluída neste piloto.

## PILOT-0002 — Aplicação instalada (PWA/Windows) não atualiza automaticamente

### Resumo

Bug reportado: lojistas usam o F5 pelo atalho/app instalado no Windows (PWA). Quando uma nova versão é publicada, a aplicação instalada continua na versão anterior até o lojista apertar F5 manualmente.

Causa raiz **comprovada por reprodução** (não presumida): uma vez carregada, uma aba/PWA nunca substitui sozinha o JavaScript em execução — nem por navegação client-side do Next.js Router, nem pelo fato de o servidor já servir uma versão nova. Reproduzi publicando uma versão A, mantendo uma aba aberta, publicando uma versão B, e navegando dentro da aba (clique em link, voltar) sem F5: ela continuou em A indefinidamente. Uma aba nova, essa sim, já mostrou B normalmente. O Service Worker existente (`public/sw.js`) não é a causa — é só *pass-through* de rede, sem cache; simplesmente não havia nenhum mecanismo de detecção/aviso de nova versão em lugar nenhum do app.

Solução: `AppUpdateChecker`, que compara a versão carregada com a versão publicada (`GET /api/version`) periodicamente (5 min) e ao voltar o foco da janela/aba — este último é o gatilho que cobre exatamente o caso do PWA instalado voltando de segundo plano. Ao detectar divergência, mostra um aviso fixo, não intrusivo: "Uma nova versão do F5 está disponível." com botão "Atualizar agora" — nunca recarrega sozinho, para não descartar formulário em preenchimento sem aviso.

### O que mudou

- `app/api/version/route.ts` (novo) — retorna `VERCEL_GIT_COMMIT_SHA` do deploy atual; rota `/api/*` já é isenta de autenticação no middleware existente, nenhuma mudança necessária lá.
- `components/AppUpdateChecker.tsx` (novo) — polling periódico + listeners de `visibilitychange`/`focus`/`controllerchange` do Service Worker; renderiza o aviso quando detecta divergência.
- `app/layout.tsx` — lê `VERCEL_GIT_COMMIT_SHA` no Server Component raiz e monta `<AppUpdateChecker versaoAtual={...} />` ao lado do `<ServiceWorkerRegister />` já existente.

Nenhuma outra rota, regra de negócio, cache ou comportamento offline foi alterado. `public/sw.js` não foi tocado.

### Como testar

1. Login em qualquer navegador ou no app instalado (PWA).
2. Deixar a aba/janela aberta, navegando normalmente.
3. Publicar uma nova versão na mesma branch/domínio.
4. Sem F5: voltar o foco para a janela (alt-tab, clicar nela) ou aguardar até 5 min.
5. O aviso "Uma nova versão do F5 está disponível" deve aparecer.
6. Clicar em "Atualizar agora" — a página recarrega, a sessão continua válida, a navegação segue normal, e o aviso não reaparece.

### Testes cobertos

- `vitest`: 123/123. `tsc`/`build`: sem novos erros.
- Reprodução real do bug (versão A → B, aba aberta, navegação client-side sem F5) confirmando a causa raiz.
- Validação end-to-end da correção (versão X → Y): login mantido numa aba, aviso detectado sem F5 (checagem periódica confirmada disparando por conta própria), clique em "Atualizar agora" carrega a versão nova, sessão permanece válida, aviso não reaparece (sem loop).
- **Homologação manual aprovada no Windows, no app instalado (PWA):** aviso apareceu sem F5, botão funcionou, aplicação carregou a versão nova, fluxo permaneceu funcional.

### Estado no momento deste handoff

- Branch `fix/pwa-atualizacao-automatica` mergeada em `main` (fast-forward).
- Deploy de produção: ver STATE.md / relatório final desta conversa para hash exato.
- Nenhuma migration foi necessária. Nenhuma regra de negócio alterada.

### Pendências / próximos passos

- `AppUpdateChecker` sempre pede confirmação explícita do usuário (nunca recarrega sozinho) — decisão deliberada de segurança, já que não há hoje detecção de "formulário com dado não salvo" na aplicação. Se no futuro isso for implementado, o mecanismo já está pronto para permitir atualização automática nos casos seguros.
- Retomada das Fases 2b/3/4 do F5 OS segue pendente de autorização explícita separada.
