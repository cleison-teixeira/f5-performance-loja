# Decisão de Arquitetura — Modelo de Roles e Posicionamento Comercial

**Status:** Aprovado para guiar Fase 10 em diante  
**Data:** 2026-06-25  
**Escopo:** Posicionamento comercial, nomenclatura futura e estratégia de migração de roles

---

## 1. Contexto

O F5 Recompra opera hoje com três roles técnicos no banco de dados:

| Role técnico | Responsabilidade atual |
|---|---|
| `vendedora` | Recebe e executa os avisos de recompra. É a responsável rastreável pela ação. |
| `gerente` | Visualiza e opera a loja com escopo completo. Pode ver todas as vendedoras. |
| `dono` | Acessa múltiplas lojas. Perfil multi-unidade. |

Esses roles estão implementados, validados e operacionais. A lógica de recompra, comissão e avisos foi construída com base neles.

---

## 2. O que NÃO muda agora

As seguintes estruturas permanecem intactas nesta fase:

- Roles no banco (`vendedora`, `gerente`, `dono`)
- RLS e policies baseados nesses roles
- Menus, dashboards e fluxos de navegação
- Fluxo de login e seleção de loja
- Lógica de recompra e rastreabilidade por responsável
- Seed de demonstração
- Qualquer query ou server action que leia ou escreva `role`

O modelo atual continua funcionando tecnicamente e não deve ser tocado até que a migração comercial esteja validada.

---

## 3. O problema que esta decisão resolve

O posicionamento atual expõe roles internos ao cliente final:

- Planos nomeados como "Vendedora", "Gerente" e "Dono" geram confusão comercial.
- O conceito de "vendedora" como produto vendável não reflete como redes de loja pensam em acesso.
- "Gerente" como plano intermediário não tem apelo comercial claro.
- O dono multi-loja é o perfil de maior valor percebido, mas está confundido com roles operacionais.

---

## 4. Direção futura — nomenclatura comercial

A UI e a comunicação comercial migrarão progressivamente para a seguinte linguagem:

| Role técnico (atual) | Nome comercial futuro | Quando |
|---|---|---|
| `gerente` ou `vendedora` | **Acesso Loja** | Fase futura — UI e onboarding |
| `dono` (uma loja) | **Acesso Loja** | Fase futura |
| `dono` (múltiplas lojas) | **Acesso Multi-loja** | Fase futura |
| Admin interno F5 | **Admin F5** | Fase futura |

### Premissas da migração

- **Acesso Loja** cobre quem opera dentro de uma única unidade, independente de ser gerente ou dono de uma só loja. A distinção interna de `gerente` vs `vendedora` permanece como detalhe operacional, não como produto.
- **Acesso Multi-loja** é vendido para redes ou donos com mais de uma unidade. Mapeia diretamente ao role `dono` com múltiplas lojas ativas.
- A rastreabilidade por responsável (quem fez a recompra, quem enviou o aviso) continua sendo capturada via `vendedora_id` mesmo que o login seja apresentado como "Acesso Loja".
- `gerente` pode se tornar apenas uma configuração de permissão dentro do Acesso Loja, sem exposição comercial.

---

## 5. O papel da vendedora no modelo

A `vendedora` é e continuará sendo a unidade de rastreabilidade operacional:

- Todo aviso de recompra tem `vendedora_id`.
- Toda comissão é calculada por `vendedora_id`.
- Todo relatório de recuperação agrupa por `vendedora_id`.

Essa rastreabilidade **não desaparece** com a mudança comercial. O que muda é que o cliente final pode não precisar contratar "um login por vendedora". O dono pode operar com um único Acesso Loja e registrar ações em nome de suas colaboradoras através da interface — sem que cada colaboradora precise ter login próprio no MVP.

Isso é uma decisão de go-to-market, não uma mudança de modelo de dados.

---

## 6. O papel do gerente no modelo

O role `gerente` hoje funciona como um `dono` de escopo reduzido — acessa toda a loja, mas não tem acesso multi-unidade.

Na comunicação comercial futura:

- Não será vendido como plano separado.
- Será tratado como uma configuração dentro do Acesso Loja (permissão elevada dentro da unidade).
- O dono pode delegar acesso gerencial sem que o cliente precise entender a distinção técnica de roles.

---

## 7. Roteiro de migração (não executar agora)

A migração acontecerá em fases futuras, nesta ordem recomendada:

1. **Fase comercial** — Atualizar landing page, precificação e onboarding para usar os novos nomes (Acesso Loja / Acesso Multi-loja). O banco não muda.
2. **Fase de UI** — Substituir referências a "vendedora", "gerente" e "dono" nas telas voltadas ao cliente pela nova linguagem. O banco não muda.
3. **Fase de dados (opcional e tardia)** — Avaliar se vale consolidar roles no banco. Só faz sentido após os planos comerciais estarem estabilizados.

Nenhuma dessas fases exige alterar RLS, policies, queries de recompra ou lógica de comissão.

---

## Recomendação executiva

**Modelo de venda para o MVP:**

- **Vender por loja.** Um contrato por unidade. O cliente entende "minha loja está no F5 Recompra".
- **Vender multi-loja para redes.** Donos com mais de uma unidade pagam por acesso consolidado. É o produto de maior ticket e maior retenção.
- **Não vender por vendedora no MVP.** Não criar atrito de precificação por colaboradora. O valor percebido está na recuperação da loja, não no número de logins.
- **Não posicionar gerente como plano comercial.** Não existe mercado para "plano gerente". É uma permissão interna, não um produto.
- **Manter rastreabilidade por responsável da ação.** Isso é diferencial competitivo e base para relatórios de desempenho. Não abrir mão disso — apenas não expor como critério de cobrança.
- **Implementar a mudança em fases futuras.** A lógica de recompra validada não deve ser tocada agora. A migração começa pela comunicação comercial, depois pela UI, e só então — se necessário — pelo modelo de dados.
