# STATE — F5 Recompra

> Arquivo criado no PILOT-0001. Atualizado no PILOT-0002.

## Estado atual

- `main`: sincronizada com `origin/main`.
- Produção (`nhcppfovsxcsulyvwvgs`): estável, sem migrations pendentes conhecidas além das já aplicadas (até `065_fix_templates_legado_plural`).
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

## Pausa operacional do F5 OS

Fases 2b, 3 e 4 do F5 OS permanecem pausadas (pausa controlada solicitada antes do PILOT-0001). PILOT-0001 e PILOT-0002 foram executados sob essa pausa, com uma única sessão executora e uma tarefa por vez. Nenhuma decisão foi tomada sobre retomar ou não as fases pausadas — isso segue pendente de autorização explícita separada.

## Débitos técnicos conhecidos (não relacionados às tarefas concluídas)

- Correção de concordância plural pendente nos estilos `consultivo`/`persuasivo`/`incentivo` e overrides de incentivo (backlog, ver migration 065).
- Avisos ativos já gerados a partir de templates legados permanecem no singular até vencerem/serem convertidos (decisão de produto).
- Loja "Cia da Saúde Digital 1" com classificação ambígua (fictícia vs. real) em produção.
- `AppUpdateChecker` usa aviso manual ("Atualizar agora"), nunca recarrega sozinho — decisão deliberada de segurança (não descartar formulário em preenchimento); não há hoje detecção de "há dado não salvo" para permitir atualização automática mesmo quando seguro, conforme permitido (mas não exigido) pelo PILOT-0002.
- Worktree `/Users/cleissonteixeira/F5-Recompra` (branch `fix/avisos-cards-e-produto-inline`) com alterações locais não commitadas, pré-existentes, aguardando decisão.
