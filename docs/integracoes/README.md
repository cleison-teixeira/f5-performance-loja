# Integrações do F5

## Propósito

Centralizar conhecimento não sensível sobre:

- ERPs;
- PDVs;
- gateways;
- plataformas de pagamento;
- mensageria;
- APIs parceiras;
- serviços externos.

## Regras

- Uma integração por arquivo.
- Usar o template oficial: `docs/templates/TEMPLATE_INTEGRACAO.md`.
- Nunca armazenar segredos.
- Toda descoberta precisa de evidência.
- Toda hipótese deve estar marcada.
- Documentos devem ser atualizados após homologação ou mudança de contrato.
- Integrações descontinuadas continuam versionadas com status DESCONTINUADO.

## Ciclo de vida da integração

- **EM DESCOBERTA** — investigação em andamento, nada documentado ainda.
- **DOCUMENTANDO** — descoberta registrada, documento sendo escrito.
- **VALIDADO** — documento escrito, revisado e aprovado pelo KPG.
- **ATIVO** — em produção.
- **DESCONTINUADO** — não usada mais, documento preservado para histórico.

## Índice

| Integração | Categoria | Status | Ambiente validado | Última revisão | Documento |
|---|---|---|---|---|---|
| VarejoOnline | ERP/PDV | EM DESCOBERTA | Nenhum contrato persistido | 2026-08-05 | A criar após início da nova investigação |

A investigação anterior do VarejoOnline produziu conhecimento arquitetural real — está registrado em `ADR-007` (`docs/03_DECISOES_ARQUITETURAIS.md`) e refletido em `supabase/migrations/072_pilot_0010_clientes_origem_externa.sql` no repositório do produto. Ela **não** deixou documentação operacional suficiente (URL, autenticação, endpoints, contrato de payload) e por isso permanece formalmente **EM DESCOBERTA** sob o Knowledge Preservation Gate — ver `docs/04_KPG_KNOWLEDGE_PRESERVATION_GATE.md`.

## Segurança

Valores sensíveis (tokens, chaves, senhas, credenciais) vivem somente em:

- gerenciador de segredos;
- variáveis de ambiente da Vercel;
- ambiente seguro equivalente;
- mecanismo aprovado pelo Security Gate.

Nunca em Markdown, nunca versionados neste diretório.

## Processo

Toda integração neste diretório segue o Knowledge Preservation Gate — ver `docs/04_KPG_KNOWLEDGE_PRESERVATION_GATE.md` para a definição normativa e `docs/checklists/CHECKLIST_KPG.md` para o fechamento operacional.
