# PILOT-0010 — Regressão H01–H10 em Staging (Infraestrutura Permanente)

**Data da execução:** 2026-08-05

**Ambiente:** `f5-recompra-staging` — Project ID `ynrffhacpjzohrhkpuiq`

**Endpoint local testado:** `http://localhost:3000/api/v1/eventos/venda`

**Migration 071:** instalada e validada estruturalmente neste ambiente antes da regressão funcional.

**Seed oficial aplicado:** `scripts/staging/seed_homologacao_integracoes.sql`

## Resultado

| Caso | Resultado |
|---|---|
| H01 | PASSOU |
| H02 | PASSOU |
| H03 | PASSOU |
| H04 | PASSOU |
| H05 | PASSOU |
| H06 | PASSOU |
| H07 | PASSOU |
| H08 | PASSOU |
| H09 | PASSOU |
| H10 | PASSOU |

**10/10.**

Resultados funcionais de H05–H09:

- H05: `aceito`
- H06: `duplicado`
- H07: `rejeitado`
- H08: `pendente_produto`
- H09: `pendente_vendedor`

## RUN_SUFFIX de H05–H09

`20260805193135`

## Prova resumida de idempotência

H06 (reenvio literal do body de H05) retornou o mesmo `evento_id` e o mesmo `venda_f5_id` de H05, com `status: duplicado`. O banco confirmou exatamente 1 linha para o `evento_externo_id` de H05 — nenhuma segunda venda ou segundo evento foram criados pelo reenvio.

## Deltas sintéticos esperados (observados no banco antes/depois da execução de H05–H09)

- `vendas`: +1
- `itens_venda`: +1
- `clientes`: +1
- `eventos_venda_externa`: +4
- `vendas_origem_externa`: +1

## Tabelas não relacionadas

`lojas`, `perfis`, `membros_loja`, `avisos`, `campanhas_venda` — inalteradas.

## Confirmações

- Produção não foi acessada em nenhum momento da regressão.
- Migration 072 não foi aplicada.
- Nenhuma credencial ou dado pessoal real foi utilizado — somente dados sintéticos (`origem.sistema = teste_f5`, telefones fictícios, produtos com namespace `F5 HOMOLOGACAO -`).
