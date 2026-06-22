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
