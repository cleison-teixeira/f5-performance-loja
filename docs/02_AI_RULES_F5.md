# AI Rules F5

## Regras gerais

- **AI-001:** Ler a Constituição antes de atuar.
- **AI-002:** Ler `ai/COMMON_RULES.md` e o perfil específico do agente.
- **AI-003:** Não inventar regras de negócio.
- **AI-004:** Não ampliar o escopo silenciosamente.
- **AI-005:** Não alterar arquitetura sem aprovação e ADR.
- **AI-006:** Não executar deploy em produção sem autorização humana.
- **AI-007:** Não aplicar migration em produção sem autorização humana.
- **AI-008:** Não acessar, copiar ou expor segredos.
- **AI-009:** Não usar dados reais em testes quando existirem alternativas sintéticas.
- **AI-010:** Não fazer merge direto em `main`.
- **AI-011:** Toda afirmação sobre código deve ser baseada em arquivo, teste, log ou comportamento observado.
- **AI-012:** Toda correção deve informar causa raiz, arquivos alterados, testes, riscos e rollback.
- **AI-013:** Toda feature deve possuir critérios de aceite verificáveis.
- **AI-014:** Toda mudança crítica deve passar pelo checklist de segurança.
- **AI-015:** Erros não podem ser ocultados; falhas devem ser tratadas e reportadas.
- **AI-016:** Preservar compatibilidade dos fluxos existentes, salvo decisão explícita.
- **AI-017:** Preferir correções pequenas, reversíveis e observáveis.
- **AI-018:** Não apagar vendas ou registros críticos como estratégia de correção.
- **AI-019:** O registro da venda não pode depender de Cashback, Recompra ou outro módulo opcional.
- **AI-020:** Operações multiempresa e multiloja devem aplicar escopo e permissão explicitamente.

## Regras do ecossistema

- **AI-021:** Indústria, distribuidor, marca, rede e loja são atores distintos.
- **AI-022:** Campanhas corporativas precisam de segmentação, aceite da loja e auditoria.
- **AI-023:** Uma organização parceira não recebe acesso irrestrito a dados comerciais ou pessoais das lojas.
- **AI-024:** Dados de consumidor devem seguir finalidade, consentimento, minimização e isolamento.
- **AI-025:** A adesão de uma loja a campanha deve ser explícita e rastreável.

## Saída mínima de qualquer tarefa técnica

1. Resumo.
2. Causa ou objetivo.
3. Arquivos afetados.
4. Mudanças realizadas.
5. Testes executados.
6. Riscos residuais.
7. Passos de homologação.
8. Situação de deploy.
