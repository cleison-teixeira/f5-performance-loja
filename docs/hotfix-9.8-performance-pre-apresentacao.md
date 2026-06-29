# Hotfix 9.8 — Performance pré-apresentação

**Data:** 2026-06-29
**Commit:** `54859d1`
**Branch:** `main`
**Status:** Aprovado parcialmente em validação visual

---

## Contexto

Antes da apresentação do F5 Recompra, foi identificado que as páginas principais estavam com tempo de carregamento perceptível. O hotfix focou em otimizações de servidor sem alterar nenhuma regra de negócio, cadência, modelo de contato, autenticação ou dados exibidos.

---

## Causa raiz identificada

1. **Queries sem `.limit()`** — todas as telas de listagem buscavam 100% dos registros da loja, sem paginação nem limite. Em lojas com volume crescente, o resultado degrada linearmente.
2. **Filtros em JavaScript** — `/avisos` e `/relacionamento` buscavam avisos de todos os tipos e depois filtravam em memória, carregando dados desnecessários da rede.
3. **Queries sequenciais sem paralelização** — `/avisos`, `/relacionamento` e `/vendas/nova` aguardavam cada query terminar antes de disparar a próxima, mesmo sendo independentes entre si.
4. **N+1 em `/avisos`** — `data_compra` das vendas era buscada em query secundária após carregar os avisos. Solucionado adicionando o campo ao join existente: `vendas(valor, data_compra)`.
5. **N+1 em `/lista-espera`** — nomes de vendedoras eram buscados via query extra mesmo quando já disponíveis em `vendedorasRes`. Solucionado usando `vendedorasRes` como fonte primária e fazendo lookup adicional apenas para IDs ausentes.

---

## Arquivos otimizados

| Arquivo | Otimizações aplicadas |
|---|---|
| `app/(app)/avisos/page.tsx` | `Promise.all` de 4 queries (avisos + catálogo + recompras + membros); N+1 de `data_compra` eliminado (campo adicionado ao join `vendas`); `.limit(200)` nos avisos |
| `app/(app)/relacionamento/page.tsx` | `Promise.all` para avisos + membros em paralelo; `.limit(200)` nos avisos |
| `app/(app)/vendas/nova/page.tsx` | 8 queries sequenciais reduzidas a 2 batches paralelos com `Promise.all`; perfil + produtos + membros + comissões fixas em paralelo; depois regras de comissão em paralelo |
| `app/(app)/produtos/page.tsx` | `.limit(300)` na query de produtos |
| `app/(app)/configuracoes/produtos/page.tsx` | `.limit(300)` na query de produtos |
| `app/(app)/lista-espera/page.tsx` | `.limit(200)` na lista de espera; N+1 de nomeMap eliminado — `vendedorasRes` como fonte primária, query extra apenas para IDs ausentes |
| `app/(app)/dashboard/page.tsx` | `.limit(300)` em `produtosRes` (mapa de fotos — não é métrica); 3 queries sequenciais do bloco `rankingLojas` convertidas para `Promise.all` |

---

## Preservação das métricas do Dashboard

Conforme aprovado antes da implementação, **nenhum `.limit()` foi aplicado** às queries que alimentam métricas do Dashboard:

- `vendas` (30 dias) → totalVendasValor, ranking, funil, chart
- `avisos` (abertos) → dinheiroNaMesa, avisosPrazo, oportunidades, previsaoEmAberto
- `recompras` (30 dias) → totalRecomprasValor, rankingRecompras
- `comissao_venda` → totalComissoes, comissaoDiaria
- `lista_espera` (bloco compacto) → listaEsperaInfo

O `.limit(300)` aplicado ao Dashboard é exclusivo de `produtosRes`, que serve apenas como mapa de lookup de fotos dos produtos, sem impacto em nenhum indicador financeiro ou operacional.

---

## O que não foi alterado

- Regras de cadência
- Geração de avisos
- Modelo de contato
- Produtos e mensagens
- Lista de Espera (dados e lógica)
- Dashboard de negócio (indicadores)
- Autenticação
- Domínio
- Cobrança / Asaas

---

## Build

```
✓ Compiled successfully in 6.4s
✓ TypeScript: 0 erros
✓ 31 rotas geradas
```

---

## Backlog — Índices no Supabase (não criados)

Se após o uso real a performance ainda não for suficiente, a próxima ação é criar uma **migration 026 exclusiva de índices** com os seguintes candidatos:

```sql
-- Queries de avisos por loja + status + data (Dashboard, Avisos, Relacionamento)
CREATE INDEX CONCURRENTLY idx_avisos_loja_status_data
  ON avisos(loja_id, status, data_aviso);

-- Contador de enviados no período (Dashboard, enviadosRes)
CREATE INDEX CONCURRENTLY idx_avisos_loja_enviado_em
  ON avisos(loja_id, enviado_em)
  WHERE status IN ('enviado', 'convertida');

-- Vendas por loja + data (Dashboard, 30 dias)
CREATE INDEX CONCURRENTLY idx_vendas_loja_criado_em
  ON vendas(loja_id, criado_em);

-- Recompras por loja + data (Dashboard, Avisos)
CREATE INDEX CONCURRENTLY idx_recompras_loja_criado_em
  ON recompras(loja_id, criado_em);

-- Lista de espera por loja + data (Lista-Espera)
CREATE INDEX CONCURRENTLY idx_lista_espera_loja_criado
  ON lista_espera(loja_id, criado_em);
```

**Observações:**
- `CONCURRENTLY` garante que a migration não bloqueia a tabela em produção.
- Esses índices beneficiam as queries com filtro em `loja_id` combinado com range de datas ou `status`.
- Criar somente após validar se as otimizações de código já são suficientes para a apresentação.
