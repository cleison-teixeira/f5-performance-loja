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
