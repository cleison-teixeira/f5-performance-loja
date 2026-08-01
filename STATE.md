# STATE — F5 Recompra

> Arquivo criado no PILOT-0001. Atualizado no PILOT-0002.

## Estado atual

- `main`: sincronizada com `origin/main`.
- Produção (`nhcppfovsxcsulyvwvgs`): estável, migrations até `067_sec_rls_tabelas_e_revoga_enumeracao` aplicadas.
- Staging (`ynrffhacpjzohrhkpuiq`): paridade com produção nas migrations do fluxo de recompra; contém dados fictícios adicionais de homologação (ver HANDOFF.md).

## PILOT-0001 — Cadastro rápido de produto na confirmação de recompra

- **Status:** CONCLUÍDO — homologado em staging, aprovado visualmente, promovido a produção.
- **Branch:** `feat/cadastro-rapido-produto-recompra` (mergeada em `main` via fast-forward).
- **Escopo:** `ConfirmarRecompraModal`, `components/produtos/ProdutoSearchInput` (componente compartilhado), `app/(app)/avisos/actions.ts` (`confirmarRecompra`), `app/(app)/avisos/page.tsx`, `app/(app)/vendas/nova/FormNovaVenda.tsx` (só import).
- **Nenhuma migration necessária.** Nenhuma regra de negócio alterada.

## PILOT-0002 — Aplicação instalada (PWA/Windows) não atualiza automaticamente

- **Status:** CONCLUÍDO — causa raiz reproduzida e comprovada, corrigida, homologada em staging (incluindo no app instalado no Windows) e promovida a produção.
- **Branch:** `fix/pwa-atualizacao-automatica` (mergeada em `main` via fast-forward).
- **Causa raiz:** nenhuma navegação client-side nem qualquer mecanismo existente detectava uma nova versão publicada; uma aba/PWA mantido aberto continuava executando o bundle antigo indefinidamente.
- **Escopo:** `app/api/version/route.ts` (novo, isento de auth), `components/AppUpdateChecker.tsx` (novo), `app/layout.tsx` (monta o checker com a versão do build).
- **Nenhuma migration necessária. Nenhuma regra de negócio alterada.** Service Worker (`public/sw.js`) não foi alterado.

## PILOT-0003 — Dados novos não aparecem sem recarregar a página

- **Status:** CONCLUÍDO — homologado em staging (automatizado) e fisicamente (Windows + macOS reais, duas sessões independentes), promovido a produção.
- **Branch:** `fix/atualizacao-dados-pos-mutacao` (mergeada em `main` via fast-forward).
- **Causas raiz (duas, sequenciais):**
  1. `AvisosPageClient` guardava os dados iniciais em `useState` sem sincronizar com props atualizadas — a lista da própria sessão que fez a mutação ficava congelada até F5. **Corrigido** (remoção do `useState` redundante).
  2. Mesmo corrigido (1), uma **sessão diferente e independente**, já aberta em `/avisos`, nunca recebia a atualização — comprovado com um teste distribuído real de duas sessões (PILOT-0003B): 210 segundos parado, sem navegar, sem F5, sem nenhuma mudança visível. `revalidatePath` só invalida cache de rota para navegações futuras da própria sessão; não existe push entre sessões.
- **Correção (2):** Supabase Realtime (Postgres Changes) em `public.avisos` — `useAvisosRealtime` (hook em `AvisosLista`) assina INSERT/UPDATE/DELETE, agrupa rajadas com debounce de 700ms e chama `router.refresh()`. Homologado em ambiente físico real (Windows/Silvana + macOS/Cleison): notificações, filtro da Fila e contador de avisos atrasados em Relacionamento atualizaram automaticamente, sem F5.
- **Migration:** `066_enable_realtime_avisos.sql` — habilita `public.avisos` na publicação `supabase_realtime`. Idempotente, sem mudança de schema funcional. Aplicada em staging e em produção (`nhcppfovsxcsulyvwvgs`).
- **Segurança entre lojas:** sem filtro de `loja_id` no client — a RLS já existente (`membros_veem_avisos`, escopada por `loja_id IN lojas_do_usuario()`) é aplicada pelo Realtime por assinante. Requer `supabase.realtime.setAuth(session.access_token)` explícito antes de assinar (sem isso a conexão fica no papel anon e não recebe nada — comprovado empiricamente). Um único channel (`avisos-realtime-sync`) por sessão.
- Indicador de diagnóstico de status da conexão (usado só para a homologação física) foi removido antes do merge — nenhum código de debug foi para produção.

## SEC-0001 — Escalação de privilégio via `liberacoes_acesso` sem RLS

- **Status:** CONCLUÍDO — auditado, corrigido, homologado em staging, promovido a produção.
- **Branch:** `fix/sec-0001-rls-liberacoes` (mergeada em `main` via PR #2, squash).
- **Vulnerabilidade:** `public.liberacoes_acesso` (e mais 6 tabelas) sem RLS, gravável por `anon`/`authenticated` via REST direto. A trigger `on_auth_user_liberacao` (`AFTER INSERT ON auth.users`, `SECURITY DEFINER`) aplica automaticamente qualquer liberação pendente casada por e-mail, inserindo o `role` indicado (inclusive `admin_f5`/`dono`) em `membros_loja` — permitia que qualquer pessoa se auto-promovesse a dono/admin de uma loja real, sem pagamento, só inserindo uma linha via API pública e se cadastrando com o mesmo e-mail. `public.buscar_auth_user_por_email(text)` (`SECURITY DEFINER`) também permitia enumeração de e-mails cadastrados, sem autenticação.
- **Tabelas afetadas:** `liberacoes_acesso`, `assinaturas`, `planos`, `parceiros`, `bibliotecas`, `biblioteca_itens`, `instalacoes_biblioteca`.
- **Migration:** `067_sec_rls_tabelas_e_revoga_enumeracao.sql` — habilita RLS nas 7 tabelas (sem policies — 100% do acesso legítimo já passa pelo client `admin`/service role, que bypassa RLS) e revoga `EXECUTE` de `anon`/`authenticated` em `buscar_auth_user_por_email(text)`. Idempotente. Aplicada em staging e em produção.
- **Forense:** sem evidência de exploração histórica em staging ou produção (nenhuma linha `pendente`/`admin_f5` suspeita em `liberacoes_acesso`, nenhum `membros_loja` órfão).
- **Riscos residuais / SEC-0002 recomendado:** grants de tabela (`GRANT ALL`) continuam amplos para `anon`/`authenticated` nas 7 tabelas — a proteção hoje é só via RLS sem policy; revisar/apertar esses grants como defesa em profundidade fica para uma tarefa separada (SEC-0002).

## Pausa operacional do F5 OS

Fases 2b, 3 e 4 do F5 OS permanecem pausadas (pausa controlada solicitada antes do PILOT-0001). PILOT-0001 e PILOT-0002 foram executados sob essa pausa, com uma única sessão executora e uma tarefa por vez. Nenhuma decisão foi tomada sobre retomar ou não as fases pausadas — isso segue pendente de autorização explícita separada.

## Débitos técnicos conhecidos (não relacionados às tarefas concluídas)

- Correção de concordância plural pendente nos estilos `consultivo`/`persuasivo`/`incentivo` e overrides de incentivo (backlog, ver migration 065).
- Avisos ativos já gerados a partir de templates legados permanecem no singular até vencerem/serem convertidos (decisão de produto).
- Loja "Cia da Saúde Digital 1" com classificação ambígua (fictícia vs. real) em produção.
- `AppUpdateChecker` usa aviso manual ("Atualizar agora"), nunca recarrega sozinho — decisão deliberada de segurança (não descartar formulário em preenchimento); não há hoje detecção de "há dado não salvo" para permitir atualização automática mesmo quando seguro, conforme permitido (mas não exigido) pelo PILOT-0002.
- Worktree `/Users/cleissonteixeira/F5-Recompra` (branch `fix/avisos-cards-e-produto-inline`) com alterações locais não commitadas, pré-existentes, aguardando decisão.
- **SEC-0002B (não iniciado):** auditoria do SEC-0002 confirmou que `postgres` e `supabase_admin` configuraram `ALTER DEFAULT PRIVILEGES` no schema `public` concedendo automaticamente privilégio total (`SELECT`/`INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/`REFERENCES`/`TRIGGER`) a `anon`/`authenticated`/`service_role` em qualquer tabela nova criada nesse schema. Isso é sistêmico — afeta tabelas futuras, não só as 7 já tratadas na migration 068. **Não faz parte da migration 068** e não deve ser corrigido junto dela: precisa de mapeamento de quem cria tabelas, em qual schema, e do risco de quebrar migrations futuras antes de qualquer `ALTER DEFAULT PRIVILEGES`. Tratar como incidente próprio, isolado.
