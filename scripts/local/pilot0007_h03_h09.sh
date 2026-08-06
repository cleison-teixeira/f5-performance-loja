#!/usr/bin/env bash
set -e

# PILOT-0007 — Gate 2A.7 — Bateria H03-H09 (DEV-LOCAL-0001)
#
# A partir do PILOT-0010, este script usa a infraestrutura PERMANENTE de
# homologação (scripts/staging/seed_homologacao_integracoes.sql), não mais
# a branch Supabase efêmera original do PILOT-0007 (já deletada). Ver
# docs/pilot/PILOT-0007-contrato-http-v1.md, seção "Infraestrutura
# permanente de homologação" para a distinção entre o resultado histórico
# e a infraestrutura atual.
#
# Execução exclusivamente manual pelo Dono do Produto (OPS-0001).
# Este script nunca imprime F5_INTEGRATION_KEY nem qualquer outro segredo.
# Requer: servidor local (npm run dev) já ativo em BASE_URL (default
# http://localhost:3000, sobrescrevível — ver abaixo) e F5_INTEGRATION_KEY
# em .env.local. VENDEDOR_HOMOLOGACAO_ID já tem default versionado (id
# público e sintético de Vend1 Teste Angeloni, não é segredo) — só precisa
# ser sobrescrito se um outro vendedor de homologação for usado.

cd "$(dirname "$0")/../.."

set -a
source .env.local
set +a

# F5_INTEGRATION_KEY: sempre exigida, nunca impressa, usada só no header
# Authorization — regra inalterada.
if [ -z "$F5_INTEGRATION_KEY" ]; then
  echo "ERRO: F5_INTEGRATION_KEY não definido em .env.local — abortando." >&2
  exit 1
fi

# BASE_URL: default oficial desta rodada é localhost:3000, mas o operador
# pode sobrescrever (ex.: BASE_URL=http://localhost:3005 ./script.sh).
# Nunca aceita vazio — o operador-form ":-" já cobre "não definido" e
# "definido como vazio" ao mesmo tempo.
BASE_URL="${BASE_URL:-http://localhost:3000}"
if [ -z "$BASE_URL" ]; then
  echo "ERRO: BASE_URL não pode ser vazio — abortando." >&2
  exit 1
fi
echo "BASE_URL: $BASE_URL"

# Vendedor oficial de homologação: identificador sintético e público
# (Vend1 Teste Angeloni, já confirmado ativo em staging pelo seed
# oficial) — não é credencial, por isso pode ter default versionado.
# Sobrescrevível via ambiente se outro vendedor de homologação precisar
# ser usado. Validação de formato UUID falha fechada antes de qualquer
# requisição — nunca escolhe um valor arbitrário nem segue adiante com
# formato inválido.
VENDEDOR_HOMOLOGACAO_ID="${VENDEDOR_HOMOLOGACAO_ID:-f5feed00-0000-0000-0002-000000000003}"
if [ -z "$VENDEDOR_HOMOLOGACAO_ID" ]; then
  echo "ERRO: VENDEDOR_HOMOLOGACAO_ID não pode ser vazio — abortando." >&2
  exit 1
fi
if ! [[ "$VENDEDOR_HOMOLOGACAO_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  echo "ERRO: VENDEDOR_HOMOLOGACAO_ID não tem formato de UUID válido — abortando." >&2
  exit 1
fi

URL="${BASE_URL}/api/v1/eventos/venda"
TMP_DIR="$(mktemp -d)"

# Sufixo único por rodada — evita colidir com evento_externo_id/
# venda_externa_id já registrados em execuções anteriores no staging.
# Pode ser fornecido externamente (RUN_SUFFIX=... ./script.sh) ou é
# gerado localmente a partir do horário; nunca contém dado pessoal.
RUN_SUFFIX="${RUN_SUFFIX:-$(date +%Y%m%d%H%M%S)}"

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
  "evento": {"evento_externo_id": "h05-homologacao-'"$RUN_SUFFIX"'", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "homologacao-integracoes"},
  "vendedor_origem": {"identificador_externo": "'"$VENDEDOR_HOMOLOGACAO_ID"'"},
  "cliente": {"nome": "Cliente Teste H05", "telefone": "11999990001"},
  "venda": {"venda_externa_id": "venda-h05-homologacao-'"$RUN_SUFFIX"'", "data_venda": "2026-08-03"},
  "itens": [{"produto": {"nome_origem": "F5 HOMOLOGACAO - PRODUTO VALIDO"}, "quantidade": 1, "valor_unitario": 150.0}]
}'
run_case "H05" "application/json" "$H05_BODY"

# H06 — Reenvio literal de H05 (mesmo evento_externo_id — deve ser duplicado)
run_case "H06" "application/json" "$H05_BODY"

# H07 — Payload rejeitado (data_venda ausente)
H07_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h07-homologacao-'"$RUN_SUFFIX"'", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "homologacao-integracoes"},
  "vendedor_origem": {"identificador_externo": "'"$VENDEDOR_HOMOLOGACAO_ID"'"},
  "cliente": {"nome": "Cliente Teste H07", "telefone": "11999990002"},
  "venda": {"venda_externa_id": "venda-h07-homologacao-'"$RUN_SUFFIX"'"},
  "itens": [{"produto": {"nome_origem": "F5 HOMOLOGACAO - PRODUTO VALIDO"}, "quantidade": 1, "valor_unitario": 150.0}]
}'
run_case "H07" "application/json" "$H07_BODY"

# H08 — Produto não resolvido (nome ambíguo, duas linhas ativas)
H08_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h08-homologacao-'"$RUN_SUFFIX"'", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "homologacao-integracoes"},
  "vendedor_origem": {"identificador_externo": "'"$VENDEDOR_HOMOLOGACAO_ID"'"},
  "cliente": {"nome": "Cliente Teste H08", "telefone": "11999990003"},
  "venda": {"venda_externa_id": "venda-h08-homologacao-'"$RUN_SUFFIX"'", "data_venda": "2026-08-03"},
  "itens": [{"produto": {"nome_origem": "F5 HOMOLOGACAO - PRODUTO AMBIGUO"}, "quantidade": 1, "valor_unitario": 50.0}]
}'
run_case "H08" "application/json" "$H08_BODY"

# H09 — Vendedor ausente ou inválido (identificador_externo não mapeável).
# Mantém propositalmente o UUID inválido — não é o vendedor de
# homologação. Usa o produto válido permanente (H09 testa vendedor, não
# produto — a RPC deve parar no vendedor antes de avaliar o item).
H09_BODY='{
  "contrato_versao": "1.0",
  "origem": {"sistema": "teste_f5"},
  "evento": {"evento_externo_id": "h09-homologacao-'"$RUN_SUFFIX"'", "tipo_evento": "venda_criada"},
  "empresa_loja": {"loja_externa_id": "homologacao-integracoes"},
  "vendedor_origem": {"identificador_externo": "00000000-0000-0000-0000-000000000000"},
  "cliente": {"nome": "Cliente Teste H09", "telefone": "11999990004"},
  "venda": {"venda_externa_id": "venda-h09-homologacao-'"$RUN_SUFFIX"'", "data_venda": "2026-08-03"},
  "itens": [{"produto": {"nome_origem": "F5 HOMOLOGACAO - PRODUTO VALIDO"}, "quantidade": 1, "valor_unitario": 150.0}]
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
