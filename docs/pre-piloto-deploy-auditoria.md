# Recway — Auditoria de Deploy e Ambiente · Pré-Piloto

**Data:** 2026-06-21  
**Fase:** 8.7A  
**Responsável:** Cleison  
**Status:** RASCUNHO — revisar antes de liberar para lojista

---

## 1. Resumo da Fase 8.6 (base para este pré-piloto)

| Item | Status |
|---|---|
| Catálogo completo PiùVita aplicado | ✅ 30 produtos oficiais ativos |
| Mensagens configuradas | ✅ 90 mensagens totais |
| Piùfort Antiox normalizado | ✅ variáveis e ciclos corrigidos |
| Variáveis antigas removidas das mensagens | ✅ zero `{cliente}` bare no catálogo |
| Dica de variáveis na UI corrigida | ✅ commit `71ac843` |
| "Creatina Teste" desativada | ✅ histórico preservado |
| Build local | ✅ limpo |
| Working tree | ✅ limpa |

---

## 2. Git e Build

| Item | Status |
|---|---|
| Branch | `main` |
| Último commit relevante | `71ac843` — fix(fase8.6g): correct variable hints |
| Working tree | limpa |
| Build local | ✅ sem erros TypeScript |

---

## 3. Variáveis de Ambiente

### 3.1 Arquivo `.env.example` (modelo público)

| Variável | Presente no exemplo | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Chave anônima para chamadas client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave de serviço para server actions (RLS bypass) |
| `NEXT_PUBLIC_WHATSAPP_TEST_MODE` | ✅ | Redireciona todos os links WA para número fixo |
| `NEXT_PUBLIC_WHATSAPP_TEST_PHONE` | ✅ | Número destino quando test mode ativo |

### 3.2 Arquivo `.env.local` (desenvolvimento local)

| Variável | Presente | Risco em produção |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — (deve estar em produção também) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Não expor no client; usado apenas em server |
| `NEXT_PUBLIC_WHATSAPP_TEST_MODE` | ✅ (presente) | **Ver Seção 4** |
| `NEXT_PUBLIC_WHATSAPP_TEST_PHONE` | ✅ (presente) | **Ver Seção 4** |
| `DEBUG_DEV_EMAIL` | Não configurado | Risco baixo — rota bloqueada por `NODE_ENV !== 'development'` |
| `DEBUG_DEV_PASSWORD` | Não configurado | Risco baixo — idem |

> **Nota:** Valores não expostos neste documento por segurança. Verificar `.env.local` localmente.

---

## 4. WhatsApp Test Mode — Risco Crítico

### Como funciona

Arquivo: `lib/whatsapp/link.ts`

```ts
const TEST_MODE = process.env.NEXT_PUBLIC_WHATSAPP_TEST_MODE === 'true'
const TEST_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_TEST_PHONE ?? ''

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const destino = TEST_MODE && TEST_PHONE
    ? TEST_PHONE.replace(/\D/g, '')
    : `55${telefone.replace(/\D/g, '')}`
  // ...
}
```

### Risco

Se `NEXT_PUBLIC_WHATSAPP_TEST_MODE=true` estiver configurado na Vercel em produção, **todos os links de WhatsApp de todos os clientes serão redirecionados para o número de teste**. A vendedora clicaria "Enviar" achando que enviou para o cliente, mas a mensagem iria para outro número.

### Status local

- `NEXT_PUBLIC_WHATSAPP_TEST_MODE` está presente no `.env.local`.
- Valor não verificado aqui por segurança.
- **Verificar manualmente**: se o valor for `true`, risco ativo em desenvolvimento local mas **não em produção** (variável não está na Vercel ainda).

### Recomendação para Vercel Production

| Variável | Valor obrigatório em produção |
|---|---|
| `NEXT_PUBLIC_WHATSAPP_TEST_MODE` | **vazio** ou `false` |
| `NEXT_PUBLIC_WHATSAPP_TEST_PHONE` | **vazio** |
| `DEBUG_DEV_EMAIL` | **não configurar** |
| `DEBUG_DEV_PASSWORD` | **não configurar** |

---

## 5. Rotas de Debug

| Rota | Proteção | Risco em produção |
|---|---|---|
| `/debug/mobile-login` | `NODE_ENV !== 'development'` → retorna 404 | ✅ segura em produção |
| `/debug/auth` | Sem proteção de NODE_ENV | ⚠️ visível em produção — apenas informação de diagnóstico, sem ação destrutiva |
| `/debug/logout` | Sem verificação | ⚠️ pode deslogar usuário se acessada |
| `/debug/mobile-access` | Não verificado | Verificar antes do pré-piloto |

**Recomendação:** Verificar `/debug/auth`, `/debug/logout` e `/debug/mobile-access` antes do go-live público. Considerar proteger com verificação de `NODE_ENV` ou remover.

---

## 6. Supabase Auth — Checklist

### Callback usado no app

Arquivo: `app/(auth)/recuperar-senha/RecuperarSenhaForm.tsx`

```ts
redirectTo = window.location.origin + '/api/auth/callback?next=/atualizar-senha'
```

Rota de callback: `app/api/auth/callback/`

### Checklist a configurar no painel Supabase Auth

| Item | Ação |
|---|---|
| **Site URL** | Definir como `https://recway.com.br` (ou domínio definitivo) |
| **Redirect URLs permitidas** | Adicionar: `https://recway.com.br/api/auth/callback` |
| | Adicionar: `http://localhost:3000/api/auth/callback` (dev) |
| | Adicionar: `https://*.vercel.app/api/auth/callback` (preview, opcional) |
| **Email Confirm** | Verificar se está ativo para novos usuários |
| **Magic Link** | Verificar se está habilitado ou desabilitado conforme decisão |

> **Status atual:** não verificado no painel Supabase. Verificar antes do pré-piloto.

---

## 7. Vercel — Checklist

### Checklist de configuração

| Item | Status | Ação |
|---|---|---|
| Projeto Vercel criado | A verificar | Confirmar nome do projeto |
| Branch de produção | `main` (padrão) | Confirmar no painel |
| Framework detectado | Next.js | Automático |
| Build command | `npm run build` | Padrão |
| Output directory | `.next` | Padrão Next.js |
| **Env vars em produção** | A configurar | Ver Seção 3 |
| `NEXT_PUBLIC_SUPABASE_URL` | A configurar | Obrigatório |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A configurar | Obrigatório |
| `SUPABASE_SERVICE_ROLE_KEY` | A configurar | Obrigatório (server-only) |
| `NEXT_PUBLIC_WHATSAPP_TEST_MODE` | `false` ou vazio | **Crítico** |
| `NEXT_PUBLIC_WHATSAPP_TEST_PHONE` | vazio | **Crítico** |
| Domínio `recway.com.br` | A conectar | Verificar DNS |
| `www.recway.com.br` | Redirect para raiz | Configurar no Vercel |
| SSL | Automático no Vercel | Verificar após conectar domínio |
| Último deploy sem erro | A verificar | Confirmar após deploy |

---

## 8. Domínio e Branding

### Referências hardcoded encontradas

| Ocorrência | Arquivo | Tipo | Risco |
|---|---|---|---|
| `"name": "f5-recompra-temp"` | `package.json` | nome interno do pacote | Baixo — não aparece para usuário |
| `admin_f5` como role | vários arquivos | role de sistema interno | Baixo — não exibido ao usuário final |
| `'Admin F5'` label | `TabelaEquipe.tsx` | Label do role admin | **Médio** — visível na tela de equipe para dono/gerente |
| `vercel.svg` | `public/` | asset padrão Next.js | Baixo — não usado no app |

### Branding Recway — Status

| Elemento | Status |
|---|---|
| `<title>Recway</title>` (metadata) | ✅ `app/layout.tsx` |
| Description: "Performance de Loja..." | ✅ `app/layout.tsx` |
| Header mobile "Recway" | ✅ `Header.tsx` |
| Sidebar desktop "Recway" | ✅ `Sidebar.tsx` |
| Auth layout "Recway / Performance de Loja" | ✅ `(auth)/layout.tsx` |
| Sidebar item "Academia Recway" | ✅ `Sidebar.tsx` |
| **Favicon/logotipo customizado** | ⚠️ **Pendente** — apenas assets padrão Next.js em `public/` |
| **Label "Admin F5"** em TabelaEquipe | ⚠️ Residual — visível para dono/gerente na tela de equipe |

---

## 9. Rotas Críticas — Status

| Rota | Existe | Observação |
|---|---|---|
| `/login` | ✅ | `(auth)/login` |
| `/dashboard` | ✅ | DashboardVendedora + DashboardDono por role |
| `/vendas/nova` | ✅ | FormNovaVenda com 30 produtos PiùVita |
| `/avisos` | ✅ | Fila de hoje + atrasados |
| `/recompras` | ⚠️ | Não existe como rota separada — coberto por `/comissoes` |
| `/lista-espera` | ✅ | |
| `/clientes` | ✅ | |
| `/produtos` | ✅ | Lista 30 produtos PiùVita |
| `/metas` | ✅ | |
| `/configuracoes` | ✅ | Rota index (redireciona ou agrupa) |
| `/configuracoes/produtos` | ✅ | ListaProdutos com variáveis corrigidas |
| `/configuracoes/comissoes` | ✅ | |
| `/configuracoes/equipe` | ✅ | |
| `/configuracoes/loja` | ✅ | |
| `/treinamentos` | ✅ | |
| `/perfil` | ✅ | |
| `/campanhas` | ⚠️ | Diretório existe mas não aparece no sidebar — provavelmente stub |

---

## 10. Contas para Smoke Test (Pré-Piloto)

Três perfis precisam estar prontos e validados antes de liberar para o lojista:

| Perfil | Role | Escopo |
|---|---|---|
| **Dono** | `dono` | Dashboard completo, metas, equipe, produtos, comissões, todos relatórios |
| **Gerente** | `gerente` | Idem dono, exceto configurações de loja |
| **Vendedora** | `vendedora` | Dashboard vendedora, venda rápida, avisos, recompras, perfil |

### Checklist por perfil (executar após configurar produção)

- [ ] Login com credenciais
- [ ] Dashboard carrega sem erro
- [ ] Registrar venda com produto PiùVita
- [ ] Avisos gerados automaticamente
- [ ] Link WhatsApp abre com número real do cliente (não número de teste)
- [ ] Marcar aviso como enviado
- [ ] Verificar recompras
- [ ] Lista de espera funciona
- [ ] Clientes carregam
- [ ] Produtos PiùVita aparecem (30 ativos)
- [ ] Metas carregam
- [ ] Perfil carrega
- [ ] Para dono/gerente: configuracoes/produtos mostra variáveis corretas

---

## 11. Pendências antes de liberar para o lojista

### Crítico (bloqueia go-live)

| # | Pendência | Ação |
|---|---|---|
| 1 | **Env vars na Vercel não configuradas** | Configurar `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` em produção |
| 2 | **`NEXT_PUBLIC_WHATSAPP_TEST_MODE` deve ser `false` na Vercel** | Confirmar/configurar antes do deploy |
| 3 | **Supabase Auth: Site URL e Redirect URLs** | Configurar no painel Supabase com domínio definitivo |
| 4 | **Domínio `recway.com.br` conectado na Vercel** | Verificar DNS e conectar |

### Importante (corrigir em breve)

| # | Pendência | Ação |
|---|---|---|
| 5 | **Favicon/logotipo** — apenas assets padrão Next.js | Adicionar `favicon.ico` e `apple-icon.png` com logo Recway |
| 6 | **Label "Admin F5"** em `TabelaEquipe.tsx` | Trocar por "Admin Recway" |
| 7 | **Rotas `/debug/*`** — `debug/auth` e `debug/logout` sem proteção NODE_ENV | Proteger ou remover antes de pré-piloto público |
| 8 | **`package.json` name `"f5-recompra-temp"`** | Renomear para `"recway"` (cosmético, não crítico) |

### Baixo (pós-pré-piloto)

| # | Pendência | Ação |
|---|---|---|
| 9 | `/campanhas` stub no código | Verificar se tela existe ou remover diretório |
| 10 | `/recompras` não existe como rota separada | Confirmar se é o comportamento esperado |
| 11 | Fotos CDN `images.tcdn.com.br` para 7 produtos antigos | Verificar se URLs ainda servem imagens |

---

## 12. Recomendação de Próximos Passos

```
Fase 8.7B — Configurar variáveis na Vercel e Supabase Auth
Fase 8.7C — Conectar domínio recway.com.br e validar SSL
Fase 8.7D — Smoke test completo com 3 perfis em produção
Fase 8.7E — Corrigir label "Admin F5" e favicon (se necessário antes do piloto)
Fase 8.8   — Briefing e onboarding da loja Cia Cidade Azul Angeloni
```

---

*Documento gerado na Fase 8.7A — Não aplicar sem revisão do Cleison.*
