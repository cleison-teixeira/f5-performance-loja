# F5 Recompra — Arquitetura: Bibliotecas, Parceiros, Planos, Assinaturas e Superadmin

Fase 9.14 — Fundação estrutural para multi-cliente, multi-loja e modelo comercial.

---

## 1. Hierarquia de entidades

```
Parceiro           → distribuidora/marca global (ex: PiùVita)
└── Biblioteca     → container de produtos e treinamentos do parceiro
    └── Itens      → produtos-modelo globais (biblioteca_itens)
    └── Treinam.   → conteúdos da Academia (treinamentos)

Empresa (conta)    → cliente contratante do F5 (ex: Cia da Saúde)
└── Loja           → unidade física (ex: Angeloni, Komprão)
    ├── membros_loja → equipe com roles
    ├── produtos     → catálogo operacional da loja
    ├── clientes     → base de clientes
    └── instalacoes_biblioteca → bibliotecas ativas na loja

Plano              → tier comercial (Trial, 1 Loja, Multi-loja, Cortesia, Parceiro)
Assinatura         → vínculo empresa × plano × status de cobrança
```

---

## 2. Empresa como conta/cliente

A tabela `empresas` é a entidade "conta" do F5 Recompra.

Uma empresa pode ter 1 ou N lojas vinculadas via `lojas.empresa_id`.

### Campos relevantes de `empresas` (após migration 026)

| Campo | Uso |
|-------|-----|
| `nome` | Nome da rede/empresa |
| `responsavel_nome` | Nome do contato principal |
| `responsavel_whatsapp` | WhatsApp do contato (para suporte) |
| `responsavel_email` | E-mail do contato |
| `nicho` | Segmento: 'suplementos', 'petshop', 'agropecuaria', etc. |
| `notas_internas` | Uso exclusivo do time F5 |
| `billing_status` | Estado operacional comercial (ver abaixo) |
| `trial_ends_at` | Quando o trial expira |
| `plano_id` | FK para tabela planos |
| `asaas_customer_id` | ID do cliente no Asaas (preenchido via webhook futuro) |
| `asaas_subscription_id` | ID da assinatura no Asaas (idem) |
| `current_period_start` | Início do ciclo atual |
| `current_period_end` | Fim do ciclo atual |
| `canceled_at` | Data de cancelamento |

### `billing_status` vs `status` legado

- `empresas.status` ('ativa'/'inativa'/'trial') → campo legado, não remover
- `empresas.billing_status` → campo operacional F5 com mais granularidade

| billing_status | Significado |
|----------------|-------------|
| `trial` | Em avaliação gratuita |
| `ativo` | Assinatura paga e vigente |
| `cancelado` | Cliente cancelou |
| `suspenso` | Suspensão administrativa |
| `inadimplente` | Cobrança vencida (futuro Asaas) |
| `cortesia` | Acesso gratuito por acordo comercial |
| `parceiro` | Parceiro distribuidor com acesso especial |

---

## 3. Lojas como unidades

Cada `loja` pertence a uma `empresa` via `empresa_id`.

Um dono pode ter 1 ou N lojas. A hierarquia multi-loja é gerenciada via:

- `lojas.empresa_id` → agrupa lojas por conta
- `membros_loja` → controla acesso por role e por loja

### Como o dono vê toda a rede

O helper `getContextoLoja(userId, multiLoja)` em `lib/loja/contexto.ts` retorna todas as lojas vinculadas ao perfil do dono via `membros_loja`. O Superadmin verá tudo via consulta direta sem filtro de perfil.

---

## 4. Membros e roles

`membros_loja` = vínculo entre perfil e loja com role:

| Role | Acesso |
|------|--------|
| `admin_f5` | Superadmin — acessa qualquer loja/empresa |
| `dono` | Vê todas as lojas da rede vinculadas ao seu perfil |
| `gerente` | Opera 1 loja específica com visão de equipe |
| `vendedora` | Opera 1 loja com visão restrita ao próprio trabalho |

---

## 5. Parceiros

Tabela `parceiros` — distribuidoras/marcas globais.

Exemplo real: PiùVita (slug: `piuvita`, nicho: `suplementos`).

Os parceiros são globais — pertencem ao F5, não a lojas específicas.

---

## 6. Bibliotecas

Tabela `bibliotecas` — container de produtos e treinamentos por parceiro.

Tipos:

| Tipo | parceiro_id | Exemplo |
|------|-------------|---------|
| Biblioteca F5 Geral | NULL | Templates genéricos da plataforma |
| Biblioteca de Parceiro | FK → parceiros | PiùVita, Nutry, futuros |

### Fluxo de instalação (implementar em fase futura)

1. Admin F5 cadastra `biblioteca_itens` na biblioteca do parceiro.
2. Dono/loja instala a biblioteca via `instalacoes_biblioteca`.
3. A instalação registra o vínculo. **Não importa produtos automaticamente.**
4. O dono escolhe quais itens importar (fase Admin F5 / importação).
5. Ao importar, o item é copiado para `produtos` da loja com `biblioteca_item_id` preenchido.
6. Depois de importado, o produto é operacional daquela loja e pode ser ajustado localmente.

---

## 7. Itens de biblioteca (`biblioteca_itens`)

Catálogo global de produtos-modelo por biblioteca.

**Não substitui `produtos`** — é o template de origem, não o produto operacional.

Campos de rastreio de origem em `produtos` (após migration 033):

| Campo em `produtos` | Tipo | Uso |
|---------------------|------|-----|
| `biblioteca_item_id` | FK → biblioteca_itens | Rastreia de qual item da biblioteca o produto veio |
| `parceiro_id` | FK → parceiros | FK real para parceiro (substitui `parceiro` TEXT legado) |
| `repasse_ativo` | boolean | Se há acordo de repasse ativo com o parceiro |
| `tipo_acordo` | text | 'livre', 'comissao_percentual', 'comissao_fixa', 'cota' |

> `produtos.parceiro` (TEXT) e `produtos.modelo_id` permanecem como legado.

---

## 8. Instalações de biblioteca

Tabela `instalacoes_biblioteca` — registra biblioteca ativa por loja.

- Uma biblioteca só pode ser instalada uma vez por loja (UNIQUE).
- Para desativar: `ativo = FALSE` (sem DELETE).
- Nenhuma loja recebe biblioteca automaticamente.

---

## 9. Planos

Tabela `planos` — tiers comerciais do F5.

| Plano | Slug | Max lojas | Bibliotecas | Treinamentos parceiro |
|-------|------|-----------|-------------|-----------------------|
| Trial | trial | 1 | Não | Não |
| 1 Loja | 1-loja | 1 | Sim | Sim |
| Multi-loja | multi-loja | Ilimitado | Sim | Sim |
| Cortesia | cortesia | Ilimitado | Sim | Sim |
| Parceiro | parceiro | Ilimitado | Sim | Sim |

---

## 10. Assinaturas

Tabela `assinaturas` — vínculo empresa × plano × status de cobrança.

Campos Asaas-ready (sem integração ativa):

| Campo | Preenchido por |
|-------|----------------|
| `asaas_customer_id` | Webhook Asaas (futuro) |
| `asaas_subscription_id` | Webhook Asaas (futuro) |
| `current_period_start` | Webhook Asaas (futuro) |
| `current_period_end` | Webhook Asaas (futuro) |
| `canceled_at` | Webhook Asaas / admin (futuro) |
| `metodo_pagamento_preferido` | Admin F5 / webhook (futuro) |

Uma empresa pode ter múltiplos registros em `assinaturas` (histórico).
O registro ativo é o com `billing_status` em 'trial', 'ativo', 'cortesia' ou 'parceiro'.

---

## 11. Treinamentos (Academia F5)

Tabela `treinamentos` — conteúdo da Academia.

Após migration 034, novos campos:

| Campo | Uso |
|-------|-----|
| `parceiro_id` | FK → parceiros (filtra treinamentos por parceiro instalado) |
| `biblioteca_id` | FK → bibliotecas |
| `nicho` | Para filtros futuros por segmento |
| `thumbnail_url` | Imagem de capa do treinamento |
| `ordem` | Ordem de exibição dentro da seção |
| `status` | 'disponivel', 'em_breve', 'inativo' |

> A tela `/treinamentos/page.tsx` ainda é hardcoded. A reconexão ao banco está prevista para a fase de Admin F5 Bibliotecas.

---

## 12. Superadmin F5 (fase futura — 9.14D)

O Superadmin usa o role `admin_f5` em `membros_loja`, que tem acesso irrestrito via RLS (função `lojas_do_usuario()`).

Visão planejada para o painel Superadmin:

- Lista de todas as `empresas` (clientes)
- Por empresa: lojas, dono(s), plano, billing_status
- Status da assinatura e datas
- Bibliotecas instaladas por loja
- Data de criação e último acesso (se disponível)

Sem tela implementada ainda. A fundação estrutural para suportar essa visão já está no banco.

---

## 13. Admin F5 (fase futura — 9.14B)

O Admin F5 gerenciará:

- CRUD de parceiros
- CRUD de bibliotecas
- Cadastro de itens na biblioteca (`biblioteca_itens`)
- Importação de CSV/planilha de produtos parceiro
- Cadastro de treinamentos por parceiro/biblioteca

Sem tela implementada ainda.

---

## 14. Modelo de repasse/cota (fase futura)

Os campos de `tipo_acordo`, `repasse_ativo` e `observacao_comercial` em `biblioteca_itens` e `produtos` são **estruturais apenas**.

Nenhum cálculo financeiro de repasse está ativo.  
A lógica de repasse/cota será especificada e aprovada em fase separada antes de implementação.

---

## 15. Asaas-ready — O que NÃO está ativo

| Item | Status |
|------|--------|
| API Asaas | Não integrada |
| Webhook Asaas | Não implementado |
| Cobrança automática | Não ativa |
| Geração de boleto/Pix | Não implementada |
| Atualização de billing_status por webhook | Não implementada |

Os campos `asaas_customer_id`, `asaas_subscription_id` e datas de ciclo existem no banco e ficarão NULL até a integração futura.

---

## 16. Migrations desta fase (9.14B.1)

| Migration | O que faz |
|-----------|-----------|
| 026_upgrade_empresas_billing_ready | ADD COLUMNs em empresas |
| 027_create_planos | CREATE TABLE planos + 5 seeds |
| 028_create_assinaturas | CREATE TABLE assinaturas |
| 029_create_parceiros | CREATE TABLE parceiros + seed PiùVita |
| 030_create_bibliotecas | CREATE TABLE bibliotecas + seeds F5 Geral e PiùVita |
| 031_create_biblioteca_itens | CREATE TABLE biblioteca_itens |
| 032_create_instalacoes_biblioteca | CREATE TABLE instalacoes_biblioteca |
| 033_upgrade_produtos_origem | ADD COLUMNs em produtos |
| 034_upgrade_treinamentos | ADD COLUMNs em treinamentos |

Todas são ADD/CREATE, zero risco destrutivo.

---

## 17. Importação inicial da biblioteca PiùVita (9.14B.2)

### Origem

- Arquivo: `data/bibliotecas/piuvita-produtos.csv`
- Fonte original: planilha fornecida pelo time F5 com produtos selecionados do catálogo PiùVita
- Quantidade: 30 produtos

### Destino

- Tabela: `biblioteca_itens`
- Biblioteca: slug `piuvita`
- Parceiro: slug `piuvita`

### Mapeamento de campos

| Campo CSV | Campo no banco |
|-----------|----------------|
| Produto | nome |
| Link imagem | foto_url |
| Preço (R$) | preco_sugerido (vírgula → ponto) |
| Recompra (dias) | ciclo_recompra_dias |
| avisos configurados | qtd_mensagens |

Valores padrão aplicados a todos os itens:

- `categoria` = `suplementos`
- `nicho` = `suplementos`
- `recorrente` = true
- `comissionavel` = true
- `repasse_ativo` = false
- `tipo_acordo` = `livre`
- `ativo` = true

### Script de importação

`scripts/importar-biblioteca-piuvita.js`

- Lê o CSV de `data/bibliotecas/piuvita-produtos.csv`
- Valida todos os campos antes de qualquer INSERT
- Faz upsert idempotente por nome normalizado dentro da biblioteca
- Exibe resumo de inseridos / atualizados / erros

### Regra de idempotência

- Critério de duplicidade: mesma `biblioteca_id` + nome normalizado (sem acentos, lowercase, sem especiais)
- Se já existir: atualiza `foto_url`, `preco_sugerido`, `ciclo_recompra_dias`, `qtd_mensagens`, `categoria`, `nicho`, `ativo`
- Se não existir: insere novo registro
- Nunca cria duplicados

### O que esta importação NÃO faz

- Não instala produtos em nenhuma loja
- Não altera `produtos` operacionais
- Não preenche `produtos.biblioteca_item_id`
- Não cria avisos, vendas ou recompras
- `instalacoes_biblioteca` permanece vazia após a importação
