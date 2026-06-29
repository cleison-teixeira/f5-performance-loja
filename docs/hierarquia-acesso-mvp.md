# Hierarquia de Acesso — Regra Oficial do MVP

Data: 2026-06-29  
Status: Aprovado e implementado

---

## 1. Hierarquia oficial do MVP

### Acesso Loja

**Roles técnicos:** `gerente`, `vendedora`

**Quem usa:**
- Gerente da unidade
- Vendedor/Vendedora 1
- Vendedor/Vendedora 2
- Demais operadores da loja

**O que pode:**
- Ver e operar apenas a loja vinculada
- Dashboard da loja
- Fila de Recompra da loja
- Relacionamento
- Registrar venda
- Produtos e mensagens da loja
- Equipe da loja

**O que NÃO pode:**
- Ver "Toda a rede"
- Ver seletor multi-loja
- Acessar dados de outras lojas

**Badge exibido:** `Acesso Loja`

---

### Acesso Multi-loja

**Roles técnicos:** `dono`, `admin_f5`

**Quem usa:**
- Dono da rede
- Admin interno F5

**O que pode:**
- Ver "Toda a rede" (quando tem 2+ lojas vinculadas)
- Ver e selecionar lojas individuais
- Dashboard agregado de toda a rede
- Dashboard filtrado por loja individual
- Fila de Recompra por loja ou toda a rede

**Comportamento por quantidade de lojas:**

| Lojas vinculadas | Seletor | Opções disponíveis |
|---|---|---|
| 1 loja | Não aparece | Só aquela loja |
| 2+ lojas | Aparece | "Toda a rede" + cada loja individual |

**Badge exibido:** `Multi-loja` (dono com 2+ lojas) ou `Acesso Loja` (dono com 1 loja — não está implementado assim; veja nota abaixo)

---

### Gerente multi-loja

**Fora do escopo do MVP.** Não implementado, não corrigir.

---

## 2. Regra do seletor "Toda a rede"

O seletor aparece **somente quando as duas condições forem verdadeiras simultaneamente:**

1. Usuário tem role `dono` ou `admin_f5`
2. Usuário tem 2 ou mais entradas ativas em `membros_loja`

**Implementação:** `app/(app)/layout.tsx`

```typescript
const multiLoja = ['dono', 'admin_f5'].includes(role)
const ctx = multiLoja ? await getContextoLoja(user.id, true) : null

// Seletor só renderiza se ctx existe E tem 2+ lojas
{ctx && ctx.lojas.length > 1 && (
  <SeletorLojaGlobal lojas={ctx.lojas} lojaAtiva={ctx.lojaId} />
)}
```

**Fonte de dados do seletor:** `getLojasDoUsuario()` em `lib/loja/contexto.ts`

```typescript
// Busca apenas entradas ativas do usuário
await admin
  .from('membros_loja')
  .select('loja_id')
  .eq('perfil_id', userId)
  .eq('ativo', true)
```

Nenhuma regra hardcoded. O seletor mostra exatamente as lojas que o usuário tem em `membros_loja` com `ativo = true`.

---

## 3. Visões disponíveis por escopo

| Escopo | lojaIds | lojaNome | Ativado quando |
|---|---|---|---|
| `'rede'` | Todas as lojas do usuário | `'Toda a rede'` | Multi-loja sem cookie de loja ativa |
| `'loja'` | Uma loja | Nome da loja | Single-loja OU multi-loja com cookie de loja ativa |

**Cookie de visão:** `f5_loja_ctx` — armazena o UUID da loja selecionada. Vazio = "Toda a rede".

---

## 4. Regra de ativação comercial — `membros_loja` como fonte de verdade

Todo acesso no F5 Recompra é controlado exclusivamente pela tabela `membros_loja`.

Não há plano, flag ou configuração separada. **Vínculos em `membros_loja` com `ativo = true` definem o que o usuário vê.**

### Cliente com 1 loja

```sql
-- 1. Criar a loja
INSERT INTO lojas (empresa_id, nome) VALUES (...);

-- 2. Criar o dono (via Supabase Auth + trigger de perfil)
-- auth.users criado via signup ou invite

-- 3. Vincular dono à loja
INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
VALUES ('<loja_id>', '<perfil_id_dono>', 'dono', true);

-- 4. Vincular gerente/vendedores à mesma loja
INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
VALUES
  ('<loja_id>', '<perfil_id_gerente>', 'gerente', true),
  ('<loja_id>', '<perfil_id_vend1>',  'vendedora', true);
```

**Resultado:** Dono vê 1 loja (sem seletor). Gerente e vendedores veem apenas aquela loja.

---

### Cliente com 2+ lojas (rede)

```sql
-- Lojas já criadas: loja_a, loja_b, loja_c

-- Vincular dono a TODAS as lojas da rede
INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
VALUES
  ('<loja_a>', '<perfil_id_dono>', 'dono', true),
  ('<loja_b>', '<perfil_id_dono>', 'dono', true),
  ('<loja_c>', '<perfil_id_dono>', 'dono', true);

-- Cada gerente/vendedor só na sua loja
INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
VALUES
  ('<loja_a>', '<gerente_a>', 'gerente', true),
  ('<loja_b>', '<gerente_b>', 'gerente', true);
```

**Resultado:** Dono vê seletor com "Toda a rede" + 3 lojas. Gerentes veem só a sua loja.

---

### Cliente adicionou uma nova loja

```sql
-- 1. Criar a nova loja
INSERT INTO lojas (empresa_id, nome) VALUES (...) RETURNING id;

-- 2. Vincular o dono existente
INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
VALUES ('<nova_loja_id>', '<perfil_id_dono>', 'dono', true)
ON CONFLICT (loja_id, perfil_id) DO UPDATE SET ativo = true, role = 'dono';

-- 3. Criar acessos da nova unidade
INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
VALUES
  ('<nova_loja_id>', '<gerente_novo>', 'gerente', true),
  ('<nova_loja_id>', '<vend_novo>',   'vendedora', true);
```

**Resultado:** A nova loja aparece automaticamente para o dono no seletor. Nenhuma alteração de código necessária.

---

## 5. Remoção de acesso

```sql
-- Desativar sem deletar (preferido — mantém histórico)
UPDATE membros_loja SET ativo = false
WHERE perfil_id = '<perfil_id>' AND loja_id = '<loja_id>';

-- A loja some do seletor imediatamente na próxima navegação
```

---

## 6. Diagnóstico de acesso (checklist)

Se um usuário não vê o seletor ou vê menos lojas do que deveria:

```sql
-- Verificar vínculos ativos do usuário
SELECT u.email, ml.role, ml.ativo, l.nome AS loja
FROM auth.users u
JOIN membros_loja ml ON ml.perfil_id = u.id
JOIN lojas l ON l.id = ml.loja_id
WHERE u.email = '<email_do_usuario>'
ORDER BY ml.ativo DESC, l.nome;
```

Pontos a verificar:
- `ml.ativo = true`? Se `false`, o vínculo existe mas está inativo
- `ml.role` é `dono` ou `admin_f5`? Se `gerente`/`vendedora`, não terá seletor
- Número de linhas com `ativo = true` ≥ 2? Se 1, seletor não aparece
- Loja esperada está na lista? Se não, falta vínculo em `membros_loja`

---

## 7. O que NÃO muda

- Lógica de recompra
- Taxa de recompra
- Confirmar recompra (action)
- Geração e cadência de avisos
- Lista de Espera
- Extrato de vendas
- Comissões
- Domínio e cobrança
- RLS e policies

---

## 8. Referências técnicas

| Componente | Arquivo |
|---|---|
| Fonte de lojas do usuário | `lib/loja/contexto.ts` — `getLojasDoUsuario()` |
| Contexto de loja | `lib/loja/contexto.ts` — `getContextoLoja()` |
| Decisão de role e seletor | `app/(app)/layout.tsx` |
| Seletor de visão | `components/layout/SeletorLojaGlobal.tsx` |
| Mapeamento de roles | `lib/acessos/perfil-produto.ts` — `isAcessoLoja()` |
| Cookie de visão | `lib/loja/contexto.ts` — `COOKIE_LOJA = 'f5_loja_ctx'` |
