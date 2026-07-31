# Playbook da Fábrica de Software F5

## Objetivo

Entregar software com velocidade, segurança e rastreabilidade, liberando Cleison para clientes, vendas, validação e parcerias.

## Papéis

- **Cleison:** visão do produto, prioridade, decisão de negócio, homologação e autorização de produção. É a autoridade final sobre arquitetura, banco de dados, segurança, produção e produto.
- **Hermes:** orquestrador operacional do F5 OS. Coordena o fluxo entre Cleison, ChatGPT, Claude, Codex e demais agentes; encaminha cada tarefa ao agente adequado; preserva contexto, evidências e rastreabilidade; exige o cumprimento dos testes e gates obrigatórios; interrompe o fluxo quando um gate falhar; e nunca autoriza autonomamente mudanças irreversíveis ou ações em produção.
- **ChatGPT:** arquitetura, especificação, regras de negócio, decomposição, auditoria e coordenação.
- **Claude:** implementação principal e correções críticas.
- **Kimi:** investigação, leitura de grande contexto, tarefas paralelas, documentação e testes.
- **Codex:** revisão, testes, segurança, SQL, regressão, performance e qualidade.

## Fluxo de bug

1. Registrar o problema com evidências.
2. Reproduzir.
3. Identificar causa raiz.
4. Definir a menor correção segura.
5. Implementar em branch própria.
6. Executar testes e build.
7. Revisar tecnicamente.
8. Publicar em staging.
9. Homologar com roteiro objetivo.
10. Autorizar produção.
11. Registrar aprendizado permanente.

## Fluxo de feature

1. Definir problema, usuário e resultado esperado.
2. Validar regra de negócio.
3. Mapear impacto técnico e dependências.
4. Definir critérios de aceite.
5. Dividir em entregas pequenas.
6. Implementar atrás de controle de acesso ou feature flag quando necessário.
7. Testar, revisar e homologar.
8. Documentar decisões e atualizar regras.

## Gates obrigatórios

- Gate de escopo.
- Gate de arquitetura e regra de negócio.
- Gate de testes e build.
- Gate de segurança.
- Gate de staging.
- Gate de homologação.
- Gate de produção.

## Regra de paralelismo

Cada tarefa tem um único responsável principal. Outros agentes investigam, revisam ou testam, evitando duplicação de trabalho.

## Durante homologação

- Não refatorar fora do escopo.
- Não misturar bugs.
- Não alterar arquitetura sem decisão registrada.
- Não usar contas reais de parceiros, equipes ou clientes em testes.
