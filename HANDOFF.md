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

## PILOT-0003 — Dados novos não aparecem sem recarregar a página

### Resumo

Bug reportado em dois cenários: (A) após registrar uma venda normal, telas/contadores já abertos não refletiam os novos avisos sem F5; (B) após confirmar uma recompra, os avisos futuros gerados não apareciam na busca da Fila sem F5. Homologação manual (Cleison/Silvana) continuou reproduzindo o problema mesmo após a primeira correção, levando a uma investigação mais profunda que revelou uma segunda causa raiz distinta.

### Causa raiz 1 — mesma sessão (corrigida)

`confirmarRecompra` e `salvarVenda` nunca chamavam `revalidatePath` — corrigido adicionando `revalidatePath('/avisos')`, `revalidatePath('/relacionamento')` e `revalidatePath('/', 'layout')` ao final do sucesso de ambas as Server Actions. Isso resolveu badges/contadores do menu, mas não o conteúdo da própria lista da Fila.

Investigação mais profunda revelou uma segunda causa: `AvisosPageClient` guardava `initialAvisos`/`initialItensVenda` em `useState` **sem nenhum efeito de sincronização**. Como esse client component permanece montado através de `router.refresh()` (só o Server Component pai reexecuta no servidor), a lista ficava congelada no estado do primeiro carregamento da página — mesmo com dados corretos já chegando do servidor. Corrigido removendo o `useState` redundante e passando os dados direto para `AvisosLista` (que já tinha seu próprio `useEffect` de sincronização correto). Comprovado com automação headed realista (cliques reais, digitação caractere por caractere, sem atalhos) e com um teste temporal de 2 minutos parado na tela, em ambos os cenários.

### Causa raiz 2 — sessões diferentes (Realtime)

Mesmo com (1) corrigida, um teste distribuído real com **duas sessões de navegador totalmente independentes** (PILOT-0003B) comprovou: uma sessão já aberta em `/avisos`, que não participou da mutação, nunca recebe a atualização — nem esperando 210 segundos parada, sem navegar, sem F5. `revalidatePath` só invalida o cache de rota para navegações *futuras* da mesma sessão; não existe nenhum mecanismo (polling, push) para notificar uma sessão diferente já conectada.

Solução (PILOT-0003C): Supabase Realtime (Postgres Changes) em `public.avisos`, via hook `useAvisosRealtime` chamado dentro de `AvisosLista`. Qualquer INSERT/UPDATE/DELETE dispara um debounce de 700ms e um único `router.refresh()` — o evento é só um sinal de invalidação, o Server Component continua sendo a fonte oficial dos dados.

### O que mudou

- `app/(app)/vendas/nova/actions.ts`, `app/(app)/avisos/actions.ts` — `revalidatePath` adicionado ao final do sucesso.
- `app/(app)/avisos/AvisosPageClient.tsx` — `useState` redundante removido; props passadas direto para `AvisosLista`.
- `lib/avisos/useAvisosRealtime.ts` (novo) — hook que assina `public.avisos` via Supabase Realtime, seta o JWT da sessão (`supabase.realtime.setAuth`) antes de assinar, agrupa eventos com debounce e chama `router.refresh()`; limpa a subscription no unmount.
- `lib/avisos/debounceRefresh.ts` (novo) — utilitário puro de debounce, extraído para ser testável sem mocks de React/Supabase.
- `app/(app)/avisos/AvisosLista.tsx` — chama `useAvisosRealtime()` (único ponto de integração; cobre `/avisos` e `/relacionamento`, que compartilham este componente).
- `supabase/migrations/066_enable_realtime_avisos.sql` (novo) — habilita `public.avisos` na publicação `supabase_realtime`. Idempotente. Aplicada em staging (`ynrffhacpjzohrhkpuiq`); **não aplicada em produção**.
- `__tests__/debounceRefresh.test.ts` (novo) — 3 testes do agrupamento de rajada/debounce/cancelamento.

### Segurança entre lojas

Sem filtro de `loja_id` no client. A RLS já existente em `avisos` (`membros_veem_avisos`, escopada por `loja_id IN lojas_do_usuario()`) é aplicada pelo Realtime por assinante — comprovado empiricamente: uma conexão sem JWT (papel anon) recebeu **zero** eventos mesmo com uma venda real acontecendo; após `setAuth` com o JWT da sessão, os eventos passaram a chegar corretamente. Isolamento entre lojas distintas verificado por simulação direta do predicado da policy via SQL (usuário fictício `vend2@teste-rvessencial.internal`, vinculado somente à "Loja Combo Teste", não passaria no filtro para uma linha da "Loja Angeloni Teste") — não foi possível testar com uma segunda sessão de navegador ao vivo por falta de credencial, e as contas "Verde Vida Angeloni/Centro" foram deliberadamente evitadas por estarem vinculadas ao e-mail pessoal real de uma stakeholder (Silvana), não a uma conta fictícia de teste. "Toda a rede" funciona automaticamente (RLS já cobre todas as lojas do usuário), sem precisar de múltiplos channels.

### Como testar

1. Login (`dono@teste-rvessencial.internal` em staging) em duas abas/sessões separadas.
2. Sessão B: abrir Fila de Recompra, permanecer parado.
3. Sessão A: registrar uma venda para cliente fictício novo (ou confirmar uma recompra pendente).
4. Sessão B, sem navegar e sem F5: o cliente/avisos novos devem aparecer na busca em poucos segundos.

### Testes cobertos

- `vitest`: 126/126. `tsc`/`build`: sem novos erros (3 erros pré-existentes em arquivos de teste não relacionados, já presentes antes deste piloto).
- Reprodução real do bug original (headed, cliques/digitação reais, sem atalhos) e do bug distribuído (duas sessões, browsers independentes, sem storage compartilhado) — ambos comprovados antes da correção correspondente.
- Teste 1 (venda nova, duas sessões): sincronizado em ~2s sem F5/navegação; 5 eventos Realtime → 1 único `router.refresh()`.
- Teste 2 (confirmar recompra, duas sessões): sincronizado em ~2s sem F5/navegação; 7 eventos Realtime → 1 único `router.refresh()`.
- Isolamento entre lojas: verificado por simulação de RLS via SQL + prova empírica de que conexão anon recebe zero eventos (ver seção de segurança acima).
- **Homologação física real (PILOT-0003C):** Windows (Silvana) e macOS (Cleison), duas sessões independentes. Antes de comprovar, uma primeira rodada de homologação física **reprovou** — sessão B não atualizou. Investigação: em vez de presumir causa, expôs-se temporariamente o status da subscription (`SUBSCRIBED`/`CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`) via indicador visível só em staging (`NEXT_PUBLIC_MOSTRAR_DEBUG_REALTIME`), sem tocar em debounce/RLS/regra de negócio. Gate técnico confirmou 1 subscribe, 1 channel, 1 `SUBSCRIBED`, 5 eventos, 1 refresh — nenhuma duplicação. Nova rodada de homologação física aprovada 100%: indicador "Conectado", notificações/filtro/contador de atrasados em Relacionamento atualizando automaticamente, sem F5, em ambiente real. Indicador de diagnóstico removido antes do merge.

### Estado no momento deste handoff

- Branch `fix/atualizacao-dados-pos-mutacao` mergeada em `main` (fast-forward).
- Migration 066 aplicada em staging e em produção.
- Nenhuma regra de negócio alterada. Nenhum schema funcional de `avisos` alterado.
- Deploy de produção: ver STATE.md / relatório final desta conversa para hash exato.

### Dados fictícios deixados em staging (não removidos)

- Diversos clientes fictícios com prefixo "Cliente Pilot0003", "Cliente Tempo Real Pilot0003", "Cliente Humano Pilot0003", "Cliente Pilot0003C" (todos em "Loja Angeloni Teste").

### Pendências / próximos passos

- Teste de isolamento entre lojas com uma segunda sessão de navegador **ao vivo** (não apenas simulação de RLS via SQL) depende de uma credencial de teste fictícia válida para um usuário restrito a uma única loja diferente — não disponível nesta sessão.
- Reconexão de rede (Teste 6 do pilot) não foi testada ao vivo (queda/retomada de conexão); o comportamento de reconexão automática do `supabase-js` é o padrão da biblioteca, sem código adicional neste piloto.
- Limpeza de dados fictícios de staging (deste e de pilotos anteriores) segue como item de organização futura.
- Retomada das Fases 2b/3/4 do F5 OS segue pendente de autorização explícita separada.

## SEC-0001 — Escalação de privilégio via `liberacoes_acesso` sem RLS

### Resumo

Auditoria de segurança (motivada pelo achado de RLS desabilitado em 7 tabelas durante o PILOT-0004) encontrou uma cadeia de escalação de privilégio explorável sem nenhuma credencial privada: `public.liberacoes_acesso` estava sem RLS e gravável por `anon`/`authenticated` via API REST direta do Supabase. A trigger `on_auth_user_liberacao` (`AFTER INSERT ON auth.users`, `SECURITY DEFINER`) aplica automaticamente qualquer liberação pendente casada por e-mail, inserindo o `role` indicado — inclusive `admin_f5`/`dono` — em `membros_loja`.

Era possível criar uma liberação de acesso não autorizada por meio da API pública e, posteriormente, fazer com que o fluxo automático de cadastro aplicasse uma role privilegiada a uma loja. Cadeia confirmada por leitura de código (binding da trigger via `pg_trigger`) e reproduzida de fato em staging antes da correção — detalhes de exploração não documentados aqui por política de segurança.

Mesma ausência de RLS e mesmos grants completos (`SELECT`/`INSERT`/`UPDATE`/`DELETE` para `anon`/`authenticated`) confirmados em mais 6 tabelas: `assinaturas`, `planos`, `parceiros`, `bibliotecas`, `biblioteca_itens`, `instalacoes_biblioteca`. `public.buscar_auth_user_por_email(text)` (`SECURITY DEFINER`) também era executável por `anon`/`authenticated`, permitindo enumerar e-mails cadastrados em `auth.users` sem autenticação.

### O que mudou

- `supabase/migrations/067_sec_rls_tabelas_e_revoga_enumeracao.sql` (novo) — único arquivo do PR:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nas 7 tabelas listadas acima, sem nenhuma policy adicional (100% do acesso legítimo já passa pelo client `admin`/service role no backend, que bypassa RLS — habilitar RLS sem policy não quebra nenhum fluxo existente e bloqueia por padrão qualquer acesso via `anon`/`authenticated`).
  - `REVOKE ALL ... FROM PUBLIC` e `REVOKE EXECUTE ... FROM anon, authenticated` em `public.buscar_auth_user_por_email(text)`.
  - Idempotente, com rollback documentado (comentado, não deve ser usado sem autorização — reabre a escalação).

Nenhum código de aplicação, trigger, dado ou regra de negócio foi alterado.

### Como confirmar

Em staging ou produção, via SQL (conexão privilegiada):

```sql
-- RLS ativo nas 7 tabelas
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('liberacoes_acesso','assinaturas','planos','parceiros','bibliotecas','biblioteca_itens','instalacoes_biblioteca')
  AND relnamespace = 'public'::regnamespace;
-- todas devem retornar relrowsecurity = true

-- zero policies
SELECT count(*) FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('liberacoes_acesso','assinaturas','planos','parceiros','bibliotecas','biblioteca_itens','instalacoes_biblioteca');
-- deve retornar 0
```

(Testes de acesso via chave `anon` pública foram executados durante a validação — ver seção "Testes cobertos" — mas os comandos específicos não são reproduzidos aqui.)

### Testes cobertos

- Forense em staging e produção: sem evidência de exploração histórica (nenhuma linha `pendente` ou `admin_f5` suspeita em `liberacoes_acesso`, nenhum `membros_loja` órfão fora do padrão esperado do fluxo legítimo).
- Staging: 7/7 RLS ativo, 0 policies, `anon` bloqueado (SELECT/INSERT/UPDATE/DELETE), `authenticated` bloqueado (com JWT real, não simulado), service role funcionando (fluxo de instalação de biblioteca/liberação intacto), função bloqueada para `PUBLIC`/`anon`/`authenticated`.
- `npx vitest run` 128/128, `npm run build` OK, `git diff --check` limpo.
- Produção, pós-aplicação: 7/7 RLS ativo, 0 policies, 0 grants públicos na função, `SELECT` anon → `[]`, RPC anon → `permission denied`, leituras via conexão privilegiada (equivalente ao service role) sem erro em `membros_loja`/`bibliotecas`/`parceiros`/`biblioteca_itens`/`instalacoes_biblioteca`/`produtos`/`liberacoes_acesso`/`planos`/`assinaturas`, contagens de linhas inalteradas (nenhum dado tocado). Zero erros de runtime em produção atribuídos ao deploy do commit `0af5291` nas 2h seguintes ao merge.
- **Limitação conhecida:** não foi feito um teste de sessão real autenticada (login de verdade) contra produção nesta rodada — por não ter e não dever obter credencial de uma conta real, e por instrução explícita de não fabricar JWT/cookie manualmente. A validação de "fluxo legítimo" em produção se apoiou em (a) logs de runtime reais (sem erros) e (b) leitura direta via conexão privilegiada espelhando exatamente as queries do backend. Recomenda-se um clique manual humano (login real) como confirmação complementar, sem bloquear o encerramento deste incidente.

### Estado no momento deste handoff

- Branch `fix/sec-0001-rls-liberacoes` mergeada em `main` via PR #2 (squash) — commit `0af5291`.
- Migration `067_sec_rls_tabelas_e_revoga_enumeracao.sql` aplicada em staging e em produção (`nhcppfovsxcsulyvwvgs`).
- Deploy de produção do commit `0af5291`: `dpl_AMhJct7tFvbxCJRYoRNDeKH9jwhG`, READY.

### Riscos residuais / SEC-0002 recomendado

- Os `GRANT`s de tabela (`SELECT`/`INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`) para `anon`/`authenticated` continuam amplos nas 7 tabelas — a proteção hoje depende inteiramente do RLS sem policy (deny-all por padrão). Isso é suficiente e correto, mas não é defesa em profundidade. Recomenda-se abrir **SEC-0002** para revisar/apertar esses grants nas 7 tabelas (e auditar se o mesmo padrão existe em outras tabelas do schema `public` fora do escopo desta auditoria).
- O gap de leitura de `.env` identificado no PILOT-0004 (deny list só cobre `cat`/`less`/`more`, não `head`/`grep`/`Read` tool/etc.) segue sem correção — fora do escopo do SEC-0001, mas relacionado à mesma frente de segurança.

### Pendências / próximos passos

- Homologação humana com login real em produção (ver limitação acima) — opcional, não bloqueante.
- SEC-0002 (grants excessivos) — não iniciado, aguardando priorização.
- Housekeeping dos scripts `.mjs` soltos na raiz do repo — tarefa separada, já registrada, não relacionada a este incidente.
