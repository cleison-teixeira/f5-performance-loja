# Banco de Dados do F5

## Princípios

- Toda entidade operacional deve possuir escopo organizacional adequado.
- Vendas e eventos críticos não devem ser apagados como correção comum.
- Operações críticas devem ser atômicas e auditáveis.
- Migrations devem ser incrementais, compatíveis e reversíveis quando possível.
- RLS, permissões e Service Role precisam ser explicitamente revisadas.

## Entidades futuras do ecossistema

- organizações_parceiras
- marcas
- distribuidores
- representantes
- campanhas_corporativas
- campanhas_segmentos
- campanhas_lojas_elegiveis
- campanhas_adesoes
- materiais_campanha
- treinamentos_campanha
- metricas_campanha

Os nomes são conceituais e não autorizam implementação sem desenho técnico e ADR.
