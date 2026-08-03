# PILOT-0007 — Contrato HTTP V1

**Status:** HOMOLOGADO — 10/10 cenários (H01–H10) PASSOU contra ambiente real (branch Supabase `kswsfgimadapaezoiprc`)

**Execution ID:** PILOT-0007-GATE2A-RUN-001

## 1. Definição do endpoint

- **Endpoint:** `POST /api/v1/eventos/venda`
- **Content-Type:** `application/json`
- **Autenticação:** `Authorization: Bearer <F5_INTEGRATION_KEY>` (chave estática única, sem tabela de integrações — Gate 1)
- **Processamento:** síncrono
- **Identidade oficial do evento:** `origem.sistema` + `evento.evento_externo_id` (derivação do conceito já homologado na migration 071 — `eventos_venda_externa_identidade_evento_unique`). Não existe `correlation_id`, `request_id` ou qualquer identificador paralelo.

## 2. Responsabilidade do endpoint

O endpoint (`app/api/v1/eventos/venda/route.ts`) faz somente:

1. verificar configuração da chave (`F5_INTEGRATION_KEY`);
2. validar `Authorization: Bearer`;
3. validar `Content-Type`;
4. interpretar o corpo como JSON;
5. validar estrutura mínima (corpo é objeto JSON);
6. chamar `processar_evento_venda_externa_v1`;
7. traduzir o `status` retornado pela RPC para um código HTTP;
8. devolver uma resposta sanitizada.

Toda regra de negócio (validação de payload, resolução de produto/vendedor/loja, idempotência, criação de venda) permanece exclusivamente na RPC.

## 3. Matriz oficial H01–H10

| Caso | Situação | RPC chamada? | HTTP esperado | Resultado esperado |
|------|----------|--------------|---------------|---------------------|
| H01 | Authorization ausente | Não | 401 | requisição bloqueada |
| H02 | Authorization inválida | Não | 401 | requisição bloqueada |
| H03 | Content-Type inválido | Não | 400 | falha de transporte |
| H04 | JSON malformado | Não | 400 | falha de parsing |
| H05 | Payload válido | Sim | 200 | status `aceito` |
| H06 | Reenvio literal de H05 | Sim | 200 | status `duplicado` |
| H07 | Payload rejeitado | Sim | 400 | status `rejeitado` |
| H08 | Produto não resolvido | Sim | 422 | status `pendente_produto` |
| H09 | Vendedor ausente ou inválido | Sim | 422 | status `pendente_vendedor` |
| H10 | Payload acima do limite permitido | Não | 413 | requisição bloqueada |

**H10 — Payload acima do limite permitido**

- **Objetivo do teste:** comprovar que o endpoint rejeita corpos de requisição grandes antes de repassar qualquer processamento à RPC, protegendo memória e tempo de execução contra payloads anormais (mal-intencionados ou mal-formados por um integrador).
- **Payload:** corpo JSON com mais de 256 KiB (`MAX_PAYLOAD_BYTES = 256 * 1024` em `route.ts`), enviado com `Authorization` válida e `Content-Type: application/json` corretos — isola a variável testada (tamanho) das demais camadas já validadas em H01–H04.
- **HTTP esperado:** `413`.
- **Status retornado:** `requisicao_invalida`.
- **Comportamento esperado:** a leitura do corpo é abortada assim que o total de bytes lidos ultrapassa o limite — **antes** do `JSON.parse` e antes de qualquer chamada à RPC. Não depende do header `Content-Length` (que o cliente controla e pode omitir ou subestimar, ex. chunked encoding); a contagem é feita sobre os bytes efetivamente recebidos.
- **Justificativa técnica do limite:** o Contrato Universal V1 (evento + envelope + itens) não tem cenário legítimo que se aproxime de 256 KiB; um limite nessa ordem de grandeza cobre folgadamente qualquer payload real do contrato, sem abrir margem para um integrador (ou um ataque) forçar o processo a alocar memória e tempo de CPU de forma desproporcional antes mesmo da autenticação de negócio ser concluída.

Fora de escopo deste Gate (já cobertos pela homologação direta da RPC no PILOT-0006C, podem integrar uma futura expansão do Contrato HTTP): `erro_parcial`, `pendente_mapeamento`, `nao_suportado_sem_telefone`, cenários de concorrência.

## 4. Corpo de resposta

Quando a RPC é chamada (H05–H09), a resposta HTTP deriva das oito chaves retornadas por `processar_evento_venda_externa_v1`:

- `sucesso`
- `status`
- `evento_id`
- `venda_f5_id`
- `motivo`
- `etapa`
- `pode_reprocessar`
- `contrato_versao`

O endpoint acrescenta `identidade_evento` (derivada, não uma nova identidade). A resposta nunca expõe: telefone, nome de cliente, payload integral, erro SQL interno ou credenciais.

Para H01–H04 (RPC não chamada), o corpo real implementado em `route.ts` é:

- **H01/H02 (401):** `{ sucesso: false, status: 'nao_autenticado', motivo: 'Autenticação inválida.' }`
- **H03 (400):** `{ sucesso: false, status: 'requisicao_invalida', motivo: 'Content-Type deve ser application/json.' }`
- **H04 (400):** `{ sucesso: false, status: 'requisicao_invalida', motivo: 'JSON inválido.' }`
- **H10 (413):** `{ sucesso: false, status: 'requisicao_invalida', motivo: 'Payload excede o tamanho máximo permitido.' }`

(Não existe campo `identidade_evento` em H01–H04 nem H10, pois o payload nunca chega a ser interpretado nesses casos — em H10, a leitura é abortada antes mesmo do `JSON.parse`.)

## 5. Regras HTTP congeladas

| Status da RPC / condição HTTP | Código HTTP |
|---|---|
| `aceito` | 200 |
| `duplicado` | 200 |
| `rejeitado` | 400 |
| `pendente_produto` | 422 |
| `pendente_vendedor` | 422 |
| autenticação ausente/inválida | 401 |
| Content-Type inválido | 400 |
| JSON malformado | 400 |
| payload acima de 256 KiB | 413 |
| falha de configuração interna (`F5_INTEGRATION_KEY` ausente) | 500 |
| falha inesperada da camada HTTP (erro ao chamar a RPC) | 500 |

**202 não é usado nesta versão** — reservado para uma futura arquitetura assíncrona (Gate 1, decisão 4).

## 6. Payloads de homologação (plano documental — não executados neste Gate)

Fixtures de origem: PILOT-0006C (Gate 1.5), com as seguintes substituições **em memória**, sem alterar as fixtures congeladas:

- `origem.sistema`: `teste_f5`
- `empresa_loja.loja_externa_id`: `loja-teste-pilot0007`
- `vendedor_origem.identificador_externo`: `edb0d0a1-03df-4722-9600-5dd3078282d1`
- Produto válido (H05/H06): `Creatina Monohidratada 300g`
- Produto ambíguo (H08): nome do produto criado em duplicidade no Gate 2A.4
- Vendedor ausente/inválido (H09): omitir ou usar um UUID não mapeado

## 7. Metadados não secretos da branch (Gate 2A.5)

- **project_ref:** `kswsfgimadapaezoiprc`
- **project URL:** `https://kswsfgimadapaezoiprc.supabase.co`
- **anon key (legacy):** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd3NmZ2ltYWRhcGFlem9pcHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MDA0MDgsImV4cCI6MjEwMTI3NjQwOH0.1ypH76xXAAxcepcGVJT5o_W6sh_fZn2HAttPe1sJwcs`
- **publishable key (novo formato):** `sb_publishable_h0g1XDa1eIjnXXJcw5zp9w_q-PpqVUI`
- **status da branch:** `FUNCTIONS_DEPLOYED` / `ACTIVE_HEALTHY`

Nenhum `service_role key`, nenhuma `F5_INTEGRATION_KEY` e nenhum conteúdo de `.env.local` foi obtido, solicitado ou exibido.

## 8. Configuração manual pelo Dono do Produto

O Dono do Produto deve configurar manualmente, fora do chat, em `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<URL DA BRANCH — seção 7 acima>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<CHAVE PÚBLICA DA BRANCH — seção 7 acima>
SUPABASE_SERVICE_ROLE_KEY=<OBTER NO DASHBOARD DA BRANCH>
F5_INTEGRATION_KEY=<CRIAR VALOR TEMPORÁRIO SECRETO>
```

Regras (OPS-0001):

- não mostrar os valores no chat;
- não colar screenshots com valores;
- Claude não pedirá confirmação dos valores;
- Claude não lerá o arquivo, nem executará `env`/`printenv`/`cat`/`grep`/`echo` sobre segredos;
- `F5_INTEGRATION_KEY` deve ser temporária, forte, definida somente pelo Dono do Produto e nunca exibida ao Claude.

## 9. Restauração do ambiente

Antes dos testes (Gate 2A.6), o Dono do Produto deve preservar ou conhecer a configuração anterior do `.env.local`.

Depois dos testes:

1. o servidor local será encerrado;
2. o Dono do Produto restaurará manualmente o `.env.local` anterior;
3. Claude aguardará a frase exata **AMBIENTE RESTAURADO**;
4. somente depois disso poderá ocorrer o `delete_branch`.
