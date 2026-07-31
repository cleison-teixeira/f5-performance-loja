# Decisões Arquiteturais do F5

Este arquivo funciona como índice. Decisões detalhadas podem ser registradas com `docs/templates/TEMPLATE_ADR.md`.

## ADR-001 — Venda como evento central

- **Status:** aprovada
- **Decisão:** toda venda deve ser registrada independentemente da ativação de Recompra, Cashback, Wallet ou TOMO.
- **Motivo:** preservar o evento comercial e permitir classificação posterior por item.

## ADR-002 — Arquitetura modular

- **Status:** aprovada
- **Decisão:** módulos compartilham núcleo comum, mas permanecem ativáveis e evolutivos de forma independente.

## ADR-003 — F5 como ecossistema B2B2B2C

- **Status:** aprovada como direção arquitetural
- **Decisão:** prever os atores indústria, marca, distribuidor, representante, rede, loja, equipe e consumidor.
- **Consequência:** permissões e segmentação não podem assumir que toda organização é uma loja.

## ADR-004 — Campanha corporativa com aceite

- **Status:** proposta aprovada conceitualmente
- **Decisão:** campanhas criadas por marcas ou distribuidores devem ser ofertadas às lojas elegíveis, com aceite ou recusa explícitos.

## ADR-005 — IA sem autonomia de produção

- **Status:** aprovada
- **Decisão:** nenhuma IA faz merge, migration ou deploy em produção sem autorização humana.

## ADR-006 — Soberania do schema e rastreabilidade de migrations

- **Status:** aprovada
- **Contexto:**
  - `public.lojas.documento` existia em produção.
  - A coluna foi criada manualmente, sem migration correspondente no repositório.
  - Staging foi reconstruído a partir das migrations oficiais e não incluía essa coluna.
  - A divergência entre código, produção e histórico de migrations causou falha na tela Minha Conta durante a homologação.
- **Decisão:**
  - Nenhuma alteração manual de schema pode permanecer sem migration correspondente.
  - Toda divergência detectada deve ser corrigida no repositório e nos ambientes, restaurando paridade.
  - Produção não é fonte única da verdade; o repositório e o histórico de migrations formam a fonte oficial e reconstruível.
- **Consequências:**
  - Migrations retroativas idempotentes podem ser usadas para formalizar alterações manuais antigas.
  - Staging deve validar paridade de schema antes da homologação.
  - Gates de deploy devem bloquear promoções com divergência de schema conhecida.
  - Em incidente excepcional, uma alteração manual emergencial em produção somente pode ocorrer com autorização humana explícita e deve gerar imediatamente uma migration equivalente, o registro da decisão e a restauração da paridade entre os ambientes.
