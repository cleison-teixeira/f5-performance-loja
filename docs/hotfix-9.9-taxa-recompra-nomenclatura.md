# Decisão de Nomenclatura — Taxa de Recompra (Hotfix 9.9 / 9.9.1)

Data: 2026-06-29

## Decisão final

Existem duas métricas de taxa de recompra no produto, com janelas de tempo e propósitos distintos.

### 1. Fila de Recompra (`/avisos`)

**Card:** TAXA DE RECOMPRA DO MÊS

**Fórmula:**
```
taxa = recompras_recuperadas_no_mes / (recompras_recuperadas_no_mes + recompras_perdidas_no_mes)
```

- Fonte de recuperadas: tabela `recompras`, filtro `criado_em >= início do mês`
- Fonte de perdidas: tabela `avisos`, filtro `status = 'perdida'` e `encerrado_em >= início do mês`
- Avisos em aberto **não** entram no denominador
- Janela: mês corrente (reinicia todo mês)

**Propósito:** visão operacional — o time sabe como está performando agora, no ciclo atual.

### 2. Dashboard (`/dashboard`)

**Card:** TAXA DE RECOMPRA 90 DIAS

**Fórmula:**
```
taxa = vendas_elegiveis_que_recompraram / vendas_elegiveis_totais
```

- Elegível = venda com pelo menos 1 item `recorrente = true` cujo ciclo já venceu (`data_compra + ciclo_recompra_dias <= hoje`)
- Janela: últimos 90 dias (rolling)
- Confirmação via `recompras.venda_original_id` — vínculo explícito com a venda de origem
- Avisos e quantidade de mensagens **não** entram no cálculo

**Propósito:** visão de gestão trimestral — permite acompanhar a evolução recente da equipe sem distorção de histórico antigo.

## Por que não "Taxa de recompra geral" ou "Todos os tempos"

Uma taxa calculada sobre todo o histórico tende a ficar distorcida pelo volume de vendas antigas que nunca tiveram chance de gerar recompra (produto descontinuado, cliente inativo, ciclo ainda não vencido há anos). A janela de 90 dias garante que apenas oportunidades maduras e recentes entram no cálculo.

## Funções em `lib/metricas/taxa-conversao.ts`

| Função | Onde é usada | Janela |
|--------|-------------|--------|
| `calcularTaxaRecompraMes` | `/avisos/page.tsx` | Mês corrente |
| `calcularTaxaRecompraGeral` | `/dashboard/page.tsx` | Últimos 90 dias |

## Arquivos de UI afetados

| Arquivo | Label anterior | Label atual |
|---------|---------------|-------------|
| `AvisosLista.tsx` | "Taxa de conversão" → "Taxa do mês" | **"Taxa de recompra do mês"** |
| `DashboardGerente.tsx` | "Taxa de conversão" → "Taxa de recompra geral" | **"Taxa de recompra 90 dias"** |
| `DashboardDono.tsx` | "Taxa de conversão" → "Taxa de recompra geral" | **"Taxa de recompra 90 dias"** |

## O que não foi alterado

- Geração de avisos
- Cadência de recompra
- Registrar venda
- Lista de espera
- Extrato / comissões
- Domínio, auth, cobrança
- RLS / permissões
