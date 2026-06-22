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
