# STATE — F5 Recompra

> Arquivo criado nesta tarefa (PILOT-0001). Não existia em nenhum branch/worktree anteriormente.

## Estado atual

- `main`: sincronizada com `origin/main`.
- Produção (`nhcppfovsxcsulyvwvgs`): estável, sem migrations pendentes conhecidas além das já aplicadas (até `065_fix_templates_legado_plural`).
- Staging (`ynrffhacpjzohrhkpuiq`): paridade com produção nas migrations do fluxo de recompra; contém dados fictícios adicionais de homologação (ver HANDOFF.md).

## PILOT-0001 — Cadastro rápido de produto na confirmação de recompra

- **Status:** CONCLUÍDO — homologado em staging, aprovado visualmente, promovido a produção.
- **Branch:** `feat/cadastro-rapido-produto-recompra` (mergeada em `main` via fast-forward).
- **Escopo:** `ConfirmarRecompraModal`, `components/produtos/ProdutoSearchInput` (componente compartilhado), `app/(app)/avisos/actions.ts` (`confirmarRecompra`), `app/(app)/avisos/page.tsx`, `app/(app)/vendas/nova/FormNovaVenda.tsx` (só import).
- **Nenhuma migration necessária.** Nenhuma regra de negócio alterada.

## Pausa operacional do F5 OS

Fases 2b, 3 e 4 do F5 OS permanecem pausadas (pausa controlada solicitada antes deste piloto). PILOT-0001 foi o primeiro piloto real executado sob essa pausa, com uma única sessão executora e uma tarefa por vez. Nenhuma decisão foi tomada aqui sobre retomar ou não as fases pausadas — isso segue pendente de autorização explícita separada.

## Débitos técnicos conhecidos (não relacionados a esta tarefa)

- Correção de concordância plural pendente nos estilos `consultivo`/`persuasivo`/`incentivo` e overrides de incentivo (backlog, ver migration 065).
- Avisos ativos já gerados a partir de templates legados permanecem no singular até vencerem/serem convertidos (decisão de produto).
- Loja "Cia da Saúde Digital 1" com classificação ambígua (fictícia vs. real) em produção.
- Worktree `/Users/cleissonteixeira/F5-Recompra` (branch `fix/avisos-cards-e-produto-inline`) com alterações locais não commitadas, pré-existentes, aguardando decisão.
