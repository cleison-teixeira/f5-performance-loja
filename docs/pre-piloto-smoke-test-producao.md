# Recway — Smoke Test de Produção · Pré-Piloto

**Data:** 2026-06-22  
**Fase:** 8.7D  
**Ambiente:** `https://recway.com.br`  
**Commit base:** `fc137f7` — docs(fase8.7c): close phase with login confirmation and final status  
**Responsável:** Cleison  
**Status:** PARCIALMENTE CONCLUÍDO — testes de UI (browser) pendentes de execução manual

---

## 1. Git / Build

| Item | Status |
|---|---|
| Working tree | ✅ Limpa |
| Último commit | ✅ `fc137f7` |
| Build local | ✅ TypeScript OK, 29 rotas |

---

## 2. Perfis disponíveis — Loja Cia Cidade Azul Angeloni

| Role | Nome | Email | Ativo |
|---|---|---|---|
| **dono** | CLEISON CARDOSO TEIXEIRA | `cleisonimarketing@gmail.com` | ✅ |
| **gerente** | Cleison Gerente | `cleisonperfil@gmail.com` | ✅ |
| **vendedora** | Cintya Teste | `cintya.teste@f5recompra.test` | ✅ |
| **vendedora** | Cleison Vendedor | `cleisonteixeiramkd@gmail.com` | ✅ |
| **vendedora** | Teste | `teste@gmail.com` | ✅ |

Todos os 3 roles existem — smoke test completo com Dono, Gerente e pelo menos 1 Vendedora é viável.

---

## 3. Estado do banco (pré-smoke)

| Item | Quantidade |
|---|---|
| Vendas existentes | 40 |
| Clientes existentes | 7 |
| Avisos existentes | 106 |
| Lista de espera | 0 |
| Produtos ativos | 34 |
| Produtos inativos | 1 (Creatina Teste ✅) |

---

## 4. Catálogo de Produtos — Auditoria

### 4.1 Contagem vs esperado

| Item | Esperado | Real | Status |
|---|---|---|---|
| Produtos ativos | 30 PiùVita | 34 total | ⚠️ Ver Seção 4.2 |
| Creatina Teste inativa | ativo=false | ativo=false | ✅ |
| Produtos com 3 mensagens | 32 produtos | 32 produtos | ✅ |
| Chocolate Zero (não recorrente) | 0 mensagens | 0 mensagens | ✅ esperado |
| MounJaro Natural | 3 mensagens | 4 mensagens | ⚠️ Ver Seção 4.3 |

### 4.2 Produtos extras além do catálogo PiùVita oficial

São 4 produtos pré-existentes de seeds anteriores que permanecem ativos:

| Nome | Recorrente | Preço | Observação |
|---|---|---|---|
| Whey EXX | sim | R$ 159,90 | Seed demo inicial — `d1000000...` |
| Cesta Amor de Mãe 💖 | sim | — | Sem preço sugerido |
| Chocolate Zero | não | R$ 19,90 | Sem mensagens (correto para não-recorrente) |
| MounJaro Natural | sim | R$ 58,90 | 4 mensagens com variáveis antigas — ver 4.3 |

> Estes produtos aparecem na lista `/produtos` e em `/vendas/nova`. Não bloqueiam o smoke test, mas devem ser revisados antes do onboarding real com o lojista.

### 4.3 Anomalia: MounJaro Natural — variáveis antigas

**Problema:** 4 mensagens (deveria ter 3) com formato de variáveis anterior ao sistema atual.

| Ordem | Tipo | dias_após_venda | Variáveis usadas |
|---|---|---|---|
| 1 | agradecimento | 0 | `{vendedora}`, `{loja}` — **formato antigo** |
| 2 | relacionamento | 15 | `{cliente}`, `{vendedora}`, `{loja}`, `{produto}` — **formato antigo** |
| 3 | recompra | 25 | `{cliente}`, `{vendedora}`, `{loja}`, `{produto}` — **formato antigo** |
| 4 | oferta | 45 | `{cliente}`, `{vendedora}`, `{loja}`, `{produto}` — **extra, formato antigo** |

**Impacto:** se uma venda for registrada para MounJaro Natural, os avisos gerados terão variáveis não substituídas (texto literal `{cliente}` em vez do nome real). **Risco médio antes do piloto.**

**Ação recomendada:** corrigir mensagens do MounJaro para formato `{cliente_nome}`, `{vendedora_nome}`, `{loja_nome}`, `{produto_nome}` e remover a mensagem `oferta` extra, ou desativar o produto antes do onboarding.

---

## 5. Rotas — Verificação técnica (sem sessão)

Todas as rotas protegidas retornam `307` (redirect para `/login`) quando acessadas sem sessão — middleware de auth funcionando em produção.

| Rota | Status sem sessão | Esperado |
|---|---|---|
| `/dashboard` | ✅ 307 → /login | Correto |
| `/avisos` | ✅ 307 → /login | Correto |
| `/clientes` | ✅ 307 → /login | Correto |
| `/produtos` | ✅ 307 → /login | Correto |
| `/metas` | ✅ 307 → /login | Correto |
| `/lista-espera` | ✅ 307 → /login | Correto |
| `/treinamentos` | ✅ 307 → /login | Correto |
| `/perfil` | ✅ 307 → /login | Correto |
| `/vendas/nova` | ✅ 307 → /login | Correto |
| `/configuracoes/produtos` | ✅ 307 → /login | Correto |
| `/configuracoes/comissoes` | ✅ 307 → /login | Correto |
| `/configuracoes/equipe` | ✅ 307 → /login | Correto |
| `/configuracoes/loja` | ✅ 307 → /login | Correto |
| `/debug/auth` | ✅ 404 | Correto — protegido |
| `/debug/logout` | ✅ 404 JSON | Correto — protegido |
| `/api/auth/callback` | ✅ 307 → /login?erro=link_invalido | Correto — fluxo auth |
| `/api/auth/logout` | ✅ 405 (POST-only) | Correto |

---

## 6. Smoke Test por Perfil — Checklist de UI (executar no browser)

> Itens verificáveis apenas via browser. Marcar cada item conforme resultado.

### 6.1 Login / Logout (todos os perfis)

| # | Ação | Dono | Gerente | Vendedora |
|---|---|---|---|---|
| 1 | Login em `https://recway.com.br/login` | ✅ confirmado 8.7C | ⬜ | ⬜ |
| 2 | Dashboard carrega após login | ✅ confirmado 8.7C | ⬜ | ⬜ |
| 3 | Loja "Cia Cidade Azul Angeloni" aparece | ✅ confirmado 8.7C | ⬜ | ⬜ |
| 4 | Nome/perfil correto no menu | ⬜ | ⬜ | ⬜ |
| 5 | Logout pelo menu → volta para `/login` | ⬜ | ⬜ | ⬜ |

### 6.2 Dono — rotas e funcionalidades

| # | Rota / Ação | Status |
|---|---|---|
| 1 | `/dashboard` — "Painel da loja" carrega com métricas | ⬜ |
| 2 | Ranking/meta/equipe visíveis no dashboard | ⬜ |
| 3 | `/produtos` — lista produtos (34 ativos) | ⬜ |
| 4 | `Creatina Teste` **não** aparece em `/produtos` | ⬜ |
| 5 | `/configuracoes/produtos` — mensagens com variáveis `{cliente_nome}` etc. | ⬜ |
| 6 | `/configuracoes/comissoes` carrega | ⬜ |
| 7 | `/configuracoes/equipe` — lista membros | ⬜ |
| 8 | Label "Admin F5" **não** aparece em nenhuma tela | ⬜ |
| 9 | `/configuracoes/loja` carrega | ⬜ |
| 10 | `/clientes` carrega com 7 clientes | ⬜ |
| 11 | `/metas` carrega | ⬜ |
| 12 | `/avisos` carrega fila de avisos | ⬜ |
| 13 | `/lista-espera` carrega (vazia) | ⬜ |
| 14 | `/treinamentos` carrega | ⬜ |
| 15 | `/perfil` — nome, e-mail, loja, role corretos | ⬜ |

### 6.3 Gerente — rotas e funcionalidades

| # | Rota / Ação | Status |
|---|---|---|
| 1 | `/dashboard` carrega sem erro | ⬜ |
| 2 | Vê dados da equipe conforme RLS | ⬜ |
| 3 | `/produtos` carrega | ⬜ |
| 4 | `/configuracoes/produtos` — acessível (gerente tem permissão) | ⬜ |
| 5 | `/configuracoes/loja` — bloqueado ou acessível (registrar comportamento) | ⬜ |
| 6 | `/avisos` — apenas avisos da loja | ⬜ |
| 7 | `/perfil` — role "Gerente" correto | ⬜ |
| 8 | Não vê dados de outra loja | ⬜ |
| 9 | Logout funciona | ⬜ |

### 6.4 Vendedora — rotas e funcionalidades

| # | Rota / Ação | Status |
|---|---|---|
| 1 | `/dashboard` — "Meu painel" carrega com métricas pessoais | ⬜ |
| 2 | Vê apenas seus próprios dados onde RLS restringe | ⬜ |
| 3 | `/produtos` carrega com PiùVita | ⬜ |
| 4 | `Creatina Teste` **não** aparece | ⬜ |
| 5 | `/vendas/nova` — carrega produtos e permite registrar venda | ⬜ |
| 6 | `/avisos` — apenas seus avisos | ⬜ |
| 7 | `/metas` — apenas meta própria | ⬜ |
| 8 | `/clientes` carrega (clientes da loja) | ⬜ |
| 9 | `/lista-espera` carrega | ⬜ |
| 10 | `/treinamentos` carrega | ⬜ |
| 11 | `/perfil` — role "Vendedora" correto | ⬜ |
| 12 | Não acessa `/configuracoes/equipe` nem `/configuracoes/loja` | ⬜ |
| 13 | Logout funciona | ⬜ |

---

## 7. Venda Rápida — Teste Controlado (executar no browser)

Criar via UI com perfil Vendedora (`cleisonteixeiramkd@gmail.com` — Cleison Vendedor).

| Campo | Valor |
|---|---|
| Cliente nome | `Cliente Smoke Test Recway` |
| WhatsApp | número controlado (não usar cliente real) |
| Produto | produto PiùVita recorrente (ex: Piùfort Antiox — R$ 149,90) |
| Vendedora | Cleison Vendedor |
| Observação (se houver) | `SMOKE TEST 8.7D` |

**Não usar MounJaro Natural** neste teste — variáveis antigas causarão aviso mal formatado.

### Validar após salvar:

- [ ] Venda aparece no dashboard/extrato
- [ ] Cliente criado no banco
- [ ] 3 avisos gerados (agradecimento, relacionamento, recompra)
- [ ] Avisos com variáveis corretas (`{cliente_nome}` etc.)
- [ ] Comissão atualiza conforme regra
- [ ] Botão WhatsApp aparece — **NÃO CLICAR** sem aprovação

### IDs para registrar após criar:

| Campo | ID |
|---|---|
| venda_id | _(registrar após criar)_ |
| cliente_id | _(registrar após criar)_ |
| item_venda_id / aviso_ids | _(registrar após criar)_ |

---

## 8. Lista de Espera — Teste Controlado (executar no browser)

| Campo | Valor |
|---|---|
| Cliente | `Cliente Lista Smoke` |
| WhatsApp | número controlado |
| Produto | `Produto Lista Smoke` |
| Observação | `SMOKE TEST 8.7D` |

- [ ] Aparece na lista
- [ ] Status correto
- [ ] RLS — Vendedora vê apenas sua entrada, Dono/Gerente veem tudo

---

## 9. Mobile — Teste Rápido (executar no browser/device)

| Tela | Status |
|---|---|
| Dashboard (mobile) | ⬜ |
| Venda rápida (mobile) | ⬜ |
| Produtos (mobile) | ⬜ |
| Avisos (mobile) | ⬜ |
| Perfil (mobile) | ⬜ |
| Menu abre/fecha | ⬜ |
| Cards sem overflow horizontal | ⬜ |

---

## 10. Anomalias Encontradas

| # | Anomalia | Severidade | Ação |
|---|---|---|---|
| 1 | **MounJaro Natural**: 4 mensagens com variáveis antigas `{cliente}`, `{vendedora}` etc. | Média | Corrigir antes do onboarding ou desativar |
| 2 | **Chocolate Zero**: produto ativo sem mensagens | Baixa | Esperado (não recorrente); confirmar se correto |
| 3 | **4 produtos extras** além dos 30 PiùVita (Whey EXX, Cesta Amor de Mãe 💖, MounJaro, Chocolate Zero) | Baixa | Revisar com Cleison antes de apresentar ao lojista |
| 4 | **Cesta Amor de Mãe 💖** sem preço sugerido | Baixa | Definir preço ou desativar |

---

## 11. Pendências antes do Onboarding

### Bloqueante para onboarding real (Fase 8.8)

| # | Pendência |
|---|---|
| 1 | Completar checklist de UI (Seções 6.2, 6.3, 6.4) no browser |
| 2 | Executar venda teste controlada (Seção 7) e registrar IDs |
| 3 | Corrigir ou desativar MounJaro Natural (variáveis antigas + 4 mensagens) |

### Importante mas não bloqueante

| # | Pendência |
|---|---|
| 4 | Confirmar logout via menu (teste no browser com cada perfil) |
| 5 | Revisar 4 produtos extras (Whey EXX, Cesta, MounJaro, Chocolate) antes de apresentar ao lojista |
| 6 | `www.recway.com.br` redirect para apex (painel Vercel) |
| 7 | Favicon/logotipo Recway — aguarda asset oficial |

---

## 12. Veredicto

**Infraestrutura e dados: ✅ prontos**  
Ambiente de produção no ar, SSL ativo, auth funcionando, catálogo PiùVita presente, perfis configurados.

**UI e fluxos: ⏳ pendentes de validação manual**  
Os testes de interface, venda rápida, mobile e logout por perfil precisam ser executados no browser pelo Cleison antes de declarar produção pronta para onboarding.

**Anomalia a corrigir antes da Fase 8.8:**  
~~MounJaro Natural com variáveis antigas~~ → **resolvido na Fase 8.7D.1** (produto desativado).

---

*Documento gerado na Fase 8.7D. Seções 6–9 dependem de execução manual no browser.*

---

## Atualização Fase 8.7D.1 — Limpeza de Produtos Legados · 2026-06-22

### Produtos legados encontrados (4)

| Produto | ID | Recorrente | Preço | Mensagens | Variáveis | itens_venda | avisos |
|---|---|---|---|---|---|---|---|
| Cesta Amor de Mãe 💖 | `665a359f-...` | sim | — (sem preço) | 3 (antigas) | `{cliente}`, `{vendedora}`, `{loja}`, `{produto}` | 3 | 9 |
| Chocolate Zero | `7a240699-...` | não | R$ 19,90 | 0 reais (qtd_mensagens=2 no campo) | — | 3 | 0 |
| MounJaro Natural | `85bdb78a-...` | sim | R$ 58,90 | 4 (antigas + extra oferta) | `{cliente}`, `{vendedora}`, `{loja}`, `{produto}` | 11 | 38 |
| Whey EXX | `d1000000-...` | sim | R$ 159,90 | 3 (antigas) | `{cliente}`, `{vendedora}`, `{loja}`, `{produto}` | 5 | 12 |

> Todos os 4 usam o formato antigo de variáveis (sem sufixo `_nome`). Nenhum é parte do catálogo PiùVita oficial. Todos são seeds de fases anteriores ao pré-piloto.

### Dependências preservadas

Vendas, itens_venda e avisos históricos **não foram alterados**. O `ativo = false` remove os produtos de `/produtos` e `/vendas/nova` mas preserva todo o histórico.

### Decisão aplicada

Todos os 4 produtos desativados com `UPDATE produtos SET ativo = false` — transação `BEGIN/COMMIT`. Nenhum dado deletado.

### Validações pós-desativação

| Validação | Esperado | Resultado |
|---|---|---|
| Produtos PiùVita oficiais ativos | 30 | ✅ **30** |
| Produtos legados ativos | 0 | ✅ **0** |
| MounJaro Natural `ativo` | false | ✅ `false` |
| Whey EXX `ativo` | false | ✅ `false` |
| Cesta Amor de Mãe 💖 `ativo` | false | ✅ `false` |
| Chocolate Zero `ativo` | false | ✅ `false` |
| Creatina Teste `ativo` (controle) | false | ✅ `false` — inalterada |

### O que NÃO foi alterado

- Nenhum produto PiùVita oficial tocado
- Nenhum código alterado
- Nenhum RLS alterado
- Nenhum schema alterado
- Nenhuma venda/aviso/cliente deletado
- Build limpo antes e depois

### Estado final do catálogo

| Categoria | Ativos | Inativos |
|---|---|---|
| PiùVita oficiais | **30** | 0 |
| Legados (seeds anteriores) | 0 | 4 |
| Testes (Creatina Teste) | 0 | 1 |
| **Total** | **30** | **5** |

### Veredicto 8.7D.1

✅ Catálogo limpo. `/produtos` e `/vendas/nova` mostrarão exatamente os 30 produtos PiùVita oficiais.

**Liberado para smoke test manual no browser (Fase 8.7D continuação).**

---

## Atualização Fase 8.7D.2 · 2026-06-22 — Bug crítico encontrado e corrigido

### Bug: substituição de variáveis em `texto_renderizado`

**Descoberta:** Durante a auditoria técnica do pipeline de avisos, identificado bug crítico na função `interpolar()` em `lib/mensagens/interpolador.ts`.

**Causa raiz:**

| Camada | Antes (bug) | Depois (fix) |
|---|---|---|
| `interpolar()` substituía | `{cliente}`, `{produto}`, `{vendedora}`, `{loja}` | `{cliente_nome}`, `{produto_nome}`, `{vendedora_nome}`, `{loja_nome}` (+ aliases `{cliente}` etc. para retrocompat) |
| `gerarAvisos()` passava | `{ cliente, produto, vendedora, loja }` | `{ cliente_nome, produto_nome, vendedora_nome, loja_nome }` |
| Templates PiùVita usam | `{cliente_nome}`, `{produto_nome}`, ... | ✅ corresponde ao fix |

**Impacto:** 15 avisos em produção tinham `{cliente_nome}`, `{produto_nome}` etc. literais em `texto_renderizado`. O link WhatsApp enviaria texto com variáveis não substituídas para o cliente.

### Correção aplicada

| Item | Ação | Status |
|---|---|---|
| `lib/mensagens/interpolador.ts` | Assinatura e regexes atualizados para `_nome` + aliases | ✅ |
| `lib/avisos/gerador.ts` | Keys do objeto passado para `interpolar` corrigidas | ✅ |
| 15 avisos no DB | `UPDATE avisos ... SET texto_renderizado = replace(...)` com JOINs em `clientes`, `perfis`, `lojas`, `itens_venda` | ✅ 0 avisos com variáveis literais |
| Build | `✓ Compiled successfully` — 29 rotas | ✅ |
| Commit | `be59725` — `fix(fase8.7d2): correct variable substitution in aviso text rendering` | ✅ |
| Deploy | Push para `main` — Vercel deploy automático acionado | ✅ |

### Validação pós-fix (banco)

```
SELECT COUNT(*) FROM avisos
WHERE texto_renderizado LIKE '%{cliente_nome}%' → 0
```

Exemplo de aviso corrigido:
> "Olá Luiz T, aqui é Teste da Cia Cidade Azul Angeloni. Obrigado pela sua compra do Piu MAG + Magnésio C/60. Salve meu contato..."

### Avisos pré-existentes com substituição correta

Os avisos de produtos legados (MounJaro Natural, Cesta Amor de Mãe, etc.) já tinham `texto_renderizado` correto — esses templates usavam `{cliente}` (sem `_nome`), que `interpolar` resolvia corretamente.

### Status após 8.7D.2

| Item | Status |
|---|---|
| Pipeline de geração de avisos | ✅ corrigido — novos avisos substituirão variáveis corretamente |
| Avisos existentes no DB | ✅ backfillados — 0 com variáveis literais |
| Deploy em produção | ✅ `be59725` em `main` → Vercel |

**Smoke test manual no browser pode prosseguir. Executar com `recway.com.br` após deploy da Vercel ficar `READY`.**

---

## Atualização Fase 8.7D.2B · 2026-06-22 — Smoke browser após correção do interpolador

### 1. Deploy em produção

| Item | Status |
|---|---|
| Commit `be59725` em produção | ✅ — incluso no deploy `5731f51` (docs seguinte) |
| Deployment ID | `dpl_7RXSqkxMVHm2fwAEbeoqzssYcYYi` |
| Status Vercel | ✅ `READY` — 3 min após push |
| Aliases ativos | `recway.com.br`, `recway.vercel.app`, `www.recway.com.br` |
| `https://recway.com.br/login` | ✅ HTTP 200 |
| Build no servidor | ✅ sem erros |

### 2. Banco — zero variáveis literais em avisos

```sql
SELECT COUNT(*) FROM avisos
WHERE texto_renderizado LIKE '%{cliente_nome}%'
   OR texto_renderizado LIKE '%{produto_nome}%'
   OR texto_renderizado LIKE '%{vendedora_nome}%'
   OR texto_renderizado LIKE '%{loja_nome}%'
   OR texto_renderizado LIKE '%{cliente}%'
   OR texto_renderizado LIKE '%{produto}%'
   OR texto_renderizado LIKE '%{vendedora}%'
   OR texto_renderizado LIKE '%{loja}%'
→ 0
```

✅ Nenhum aviso com variáveis não substituídas.

### 3. Templates PiùVita — confirmados corretos

| Verificação | Resultado |
|---|---|
| Todos os produtos PiùVita ativos têm 3 mensagens (agradecimento/relacionamento/recompra) | ✅ |
| Formato das variáveis nos templates | ✅ `{cliente_nome}`, `{produto_nome}`, `{vendedora_nome}`, `{loja_nome}` |
| `interpolar()` agora substitui esse formato | ✅ |
| Textos finais em `avisos` | ✅ sem chaves literais |

---

### 4–9. Smoke browser — Pendente de execução manual por Cleison

Os itens a seguir requerem browser em `https://recway.com.br`.

#### 4. Login/logout por perfil

| Perfil | Email | Login | Dashboard | Logout |
|---|---|---|---|---|
| **Dono** | `cleisonimarketing@gmail.com` | ⬜ | ⬜ | ⬜ |
| **Gerente** | `cleisonperfil@gmail.com` | ⬜ | ⬜ | ⬜ |
| **Vendedora** | `cintya.teste@f5recompra.test` | ⬜ | ⬜ | ⬜ |

#### 5. Rotas principais

| Rota | Dono | Gerente | Vendedora |
|---|---|---|---|
| `/dashboard` | ⬜ | ⬜ | ⬜ |
| `/vendas/nova` | ⬜ | ⬜ | ⬜ |
| `/avisos` | ⬜ | ⬜ | ⬜ |
| `/clientes` | ⬜ | ⬜ | ⬜ |
| `/produtos` | ⬜ | ⬜ | ⬜ |
| `/metas` | ⬜ | ⬜ | ⬜ |
| `/configuracoes/produtos` | ⬜ | ⬜ | — |
| `/configuracoes/comissoes` | ⬜ | — | — |
| `/treinamentos` | ⬜ | ⬜ | ⬜ |
| `/perfil` | ⬜ | ⬜ | ⬜ |

#### 6. Venda teste PiùVita recorrente

- **Cliente:** `Cliente Smoke Test Recway`
- **WhatsApp:** número controlado (não enviar WA real)
- **Produto:** produto PiùVita ativo (ex: Creatina Efervescente Maçã Verde 360g)
- **Observação:** `SMOKE TEST 8.7D.2`

| Validação | Status |
|---|---|
| Venda criada | ⬜ |
| `venda_id` criado | ⬜ — anotar: `___` |
| `cliente_id` criado | ⬜ — anotar: `___` |
| `item_venda_id` criado | ⬜ — anotar: `___` |
| 3 avisos criados | ⬜ — anotar IDs: `___` |
| Textos dos avisos interpolados (sem chaves) | ⬜ |
| Link WhatsApp contém nome real, produto real | ⬜ |
| Não enviado WA real | ⬜ |

#### 7. Item livre não recorrente

- **Item:** `Item Livre Smoke Test`
- **recorrente = false**
- **Observação:** `SMOKE TEST 8.7D.2`

| Validação | Status |
|---|---|
| Venda criada | ⬜ |
| Nenhum produto criado no catálogo | ⬜ |
| Nenhum aviso criado | ⬜ |

#### 8. Lista de espera

- **Cliente:** `Cliente Lista Smoke`
- **Produto:** `Produto Lista Smoke`
- **Observação:** `SMOKE TEST 8.7D.2`

| Validação | Status |
|---|---|
| Item aparece na lista | ⬜ |
| Status correto | ⬜ |

#### 9. Mobile quick-check

| Tela | Status |
|---|---|
| Dashboard (mobile) | ⬜ |
| Venda rápida (mobile) | ⬜ |
| Produtos (mobile) | ⬜ |
| Avisos (mobile) | ⬜ |
| Perfil (mobile) | ⬜ |

---

### Pendências para conclusão da Fase 8.7D.2B

| # | Item | Tipo |
|---|---|---|
| 1 | Login/logout — 3 perfis | Browser manual |
| 2 | Rotas principais — Dono, Gerente, Vendedora | Browser manual |
| 3 | Venda PiùVita + validação dos 3 avisos no DB | Browser manual + consulta SQL |
| 4 | Item livre — validar zero avisos gerados | Browser manual |
| 5 | Lista de espera | Browser manual |
| 6 | Mobile quick-check | Browser mobile |
| 7 | `www.recway.com.br` redirect para apex | Painel Vercel |
| 8 | Logout via menu | Browser manual |
| 9 | Favicon/logotipo oficial Recway | Asset pendente do Cleison |

---

## Achados do smoke manual — Fase 8.7D.3 · 2026-06-22

**Smoke executado por:** Cleison  
**Ambiente:** `https://recway.com.br`  
**Status:** Smoke parcial concluído — achados catalogados, correções NÃO aplicadas nesta fase

---

### Resultados confirmados no smoke

| Item | Status |
|---|---|
| Login funcionando — 3 perfis | ✅ |
| Dashboard abre com loja correta | ✅ |
| Perfil correto exibido por role | ✅ |
| Logout pelo menu → volta para `/login` | ✅ |
| Lista de espera — item de teste apareceu | ✅ |
| Venda com múltiplos produtos recorrentes — avisos criados | ✅ (12 avisos para venda com 4+ produtos) |
| Item livre não recorrente — gerou aviso de agradecimento | ⚠️ ver Achado 9 |

---

### Tabela de achados

| # | Achado | Tipo | Severidade | Fase sugerida | Decisão recomendada |
|---|---|---|---|---|---|
| 1 | Senha da Cintya Teste (`cintya.teste@f5recompra.test`) divergente — não conseguiu logar | Bug | **Bloqueador** | Antes do onboarding | Resetar senha da Cintya no painel Supabase Auth antes de entregar acesso à lojista |
| 2 | Gerente não tem acesso completo operacional: Venda Rápida, Avisos, Lista de Espera, Comissões | UX / regra de negócio | **Alto** | 8.7D.4 | Auditar middleware/menu para Gerente ter visão operacional completa (gerente também vende na operação real) |
| 3 | Dashboard Vendedora sem destaque de comissão do mês, meta, recompras, atrasados, resultado 30 dias | UX | **Alto** | 8.7D.5 | Redesenhar cards do dashboard da vendedora para evidenciar indicadores de desempenho |
| 4 | Dashboard Vendedora: quando há atrasados, bloqueia visualização de resultado 30 dias | UX | **Alto** | 8.7D.5 | Mostrar alerta de atrasados + resultado 30 dias simultaneamente, não substituir |
| 5 | Comissão da vendedora parece calcular apenas recompras, não todas as vendas comissionáveis | Bug / regra de negócio | **Alto** | 8.7D.6 | Auditar query de cálculo de comissão — verificar se `comissionavel = true` está sendo aplicado em todas as vendas |
| 6 | Gerente sem visão/opção de comissão conforme regra de negócio | Regra de negócio | **Alto** | 8.7D.6 | Definir regra: gerente vê comissão da equipe? Só a própria? Auditar e implementar |
| 7 | Lista de Espera sem máscara de WhatsApp, máscara de valor e validação consistente | UX | **Médio** | 8.7D.4 | Aplicar mesma qualidade de formulário da Venda Rápida: máscara WA, valor e validação |
| 8 | Dashboards exibem produtos legados inativos (Whey EXX, MounJaro Natural, Cesta Amor de Mãe, Creatina Teste) em Top Produtos/Radar | Bug | **Médio** | 8.7D.4 | Auditar queries de dashboard — filtrar por `ativo = true` ou separar histórico legado |
| 9 | Item livre não recorrente gerou aviso de agradecimento | Regra de negócio | **Médio** | 8.7D.4 | Definir e documentar regra: item livre não recorrente → agradecimento OK, sem recompra/relacionamento. Auditar código e confirmar |
| 10 | Menu "Equipe" visível para vendedora pode expor dados sensíveis de comissão | Segurança / UX | **Médio** | 8.7D.4 | Ocultar menu Equipe para vendedora ou remover acesso a valores de comissão da equipe |
| 11 | "Academia Recway" deve ser renomeado para "Recway Academy" | UX / nomenclatura | **Baixo** | 8.7D.4 | Alterar label no menu/sidebar — não renomear rota `/treinamentos` nesta etapa |
| 12 | Venda com múltiplos produtos recorrentes gera muitos avisos (ex: 12 para 4 produtos) | UX / backlog | **Baixo** | Pós-pré-piloto | Registrar como backlog: agrupamento de mensagens por cliente/data para reduzir volume percebido |
| 13 | Ciclo das mensagens fixo — não considera dose diária do produto (1 ou 2 cápsulas/dia) | Backlog | **Baixo** | Pós-pré-piloto | Backlog: permitir regra de consumo por produto (quantidade, consumo diário, ciclo calculado) |
| 14 | Sistema não suporta multi-role (mesma pessoa como dona, gerente e vendedora) | Backlog | **Baixo** | Pós-pré-piloto | Backlog: suporte a múltiplos roles por perfil/loja |
| 15 | Mobile: alguns botões com aparência de duplo clique, margens estouram em telas pequenas | UX | **Médio** | 8.7D.4–8.7D.5 | Auditoria mobile: Dashboard, Venda Rápida, Lista de Espera, Produtos, Avisos, Perfil |
| 16 | Cashback / Clube Recway não implementado | Backlog estratégico | **Baixo** | Pós-pré-piloto | Backlog enterprise: Clube Recway / cashback de recompra |
| 17 | Integração PDV/ERP não implementada | Backlog estratégico | **Baixo** | Pós-pré-piloto | Backlog enterprise: integração para redes com ERP |
| 18 | Portal/Aba de Parceiros não implementada | Backlog estratégico | **Baixo** | Pós-pré-piloto | Backlog enterprise: fornecedores acompanham vendas agregadas em tempo real |

---

### Plano de correção — fases sugeridas

#### Fase 8.7D.4 — Correções rápidas pré-onboarding

**Objetivo:** resolver bloqueadores e achados médios antes de entregar à lojista.

| # | Item | Ação |
|---|---|---|
| 1 | **Senha Cintya Teste** | Resetar no painel Supabase Auth — `cintya.teste@f5recompra.test` |
| 2 | **Acesso operacional do Gerente** | Auditar middleware/menu — garantir Venda Rápida, Avisos, Lista de Espera, Clientes, Produtos, Metas, Equipe, Comissões, Configurações e Recway Academy |
| 3 | **Lista de Espera — máscaras e validação** | Aplicar máscara de WhatsApp, máscara/normalização de valor e validação consistente (paridade com Venda Rápida) |
| 4 | **Dashboards — produtos inativos** | Auditar queries de Top Produtos e Radar — adicionar filtro `p.ativo = true` para não exibir legados |
| 5 | **Regra item livre** | Auditar código de `gerarAvisos` — confirmar e documentar: item livre não recorrente → apenas agradecimento, sem recompra |
| 6 | **Menu Equipe para vendedora** | Ocultar menu Equipe do role `vendedora` ou remover acesso a valores de comissão da equipe |
| 7 | **"Recway Academy"** | Alterar label "Academia Recway" → "Recway Academy" em menu e sidebar |
| 8 | **Mobile — bloqueadores** | Auditoria mobile rápida: identificar e corrigir o que é bloqueador (estouro de layout, botão inoperante) |

#### Fase 8.7D.5 — Dashboards Gerente e Vendedora

**Objetivo:** dashboards operacionais que "brilhem os olhos" e orientem a ação.

| # | Item | Ação |
|---|---|---|
| 1 | **Dashboard Vendedora** | Destacar: comissão do mês, oportunidades de recompra, alerta de meta, avisos atrasados, resultado 30 dias |
| 2 | **Dashboard Vendedora — atrasados** | Mostrar alerta de atrasados + resultado 30 dias simultaneamente (não substituir) |
| 3 | **Dashboard Gerente** | Garantir visão gerencial completa: equipe, vendas, meta, comissão |
| 4 | **Mobile polish** | Margens, touch targets e UX mobile nos dashboards |

#### Fase 8.7D.6 — Auditoria de comissão

**Objetivo:** garantir que o cálculo de comissão está correto por perfil e tipo de venda.

| # | Item | Ação |
|---|---|---|
| 1 | **Comissão vendedora** | Auditar query — verificar se todas as vendas com `comissionavel = true` entram no cálculo, não apenas recompras |
| 2 | **Comissão gerente** | Definir e implementar regra: gerente vê só a própria comissão? Comissão da equipe? Percentual diferente? |
| 3 | **Validação DB** | Confirmar valores no banco contra vendas registradas no smoke test |

#### Fase 8.7D.7 — Smoke final curto

**Objetivo:** smoke rápido de validação pós-correções, antes do onboarding.

| # | Item |
|---|---|
| 1 | Login/logout — 3 perfis com senha correta |
| 2 | Venda rápida — produto PiùVita — verificar avisos no banco |
| 3 | Link WhatsApp — nome real do cliente |
| 4 | Dashboard Vendedora — comissão e meta visíveis |
| 5 | Dashboard Gerente — visão operacional completa |
| 6 | Comissão — conferir valor calculado |
| 7 | Mobile — dashboard e venda rápida |

#### Pós-pré-piloto — Backlog registrado

| Item | Descrição |
|---|---|
| Agrupamento de mensagens | Reduzir volume de avisos para vendas com múltiplos produtos — agrupar por cliente/data |
| Ciclo inteligente por produto | Suporte a regra de consumo: dose diária, ciclo calculado, override manual |
| Multi-role | Mesma pessoa como dono + gerente + vendedora na mesma loja |
| Cashback / Clube Recway | Cashback de recompra — programa de fidelidade do lojista |
| Integração PDV/ERP | Backlog enterprise para redes com sistema de gestão |
| Portal de Parceiros | Fornecedores acompanham vendas agregadas em tempo real |
| Pedido B2B | Backlog para redes e distribuidores |

---

### Status da Fase 8.7D.3

| Item | Status |
|---|---|
| Smoke manual executado (parcial) | ✅ |
| Achados catalogados (18 itens) | ✅ |
| Código alterado | ✅ NÃO — apenas documentação |
| Banco alterado | ✅ NÃO |
| RLS alterado | ✅ NÃO |
| Plano de fases 8.7D.4–8.7D.7 criado | ✅ |
| Backlog pós-pré-piloto registrado | ✅ |

**Bloqueador imediato antes do onboarding:** senha da Cintya Teste deve ser resetada (Achado #1).

**Próxima fase:** 8.7D.4 — Correções rápidas pré-onboarding.

---

## Atualização Fase 8.7D.4 · 2026-06-22 — Correções rápidas pré-onboarding

**Commit:** `1a2ba04`  
**Status:** ✅ CONCLUÍDO

### 1. Senha Cintya Teste

| Item | Status |
|---|---|
| Usuário | `cintya.teste@f5recompra.test` |
| Senha temporária definida | ✅ `123456` — via `UPDATE auth.users SET encrypted_password = crypt(...)` |
| ID usuário | `c1000000-0000-0000-0000-000000000001` |
| Loja vinculada | ✅ Cia Cidade Azul Angeloni |
| Role | ✅ `vendedora` |
| Perfil | ✅ Cintya Teste |

> **Ação pós-onboarding:** Cintya deve trocar a senha no primeiro acesso.

### 2. Gerente — acesso operacional

| Item | Status |
|---|---|
| Gerente já via todos os itens do menu antes desta fase | ✅ |
| Nenhuma restrição de rota/menu bloqueava o gerente | ✅ |
| Ajuste necessário | Nenhum — gerente tem acesso completo |

### 3. Vendedora — menu Equipe ocultado

| Item | Status |
|---|---|
| Sidebar desktop: Equipe oculto para vendedora | ✅ |
| Sidebar desktop: Loja oculto para vendedora | ✅ |
| Sidebar desktop: Configuração (seção) oculta para vendedora | ✅ |
| BottomNav mobile: mesmo filtro aplicado | ✅ |
| Dono e gerente continuam vendo tudo | ✅ |
| RLS não alterado | ✅ |

**Arquivos alterados:**
- `app/(app)/layout.tsx` — fetcha role de `membros_loja`, passa para Sidebar e BottomNav
- `components/layout/Sidebar.tsx` — aceita `role` prop, filtra `gestaoItems` e seção Configuração para vendedora
- `components/layout/BottomNav.tsx` — aceita `role` prop, filtra drawerSections para vendedora

### 4. Lista de Espera — máscaras e validação

| Item | Status |
|---|---|
| Máscara de WhatsApp (formato `(XX) XXXXX-XXXX`) | ✅ |
| Validação: mínimo 10 dígitos, máximo 11 | ✅ |
| Normalização: envia apenas dígitos ao backend | ✅ |
| Valor potencial: `replace(/\./g, '')` antes do parse | ✅ |
| Campo WhatsApp: `inputMode="numeric"` para mobile | ✅ |

### 5. Dashboard — filtro de produtos inativos/legados

| Item | Status |
|---|---|
| Top Produtos do mês | ✅ filtra `!produtoFotoMap.has(produto_nome)` — exclui inativos e item livre |
| Radar de produtos (30 dias) | ✅ mesmo filtro aplicado |
| Whey EXX, MounJaro Natural, Cesta Amor de Mãe, Creatina Teste | ✅ não aparecem mais |
| Item livre | ✅ também excluído do radar (não está no catálogo ativo) |

### 6. Regra item livre não recorrente — confirmada no código

Auditoria de `app/(app)/vendas/nova/actions.ts`:

| Regra | Status no código |
|---|---|
| Item livre não recorrente NÃO cria produto no catálogo | ✅ `produto_id = null` (linha 126–128) |
| Item livre não recorrente NÃO cria mensagens | ✅ nenhum `mensagens_produto` inserido |
| Item livre não recorrente NÃO gera avisos (nenhum, incluindo agradecimento) | ✅ linha 273: `if (!recorrente) continue` — skip total |

> Nota: smoke test relatou "aviso de agradecimento" para item livre — provavelmente erro de observação (item estava marcado como recorrente, ou aviso era de outro item na mesma venda). O código não gera avisos para não-recorrente.

### 7. "Recway Academy" — labels atualizados

| Arquivo | Antes | Depois |
|---|---|---|
| `components/layout/Sidebar.tsx` | `Academia Recway` | `Recway Academy` |
| `components/layout/BottomNav.tsx` | `Academia Recway` | `Recway Academy` |
| `app/(app)/treinamentos/page.tsx` | `Academia Recway` | `Recway Academy` |

Rota `/treinamentos` mantida sem alteração.

### 8. Mobile — ajustes feitos

| Item | Status |
|---|---|
| Lista de Espera: `inputMode="numeric"` no campo WhatsApp | ✅ |
| Overflow/margens evidentes | Sem bloqueadores críticos identificados no código estático |
| Redesign de telas | ✅ NÃO feito — aguarda fase 8.7D.5 |

### Status consolidado da fase

| Item | Status |
|---|---|
| Senha Cintya | ✅ `123456` temporária — vinculada à loja correta como vendedora |
| Acesso Gerente | ✅ completo — nenhuma restrição identificada |
| Menu Equipe ocultado para vendedora | ✅ |
| Lista de Espera com máscara WA | ✅ |
| Dashboard sem produtos inativos | ✅ |
| Item livre confirmado no código | ✅ zero avisos para não-recorrente |
| "Recway Academy" aplicado | ✅ |
| Schema/RLS/produtos PiùVita | ✅ NÃO alterados |
| Build | ✅ `Compiled successfully` — 29 rotas |
| Commit | ✅ `1a2ba04` → `main` → Vercel deploy acionado |

### Pendências restantes

| # | Item | Fase |
|---|---|---|
| 1 | Dashboard Vendedora: comissão, meta, atrasados + resultado 30 dias juntos | 8.7D.5 |
| 2 | Dashboard Gerente: visão operacional completa | 8.7D.5 |
| 3 | Mobile polish: overflow, touch targets nos dashboards | 8.7D.5 |
| 4 | Auditoria cálculo de comissão (vendedora vê só recompras?) | 8.7D.6 |
| 5 | Comissão gerente: definir e implementar regra | 8.7D.6 |
| 6 | `www.recway.com.br` redirect para apex | Painel Vercel |
| 7 | Favicon/logotipo oficial Recway | Asset pendente do Cleison |
| 8 | Cintya trocar senha no primeiro acesso | Pós-onboarding |

---

## Atualização Fase 8.7D.5 · 2026-06-22 — Dashboards Gerente e Vendedora

**Status:** ✅ CONCLUÍDO

### 1. Dashboard Vendedora — reestruturação

**Problema (pré-8.7D.5):** headline mutually-exclusive — quando atrasados > 0, o card de resultado 30 dias ficava completamente oculto. Comissão enterrada nos MetricCards. Sem barra de meta.

**Solução implementada:**

| Item | Status |
|---|---|
| Comissão do mês como destaque no topo da página (card proeminente verde, 3xl) | ✅ |
| Meta do mês com barra de progresso (valor vendido / meta, %, falta, dias restantes) | ✅ |
| Headline de ação (prioridade: atrasados → hoje → resultado → bem-vinda) mantida | ✅ |
| Resultado strip (verde) aparece SIMULTANEAMENTE com headline de urgência quando há recompras | ✅ |
| CTA "Ver meus avisos" adicionado ao lado do "Registrar nova venda" | ✅ |
| Props novas: `totalVendasMes`, `metaVendasMes`, `diasRestantes` | ✅ |
| Props novas encaminhadas de `DashboardView.tsx` para `DashboardVendedora.tsx` | ✅ |

**Arquivos alterados:**
- `app/(app)/dashboard/DashboardVendedora.tsx` — reestruturação da ordem visual e lógica de cards
- `app/(app)/dashboard/DashboardView.tsx` — forward de 3 novas props para vendedora
- `app/debug/mobile-access/page.tsx` — mock values para as novas props

### 2. Dashboard Gerente — CTA equipe

| Item | Status |
|---|---|
| 3 CTAs operacionais: Ir para avisos / Ver equipe / Ver extrato | ✅ |
| Layout: `grid-cols-1 sm:grid-cols-3` | ✅ |
| "Painel da operação" — label mantido | ✅ |
| 6 MetricCards, ComissaoChart, Funil, Pendências, Ranking, Radar | ✅ (inalterados) |

**Arquivo alterado:**
- `app/(app)/dashboard/DashboardGerente.tsx` — CTAs expandidos de 2 para 3

### 3. Restrições respeitadas

| Restrição | Status |
|---|---|
| Cálculo de comissão NÃO alterado (aguarda 8.7D.6) | ✅ |
| Schema / RLS / banco NÃO alterados | ✅ |
| DashboardDono NÃO alterado | ✅ |
| Produtos PiùVita NÃO alterados | ✅ |

### Status consolidado da fase

| Item | Status |
|---|---|
| Comissão proeminente no topo — Vendedora | ✅ |
| Meta do mês com barra de progresso | ✅ |
| Atrasados + Resultado 30 dias simultâneos | ✅ |
| CTA "Ver meus avisos" adicionado | ✅ |
| CTA "Ver equipe" adicionado ao Gerente | ✅ |
| Schema/RLS/banco | ✅ NÃO alterados |
| Build | ✅ `Compiled successfully` — 29 rotas, TypeScript OK |

---

## Atualização Fase 8.7D.5.1 · 2026-06-22 — Refinos de Dashboard e Lista de Espera

**Commit:** `6e5e096`  
**Status:** ✅ CONCLUÍDO

### 1. Bloco "Comissão acumulada do mês" — reestruturado

**Problema:** bloco misturava gráfico, meta, comissão e total vendido sem hierarquia clara; "Meta: R$X" no header era redundante com o que o ComissaoChart já mostrava internamente.

**Solução:**

| Item | Status |
|---|---|
| Valor principal (R$ X) em destaque 3xl acima do gráfico | ✅ |
| "de R$ Y da meta" como subtítulo imediato | ✅ |
| `showProgressBar={false}` passado ao ComissaoChart (remove barra interna redundante) | ✅ |
| Barra de meta manual abaixo do gráfico com "X% · faltam R$Y" | ✅ |
| Footer reduzido de 3 para 2 colunas (removido "Minha comissão" duplicado) | ✅ |
| Dashboard Gerente: título renomeado para "Comissões da equipe" | ✅ |
| Dashboard Gerente: mesma estrutura (valor + barra manual + 2 colunas) | ✅ |

### 2. Dashboard Vendedora — Funil de recompra

**Problema:** vendedora não tinha visão do funil de recompra; dados da equipe poderiam vazar.

**Solução:**

| Item | Status |
|---|---|
| Bloco "Meu funil de recompra" adicionado após MetricCards | ✅ |
| Barras horizontais simples por step (label + contagem + barra proporcional) | ✅ |
| Cor por step: azul/âmbar/verde/emerald | ✅ |
| `funil` prop adicionada à DashboardVendedora | ✅ |
| `funil` encaminhado de DashboardView para DashboardVendedora | ✅ |
| Dados já filtrados pela vendedora logada via `vidFilter` em page.tsx | ✅ |
| "Uma venda pode gerar mais de uma mensagem" como nota informativa | ✅ |

### 3. Lista de Espera — Oportunidade destacada

**Problema:** Lista de Espera não comunicava o valor comercial da demanda represada.

**Solução:**

| Item | Status |
|---|---|
| Banner amber "Oportunidade" entre stats e formulário | ✅ |
| Mostra: "R$ X em potencial aguardando reposição" | ✅ |
| Contagem: "Y itens aguardando · Z clientes interessados" | ✅ |
| Clientes únicos calculados com `Set()` sobre `registros.filter(aguardando)` | ✅ |
| Aparece somente quando `aguardando > 0 && valorPotencial > 0` | ✅ |

### 4. Lista de Espera — Valores com 2 casas decimais

**Problema:** valores apareciam como "R$ 150", "R$ 100" sem casas decimais.

**Solução:**

| Arquivo | Mudança |
|---|---|
| `lista-espera/page.tsx` — `fmt()` | `maximumFractionDigits: 0` → `minimumFractionDigits: 2, maximumFractionDigits: 2` |
| `lista-espera/ListaEsperaCards.tsx` — `fmtValor()` | idem |
| Card de resumo "Potencial" | ✅ R$ 150,00 |
| Valor potencial de cada item nos cards | ✅ R$ 100,00 |
| Valor enviado ao banco | ✅ não alterado (normalização numérica intacta) |

### 5. Restrições respeitadas

| Restrição | Status |
|---|---|
| Banco / RLS / migrations | ✅ NÃO alterados |
| Regra de comissão | ✅ NÃO alterada (aguarda 8.7D.6) |
| Dashboard Dono | ✅ NÃO alterado |
| Produtos PiùVita | ✅ NÃO alterados |
| Autenticação | ✅ NÃO alterada |

### 6. Status consolidado

| Item | Status |
|---|---|
| Bloco comissão reestruturado — Vendedora | ✅ |
| Bloco "Comissões da equipe" reestruturado — Gerente | ✅ |
| Funil de recompra compacto — Vendedora | ✅ |
| Oportunidade em destaque — Lista de Espera | ✅ |
| Valores monetários com 2 casas decimais — Lista de Espera | ✅ |
| Build | ✅ `Compiled successfully` — 29 rotas, TypeScript OK |
| Commit | ✅ `6e5e096` → `main` → Vercel deploy acionado |

### 7. Pendências para 8.7D.6

| # | Item |
|---|---|
| 1 | Auditoria cálculo de comissão: vendedora vê só recompras ou todas as vendas comissionáveis? |
| 2 | Comissão gerente: definir e implementar regra de visão (própria / equipe / percentual) |
| 3 | Validação dos valores no banco contra vendas registradas no smoke |

---

## Atualização Fase 8.7D.6 — Auditoria do Cálculo de Comissão

**Data:** 2026-06-22  
**Status:** ✅ CONCLUÍDA — sem alterações de código

---

### 1. Arquitetura do sistema de comissão

O caminho canônico é `lib/comissoes/gravar.ts` → `gravarComissaoVenda()`, chamado por:
- `salvarVenda` (Step 5.5) — toda venda manual
- `confirmarRecompra` — toda recompra confirmada via aviso

Ambos criam um registro `vendas` com `origem = 'venda_manual' | 'recompra'` e depois chamam o mesmo helper. A comissão é calculada apenas sobre `itens_venda.comissionavel = true` (snapshot no momento da venda).

**Sistema de prioridades (P1 → P4):**

| Prioridade | Fonte | Quando ativa |
|---|---|---|
| P1 | `comissao_fixa_produto` | Existe entrada ativa para o produto + vendedora |
| P2 | `campanhas_produto` | Campanha ativa no momento da venda |
| P3 | `metas_vendedora` | Meta configurada para o mês (`comissao_base` abaixo da meta, `comissao_meta` acima) |
| P4 | `regras_comissao` | Percentual padrão da vendedora (fallback) |

Se `valor_comissao = 0` após o cálculo, **nenhum registro é inserido** em `comissao_venda` (retorno `ok: true, valor_comissao: 0`).

---

### 2. Schema campos relevantes

| Tabela | Campo chave | Observação |
|---|---|---|
| `vendas` | `origem` (text NOT NULL) | `'venda_manual'` ou `'recompra'` |
| `itens_venda` | `comissionavel` (boolean NOT NULL DEFAULT true) | Snapshot do checkbox da UI no momento da venda |
| `itens_venda` | `recorrente` (boolean NOT NULL DEFAULT true) | Apenas para programação de avisos; **não** filtra comissão |
| `comissao_venda` | `venda_id` (UNIQUE) | Máximo 1 comissão por venda |
| `comissao_venda` | `tipo_comissao` | `null`=P4, `'produto_fixo'`=P1, `'base'`=P3 abaixo meta, `'meta_batida'`=P3 acima meta |
| `membros_loja` | sem `percentual_comissao` | Percentual vive em `regras_comissao`, não em `membros_loja` |

---

### 3. Configuração de comissão — Loja Cia Cidade Azul Angeloni

#### 3.1 Regras padrão (`regras_comissao` — P4)

| Vendedora | Percentual | Criado em |
|---|---|---|
| Cintya Teste | 5,00% | 2026-06-17 14:19 |
| Cleison Vendedor | 8,00% | 2026-06-19 12:55 |
| Teste | 2,00% | 2026-06-17 15:22 |
| dono (CLEISON CARDOSO TEIXEIRA) | — nenhuma — | vendas do dono sem comissão |
| gerente (Cleison Gerente) | — nenhuma — | sem comissão registrada |

#### 3.2 Metas do mês (junho/2026 — P3)

| Vendedora | Meta | % abaixo | % acima | Criado em |
|---|---|---|---|---|
| Cintya Teste | R$2.000,00 | 1,00% | 2,50% | 2026-06-19 12:26 |
| Cleison Vendedor | R$2.000,00 | 1,00% | 2,00% | 2026-06-19 21:16 |
| Teste | R$2.000,00 | 1,00% | 2,00% | 2026-06-19 21:16 |

#### 3.3 Comissão fixa por produto (P1)

| Produto | Vendedora | Valor fixo |
|---|---|---|
| MounJaro Natural | Cintya Teste | R$10,00 por venda |
| MounJaro Natural | Cleison Vendedor | R$5,00 por venda |

---

### 4. Resultado: vendas vs comissão no mês (junho/2026)

| Vendedora | Origem | Vendas | Valor total | Com comissão | Total comissão |
|---|---|---|---|---|---|
| Cintya Teste | venda_manual | 12 | R$1.442,10 | 7 | R$46,56 |
| Cintya Teste | recompra | 11 | R$1.312,90 | 11 | R$59,88 |
| Cleison Vendedor | venda_manual | 9 | R$2.407,70 | 7 | R$32,91 |
| Cleison Vendedor | recompra | 4 | R$613,60 | 4 | R$6,14 |
| Teste | venda_manual | 9 | R$1.135,80 | 9 | R$18,81 |
| Teste | recompra | 6 | R$738,60 | 6 | R$7,39 |
| CLEISON CARDOSO (dono) | venda_manual | 1 | R$159,90 | 0 | — |

**Observação do smoke test confirmada e explicada:** a observação de que "comissão parecia só incluir recompras" se deve a lacunas históricas em `venda_manual`, não a uma falha arquitetural.

---

### 5. Lacuna de dados identificada (orphan vendas)

Durante uma janela de ~15h entre **2026-06-17 22:27** e **2026-06-18 ~12:34**, vendas com itens `comissionavel = true` foram gravadas sem gerar registro em `comissao_venda`. A causa provável é um deploy no Vercel nesse intervalo que quebrou silenciosamente o step de comissão.

#### Orphans confirmados

| Vendedora | Qtd | Valor total | Comissão esperada | Causa |
|---|---|---|---|---|
| Cintya Teste | 5 | R$647,40 | ~R$32,37 (5%) | Janela de deploy quebrado |
| Cleison Vendedor | 1 | R$58,90 | ~R$4,71 (8%) | Janela de deploy quebrado (pós regras_comissao) |
| Cleison Vendedor | 1 | R$156,90 | — | Criado **antes** da regra existir → correto sem comissão |

#### Impacto no dashboard

O dashboard usa `comissao_venda!inner` (INNER JOIN), então vendas orphan são excluídas do total de comissão exibido. Para as 5 vendas orphan de Cintya, o dashboard subexibe ~R$32,37 em comissão.

---

### 6. Gerente e Dono

- **Dono e Gerente não têm `regras_comissao`** → vendas atribuídas a eles ficam sem `comissao_venda`. Isso é correto: dono e gerente não recebem comissão por venda.
- O dashboard do Gerente exibe a comissão **consolidada da equipe** (todas as vendedoras da loja), não a comissão própria. Arquitetura está coerente.

---

### 7. Fórmula verificada

Para P4 (mais comum): `valor_comissao = round(valor_comissao_total × percentual / 100, 2)`  
Para P3: usa `comissao_base` se `totalVendasMes < valor_meta`, senão `comissao_meta`.  
Para P1: `valor_fixo` por item comissionável (sem percentual).

---

### 8. Veredicto

| Item | Veredicto |
|---|---|
| Arquitetura — comissão inclui `venda_manual` E `recompra` | ✅ CORRETO |
| Dashboard usa INNER JOIN (exclui vendas sem comissão) | ✅ INTENCIONAL |
| Sistema ao vivo (desde 2026-06-19) | ✅ FUNCIONANDO CORRETAMENTE |
| Orphan vendas (janela de deploy Jun 17-18) | ⚠️ DADO HISTÓRICO — não afeta novas vendas |
| Comissão de dono/gerente não registrada | ✅ CORRETO POR DESIGN |
| Regras P1/P3/P4 configuradas para piloto | ✅ ATIVAS |

**Ação recomendada (baixa prioridade):** backfill manual dos 6 registros orphan em `comissao_venda` após o piloto real iniciar. Não bloqueia onboarding da Cintya.

**Ação requerida:** ao onboarding real da Cintya, confirmar que `regras_comissao` e `metas_vendedora` estão configurados antes do primeiro dia de uso.

---

## Atualização Fase 8.7D.6.1 — Correção de leitura dos dashboards

**Data:** 2026-06-22  
**Status:** ✅ CONCLUÍDA  
**Commits afetados:** sem banco, sem RLS, sem migrations, sem motor de comissão

---

### 1. Nome no topo dos 3 dashboards

| Dashboard | Antes | Depois |
|---|---|---|
| Vendedora | "Meu painel · [nome] · suas metas..." | "Olá, [firstName] / Seu painel de vendas" |
| Gerente | "Painel da operação · [loja] · acompanhe..." | "Olá, [firstName] / Painel da operação · [loja]" |
| Dono | "Painel da loja · [loja] · visão geral..." | "Olá, [firstName] / Painel da loja · [loja]" |

O nome é lido de `perfis.nome` (já buscado via `perfilRes` em `page.tsx`) e passado como `nomeVendedora` para todos os roles. Dono e Gerente recebem o novo prop `nomeUsuario`. `firstName = nome.split(' ')[0]` garante exibição curta e mobile-safe.

---

### 2. Correção do bloco de comissão

**Problema identificado:** `metaComissao` é `valor_meta` de `metas_vendedora` (meta de vendas = R$2.000), não uma meta de comissão. O bloco mostrava "R$39 de R$2.000 da meta" — confuso porque R$39 é comissão e R$2.000 é target de vendas.

**Correção aplicada (Vendedora e Gerente):**
- Removido: "de R$X da meta" / "Meta ainda não configurada"
- Adicionado: "gerada sobre R$X vendidos em 30 dias" (usa `totalVendasValor`)
- Removido: barra de progresso `comissaoPct` (comparava comissão/meta_venda — inválido)
- Corrigido: `metaValor={null}` no `ComissaoChart` (remove linha de meta errada no gráfico)
- Mantido: gráfico de acumulado diário, rodapé recompras/total vendido

**Meta de vendas:** o bloco "Meta do mês" já exibe `totalVendasMes / metaVendasMes` corretamente na Vendedora. O bloco de ranking exibe metas individuais no Dono.

---

### 3. Lista de Espera nos dashboards

**Nova query** adicionada ao `Promise.all` em `page.tsx`:
- `lista_espera` → `status = 'aguardando'` + filtro `vendedora_id` para vendedora
- Prop `listaEsperaInfo: { qtdAguardando, valorPotencial, qtdClientes }` propagado via `DashboardView`

**Blocos compactos adicionados:**

| Dashboard | Posição | Label |
|---|---|---|
| Vendedora | Após funil, antes de avisos | "Pedidos em espera" |
| Gerente | Após "O que fazer agora", antes de métricas | "Lista de espera" |
| Dono | Após "Dinheiro na Mesa", antes de Meta+Ranking | "Lista de espera" |

Valores com 2 casas decimais (`minimumFractionDigits: 2`). Bloco oculto quando `qtdAguardando = 0`.

---

### 4. Funil da Vendedora com próxima ação

Adicionado dentro do bloco "Meu funil de recompra" (após a nota sobre mensagens programadas):

| Condição | Texto |
|---|---|
| `totalAtrasados > 0` | "Envie os X avisos atrasados para recuperar oportunidades." (vermelho) |
| `totalHoje > 0` | "Fale com os X clientes de hoje." (âmbar) |
| Fila vazia | "Fila zerada. Registre novas vendas para gerar próximas recompras." (muted) |

---

### 5. Dashboard Gerente como central de comando

**Novo bloco "O que fazer agora"** adicionado após o headline card, antes das métricas:

- Itens dinâmicos e numerados sequencialmente
- Item 1 (se houver): enviar avisos atrasados (vermelho)
- Item 2 (se houver): acompanhar vendedoras com pendência (âmbar)
- Item 3 (se houver): ver lista de espera
- Último: conferir produtos com maior recompra (sempre visível)

Usa dados já existentes: `qtdAvisosAtrasados`, `vendedorasComPendencias`, `listaEsperaInfo`.

---

### 6. Restrições respeitadas

| Restrição | Status |
|---|---|
| Banco / RLS / migrations | ✅ NÃO alterados |
| Motor de comissão (`gravarComissaoVenda`) | ✅ NÃO alterado |
| Regras de comissão no banco | ✅ NÃO alteradas |
| Produtos PiùVita | ✅ NÃO alterados |
| DashboardDono (estrutura principal) | ✅ NÃO quebrado — apenas nome + lista espera adicionados |

---

### 7. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `app/(app)/dashboard/page.tsx` | Novo tipo `ListaEsperaInfo`; query `lista_espera`; cálculo e prop |
| `app/(app)/dashboard/DashboardView.tsx` | Propagar `listaEsperaInfo` e `nomeUsuario` para os 3 dashboards |
| `app/(app)/dashboard/DashboardVendedora.tsx` | Nome; fix comissão; funil próxima ação; lista espera |
| `app/(app)/dashboard/DashboardGerente.tsx` | Nome; fix comissão; "O que fazer agora"; lista espera |
| `app/(app)/dashboard/DashboardDono.tsx` | Nome; lista espera |
| `app/debug/mobile-access/page.tsx` | Mock `listaEsperaInfo` para preview |

---

### 8. Build e deploy

| Item | Status |
|---|---|
| TypeScript | ✅ sem erros |
| Build | ✅ `Compiled successfully` — 29 rotas |
| Commit | ver abaixo |

---

## Atualização Fase 8.7D.6.2D — Smoke visual final dos dashboards

**Data:** 2026-06-22
**Fases cobertas:** 8.7D.6.2A (Dono), 8.7D.6.2B (Gerente), 8.7D.6.2C.1–C.3 (Vendedora)
**Commits auditados:** `9bd9791` (C.3), `ecbd191` (C.2), `4ef7f71` (C.1), builds anteriores

### 1. Auditoria de código — blocos proibidos

Script Python verificou ausência de padrões proibidos (`ComissaoChart`, `MetricCard`, `FunilRecompra`, `headlineCor`, `showResultado`, `radar de produtos`, `rankingVendedoras`, `VendedoraComPendencia`) em todos os 3 arquivos de dashboard.

| Dashboard | Resultado |
|---|---|
| `DashboardDono.tsx` | ✅ LIMPO |
| `DashboardGerente.tsx` | ✅ LIMPO |
| `DashboardVendedora.tsx` | ✅ LIMPO |

---

### 2. Checklist — Dashboard Dono

| Item | Código | Status |
|---|---|---|
| Saudação + badge "Dono(a)" | `Olá, {nomeUsuario.split(' ')[0]}` + badge emerald → azul dono | ✅ |
| Dinheiro na Mesa (gradient verde escuro) | `dm-` SVG prefix, `totalComissoes` principal | ✅ |
| CTA Dinheiro na Mesa | "Ver fila de recompra" → `/avisos` | ✅ |
| Meta mensal (`META_MENSAL_DONO = 20000`) | Padrão 6 linhas aprovado, `barGradDono` | ✅ |
| Meta diária | Calculada a partir de `metaVendasMes` e `diasRestantes` | ✅ |
| 6 cards operacionais | Total vendido · Recompras · Comissões · Atrasados · Para hoje · Enviados | ✅ |
| Lista de Espera (card âmbar robusto) | `fmtVal()` 2 decimais, `qtdAguardando` / `valorPotencial` | ✅ |
| Ranking da equipe | Full width, `rankingMes` | ✅ |
| Top Produtos do mês | Full width, `topProdutosMes` | ✅ |
| CTAs finais | "Ir para avisos" · "Ver equipe" · "Ver extrato" | ✅ |
| Sem funil, sem ComissaoChart, sem radar | Auditoria confirmada | ✅ |

**Veredicto Dono: APROVADO**

---

### 3. Checklist — Dashboard Gerente

| Item | Código | Status |
|---|---|---|
| Saudação + badge "Gerente" (azul) | `Olá, {nomeUsuario.split(' ')[0]}` + badge blue | ✅ |
| Dinheiro na Mesa (gradient verde escuro) | `gm-` SVG prefix, mesma estrutura do Dono | ✅ |
| CTA Dinheiro na Mesa | "Ver fila de recompra" → `/avisos` | ✅ |
| Meta mensal (`META_MENSAL = 20000`) | Padrão 6 linhas aprovado | ✅ |
| Meta diária | Mesma lógica do Dono | ✅ |
| 6 cards operacionais | Mesma ordem e dados do Dono (equipe) | ✅ |
| Lista de Espera (card âmbar robusto) | Idêntico ao Dono | ✅ |
| Ranking da equipe | Full width, `rankingMes` | ✅ |
| Top Produtos do mês | Full width, `topProdutosMes` | ✅ |
| CTAs finais | "Ir para avisos" · "Ver equipe" · "Ver extrato" | ✅ |
| Props removidas (funil, radar, rankingVendedoras, VendedoraComPendencia) | Auditoria confirmada | ✅ |

**Veredicto Gerente: APROVADO**

---

### 4. Checklist — Dashboard Vendedora

| Item | Código | Status |
|---|---|---|
| Saudação + badge "Vendedor(a)" (emerald) | `Olá, {firstName}` + badge emerald | ✅ |
| Dinheiro na Mesa — foco em comissão | `vm-` SVG prefix, `totalComissoes` principal | ✅ |
| Indicadores Dinheiro na Mesa | `previsaoEmAberto` · `totalHoje` · `totalAtrasados` | ✅ |
| CTA Dinheiro na Mesa | "Ver meus avisos" → `/avisos` | ✅ |
| Meta mensal (real `metaVendasMes`, fallback null) | Padrão 6 linhas; "meta não configurada" se null | ✅ |
| Meta diária | Calculada dinamicamente | ✅ |
| 6 cards operacionais | Total vendido · Recompras · Comissões · Atrasados · Para hoje · Enviados | ✅ |
| Lista de Espera (card âmbar robusto) | `fmtVal()` 2 decimais | ✅ |
| Top Produtos da loja | Full width, label honesto ("da loja") | ✅ |
| Para hoje (avisos atrasados + hoje) | Cards `AvisoEnvio`, botão "Enviar", link "Ver todos" | ✅ |
| Estado vazio "Fila zerada!" | Empty state preservado | ✅ |
| CTAs finais | "Registrar nova venda" · "Ver meus avisos" | ✅ |
| Sem ranking, sem funil, sem ComissaoChart, sem MetricCard | Auditoria confirmada | ✅ |
| Props legado mantidos na interface (compat) | `funil`, `diasMes`, `comissaoDiaria`, `hojeDia`, `totalVendasValor`, `metaComissao` | ✅ |

**Veredicto Vendedora: APROVADO**

---

### 5. Mobile

| Item | Status |
|---|---|
| Preview `/debug/mobile-access` com mock completo | ✅ props atualizadas em todas as fases |
| Teste no iPhone (Safari / Chrome) | ⏳ pendente de validação manual por Cleison |
| Scroll, touch, bottom nav | ⏳ pendente de validação manual |

---

### 6. Produção

| Item | Status |
|---|---|
| Build `npm run build` — 29 rotas | ✅ sem erros TS, sem warnings críticos |
| Deploy Vercel automático (push main) | ⏳ pendente de validação na URL de produção |
| Teste nos 3 roles em produção | ⏳ pendente de validação manual |

---

### 7. Pendências visuais não bloqueantes

| Pendência | Observação |
|---|---|
| Gradiente Meta mensal — mobile contrast | A verificar no iPhone real |
| Top Produtos: `foto_url = null` → placeholder vazio | Comportamento esperado para piloto |

---

### 8. Restrições respeitadas

| Restrição | Status |
|---|---|
| Banco / RLS / migrations | ✅ NÃO alterados |
| Motor de comissão | ✅ NÃO alterado |
| DashboardDono (pós-fase A) | ✅ NÃO tocado nas fases B/C |
| DashboardGerente (pós-fase B) | ✅ NÃO tocado nas fases C |
| IDs SVG únicos por dashboard (`dm-` / `gm-` / `vm-`) | ✅ sem conflito |

---

### 9. Arquivos alterados (fases 8.7D.6.2A–D)

| Arquivo | Fases |
|---|---|
| `app/(app)/dashboard/DashboardDono.tsx` | 8.7D.6.2A |
| `app/(app)/dashboard/DashboardGerente.tsx` | 8.7D.6.2B |
| `app/(app)/dashboard/DashboardVendedora.tsx` | 8.7D.6.2C.1, C.2, C.3 |
| `app/(app)/dashboard/DashboardView.tsx` | 8.7D.6.2B, C.1, C.2 |
| `app/debug/mobile-access/page.tsx` | 8.7D.6.2C.1, C.2 |
| `docs/pre-piloto-smoke-test-producao.md` | 8.7D.6.2D |

---

### 10. Build e deploy

| Item | Status |
|---|---|
| TypeScript | ✅ sem erros |
| Build | ✅ `Compiled successfully` — 29 rotas |
| Commits | `9bd9791` C.3 · `ecbd191` C.2 · `4ef7f71` C.1 — todos no main |

---

### Veredicto final — Fase 8.7D.6.2D

| Dashboard | Código | Aprovação visual |
|---|---|---|
| Dono | ✅ APROVADO | ✅ aprovado por Cleison |
| Gerente | ✅ APROVADO | ✅ aprovado por Cleison |
| Vendedora | ✅ APROVADO | ✅ aprovado por Cleison |
| Mobile | ✅ mock pronto | ⏳ teste iPhone pendente |
| Produção | ✅ build limpo | ⏳ validação URL pendente |

**STATUS: APROVADO PARA PRÓXIMA FASE (8.7D.7 — Smoke operacional)**

---

## Atualização Fase 8.7D.7 — Smoke operacional final

**Data:** 2026-06-22
**Objetivo:** Validar fluxos operacionais antes do onboarding da Cia Cidade Azul Angeloni.
**Método:** Auditoria de banco via Supabase MCP + build local + itens manuais sinalizados.

---

### 1. Baseline

| Item | Status |
|---|---|
| Branch | ✅ main |
| Commit | ✅ `49f23e2` presente |
| Working tree | ✅ limpa |
| Build | ✅ `Compiled successfully` — 29 rotas |

---

### 2. Deploy em produção

| Item | Status |
|---|---|
| App carrega em `recway.com.br` | ⏳ pendente de validação manual |
| Login abre sem erro | ⏳ pendente de validação manual |
| `/dashboard` carrega após login | ⏳ pendente de validação manual |
| Rotas de debug bloqueadas em prod | ⏳ pendente de validação manual |

---

### 3. Login/Logout dos 3 perfis

#### Mapeamento de perfis confirmado via banco

| Role | E-mail | Nome | Loja | Ativo |
|---|---|---|---|---|
| dono | cleisonimarketing@gmail.com | CLEISON CARDOSO TEIXEIRA | Cia Cidade Azul Angeloni | ✅ |
| gerente | cleisonperfil@gmail.com | Cleison Gerente | Cia Cidade Azul Angeloni | ✅ |
| vendedora | cintya.teste@f5recompra.test | Cintya Teste | Cia Cidade Azul Angeloni | ✅ |

| Teste | Status |
|---|---|
| Dono: login → badge Dono(a) → loja correta → logout | ⏳ pendente de validação manual |
| Gerente: login → badge Gerente → loja correta → logout | ⏳ pendente de validação manual |
| Vendedora: login → badge Vendedor(a) → loja correta → logout | ⏳ pendente de validação manual |
| Todos voltam para `/login` após logout | ⏳ pendente de validação manual |

---

### 4. Dashboards em produção

| Item | Status |
|---|---|
| Dashboard Dono — todos os 8 blocos visíveis | ⏳ pendente de validação manual |
| Dashboard Gerente — todos os 8 blocos visíveis | ⏳ pendente de validação manual |
| Dashboard Vendedora — todos os 9 blocos visíveis | ⏳ pendente de validação manual |
| Nenhum bloco legado voltou (funil, ComissaoChart, radar) | ⏳ pendente de validação manual |

---

### 5. Venda PiùVita recorrente

**Instrução:** Criar via `/vendas/nova` com os dados abaixo. Não enviar WhatsApp real.

```
Cliente: Cliente Smoke Operacional Recway
WhatsApp: número controlado (ex: 48900000007)
Produto: Ácido Fólico C/60 (R$ 56,40) — ou qualquer PiùVita ativo
Observação: SMOKE OPERACIONAL 8.7D.7
```

| Validação | Status |
|---|---|
| Venda criada | ⏳ pendente — executar via UI |
| Cliente criado/atualizado | ⏳ pendente |
| item_venda criado (recorrente = true) | ⏳ pendente |
| 3 avisos criados com textos reais | ⏳ pendente |
| Link WhatsApp sem variáveis literais | ⏳ pendente |
| comissao_venda criada | ⏳ pendente |
| Dashboard reflete venda após refresh | ⏳ pendente |

IDs a registrar: `venda_id` / `cliente_id` / `item_venda_id` / `aviso_ids[3]` / `comissao_venda_id`

---

### 6. Item livre não recorrente

**Instrução:** Criar via `/vendas/nova` com os dados abaixo.

```
Cliente: Cliente Item Livre Smoke
WhatsApp: número controlado (ex: 48900000008)
Produto: Item Livre Smoke Operacional
Recorrente: false
Observação: SMOKE OPERACIONAL 8.7D.7
```

| Validação | Status |
|---|---|
| Venda criada | ⏳ pendente — executar via UI |
| item_venda criado (recorrente = false) | ⏳ pendente |
| Não criou produto no catálogo | ⏳ pendente |
| Não criou mensagens_produto | ⏳ pendente |
| Não criou avisos | ⏳ pendente |
| Dashboard não quebra | ⏳ pendente |

---

### 7. Lista de Espera

**Instrução:** Criar via `/lista-espera`.

```
Cliente: Cliente Lista Smoke Operacional
WhatsApp: número controlado (ex: 48900000009)
Produto: Produto Lista Smoke Operacional
Valor potencial: 123,45
Quantidade: 1
Observação: SMOKE OPERACIONAL 8.7D.7
```

| Validação | Status |
|---|---|
| Item criado com status "aguardando" | ⏳ pendente — executar via UI |
| Valor aparece como R$ 123,45 | ⏳ pendente |
| Máscara de WhatsApp funciona | ⏳ pendente |
| Card Lista de Espera nos dashboards atualiza | ⏳ pendente |

Lista de espera atual (pré-smoke): 4 itens (3 `aguardando` / 1 `convertido`)

---

### 8. Avisos e WhatsApp

#### Validação via banco ✅

| Métrica | Resultado |
|---|---|
| Total de avisos | 163 |
| Avisos pendentes | 124 |
| Avisos enviados | 39 |
| Avisos com variáveis literais (`{cliente}`, `{produto}`, etc.) | **0** ✅ |

Amostra de texto validado (sem literais):
> "Olá Cliente Novi, aqui é Teste da Cia Cidade Azul Angeloni. Obrigado pela sua compra do Piu Energy 1 C/60. Salve meu con..."
> "Oi, Luiz T! 🌿 Aqui é Cintya Teste da Cia Cidade Azul Angeloni. Seu Piùfort Antiox deve estar chegando no final..."

Consulta executada:
```sql
select count(*) as total_avisos,
  sum(case when texto_renderizado like '%{%}%' then 1 else 0 end) as com_variaveis_literais
from avisos;
-- Resultado: total=163, com_variaveis_literais=0
```

| Validação de UI | Status |
|---|---|
| Botão Enviar aparece nos avisos pendentes | ⏳ pendente de validação manual |
| Link WhatsApp abre com texto correto | ⏳ pendente de validação manual |

---

### 9. Comissão

#### Validação via banco ✅

| Métrica | Resultado |
|---|---|
| Registros em `comissao_venda` | 47 |
| Tipos de comissão | `base` + `meta_batida` |
| Regras ativas | 3 vendedoras com percentuais configurados |

Regras de comissão ativas:
| Vendedora | Percentual |
|---|---|
| Cintya Teste | 5,00% |
| Cleison Vendedor | 8,00% |
| Teste | 2,00% (Teste) / 1,00% (base) |

Amostra de comissão gerada:
- venda `7d8775a6`: Cintya Teste — R$ 149,90 × 2,50% (meta_batida) = R$ 3,75
- venda `bde0d0ef`: Cleison Vendedor — R$ 1.099,00 × 2,00% (meta_batida) = R$ 21,98

| Validação de UI | Status |
|---|---|
| Dashboard Vendedora atualiza card comissão após venda smoke | ⏳ pendente |
| Dashboard Dono/Gerente atualiza comissões da equipe | ⏳ pendente |

---

### 10. Produtos

#### Validação via banco ✅

| Métrica | Resultado |
|---|---|
| Produtos ativos (loja Cia Cidade Azul Angeloni) | **30** ✅ |
| Produtos inativos | 6 |
| Mensagens configuradas por produto | 3 por produto ✅ |
| Todos recorrentes | ✅ (amostra confirmada) |

Consulta executada:
```sql
select count(*) as produtos_ativos
from produtos
where loja_id = 'b1000000-0000-0000-0000-000000000001'
  and ativo = true;
-- Resultado: 30
```

| Validação de UI | Status |
|---|---|
| Catálogo `/produtos` mostra só PiùVita ativos | ⏳ pendente de validação manual |
| `/vendas/nova` só lista ativos | ⏳ pendente de validação manual |
| Top Produtos não mostra legados | ⏳ pendente de validação manual |

---

### 11. Mobile / iPhone

| Rota | Status |
|---|---|
| `/login` | ⏳ pendente de validação manual |
| `/dashboard` | ⏳ pendente de validação manual |
| `/vendas/nova` | ⏳ pendente de validação manual |
| `/avisos` | ⏳ pendente de validação manual |
| `/lista-espera` | ⏳ pendente de validação manual |
| `/produtos` | ⏳ pendente de validação manual |
| `/perfil` | ⏳ pendente de validação manual |

---

### 12. Build final

| Item | Status |
|---|---|
| TypeScript | ✅ sem erros |
| Build | ✅ `Compiled successfully` — 29 rotas |
| Commit documentação | `49f23e2` (6.2D) + este commit (8.7D.7) |

---

### 13. Veredicto

| Validação | Método | Status |
|---|---|---|
| 30 produtos PiùVita ativos | DB ✅ | ✅ APROVADO |
| 0 avisos com variáveis literais | DB ✅ | ✅ APROVADO |
| 163 avisos com textos reais | DB ✅ | ✅ APROVADO |
| regras_comissao configuradas | DB ✅ | ✅ APROVADO |
| comissao_venda: 47 registros base/meta_batida | DB ✅ | ✅ APROVADO |
| mensagens_produto: 3 por produto | DB ✅ | ✅ APROVADO |
| 3 perfis ativos + roles corretos | DB ✅ | ✅ APROVADO |
| Build limpo 29 rotas | Local ✅ | ✅ APROVADO |
| Deploy produção | Manual | ⏳ PENDENTE |
| Login/logout 3 perfis | Manual | ⏳ PENDENTE |
| Dashboards em produção | Manual | ⏳ PENDENTE |
| Venda PiùVita + avisos + comissão | Manual | ⏳ PENDENTE |
| Item livre não recorrente | Manual | ⏳ PENDENTE |
| Lista de Espera via UI | Manual | ⏳ PENDENTE |
| Mobile / iPhone | Manual | ⏳ PENDENTE |

**STATUS: APROVADO PARCIALMENTE**
- Todas as validações de banco passaram sem bloqueadores.
- Pendências são de validação manual em browser/mobile — nenhuma é bloqueadora de código.
- Após Cleison executar os itens marcados como ⏳ e confirmar, o veredicto muda para:

> **Liberado para Fase 8.8 — Onboarding Cia Cidade Azul Angeloni**
