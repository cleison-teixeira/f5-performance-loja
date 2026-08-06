# KPG — Knowledge Preservation Gate

Ver `ADR-007` em `docs/03_DECISOES_ARQUITETURAIS.md` para o contexto que originou este gate. Fechamento operacional em `docs/checklists/CHECKLIST_KPG.md`.

## Status

Documento normativo do F5 OS.

Este documento define oficialmente o funcionamento do Knowledge Preservation Gate (KPG).

O `CHECKLIST_KPG.md` é apenas a implementação operacional resumida deste documento e não substitui sua definição normativa.

## 1. Propósito

Evitar que conhecimento técnico crítico fique restrito a:

- conversas;
- memória de operador;
- sessões de IA;
- scripts temporários;
- arquivos não versionados;
- decisões sem evidência recuperável.

## 2. Quando o KPG é obrigatório

Aplicar quando uma atividade descobrir ou definir:

- API externa;
- ERP;
- PDV;
- gateway;
- autenticação;
- contrato de payload;
- endpoint;
- regra de negócio externa;
- limitação de fornecedor;
- comportamento não documentado;
- decisão arquitetural baseada em evidência externa;
- investigação de produção;
- comportamento de integração;
- dependência operacional crítica.

## 3. Quando não é necessário

Não exigir para:

- correção textual simples;
- ajuste visual sem conhecimento novo;
- refatoração sem mudança de comportamento;
- tarefa puramente mecânica;
- conhecimento já documentado e referenciado.

## 4. Critérios de abertura

A investigação entra no estado **EM DESCOBERTA** assim que ocorrer pelo menos um dos eventos abaixo:

- descoberta técnica inédita;
- investigação superior a uma sessão;
- integração externa;
- comportamento não documentado;
- incidente cuja solução gere conhecimento permanente;
- investigação envolvendo produção;
- nova regra institucional.

## 5. Critério de conclusão

Só pode entrar no estado **ENCERRADO** quando todos os itens obrigatórios estiverem presentes:

- documento versionado;
- fonte da descoberta;
- data;
- responsável;
- grau de confiança;
- evidência;
- limitações;
- decisões tomadas;
- riscos;
- endpoints ou contratos, quando aplicável;
- referência cruzada com código/migration/decisão;
- índice de documentação atualizado;
- commit;
- revisão;
- confirmação de ausência de segredos.

## 6. Estados do KPG

- **EM DESCOBERTA** — investigação em andamento, nenhum documento formal ainda.
- **DOCUMENTANDO** — descoberta registrada, documento sendo escrito.
- **VALIDADO** — documento escrito e revisado, evidências classificadas.
- **APROVADO** — dono do produto aprovou o conteúdo e o fechamento.
- **BLOQUEADO** — investigação interrompida por dependência externa ou decisão de negócio.
- **ENCERRADO** — conhecimento documentado, indexado, referenciado e aprovado — gate fechado.

A diferença entre **VALIDADO** e **ENCERRADO** é a aprovação do dono do produto e a indexação/referência cruzada — documentar e revisar sozinho não fecha o gate.

## 7. Regra de fechamento

Uma implementação não fecha automaticamente a investigação.

Uma migration aplicada não fecha automaticamente a investigação.

Um teste aprovado não fecha automaticamente a investigação.

Um deploy realizado não fecha automaticamente a investigação.

Sem o KPG no estado ENCERRADO, a investigação continua formalmente aberta.

## 8. Regra de segurança

Nunca versionar:

- tokens;
- senhas;
- chaves;
- cookies;
- headers completos;
- dados pessoais;
- payloads reais não mascarados;
- CNPJ completo sem justificativa;
- URLs contendo credenciais;
- arquivos `.env`;
- dumps privados.

## 9. Evidência mínima

Cada informação deve ser classificada como:

- COMPROVADA;
- PROVÁVEL;
- INFERÊNCIA;
- DESCONHECIDA;
- DEPRECIADA.

Nenhuma inferência pode ser apresentada como fato.

Toda descoberta crítica deve registrar, no mínimo:

- ambiente;
- data;
- autor;
- evidência;
- commit;
- migration, quando existir;
- artefato relacionado.

Sem criar campos obrigatórios além destes.

## 10. Responsabilidades

- **Dono do produto:** aprova decisões e fechamento.
- **ChatGPT:** arquitetura, auditoria e consolidação.
- **Claude:** investigação, implementação e produção dos artefatos.
- **Codex:** revisão independente, quando aplicável.
- **Hermes:** orquestração e preservação de estado, conforme evolução do F5 OS.

## 11. Relação com outros gates

O KPG não substitui:

- Security Gate;
- Migration Review;
- Deployment Readiness;
- Freeze Check;
- Production Gate;
- Runtime Verification;
- Smoke Test.

Ele ocorre antes do encerramento formal da iniciativa — e, para integrações externas, fecha o "Registrar aprendizado permanente"/"Documentar decisões e atualizar regras" que já encerram os fluxos de bug e de feature em `docs/01_PLAYBOOK_FABRICA_F5.md`.

O KPG pode ser iniciado antes da implementação e concluído depois da homologação — o documento evolui durante a investigação, não é escrito só no final.

## 12. Regra institucional

Nenhuma investigação técnica crítica do F5 OS será considerada concluída enquanto o conhecimento produzido não estiver documentado, versionado, indexado, referenciado e aprovado pelo Knowledge Preservation Gate.

## 13. Registro de versão

```
KPG

Versão oficial: v1.1
Status: FREEZE
Origem: Primeira aplicação prática (KPG-0001A)
```

## 14. Política de evolução

O KPG é um componente institucional do F5 OS.

Nenhuma alteração poderá ser realizada por hipótese, preferência pessoal ou refatoração documental.

Toda evolução deverá:

- nascer de uma aplicação real do KPG;
- apresentar evidência objetiva do problema;
- demonstrar o benefício arquitetural da mudança;
- preservar a filosofia da "faca";
- passar novamente pelo ciclo completo de revisão.

Caso contrário, a alteração deverá ser rejeitada.

## Índice de Reprodutibilidade

Sempre que aplicável, a investigação pode registrar uma avaliação qualitativa da capacidade de reconstrução do conhecimento apenas a partir do repositório.

Categorias sugeridas:

- Arquitetura
- Banco
- Código
- API Externa
- Processo
- Documentação

Não há fórmula matemática nem métrica obrigatória — é um indicador institucional de maturidade para ajudar futuras auditorias, não um número a ser otimizado.
