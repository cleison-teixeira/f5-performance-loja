# F5 Recompra — Arquitetura Técnica V1

## Produto

**Promessa:** "Troque a caderneta do balcão por avisos automáticos no WhatsApp."

**Problema:** Pequenos negócios vendem uma vez e esquecem de chamar o cliente novamente. O F5 Recompra registra vendas, cria lembretes de relacionamento e recompra, acompanha comissões e ajuda a recuperar faturamento.

**Público-alvo:** Produtos naturais, suplementos, farmácias, agropecuárias, material de construção, cosméticos e pequeno varejo em geral.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS + shadcn/ui |
| Backend/DB | Supabase (Postgres + Auth + RLS) |
| Deploy | Vercel |
| WhatsApp | `wa.me` link direto (V1, sem API oficial) |
| Cron | Vercel Cron Jobs |

---

## Perfis de Acesso

| Role | Descrição |
|---|---|
| `admin_f5` | Administrador interno do SaaS — acesso global a todas as empresas |
| `dono` | Dono da empresa — acesso total às suas lojas |
| `gerente` | Gerente de uma loja — configura produtos, mensagens, equipe e comissões |
| `vendedora` | Vendedora da loja — registra vendas, visualiza avisos e suas comissões |

**Regra fundamental:** a diferenciação de acesso é sempre por **role**, nunca por dispositivo.

---

## Responsividade

Todos os perfis devem funcionar plenamente em mobile e desktop.

**Princípio:**
```
Role  → o que você VÊ e pode FAZER
Device → como você VÊ e como interage
```

Esses dois eixos são completamente independentes.

| Dispositivo | Layout |
|---|---|
| Mobile | Bottom navigation, cards grandes, ações rápidas, filtros em drawer/sheet |
| Desktop | Sidebar lateral, tabelas, filtros visíveis, visão mais ampla |

Nenhuma funcionalidade essencial é removida ou ocultada em nenhum dispositivo. Tabelas (desktop) têm versão em cards (mobile). Filtros avançados existem em ambos os formatos.

---

## Módulos

| Módulo | Roles com acesso |
|---|---|
| Dashboard | Todos |
| Avisos de hoje | Todos |
| Nova venda | Vendedora, Gerente, Dono |
| Clientes | Vendedora, Gerente, Dono |
| Produtos | Gerente, Dono |
| Mensagens prontas | Gerente, Dono |
| Lista de espera | Vendedora, Gerente, Dono |
| Comissões | Vendedora (próprias), Gerente/Dono (todas) |
| Configurações › Loja | Dono |
| Configurações › Equipe | Gerente, Dono |
| Configurações › Comissões | Gerente, Dono |
| Painel Admin F5 | admin_f5 |

---

## Fluxo Principal

A vendedora registra uma venda em uma única tela:

```
Nome do cliente + WhatsApp + Produto + Valor
        ↓
Sistema cria/atualiza o cliente
        ↓
Registra a venda
        ↓
Calcula comissão
        ↓
Gera avisos futuros automaticamente
        ↓
Exibe confirmação com resumo
```

---

## Regras de Recompra (Avisos)

Cada produto pode ter até 3 mensagens configuradas:

| Campo | Descrição |
|---|---|
| Tipo | `agradecimento` \| `relacionamento` \| `recompra` \| `oferta` |
| Ordem | 1, 2 ou 3 |
| Dias após a venda | Ex: 3, 15, 30 |
| Texto | Suporta variáveis: `{cliente}`, `{produto}`, `{vendedora}`, `{loja}` |

O envio é feito pela vendedora via botão que abre o WhatsApp com a mensagem pré-preenchida.

---

## Comissões

- A gerente ou o dono define o percentual de comissão por vendedora
- A comissão é calculada automaticamente ao registrar a venda
- A vendedora visualiza apenas suas próprias comissões
- A gerente e o dono visualizam todas

---

## Multiempresa / Multiloja

```
empresas
  └── lojas
        ├── membros_loja (perfil + role)
        ├── clientes
        ├── produtos
        │     └── mensagens_produto
        ├── vendas
        │     ├── avisos
        │     └── comissao_venda
        └── regras_comissao
```

**Isolamento:** cada loja é isolada via Row Level Security (RLS) no Supabase. Nenhuma query vaza entre lojas.

**Seleção de loja:**
- Usuário em 1 loja → entra direto no dashboard
- Usuário em N lojas → seleciona a loja após login

**Convite de equipe:**
```
Gerente/Dono gera convite → token único (24h) →
link enviado via WhatsApp → vendedora acessa /convite/[token] →
cria conta ou faz login → vinculada à loja com role definido
```

**Planos (gerenciados pelo Admin F5):**

| Plano | Lojas | Usuários | Período |
|---|---|---|---|
| trial | 1 | 1 | 30 dias |
| basico | 1 | 5 | Mensal |
| pro | Ilimitadas | Ilimitados | Mensal |

---

## Autenticação

- **Provedor:** Supabase Auth (email + senha e magic link)
- **Proteção de rotas:** middleware Next.js valida sessão e role
- **Custom claims no JWT:** `loja_ativa`, `role`, `empresa_id`
- **Troca de loja:** atualiza cookie httpOnly + custom claims

---

## Banco de Dados — Tabelas Principais

| Tabela | Descrição |
|---|---|
| `empresas` | Raiz do multitenancy |
| `lojas` | Lojas de cada empresa |
| `perfis` | Extensão de `auth.users` |
| `membros_loja` | Usuário ↔ Loja com role |
| `clientes` | Clientes por loja |
| `lista_espera` | Interesse sem estoque |
| `produtos` | Produtos por loja |
| `mensagens_produto` | Até 3 templates por produto |
| `vendas` | Vendas registradas |
| `avisos` | Notificações geradas por venda |
| `regras_comissao` | Percentual por vendedora |
| `comissao_venda` | Comissão calculada por venda |

---

## Estrutura de Rotas

```
/(auth)
  /login
  /cadastro
  /convite/[token]

/(app)                        ← protegido, qualquer role
  /dashboard
  /avisos
  /vendas/nova
  /vendas/[id]
  /clientes
  /clientes/[id]
  /produtos                   ← gerente+
  /produtos/[id]              ← gerente+
  /mensagens                  ← gerente+
  /espera
  /comissoes
  /configuracoes/loja         ← dono
  /configuracoes/equipe       ← gerente+
  /configuracoes/comissoes    ← gerente+

/(admin)                      ← protegido, apenas admin_f5
  /empresas
  /empresas/[id]
  /usuarios
```

---

## Arquitetura de Pastas

```
f5-recompra/
├── app/
│   ├── (auth)/
│   ├── (app)/
│   ├── (admin)/
│   └── api/
│       ├── vendas/
│       ├── avisos/
│       │   └── processar/    ← cron job
│       ├── comissoes/
│       └── webhooks/whatsapp/
├── components/
│   ├── ui/                   ← shadcn/ui
│   ├── layout/               ← Sidebar, BottomNav, Header, LojaSelector
│   ├── dashboard/
│   ├── vendas/
│   ├── avisos/
│   ├── clientes/
│   └── shared/
├── lib/
│   ├── supabase/             ← client, server, admin
│   ├── avisos/               ← gerador de avisos
│   ├── mensagens/            ← interpolador de variáveis
│   ├── comissoes/            ← calculador
│   └── whatsapp/             ← gerador de links wa.me
├── hooks/
├── types/
├── middleware.ts
└── supabase/
    ├── migrations/
    └── seed/
```

---

## Plano de Fases

| Fase | Escopo | Status |
|---|---|---|
| 1 | Setup, auth, multitenancy, shell responsivo | — |
| 2 | Nova venda, geração de avisos, comissão | — |
| 3 | Avisos de hoje, templates, links WhatsApp | — |
| 4 | Gestão de produtos, equipe, comissões | — |
| 5 | Dashboard com métricas e potencial de faturamento | — |
| 6 | Admin F5, PWA, onboarding, polimento | — |

---

## Decisões Técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| WhatsApp V1 | `wa.me` link | Zero custo, sem necessidade de API oficial |
| Notificações push | PWA + service worker | Mobile-first sem app nativo |
| Cron | Vercel Cron Jobs | Marca avisos do dia diariamente |
| Tipagem DB | `supabase gen types` | Tipos sincronizados com migrations |
| RLS | Por loja via `membros_loja` | Isolamento garantido em nível de banco |
| Layout | Responsivo universal | Role ≠ dispositivo — todos os perfis funcionam em mobile e desktop |
