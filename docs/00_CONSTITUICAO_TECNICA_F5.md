# Constituição Técnica do F5

> **Status:** documento principal em consolidação. Substituir este arquivo pela versão quase final já produzida, preservando os princípios abaixo.

## Princípios mínimos obrigatórios

1. O F5 é uma plataforma modular de relacionamento, venda, recompra, fidelização e conexão entre indústria, distribuidores, redes, lojas, equipes e consumidores.
2. A venda é o evento central do sistema e não deve ser bloqueada por módulos opcionais.
3. Todos os módulos compartilham um núcleo comum de empresas, lojas, usuários, clientes, produtos, vendas, permissões e auditoria.
4. Recompra, Cashback, Wallet, TOMO, Campanhas, Academy, Partners/Connect e demais módulos devem permanecer desacoplados e ativáveis por organização ou loja.
5. Toda operação deve respeitar isolamento por organização, empresa, rede e loja.
6. Nenhuma IA possui autoridade para alterar regras de negócio, arquitetura, migrations, produção ou dados reais sem aprovação.
7. Correções durante homologação devem ser mínimas, rastreáveis e sem refatorações paralelas.
8. Toda mudança crítica exige testes, revisão, staging, homologação e plano de rollback.
9. O F5 deve permanecer preparado para novos atores do ecossistema: indústria, distribuidor, marca, representante, rede, loja, gerente, vendedor e consumidor.
10. O repositório é a fonte oficial da verdade técnica.

## Soberania do Schema

11. Toda alteração estrutural no banco de dados deve existir como migration versionada no repositório.
12. É proibida alteração manual de schema em produção sem migration correspondente.
13. Desenvolvimento, staging, produção e ambientes futuros devem ser reconstruíveis a partir do repositório e das migrations oficiais.
14. Divergências de schema entre ambientes devem ser corrigidas restaurando rastreabilidade e paridade, nunca ocultadas ou contornadas.
15. Mudanças de banco seguem os mesmos gates de staging e homologação já exigidos para mudanças críticas (princípio 8), aplicados obrigatoriamente antes da produção.
16. Nenhuma mudança manual em produção pode permanecer fora do histórico oficial de migrations do repositório.

## Governança de Agentes e Evolução do F5 OS

17. O F5 não depende de nenhum fornecedor específico de IA; agentes são escolhidos por capacidade, não por vínculo.
18. A seleção de agente para uma tarefa deve considerar a capacidade necessária para executá-la, não preferência arbitrária.
19. Na ausência ou falha de um agente, o sistema deve degradar de forma controlada e registrada, nunca falhar silenciosamente.
20. O uso de recursos de IA deve ser eficiente — não introduzir custo, camada ou complexidade além do necessário para resolver a dor real.
21. A autonomia dos agentes é progressiva: cada nível só se expande depois de o nível anterior ser validado em uso real.
22. A autoridade final sobre produto, arquitetura, banco de dados, segurança e produção pertence sempre a Cleison ou a quem ele designar explicitamente, consistente com o princípio 6.
23. Existe uma barreira absoluta entre staging e produção: nenhum agente, script ou automação pode atravessá-la sem autorização humana explícita e específica.
24. A arquitetura do F5 OS deve evoluir na velocidade da dor real que resolve, nunca à frente dela.
25. Nenhuma investigação técnica crítica do F5 OS será considerada concluída enquanto o conhecimento produzido não estiver documentado, versionado, indexado, referenciado e aprovado pelo Knowledge Preservation Gate (KPG).

## Documentos subordinados

- `docs/01_PLAYBOOK_FABRICA_F5.md`
- `docs/02_AI_RULES_F5.md`
- `docs/03_DECISOES_ARQUITETURAIS.md`
- `docs/04_KPG_KNOWLEDGE_PRESERVATION_GATE.md`
- `ai/COMMON_RULES.md`
- `knowledge/REGRAS_NEGOCIO.md`
