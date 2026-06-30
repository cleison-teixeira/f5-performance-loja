# Política de Preços — F5 Recompra

## Modelo atual (vigente)

1. O F5 Recompra é cobrado por **loja ativa**.
2. Valor padrão: **R$149/mês por loja**.
3. Cada loja/CNPJ ativo representa uma **licença independente**.
4. O acesso do dono está incluso na licença da loja.
5. Quando o cliente possui mais de uma loja, o mesmo login do dono pode ser vinculado a várias lojas pelo suporte/Admin F5.
6. O dono multi-loja vê visão consolidada/rede no app, mas a **cobrança continua por loja ativa**.
7. Não há desconto automático por quantidade de lojas neste momento.
8. **Trial máximo de 7 dias.** Se usado, a data final não pode ultrapassar hoje + 7 dias.
9. Cortesias, pilotos ou condições especiais devem ser marcadas internamente (`billing_status = cortesia`).
10. **Lojas inativas não contam** como licença ativa para cobrança.
11. **Empresa/Rede é agrupamento gerencial**, não unidade principal de cobrança.
12. Funcionalidades extras poderão ser cobradas futuramente como módulos adicionais.
13. CNPJ/CPF será importante futuramente para contrato, Asaas, cobrança e identificação fiscal, mas **não é obrigatório agora** (backlog).

## Tabela de valores

| Lojas ativas | Valor mensal |
|---|---|
| 1 loja | R$ 149,00 |
| 2 lojas | R$ 298,00 |
| 3 lojas | R$ 447,00 |
| 4 lojas | R$ 596,00 |
| 5 lojas | R$ 745,00 |
| 10 lojas | R$ 1.490,00 |

## Exemplo — Caso Fábio (Cia Cidade Azul)

- 3 lojas ativas (Angeloni, Komprão Centro, Komprão São João)
- 3 × R$149 = **R$447/mês**
- Fábio usa um único login (dono)
- O Admin F5 vincula o login do Fábio às 3 lojas como `dono`
- Vendedoras são vinculadas apenas à loja onde trabalham

## Arquitetura de cobrança

```
Empresa/Rede (agrupamento gerencial)
  └── Loja A — R$149/mês → 1 licença
  └── Loja B — R$149/mês → 1 licença
  └── Loja C — R$149/mês → 1 licença
               Total: R$447/mês
```

## Papéis e acesso

| Role | Descrição | Custo adicional |
|---|---|---|
| `dono` | Acesso total à(s) loja(s) vinculada(s) | Incluso |
| `gerente` | Acesso operacional | Incluso |
| `vendedora` | Acesso à loja vinculada | Incluso |
| `admin_f5` | Interno F5 — painel admin | Interno |

## Status comerciais (`billing_status`)

| Valor | Descrição |
|---|---|
| `trial` | Período de teste, máximo 7 dias |
| `ativo` | Licença paga e ativa |
| `cortesia` | Acesso especial sem cobrança |
| `parceiro` | Condição de parceria |
| `suspenso` | Acesso suspenso por inadimplência |
| `inadimplente` | Em atraso |
| `cancelado` | Contrato encerrado |

## Backlog técnico — itens pendentes

- [ ] Campo `CNPJ/CPF` nas lojas (necessário para contrato e Asaas)
- [ ] Tabela `licencas_loja` com campos: `valor_mensal`, `billing_status`, `trial_ate`, `origem`, `asaas_customer_id`, `asaas_subscription_id`
- [ ] Integração Asaas para cobrança recorrente por loja
- [ ] Webhook de status de pagamento por loja

## Observação sobre campos atuais

Por enquanto, sem migration nova:
- `valor_mensal` é armazenado em `liberacoes_acesso.valor_pago` no momento da liberação
- `trial_ate` é armazenado em `liberacoes_acesso.prazo_acesso`
- `billing_status` e `status` ficam no nível de `empresas`

A tabela `licencas_loja` será a solução definitiva para persistir dados comerciais por loja.
