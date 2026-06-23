# Fase 9.0D.1 — Auditoria: Dashboards Recompra-First

**Data:** 2026-06-23
**Branch:** main
**Commit baseline:** 90df1e8 feat(fase9.0c): simplify navigation around recompra
**Build:** limpo

---

## 1. Arquivos analisados

| Arquivo | Função |
|---|---|
| `app/(app)/dashboard/page.tsx` | Server component — busca todos os dados, roteia por role |
| `app/(app)/dashboard/DashboardView.tsx` | Switch de role — distribui props para cada dashboard |
| `app/(app)/dashboard/DashboardDono.tsx` | Dashboard para dono e admin_f5 |
| `app/(app)/dashboard/DashboardGerente.tsx` | Dashboard para gerente |
| `app/(app)/dashboard/DashboardVendedora.tsx` | Dashboard para vendedora |
| `app/(app)/dashboard/ComissaoChart.tsx` | Gráfico de comissão — **não está sendo usado em nenhum dashboard atual** |
| `app/(app)/dashboard/TrendChart.tsx` | Gráfico de tendência — **não está sendo usado em nenhum dashboard atual** |

---

## 2. Blocos atuais por dashboard

### 2.1 Dashboard Dono

| # | Bloco | Label na tela | Variável/dado | É recompra-first? |
|---|---|---|---|---|
| 1 | Saudação | "Painel da loja" | nomeUsuario, loja.nome | Não — genérico |
| 2 | Dinheiro na Mesa (hero) | "Dinheiro na Mesa" | `dinheiroMesaInfo.totalPotencial` (soma valor_venda de avisos recompra/oferta) | **Sim** |
| 2a | — sub-card Oportunidades | qtdOportunidades | avisos pendentes tipo recompra/oferta (deduplicado por venda_id) | **Sim** |
| 2b | — sub-card Próximos 7 dias | potencial7Dias | valor dos avisos que vencem em até 7 dias | **Sim** |
| 2c | — sub-card Clientes vencendo | qtdClientes7Dias | clientes únicos nos próximos 7 dias | **Sim** |
| 3 | Meta Mensal | "Meta mensal" | `totalVendasMes` vs `META_MENSAL_DONO = R$ 20.000 (HARDCODED)` | **Não** — venda geral |
| 4 | Meta Diária | "Meta diária" | `(20000 - totalVendasMes) / diasRestantes` | **Não** — venda geral |
| 5a | Card Total vendido | "Total vendido" | `totalVendasMes`, `qtdVendasMes` | **Não** — venda geral |
| 5b | Card Recompras | "Recompras" | `totalRecomprasValor`, `qtdRecompras` (30 dias) | **Parcial** — existe mas subordinado |
| 5c | Card Comissões | "Comissões" | `totalComissoes` (via comissao_venda, 30 dias) | Neutro |
| 5d | Card Atrasados | "Atrasados" | `avisosPrazo.atrasados.qtd` | **Sim** |
| 5e | Card Para hoje | "Para hoje" | `avisosPrazo.hoje.qtd` | **Sim** |
| 5f | Card Enviados | "Enviados" | `avisosEnviadosCount` (30 dias) | Parcial |
| 6 | Lista de Espera | "Lista de espera" | `listaEsperaInfo` (condicional — só aparece se houver) | Sim |
| 7 | Ranking da equipe | "Ranking da equipe" | `rankingMes[]` ordenado por `totalMes` (VENDA GERAL) | **Não** — venda geral |
| 7a | — rodapé ranking | "Total equipe / Vendas / Melhor progresso" | soma de venda geral | **Não** |
| 8 | Top produtos do mês | "Top produtos do mês" | `topProdutosMes[]` por subtotal de venda geral | **Não** — venda geral |
| 9 | CTAs | "Fila de avisos / Extrato de vendas / Gestão da equipe" | links /avisos, /vendas, /configuracoes/equipe | Parcial — /vendas é ERP |

---

### 2.2 Dashboard Gerente

Estrutura quase idêntica ao Dono. Diferenças:

| # | Diferença vs Dono | Detalhe |
|---|---|---|
| 1 | Título | "Painel da operação" (genérico) |
| 2 | Badge | "Gerente" (azul) |
| 3 | Cards Atrasados/Hoje | Recebe `qtdAvisosAtrasados` e `qtdAvisosHoje` (só contagem, sem valor por bucket) |
| 4 | Sem `avisosPrazo.amanha/em2a3/em4a7` | Gerente não vê breakdown temporal além de hoje/atrasados |
| 5 | CTAs | "Ir para avisos / Ver equipe / Ver extrato" (o "Ver extrato" → /vendas é ERP) |
| 6 | Meta | Igual ao Dono — `META_MENSAL = 20000` hardcoded, baseada em venda geral |

Blocos ERP-like são os mesmos do Dono.

---

### 2.3 Dashboard Vendedora

| # | Bloco | Label na tela | Variável/dado | É recompra-first? |
|---|---|---|---|---|
| 1 | Saudação | **"Seu painel de vendas"** | nomeVendedora, loja.nome | **Não** — centraliza venda |
| 2 | Dinheiro na Mesa (hero) | "Dinheiro na Mesa" | **`totalComissoes`** — comissão total 30 dias | **Não** — comissão geral |
| 2a | — sub-card Comissão em aberto | previsaoEmAberto | soma previsao_comissao dos avisos pendentes | **Parcial** |
| 2b | — sub-card Para hoje | totalHoje | avisosHoje.length | **Sim** |
| 2c | — sub-card Atrasados | totalAtrasados | avisosAtrasados.length | **Sim** |
| 3 | Meta Mensal | "Meta mensal" | `totalVendasMes` vs `metaVendasMes` (banco) | **Não** — venda geral |
| 4 | Meta Diária | "Meta diária" | derivada de venda geral | **Não** |
| 5a | Card Total vendido | "Total vendido" | `totalVendasMes`, `qtdVendas` | **Não** — venda geral |
| 5b | Card Recompras | "Recompras" | `totalRecomprasValor`, `qtdRecompras` | **Parcial** |
| 5c | Card Comissões | "Comissões" | `totalComissoes` 30 dias | Neutro |
| 5d | Card Atrasados | "Atrasados" | `avisosAtrasados.length` | **Sim** |
| 5e | Card Para hoje | "Para hoje" | `avisosHoje.length` | **Sim** |
| 5f | Card Enviados | "Enviados" | `avisosEnviadosCount` | Parcial |
| 6 | Lista de Espera | "Lista de espera" | `listaEsperaInfo` | Sim |
| 7 | Top produtos da loja | **"Top produtos da loja"** | `topProdutosMes[]` — LOJA TODA, não da vendedora | **Não** |
| 8 | Avisos atrasados | "Atrasados — envie agora" | lista avisosAtrasados com CTA WhatsApp | **Sim** |
| 9 | Avisos de hoje | "Para hoje" | lista avisosHoje com CTA WhatsApp | **Sim** |
| 10 | CTAs | "Registrar nova venda / Ver meus avisos" | /vendas/nova, /avisos | Parcial — CTA 1 é venda geral |

---

## 3. Blocos ERP-like identificados

Estes blocos puxam o dashboard para lógica de sistema de venda geral. Não devem ser removidos agora — apenas mapeados.

### Em todos os perfis:

| Bloco ERP-like | Por quê é ERP | O que fazer |
|---|---|---|
| **Meta mensal / Meta diária** | Meta hardcoded R$ 20k de venda geral; mede quanto a loja vendeu, não quanto recuperou | Mover para posição secundária ou renomear para "Meta de recuperação" |
| **Total vendido** | Card que exibe receita bruta de todas as vendas do mês | Rebaixar para "informação de contexto" ou eliminar do dashboard principal |
| **Ranking da equipe por venda geral** | `rankingMes` ordenado por `totalMes` (soma de vendas); sub-textos dizem "X vendas"; rodapé "Total equipe / Vendas" | Substituir por ranking de recuperação (recompras por vendedora) |
| **Top produtos por venda geral** | `topProdutosMes` calculado por subtotal de itens de venda; mede faturamento, não recompras geradas | Substituir por top produtos com maior fila de recompra pendente |

### Específico da Vendedora:

| Bloco ERP-like | Por quê é ERP | O que fazer |
|---|---|---|
| **Título: "Seu painel de vendas"** | "Vendas" é o centro nominal | Renomear para "Meu painel de recompra" |
| **Hero mostra `totalComissoes`** | Comissão total 30 dias como número principal não guia para ação de recompra | Substituir pelo potencial da fila dela (`previsaoEmAberto`) |
| **Top produtos da loja** | Mostra dados da loja toda, não da fila da vendedora | Substituir por top produtos na fila dela |
| **CTA "Registrar nova venda"** | Linguagem de ERP | Renomear para "Registrar compra para recompra" |

### Específico do Dono/Gerente:

| Bloco ERP-like | Por quê é ERP | O que fazer |
|---|---|---|
| **CTA "Extrato de vendas"** | Acesso direto ao histórico de vendas gerais no destaque | Rebaixar para menu ou substituir por acesso à fila de recompra |

---

## 4. Análise de dados: o que já existe hoje vs o que precisa de fase futura

### Métricas recompra-first propostas para Dono/Gerente

| Métrica nova | Já existe hoje? | Variável/tabela atual | Sem migration? | Só label? | Cálculo novo? | Migration futura? | Risco |
|---|---|---|---|---|---|---|---|
| Dinheiro na Mesa | **Sim** | `dinheiroMesaInfo.totalPotencial` (avisos recompra/oferta pendentes) | ✓ | ✓ manter | — | — | Baixo |
| Recuperado no mês | **Parcial** | `totalRecomprasValor` (30 dias, não filtra mês corrente) | ✓ com ajuste no server | Não — precisa filtrar por mês | Sim (filter no server) | Não | Baixo |
| Clientes para retornar hoje | **Sim** | `avisosPrazo.hoje.qtd` | ✓ | ✓ renomear | — | — | Baixo |
| Atrasados | **Sim** | `avisosPrazo.atrasados.qtd` | ✓ | ✓ manter | — | — | Baixo |
| Próximos 7 dias | **Sim** | `avisosPrazo.em4a7` + `em2a3` + `amanha` | ✓ | ✓ reorganizar | — | — | Baixo |
| Ranking de recuperação | **Parcial** | `recompras[]` por vendedora\_id existe no server | ✓ sem migration | Não — precisa novo agregador | Sim (no server) | Não | Médio |
| Top produtos de recompra | **Parcial** | `avisosPorProduto` já calculado no page.tsx mas não passado como prop | ✓ sem migration | Não — passar prop | Sim (prop + componente) | Não | Baixo |
| Taxa de recuperação | **Parcial** | `qtdRecompras / avisosEnviadosCount` (proxy impreciso) | ✓ proxy | Não | Sim | Não (proxy); migration para denominador preciso | Médio |
| Meta de recuperação | **Não** | `META_MENSAL_DONO = 20000` hardcoded em venda geral | Não | Não | Sim (nova semântica) | Sim (coluna meta_recompra ou reconfigurar metas_vendedora) | Alto |
| Agendados | **Não** | `avisos.data_aviso` serve como proxy de agendamento | Parcial | Não | Sim | Sim (coluna status agendado) | Alto |
| Upsell recuperado | **Não** | Não existe | Não | — | — | Sim | Alto |

### Métricas recompra-first propostas para Vendedora

| Métrica nova | Já existe hoje? | Variável/tabela atual | Sem migration? | Notas |
|---|---|---|---|---|
| Minha fila hoje | **Sim** | `avisosHoje` | ✓ | Já renderizado como lista |
| Meus atrasados | **Sim** | `avisosAtrasados` | ✓ | Já renderizado como lista |
| Minhas recompras recuperadas | **Parcial** | `totalRecomprasValor` (filtrado por vendedora via RLS) | ✓ | Filtro de mês a ajustar no server |
| Meu dinheiro na mesa | **Sim** | `previsaoEmAberto` (comissão potencial) | ✓ | Usar como hero em vez de comissão total |
| Minha comissão de recompra | **Sim** | `totalComissoes` | ✓ | Rebaixar de hero para card |
| Clientes sem resposta | **Não** | Não existe campo de resposta/status de retorno | Não | Fase futura |
| Top produtos da minha fila | **Parcial** | `avisosPorProduto` calculado no server (sem filtro vendedora no componente) | ✓ sem migration | Filtrar por vendedora no server |

---

## 5. O que dá para fazer sem migration (fase 9.0D.2)

Estas mudanças são apenas de labels, reordenação e novos cálculos no server sem tocar no banco:

1. **Renomear título** "Painel da loja" → "Recompra F5" (Dono/Gerente)
2. **Renomear título** "Seu painel de vendas" → "Meu painel de recompra" (Vendedora)
3. **Hero da Vendedora**: trocar valor principal de `totalComissoes` para `previsaoEmAberto` ("potencial da minha fila")
4. **Rebaixar Meta Mensal de venda geral**: mover para bloco secundário / informação de contexto
5. **Rebaixar "Total vendido"**: tirar do grupo de 6 cards principais; incluir como dado de rodapé do ranking ou sumir do hero
6. **Ranking de recuperação**: no `page.tsx`, calcular `rankingRecompras` agregando `recompras[]` por `vendedora_id` → passar como prop extra sem migration
7. **Top produtos de recompra**: `avisosPorProduto` já existe no `page.tsx`; basta passar como prop e usar nos componentes
8. **CTA Vendedora**: renomear "Registrar nova venda" → "Registrar compra para recompra"
9. **CTA Dono/Gerente**: substituir "Extrato de vendas" por "Registrar compra" ou remover do destaque

---

## 6. O que precisa de fase futura (não pode fazer sem migration ou decisão de produto)

| O que | Por quê precisa de fase futura |
|---|---|
| **Meta de recuperação** | `META_MENSAL_DONO = 20000` é hardcoded de venda geral. Precisa definir: meta de recuperação por valor? Por qtd de clientes recuperados? E criar coluna ou reconfigurar tabela `metas_vendedora` com tipo "meta_recompra" |
| **Taxa de recuperação precisa** | Denominador ideal seria "oportunidades acionadas" mas isso não existe; proxy atual (qtdRecompras/avisosEnviados) é instável |
| **Agendados** | Não há coluna de status "agendado" em `avisos`; seria necessário novo status ou nova tabela |
| **Clientes sem resposta** | Precisa rastrear resposta de cliente — não existe hoje |
| **Upsell recuperado** | Produto de fase futura — precisa modelo de dados e fluxo |
| **Top produtos da minha fila (vendedora)** | `avisosPorProduto` no server agrupa todos os avisos da loja; para filtrar por vendedora precisa de ajuste no server (não migration, mas ajuste cuidadoso) |

---

## 7. Proposta de novo layout por perfil

### 7.1 Dono/Gerente — Dashboard Recompra-First

```
┌─────────────────────────────────────────────────┐
│  Saudação: "Recompra F5 — [nome loja]"          │
│  Badge: Dono(a) ou Gerente                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  HERO: Dinheiro na Mesa                         │
│  [valor total potencial em aberto]              │
│  — Oportunidades | Próximos 7 dias | Clientes   │
│  CTA: "Ver fila de recompra →"                  │
└─────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬───────────────┐
│Recuperado│ Para hoje│Atrasados │    Enviados   │
│ no mês   │          │          │               │
│(recompras│(avisos   │(avisos   │ (avisos 30d)  │
│ do mês)  │ hoje)    │ vencidos)│               │
└──────────┴──────────┴──────────┴───────────────┘

┌─────────────────────────────────────────────────┐
│  Ranking de Recuperação (novo)                  │
│  [equipe ordenada por recompras confirmadas]    │
│  cada linha: nome | valor recuperado | qtd      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Top produtos de recompra                       │
│  [produtos com mais avisos pendentes]           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Lista de Espera (condicional)                  │
└─────────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────────┐
│ Ver fila de      │  Gestão da equipe             │
│ recompra         │                               │
└──────────────────┴──────────────────────────────┘

[Informação de contexto — abaixo do dobra ou recolhível]
  Meta de venda geral: R$ X / R$ 20k (contexto, não destaque)
  Total vendido: R$ X (contexto)
```

---

### 7.2 Vendedora — Dashboard Recompra-First

```
┌─────────────────────────────────────────────────┐
│  Saudação: "Meu painel de recompra"             │
│  Badge: Vendedor(a)                             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  HERO: Minha fila                               │
│  [previsaoEmAberto] — potencial da minha fila   │
│  — Para hoje | Atrasados | Comissão em aberto   │
│  CTA: "Ver meus avisos →"                       │
└─────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬───────────────┐
│Recompras │Atrasados │ Para hoje│   Enviados    │
│recuperad.│          │          │               │
└──────────┴──────────┴──────────┴───────────────┘

┌─────────────────────────────────────────────────┐
│  Atrasados — envie agora                        │
│  [lista de avisos atrasados com CTA WhatsApp]   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Para hoje                                      │
│  [lista de avisos de hoje com CTA WhatsApp]     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Lista de Espera (condicional)                  │
└─────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────┐
│  Registrar compra p/ recompra│  Ver meus avisos │
└──────────────────────────────┴──────────────────┘

[Contexto — abaixo do dobra]
  Minha comissão: R$ X (30d)
  Top produtos da minha fila
  Meta de venda (se configurada)
```

---

## 8. Resumo de diagnóstico por perfil

### Dono
- **Ponto forte:** Hero "Dinheiro na Mesa" está bem construído e é recompra-first.
- **Principal problema:** Meta mensal/diária e Ranking da equipe são 100% ERP — medem venda geral, não recuperação.
- **Prioridade 1:** Substituir ranking por recuperação. Prioridade 2: rebaixar meta de venda.

### Gerente
- **Ponto forte:** Mesmo hero "Dinheiro na Mesa". Recebe `qtdAvisosAtrasados/Hoje` da equipe toda.
- **Principal problema:** Idêntico ao Dono — meta e ranking são ERP.
- **Diferença relevante:** Gerente não recebe `avisosPrazo` com breakdown completo — oportunidade de adicionar visão da fila da equipe por prazo.

### Vendedora
- **Ponto forte:** Listas de avisos atrasados/hoje já existem com CTA direto de WhatsApp — é o bloco mais recompra-first do sistema.
- **Principal problema:** Título e hero errados. "Seu painel de vendas" + comissão total como hero central desloca o foco.
- **Prioridade 1:** Trocar título + hero (sem migration). Prioridade 2: reordenar cards.

---

## 9. Recomendação para Fase 9.0D.2

**Escopo sugerido para 9.0D.2 — Implementação recompra-first (sem migration):**

1. Renomear títulos dos 3 dashboards
2. Corrigir hero da Vendedora: `previsaoEmAberto` no lugar de `totalComissoes`
3. Adicionar `rankingRecompras` no `page.tsx` (agregação de `recompras[]` por `vendedora_id`) e passar para Dono/Gerente
4. Passar `avisosPorProduto` como prop para Dono/Gerente como "top produtos de recompra"
5. Rebaixar Meta Mensal de venda para posição secundária nos 3 dashboards
6. Rebaixar "Total vendido" de destaque para contexto
7. Ajustar CTAs (remover "Extrato de vendas" do destaque do Dono/Gerente; renomear CTA da Vendedora)
8. Renomear CTA "Registrar nova venda" → "Registrar compra para recompra" na Vendedora

**Fases futuras (precisam de decisão de produto):**
- Meta de recuperação (precisa definir semântica + possivelmente migration)
- Agendados (migration)
- Clientes sem resposta (migration)
- Taxa de recuperação precisa (migration)

---

## 10. Confirmação de escopo desta fase

- Nenhum arquivo de código foi alterado
- Nenhuma migration foi criada
- Nenhum RLS foi alterado
- Nenhum cálculo foi alterado
- Nenhuma query foi alterada
- Nenhum dashboard foi alterado
- Este documento é o único artefato desta fase
