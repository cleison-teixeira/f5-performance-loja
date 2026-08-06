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

## ADR-007 — Knowledge Preservation Gate (KPG)

- **Status:** aprovada
- **Contexto:**
  - Uma investigação técnica real (integração VarejoOnline, PILOT-0009) produziu uma descoberta que fundamentou uma decisão de arquitetura permanente — a chave natural de `clientes_origem_externa` sem `loja_id`, registrada em `supabase/migrations/072_pilot_0010_clientes_origem_externa.sql`.
  - A decisão de arquitetura foi preservada (está no código). A investigação que a originou não foi — nenhuma URL, endpoint, mecanismo de autenticação ou contrato de payload foi documentado ou versionado.
  - Uma auditoria forense (histórico de commits, branches, stash, reflog e objetos órfãos de todas as worktrees) confirmou que esse conhecimento técnico não sobrevive em nenhuma fonte recuperável fora da conversa original.
  - Estimativa: um novo desenvolvedor reconstruiria apenas ~15% da integração lendo somente o repositório — a parte "por quê", não o "como".
- **Decisão:**
  - Toda investigação técnica crítica (API externa, ERP, PDV, gateway, autenticação, contrato de payload, comportamento não documentado de fornecedor, decisão arquitetural baseada em evidência externa) só é considerada concluída depois de passar pelo Knowledge Preservation Gate, definido em `docs/04_KPG_KNOWLEDGE_PRESERVATION_GATE.md`.
  - Implementação, migration aplicada, teste aprovado ou deploy realizado **não** encerram automaticamente a investigação.
- **Consequências:**
  - Toda investigação técnica crítica precisa terminar com documento versionado, evidência classificada (comprovada/provável/inferência/desconhecida), referência cruzada com o código/migration correspondente e entrada no índice de `docs/integracoes/` quando aplicável.
  - `docs/checklists/CHECKLIST_KPG.md` operacionaliza o fechamento.
  - A investigação do VarejoOnline permanece formalmente **EM DESCOBERTA** sob o KPG até nova descoberta controlada documentá-la.
- **Alternativas descartadas:**
  - Confiar apenas na memória de operador ou de sessão de IA — descartada por já ter causado a perda de conhecimento que originou este ADR.
  - Exigir documentação completa antes de a investigação começar — descartada por ser impraticável e por poder desincentivar a investigação em si.
  - Tratar migration aplicada ou deploy bem-sucedido como prova suficiente de conhecimento preservado — descartada porque é exatamente essa suposição que falhou no caso VarejoOnline.
- **Lições aprendidas:**
  - Uma decisão de arquitetura pode sobreviver no código mesmo que a investigação que a originou desapareça — não presumir que uma preservação implica a outra.
