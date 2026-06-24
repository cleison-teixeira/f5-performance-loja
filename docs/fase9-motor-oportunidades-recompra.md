# Fase 9.3 — Motor de Oportunidades de Recompra

> **Status:** definição técnica e de produto — sem alteração de código  
> **Data:** 2026-06-24  
> **Contexto:** fundação conceitual para as fases 9.3B–9.3G

---

## 1. Por que isso existe

A loja perde dinheiro porque clientes que já compraram produtos recorrentes não são acionados no momento certo.

Hoje esse processo fica perdido em caderno, bloco de notas, memória da vendedora, WhatsApp e planilha.

O F5 Recompra transforma isso em um motor operacional simples.

O sistema **não é** ERP, sistema de comissão, sistema de metas ou controle financeiro.

O sistema **é** um micro SaaS para:
- mostrar o Dinheiro na Mesa (quanto está disponível para reativar)
- organizar a Fila de Recompra (quem acionar e quando)
- fazer a vendedora acionar o cliente
- registrar o resultado da oportunidade (converteu ou não?)
- criar o próximo ciclo de recompra automaticamente
- mostrar performance de vendedoras, lojas e produtos

---

## 2. Entidade Central: Oportunidade de Recompra

A entidade central do sistema é a **Oportunidade de Recompra**.

> Uma oportunidade de recompra representa um cliente que comprou um produto recorrente e deve ser acionado no momento certo para comprar novamente.

### Mapeamento atual de tabelas

| Conceito | Tabela atual | Correto? |
|---|---|---|
| Oportunidade de recompra | `avisos` | ✅ Sim |
| Resultado convertido | `recompras` | ✅ Sim |
| Compra base que gerou a oportunidade | `vendas` (origem='venda_manual') | ✅ Sim |
| Produto que gerou a oportunidade | `itens_venda` → `produtos` | ✅ Sim (via item_venda_id) |
| Pessoa que deve ser acionada | `clientes` | ✅ Sim |
| Define se produto tem ciclo de recompra | `produtos.recorrente` | ✅ Sim |
| Texto personalizado da mensagem | `mensagens_produto` | ✅ Sim |

**Conclusão:** `avisos` é a melhor representação de oportunidade no modelo atual. Não há necessidade de criar uma nova tabela. É necessário expandir o ciclo de vida (status) e adicionar campos de controle.

---

## 3. Ciclo de Vida da Oportunidade

### Status recomendados

```
aberta          → oportunidade viva, ainda não contatada
contato_feito   → vendedora abordou o cliente (WhatsApp enviado)
reagendada      → oportunidade viva, data alterada pela vendedora
convertida      → cliente comprou — oportunidade encerrada com sucesso
perdida         → cliente não quer mais — oportunidade encerrada sem conversão
```

### Status atuais no banco

```sql
pendente  — 153 registros (representa: aberta)
enviado   —  52 registros (representa: contato_feito E convertida — ambos misturados)
ignorado  —   0 registros (no TypeScript mas sem dados)
```

### Problemas críticos dos status atuais

1. **`enviado` é ambíguo.** Tanto `marcarEnviado` (só WhatsApp) quanto `confirmarRecompra` definem `status='enviado'`. Não é possível distinguir oportunidade apenas contatada de oportunidade convertida.

2. **Não existe `convertida`.** Impossível saber quais avisos geraram recompras sem fazer JOIN em `recompras` pelo campo `recompra_id`.

3. **Não existe `reagendada`.** Impossível manter oportunidade viva com nova data sem inventar status.

4. **Não existe `perdida`.** Impossível marcar cliente que não quer mais.

5. **`ignorado` nunca foi usado.** Pode ser removido ou mapeado para `perdida`.

6. **O Dinheiro na Mesa filtra apenas `pendente`.** Isso significa que ao enviar WhatsApp (`marcarEnviado`), a oportunidade sai do Dinheiro na Mesa — o que é errado. Enviar o WhatsApp não é conversão.

### Status que faltam (requerem migration)

| Status novo | Substituição atual | Impacto |
|---|---|---|
| `aberta` | `pendente` | rename semântico |
| `contato_feito` | `enviado` parcial | nova ação distinta |
| `reagendada` | não existe | nova ação |
| `convertida` | `enviado` parcial | novo status final positivo |
| `perdida` | não existe | novo status final negativo |

### Campos que faltam em `avisos` (requerem migration)

| Campo | Tipo | Propósito |
|---|---|---|
| `motivo_perda` | text nullable | razão quando status=perdida |
| `observacao_resultado` | text nullable | observação livre da vendedora |
| `encerrado_em` | timestamptz nullable | quando foi encerrada (convertida ou perdida) |
| `encerrado_por` | uuid nullable (FK perfis) | quem encerrou |
| `produto_id` | uuid nullable (FK produtos) | atalho direto sem JOIN via item_venda_id |
| `data_prevista_original` | date nullable | data antes do primeiro reagendamento |

### Campos que já existem em `avisos` e são suficientes

| Campo | Uso |
|---|---|
| `venda_id` | venda base que gerou a oportunidade |
| `item_venda_id` | produto específico na venda base |
| `cliente_id` | quem deve ser acionado |
| `vendedora_id` | quem deve acionar |
| `loja_id` | escopo da oportunidade |
| `data_aviso` | data prevista de acionamento |
| `recompra_id` | vínculo com resultado convertido (quando houver) |
| `mensagem_id` | mensagem que gerou este aviso |
| `texto_renderizado` | texto personalizado para WhatsApp |
| `enviado_em` | timestamp do último envio de mensagem |
| `updated_at` | última modificação |

---

## 4. Ações da Fila de Recompra

### 4.1 Enviar WhatsApp

- Abre o app do WhatsApp com a mensagem pré-preenchida
- Não muda status automaticamente
- O sistema pode sugerir após o envio: "Marcar como contato feito?"
- **Não conta como conversão**
- **Não sai do Dinheiro na Mesa**
- Registra `enviado_em = now()` para rastreio de execução

### 4.2 Marcar Contato Feito

- A vendedora indica que abordou o cliente
- `status = 'contato_feito'`
- **Continua no Dinheiro na Mesa**
- **Continua como oportunidade ativa**
- Útil para medir execução da vendedora (quantas abordagens ela faz)
- Futuramente: base para "taxa de resposta" e "tempo de resposta"

### 4.3 Confirmar Recompra

- Cliente comprou
- Cria registro em `recompras` com itens e valor
- `status = 'convertida'`, `recompra_id` preenchido, `encerrado_em = now()`
- **Sai do Dinheiro na Mesa**
- **Entra em Recuperado**
- **Entra na taxa de conversão** (numerador)
- **Gera automaticamente a próxima oportunidade futura** (ciclo contínuo)

### 4.4 Reagendar

- Cliente não pode agora, mas pode futuramente
- Muda `data_aviso` para data futura definida pela vendedora
- `status = 'reagendada'`
- **Continua no Dinheiro na Mesa** (mas na nova data)
- **Não conta como perdida**
- **Não conta como convertida**
- **Não cria nova oportunidade**
- Apenas atualiza a data da oportunidade atual

### 4.5 Cliente Não Quer Mais

- Cliente encerrou o interesse
- `status = 'perdida'`, `motivo_perda` obrigatório, `encerrado_em = now()`
- **Sai do Dinheiro na Mesa**
- **Entra em Motivos de Perda**
- **Não gera próxima oportunidade**
- Entra no denominador da taxa de conversão

---

## 5. Motivos de Perda

Os motivos de perda são fundamentais para o dono descobrir problemas de produto, preço e atendimento.

### Motivos recomendados

```
Não gostou do produto
Sem dinheiro agora
Comprou em outro lugar
Achou caro
Não usa mais
Sem resposta
Outro
```

### Por que isso importa para o negócio

| Motivo frequente | Sinal para o dono |
|---|---|
| "Achou caro" | preço percebido alto — revisar precificação |
| "Comprou em outro lugar" | concorrência ativa — verificar diferenciais |
| "Não gostou do produto" | qualidade/resultado insatisfatório |
| "Sem resposta" | acionamento no timing errado ou canal errado |
| "Não usa mais" | ciclo de recompra mal configurado |

### Implementação recomendada

Salvar `motivo_perda` como enum em text (não FK em tabela separada). Flexível, sem migration para adicionar novos motivos. Permitir campo opcional `observacao_resultado` para texto livre.

---

## 6. Ciclo Contínuo de Recompra

### Regra Central

> Toda recompra confirmada **deve gerar automaticamente uma nova oportunidade futura** de recompra para o mesmo produto.

O F5 Recompra não trata a recompra como evento final. A recompra confirmada encerra uma oportunidade atual **e inicia o próximo ciclo**.

### Fluxo Canônico

```
Compra base (vendas, origem='venda_manual')
↓
Sistema gera avisos via mensagens_produto (gerarAvisos)
↓
Avisos aparecem na Fila de Recompra na data prevista
↓
Vendedora trabalha a oportunidade
↓
Cliente recompra → confirmarRecompra()
↓
Sistema cria nova venda (origem='recompra') + itens_venda
↓
Sistema cria recompra + itens_recompra
↓
Sistema marca aviso atual como convertida (hoje: 'enviado' com recompra_id)
↓
Sistema gera novos avisos a partir da nova venda (ciclo contínuo)
↓
Nova oportunidade aparece na fila na nova data prevista
```

### O ciclo contínuo já existe na implementação

A função `confirmarRecompra` em `app/(app)/avisos/actions.ts` já:
1. Cria nova venda com `origem='recompra'`
2. Chama `gerarAvisos()` a partir da nova venda
3. Insere os novos avisos no banco

**A data do ciclo é calculada corretamente:**
```
nova_data_aviso = data_recompra_confirmada + mensagem.dias_apos_venda
```
A referência é a data da recompra confirmada, não a data original — correto.

### O que falta no ciclo atual

- O aviso encerrado fica como `'enviado'` sem diferenciação de `'convertida'`
- Não é possível reportar "oportunidades convertidas este mês" sem JOIN em `recompras`
- A nova oportunidade gerada não tem vínculo explícito com a oportunidade anterior (`oportunidade_anterior_id` ou `origem_recompra_id`)

### Campos recomendados para rastreio completo do ciclo

Adições recomendadas em `avisos`:

```
avisos.origem_recompra_id  — uuid nullable (FK recompras)
                            A recompra que gerou este aviso (para rastrear ciclos)
```

Isso permite:
- Saber quantos ciclos um cliente/produto já percorreu
- Visualizar a cadeia: venda → recompra1 → recompra2 → recompra3
- Identificar produtos com alto número de ciclos (alta fidelidade)

### Deduplicação

O sistema não deve criar duas oportunidades futuras idênticas.

**Chave de deduplicação recomendada:**
```
(cliente_id, produto_id, venda_id, mensagem_id)
```

Esta chave já é implicitamente única no `gerarAvisos()` atual, pois para cada combinação de `venda_id + item_venda_id + mensagem_id` só existe um aviso. Nenhuma migration necessária para deduplicação.

### Quando NÃO gerar nova oportunidade

```
produto.recorrente = false    → produto não é recorrente
produto.ativo = false         → produto foi desativado
produtos.qtd_mensagens = 0    → sem mensagens configuradas
status_anterior = 'perdida'   → cliente não quer mais
```

### Reagendamento NÃO gera nova oportunidade

Reagendar é mover a data da oportunidade atual, não criar uma nova.

```
oportunidade reagendada → mesma oportunidade, data_aviso atualizada
não cria nova entrada em avisos
não conta como convertida
não conta como perdida
```

---

## 7. Cálculo Canônico das Métricas

### Dinheiro na Mesa

> Soma do valor bruto das oportunidades **ativas** de recompra.

**Entram:**
```
status IN ('aberta', 'contato_feito', 'reagendada')
tipo IN ('recompra', 'oferta')
```

**Não entram:**
```
status = 'convertida'
status = 'perdida'
```

**Problema atual:** o Dinheiro na Mesa filtra apenas `status='pendente'`. Ao chamar `marcarEnviado`, o status vira `'enviado'` e a oportunidade sai do Dinheiro na Mesa — mas ela ainda está em aberto. Isso subestima o Dinheiro na Mesa e gera confusão operacional.

**Workaround imediato (sem migration):** incluir `status IN ('pendente', 'enviado')` com filtro `recompra_id IS NULL` para excluir convertidas. Isso funciona porque `enviado+recompra_id` = convertida, `enviado+recompra_id IS NULL` = contato feito.

**Solução definitiva (com migration):** status canônicos como definidos na seção 3.

### Recuperado

> Soma das recompras confirmadas.

```sql
SELECT SUM(valor_total) FROM recompras
WHERE loja_id = ? AND criado_em >= inicio_periodo
```

Nota: `recompras` tem seu próprio `valor_total`, independente dos avisos. Correto.

### Taxa de Conversão

> Oportunidades convertidas / Oportunidades encerradas

```
convertidas / (convertidas + perdidas)
```

**Não entra no denominador:**
```
aberta, contato_feito, reagendada  → oportunidades ainda ativas
```

**Problema atual:** não é possível calcular conversão real porque `convertida` e `perdida` não existem como status. Workaround: `recompra_id IS NOT NULL` = convertida, mas perdida não tem representação.

### Oportunidades Abertas

```
status IN ('aberta', 'contato_feito', 'reagendada')
```

### Atrasadas

```
status IN ('aberta', 'contato_feito', 'reagendada')
AND data_aviso < today
```

### Para Hoje

```
status IN ('aberta', 'contato_feito', 'reagendada')
AND data_aviso = today
```

### Próximos 7 Dias

```
status IN ('aberta', 'contato_feito', 'reagendada')
AND data_aviso > today
AND data_aviso <= today + 7
```

### Perdidas

```
status = 'perdida'
```

Com `motivo_perda` disponível para agrupamento.

### Reagendadas

```
status = 'reagendada'
```

---

## 8. Performance por Produto

### Métricas desejadas

```
oportunidades geradas
recompras confirmadas (convertidas)
oportunidades perdidas
oportunidades reagendadas
conversão de recompra (convertidas / encerradas)
valor recuperado
motivos de perda agrupados
número de ciclos (recompras encadeadas)
```

### O que já é possível com o schema atual

- Oportunidades geradas: `COUNT(avisos) WHERE item_venda_id IN (itens_venda.produto_id = ?)`
- Recompras confirmadas: `COUNT(recompras JOIN itens_recompra WHERE produto_id = ?)`
- Valor recuperado: `SUM(itens_recompra.subtotal WHERE produto_id = ?)`

### O que precisaria de migration

- Conversão real: precisa de `status = 'convertida'` e `status = 'perdida'`
- Motivos de perda por produto: precisa de `avisos.motivo_perda`
- Query mais eficiente: `avisos.produto_id` como atalho (sem JOIN via item_venda_id)

### Exemplo esperado de saída

```
Produto: Whey Protein
100 oportunidades geradas
70 convertidas
20 perdidas
10 reagendadas
70% conversão sobre encerradas
R$ 14.000 recuperados
Motivos de perda: "Achou caro" (8), "Sem resposta" (6), "Comprou em outro lugar" (4), "Sem dinheiro" (2)
```

---

## 9. Performance por Vendedora

### Regra arquitetural

> A tela da vendedora é a operação real. Dono e gerente são **agregações** da mesma lógica.

Não criar lógicas diferentes por perfil além de escopo e filtro.

### Métricas por vendedora

```
Dinheiro na Mesa          (oportunidades ativas, valor bruto)
Oportunidades abertas     (qtd ativa)
Para hoje                 (qtd com data=hoje)
Atrasadas                 (qtd com data < hoje)
Reagendadas               (qtd reagendadas)
Convertidas               (qtd convertidas no período)
Perdidas                  (qtd perdidas no período)
Recuperado                (valor total de recompras no período)
Taxa de Conversão         (convertidas / encerradas)
Motivos de perda          (agrupados)
```

---

## 10. Performance por Loja

### Métricas por loja (para o Dono)

```
Dinheiro na Mesa total da loja
Recuperado no mês
Oportunidades abertas
Convertidas
Perdidas
Reagendadas
Taxa de Conversão
Produto em foco (mais oportunidades)
Ranking das vendedoras
```

### Exemplo esperado

```
CIA CIDADE AZUL - ANGELONI
R$ 7.000 em Dinheiro na Mesa
R$ 3.000 recuperados no mês
80 oportunidades ativas
40 convertidas
10 perdidas
80% conversão sobre encerradas
Produto em foco: Whey Protein
```

---

## 11. Hierarquia dos Dashboards

```
Vendedora     → apenas sua própria fila e seus próprios resultados
Gerente       → mesmas métricas, agregadas na loja + performance da equipe
Dono          → mesmas métricas, agregadas nas lojas + performance das lojas
```

**Regra:** sem lógicas diferentes por perfil — apenas escopo e agregação mudam.

---

## 12. Auditoria do que já existe

### O que já suporta a lógica de recompra

| Componente | Status |
|---|---|
| Geração automática de avisos na venda | ✅ Implementado |
| Ciclo contínuo: recompra gera novos avisos | ✅ Implementado (`confirmarRecompra`) |
| Vínculo aviso → recompra (`recompra_id`) | ✅ Existe em `avisos` |
| Vínculo recompra → aviso (`aviso_id`) | ✅ Existe em `recompras` |
| Vínculo recompra → venda original | ✅ `recompras.venda_original_id` |
| Filtro de produto recorrente | ✅ `produtos.recorrente` |
| Fila por data de aviso | ✅ `avisos.data_aviso` |
| Vínculo aviso → produto via item | ✅ `avisos.item_venda_id → itens_venda → produto_id` |
| Valor da venda por aviso | ✅ Calculado via `vendas.valor` |
| Dinheiro na Mesa (aproximado) | ✅ Implementado (status='pendente' apenas) |
| Recuperado (por recompras) | ✅ Implementado |
| Ranking de recuperação | ✅ Implementado |
| Performance das lojas | ✅ Implementado |
| Produto em foco | ✅ Implementado |

### O que está incompleto ou impreciso

| Problema | Impacto |
|---|---|
| `status='enviado'` mistura contato feito + convertida | Dinheiro na Mesa e métricas imprecisas |
| Dinheiro na Mesa filtra só `pendente` | Oportunidades contatadas saem do Dinheiro na Mesa cedo demais |
| Não existe `status='perdida'` | Impossível calcular conversão real |
| Não existe `status='reagendada'` | Não existe ação de reagendamento |
| Sem `motivo_perda` em avisos | Sem insights de perda |
| Sem `encerrado_em` / `encerrado_por` | Sem rastreio temporal de encerramento |
| Taxa de conversão não calculada | Métrica central ausente |
| `ignorado` nunca usado | Status morto no TypeScript |

### O que pode ser feito SEM migration

| Ação | Implementação |
|---|---|
| Dinheiro na Mesa mais preciso (workaround) | Filtrar `status IN ('pendente','enviado') AND recompra_id IS NULL` |
| Separar "contato feito" na UI | Label diferente para enviado com/sem recompra_id |
| Conversão aproximada | `COUNT(avisos com recompra_id) / COUNT(avisos com recompra_id ou dados de perda)` — impossível sem perdidas |
| Performance por produto (aproximada) | JOIN em `itens_venda` e `itens_recompra` com produto_id |
| Reagendamento (workaround) | Manter `status='pendente'` e apenas atualizar `data_aviso` — sem status dedicado |

### O que requer migration

| Campo/Status | Tipo de migration |
|---|---|
| `avisos.status` enum expandido | ALTER TABLE: verificar se é text (já é — sem constraint enum) |
| `avisos.motivo_perda` | ADD COLUMN text nullable |
| `avisos.observacao_resultado` | ADD COLUMN text nullable |
| `avisos.encerrado_em` | ADD COLUMN timestamptz nullable |
| `avisos.encerrado_por` | ADD COLUMN uuid nullable |
| `avisos.produto_id` | ADD COLUMN uuid nullable (FK produtos) |
| `avisos.origem_recompra_id` | ADD COLUMN uuid nullable (FK recompras) |
| `avisos.data_prevista_original` | ADD COLUMN date nullable |

**Nota sobre `avisos.status`:** o campo é `text` sem constraint de enum no PostgreSQL (confirmado via information_schema: `data_type='text'`). Isso significa que novos valores de status podem ser inseridos **sem migration de schema**. A migration necessária é apenas de dados (migrar `enviado` para os novos status) e de código (actions + filtros).

---

## 13. Plano de Implementação

### Prioridade recomendada

```
1. Status corretos        (fundação — tudo depende disso)
2. Ações da fila          (operação da vendedora)
3. Métricas honestas      (Dinheiro na Mesa e Conversão reais)
4. Ciclo contínuo         (já funciona, precisa de ajustes menores)
5. Performance            (métricas de produto/vendedora/loja)
6. Reagendamento          (fluxo completo)
7. Motivos de perda       (insights avançados)
```

### Fases propostas

#### Fase 9.3B — Status canônicos e campos de controle

**O que muda:**
- `avisos.status` passa a aceitar: `aberta`, `contato_feito`, `reagendada`, `convertida`, `perdida`
- Migration de dados: `pendente → aberta`; `enviado sem recompra_id → contato_feito`; `enviado com recompra_id → convertida`
- ADD COLUMN: `motivo_perda`, `encerrado_em`, `encerrado_por`
- Atualizar TypeScript types

**Sem migration:** campo `status` é `text` livre — novos valores não precisam de ALTER TABLE.  
**Com migration de dados:** UPDATE cuidadoso e idempotente.

#### Fase 9.3C — Ações da Fila de Recompra

**O que muda:**
- `marcarEnviado` → renomear para `marcarContatoFeito`, status='contato_feito'
- Nova action `reagendarAviso(aviso_id, nova_data)` → status='reagendada', data_aviso=nova_data
- Nova action `marcarPerdida(aviso_id, motivo)` → status='perdida', motivo_perda=motivo, encerrado_em=now()
- `confirmarRecompra` → status='convertida' (não mais 'enviado'), encerrado_em=now()
- UI: novos botões/ações no `CardAviso`

#### Fase 9.3D — Dinheiro na Mesa e Métricas Honestas

**O que muda:**
- Dinheiro na Mesa: filtrar `status IN ('aberta','contato_feito','reagendada')`
- Taxa de Conversão: `convertidas / (convertidas + perdidas)` — primeira vez calculável
- Dashboard atualizado para mostrar Convertidas e Perdidas
- Remover dependência de `pendente` como filtro de Dinheiro na Mesa

#### Fase 9.3E — Ciclo Contínuo Explícito

**O que muda:**
- ADD COLUMN `avisos.origem_recompra_id` (uuid, FK recompras)
- `confirmarRecompra`: preencher `origem_recompra_id` nos novos avisos gerados
- Permite rastrear cadeia: aviso1 → recompra1 → aviso2 → recompra2 → ...
- Verificar deduplicação: garantir que não gera duas oportunidades idênticas

#### Fase 9.3F — Performance por Produto / Vendedora / Loja

**O que muda:**
- ADD COLUMN `avisos.produto_id` (uuid, FK produtos) para queries eficientes
- Backfill: preencher produto_id via `item_venda_id → itens_venda → produto_id`
- Novas queries de performance: conversão, valor recuperado, ciclos por produto
- Dashboard: cards de performance de produto com conversão real

#### Fase 9.3G — Motivos de Perda e Insights

**O que muda:**
- ADD COLUMN `avisos.observacao_resultado` (text nullable)
- UI: modal de "Cliente não quer mais" com seleção de motivo + campo de observação
- Dashboard dono/gerente: seção de motivos de perda agrupados por produto
- Alert: produtos com alta taxa de perda por "Achou caro" ou "Comprou em outro lugar"

---

## 14. Resumo de Dependências

```
9.3B (status) → fundação para tudo
9.3C (ações)  → depende de 9.3B
9.3D (métricas) → depende de 9.3B + 9.3C
9.3E (ciclo) → pode ser paralelo a 9.3D
9.3F (performance) → depende de 9.3D
9.3G (motivos) → depende de 9.3C
```

### Critério de MVP mínimo funcional

Após 9.3B + 9.3C + 9.3D, o sistema terá:
- Ciclo de vida correto da oportunidade
- Ações completas na fila (contato, reagendar, perda, converter)
- Dinheiro na Mesa sem inflação falsa
- Primeira taxa de conversão real calculável

---

## 15. Glossário Canônico

| Termo | Definição |
|---|---|
| **Oportunidade de recompra** | Um aviso gerado para um cliente acionável |
| **Dinheiro na Mesa** | Valor bruto das oportunidades ativas (não encerradas) |
| **Recuperado** | Valor total de recompras confirmadas |
| **Fila de Recompra** | Lista de oportunidades ativas ordenadas por data |
| **Atrasado** | Oportunidade ativa com data passada |
| **Ciclo de recompra** | Intervalo de dias entre recompras de um produto |
| **Conversão** | convertidas / (convertidas + perdidas) |
| **Contato feito** | Vendedora abordou o cliente, mas sem resultado ainda |
| **Reagendada** | Oportunidade viva com data futura alterada |
| **Perdida** | Oportunidade encerrada sem conversão |
| **Convertida** | Oportunidade encerrada com recompra confirmada |
| **Produto em foco** | Produto com mais oportunidades ativas na fila |
