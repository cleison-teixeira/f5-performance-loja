# Recway — Configuração de Ambiente de Produção · Pré-Piloto

**Data:** 2026-06-21  
**Fase:** 8.7C  
**Responsável:** Cleison  
**Status:** PARCIALMENTE CONCLUÍDO — DNS e Supabase Auth pendentes de ação manual

---

## 1. Build e Git

| Item | Status |
|---|---|
| Branch | `main` |
| Último commit | `87634b9` — fix(fase8.7b): harden pre-production branding and debug routes |
| Working tree | Limpa |
| Build local | ✅ TypeScript sem erros, 29 rotas geradas |

---

## 2. Vercel — Projeto

| Item | Status |
|---|---|
| Projeto criado | ✅ `recway` |
| Conta | `cleisonimarketing-9770s-projects` |
| Project ID | `prj_mkDpYeTbIpXzX35U79m3Kz84ubPl` |
| Repo vinculado | ✅ `github.com/cleison-teixeira/f5-performance-loja` |
| Branch de produção | `main` |
| Framework | Next.js (auto-detectado) |

---

## 3. Vercel — Env Vars (Production)

| Variável | Configurada | Ambiente | Observação |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Production | Valor do `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Production | Valor do `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Production | Valor do `.env.local` — server-only |
| `NEXT_PUBLIC_WHATSAPP_TEST_MODE` | ✅ `false` | Production | Modo teste desligado |
| `NEXT_PUBLIC_WHATSAPP_TEST_PHONE` | ✅ não configurada | Production | Vazia em produção — correto |
| `DEBUG_DEV_EMAIL` | ✅ não configurada | — | Não deve existir em produção |
| `DEBUG_DEV_PASSWORD` | ✅ não configurada | — | Não deve existir em produção |

> Valores não expostos neste documento. Verificar painel Vercel → Project → Settings → Environment Variables.

---

## 4. Vercel — Deploy

| Item | Status |
|---|---|
| Deploy acionado | ✅ `2026-06-21` |
| Branch | `main` |
| Status | ✅ `READY` |
| Deployment ID | `dpl_5ZqE8sgKNvbDmUafvFx2Epo4u3bR` |
| URL de produção Vercel | `https://recway.vercel.app` |
| URL de inspeção | `https://vercel.com/cleisonimarketing-9770s-projects/recway/5ZqE8sgKNvbDmUafvFx2Epo4u3bR` |
| Build no servidor | ✅ TypeScript OK, 29 rotas |

---

## 5. Vercel — Domínios

| Domínio | Adicionado ao projeto | DNS | SSL |
|---|---|---|---|
| `recway.com.br` | ✅ | ⏳ Pendente — configurar no registrador | ⏳ Aguarda DNS |
| `www.recway.com.br` | ✅ | ⏳ Pendente — configurar no registrador | ⏳ Aguarda DNS |

### Ação necessária: configurar DNS no registrador de `recway.com.br`

Adicionar os seguintes registros A no painel do registrador do domínio:

```
Tipo   Host                 Valor            TTL
A      recway.com.br        76.76.21.21      auto/300
A      www.recway.com.br    76.76.21.21      auto/300
```

> **Alternativa:** Apontar os nameservers para `ns1.vercel-dns.com` e `ns2.vercel-dns.com` — neste caso a Vercel gerencia o DNS completo do domínio.

Após propagação DNS (~5 min a 48h dependendo do registrador), a Vercel provisiona SSL automaticamente.

### Domínio canônico recomendado

- Canônico: `https://recway.com.br` (raiz)
- `www.recway.com.br` → redireciona para `recway.com.br`

**Ação manual**: no painel Vercel → Project `recway` → Settings → Domains → definir `recway.com.br` como domínio primário e configurar redirect do `www`.

---

## 6. Supabase Auth — Pendente de Ação Manual

O MCP Supabase não expõe endpoint de configuração de Auth. As URLs devem ser configuradas manualmente no painel Supabase.

**Painel:** `https://supabase.com/dashboard/project/nhcppfovsxcsulyvwvgs/auth/url-configuration`

### Site URL

```
https://recway.com.br
```

### Redirect URLs (adicionar todas)

```
https://recway.com.br/api/auth/callback
https://www.recway.com.br/api/auth/callback
https://recway.vercel.app/api/auth/callback
http://localhost:3000/api/auth/callback
```

> Não remover `localhost:3000` — necessário para desenvolvimento local.  
> Não remover `recway.vercel.app` até o domínio customizado estar estável.

---

## 7. WhatsApp Test Mode — Validação

| Item | Status |
|---|---|
| `NEXT_PUBLIC_WHATSAPP_TEST_MODE` em Production | `false` ✅ |
| `NEXT_PUBLIC_WHATSAPP_TEST_PHONE` em Production | não configurada ✅ |
| Risco de redirecionamento indevido | ✅ eliminado em produção |

Links de WhatsApp vão para o número real do cliente em produção.

---

## 8. Rotas de Debug — Validação em Produção

| Rota | Proteção | Comportamento esperado em produção |
|---|---|---|
| `/debug/auth` | `notFound()` quando `NODE_ENV !== 'development'` | Retorna 404 |
| `/debug/logout` | `Response 404` quando `NODE_ENV !== 'development'` | Retorna `{"error":"Not found"}` com status 404 |
| `/debug/mobile-login` | `notFound()` quando `NODE_ENV !== 'development'` | Retorna 404 |

> **Validação manual pendente:** acessar `https://recway.vercel.app/debug/auth` e confirmar 404.

---

## 9. Validações Manuais Pendentes

### 9.1 Browser (executar após DNS propagar)

- [ ] `https://recway.com.br` abre e carrega app Recway
- [ ] `https://www.recway.com.br` redireciona para `recway.com.br`
- [ ] SSL ativo (cadeado verde)
- [ ] `/login` carrega com branding Recway (sem "Admin F5", sem "F5 Recompra")
- [ ] `/debug/auth` retorna 404 em produção
- [ ] `/debug/logout` retorna 404 em produção

### 9.2 Login real (executar com usuário dono/admin)

- [ ] Login com credenciais funciona em `https://recway.vercel.app` (já disponível)
- [ ] Redireciona para dashboard após login
- [ ] Dashboard carrega com loja correta
- [ ] Logout funciona pelo fluxo normal do app

---

## 10. Pendências antes do Smoke Test

### Crítico (bloqueia smoke test)

| # | Pendência | Ação |
|---|---|---|
| 1 | **DNS não propagado** | Configurar registros A no registrador de `recway.com.br` |
| 2 | **Supabase Auth Site URL** | Configurar `https://recway.com.br` no painel Supabase |
| 3 | **Supabase Auth Redirect URLs** | Adicionar 4 URLs no painel Supabase |

### Importante (antes do go-live com lojista)

| # | Pendência | Ação |
|---|---|---|
| 4 | **www redirect** | Configurar no painel Vercel: www → recway.com.br |
| 5 | **Validação browser** | Acessar URLs e confirmar comportamento (Seção 9.1) |
| 6 | **Login real** | Testar login com usuário dono em produção (Seção 9.2) |
| 7 | **Favicon/logotipo** | Enviar asset oficial Recway para aplicar como favicon |

---

## 11. Recomendação — Próximos Passos

```
Agora:
1. Configurar DNS no registrador do recway.com.br (A → 76.76.21.21)
2. Configurar Supabase Auth Site URL e Redirect URLs no painel Supabase

Após DNS propagar:
3. Validar browser: https://recway.com.br
4. Configurar www redirect no painel Vercel
5. Testar login real com usuário dono

Fase 8.7D — Smoke test completo com os 3 perfis (Dono, Gerente, Vendedora)
```

---

*Documento gerado na Fase 8.7C. Ações de DNS e Supabase Auth requerem acesso manual ao registrador e ao painel Supabase.*
