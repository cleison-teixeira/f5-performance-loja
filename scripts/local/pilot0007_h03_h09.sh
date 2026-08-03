#!/usr/bin/env bash
set -e

# PILOT-0007 — Gate 2A.7 — Bateria H03-H09 (DEV-LOCAL-0001)
#
# Execução exclusivamente manual pelo Dono do Produto (OPS-0001).
# Este script nunca imprime F5_INTEGRATION_KEY nem qualquer outro segredo.
# Requer: servidor local (npm run dev) já ativo em http://localhost:3001
# e .env.local configurado na raiz do repositório.

cd "$(dirname "$0")/../.."

set -a
source .env.local
set +a

URL="http://localhost:3001/api/v1/eventos/venda"
TMP_DIR="$(mktemp -d)"

declare -a RESULTS

run_case() {
  local nome="$1"
  local content_type="$2"
  local body="$3"
  local out_file="$TMP_DIR/${nome}.txt"

  local http_status
  http_status=$(curl -s -o "$out_file" -w "%{http_code}" -X POST "$URL" \
    -H "Authorization: Bearer $F5_INTEGRATION_KEY" \
    -H "Content-Type: $content_type" \
    -d "$body")

  echo "== $nome =="
  echo "HTTP: $http_status"
  echo "Corpo:"
  cat "$out_file"
  echo
  echo

  RESULTS+=("$nome: HTTP $http_status")
}

# H03 — Content-Type inválido (com auth válida)
run_case "H03" "text/plain" '{}'

# H04 — JSON malformado (com auth válida, Content-Type correto)
run_case "H04" "application/json" '{ isto nao e json'

# H05 — Payload válido
H05_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h05-gate2a-001", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "loja-teste-pilot0007"},
  "vendedor_origem": {"identificador_externo": "edb0d0a1-03df-4722-9600-5dd3078282d1"},
  "cliente": {"nome": "Cliente Teste H05", "telefone": "11999990001"},
  "venda": {"venda_externa_id": "venda-h05-001", "data_venda": "2026-08-03"},
  "itens": [{"produto": {"nome_origem": "Creatina Monohidratada 300g"}, "quantidade": 1, "valor_unitario": 150.0}]
}'
run_case "H05" "application/json" "$H05_BODY"

# H06 — Reenvio literal de H05 (mesmo evento_externo_id — deve ser duplicado)
run_case "H06" "application/json" "$H05_BODY"

# H07 — Payload rejeitado (data_venda ausente)
H07_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h07-gate2a-001", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "loja-teste-pilot0007"},
  "vendedor_origem": {"identificador_externo": "edb0d0a1-03df-4722-9600-5dd3078282d1"},
  "cliente": {"nome": "Cliente Teste H07", "telefone": "11999990002"},
  "venda": {"venda_externa_id": "venda-h07-001"},
  "itens": [{"produto": {"nome_origem": "Creatina Monohidratada 300g"}, "quantidade": 1, "valor_unitario": 150.0}]
}'
run_case "H07" "application/json" "$H07_BODY"

# H08 — Produto não resolvido (nome ambíguo, duas linhas ativas)
H08_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h08-gate2a-001", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "loja-teste-pilot0007"},
  "vendedor_origem": {"identificador_externo": "edb0d0a1-03df-4722-9600-5dd3078282d1"},
  "cliente": {"nome": "Cliente Teste H08", "telefone": "11999990003"},
  "venda": {"venda_externa_id": "venda-h08-001", "data_venda": "2026-08-03"},
  "itens": [{"produto": {"nome_origem": "TESTE_PILOT_0007_GATE2A_RUN_001 - Produto Ambiguo"}, "quantidade": 1, "valor_unitario": 50.0}]
}'
run_case "H08" "application/json" "$H08_BODY"

# H09 — Vendedor ausente ou inválido (identificador_externo não mapeável)
H09_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h09-gate2a-001", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "loja-teste-pilot0007"},
  "vendedor_origem": {"identificador_externo": "00000000-0000-0000-0000-000000000000"},
  "cliente": {"nome": "Cliente Teste H09", "telefone": "11999990004"},
  "venda": {"venda_externa_id": "venda-h09-001", "data_venda": "2026-08-03"},
  "itens": [{"produto": {"nome_origem": "Creatina Monohidratada 300g"}, "quantidade": 1, "valor_unitario": 150.0}]
}'
run_case "H09" "application/json" "$H09_BODY"

echo "=================================================="
echo "RESUMO CONSOLIDADO"
echo "=================================================="
for r in "${RESULTS[@]}"; do
  echo "$r"
done

echo
echo "Arquivos de resposta completos salvos em: $TMP_DIR"
