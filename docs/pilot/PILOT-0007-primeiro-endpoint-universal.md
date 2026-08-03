# PILOT-0007 — Primeiro Endpoint Universal

**Status:** GATE 0 — PLANEJAMENTO

## Contexto e motivação

Registrado em `docs/security/SEC-0005A-hipotese-podman-rejeitada.md`: a
hipótese de ambiente Supabase local (Podman) foi testada e rejeitada neste
Mac. Decisão do Dono do Produto: não perseguir infraestrutura local mais
sofisticada agora — a prioridade passa a ser colocar o Primeiro Endpoint
Universal em funcionamento para viabilizar a conversa de integração com a
Cia da Saúde.

### Princípio estratégico

> O F5 não contratará infraestrutura antecipadamente apenas por
> conveniência. A prioridade é provar o Endpoint Universal e a integração
> comercial. Quando a API viabilizar a expansão da Cia da Saúde para mais
> de 30 lojas, o Supabase Pro poderá ser contratado com receita e
> necessidade operacional comprovadas.

Registrado com precisão, sem tratar como fato garantido:

- Existe **potencial comercial** de expansão via Cia da Saúde.
- Existe **interesse/aval** a ser convertido em integração operacional.
- A **quantidade exata de lojas** depende da validação e do acordo com a
  rede — não é um número comprometido.
- O upgrade do Supabase (Estratégia C do ADR-0001) ocorrerá **somente**
  mediante decisão financeira própria, com receita e necessidade
  operacional comprovadas — não antecipadamente.

Isso não reabre nem contradiz o ADR-0001 — é exatamente o gatilho de
receita que o ADR já previa (seção 9, gatilhos objetivos).

## Objetivo único

Criar o primeiro endpoint HTTP do F5 capaz de receber um Evento Universal
de Venda V1, validar a requisição, chamar a RPC já desenhada e devolver
uma resposta padronizada.

### Fluxo-alvo

```
POST /api/v1/eventos/venda
        ↓
autenticação da integração
        ↓
validação superficial do envelope
        ↓
Contrato Universal V1
        ↓
RPC processar_evento_venda_externa_v1
        ↓
Evento Bruto
        ↓
cliente + venda + itens
        ↓
status processando
        ↓
avisos pendentes
```

## Escopo desta primeira fatia

**Incluído:**
- Endpoint HTTP.
- Autenticação técnica da integração.
- Versionamento da rota.
- Validação de Content-Type.
- Limite de tamanho do payload.
- Validação de JSON.
- Chamada server-side à RPC.
- Tradução do retorno da RPC para HTTP.
- Logs sanitizados.
- Idempotência delegada à fundação já desenhada (migration 071/RPC).
- Teste com evento sintético.
- Documentação mínima para o primeiro integrador.

**Fora de escopo:**
- Integração real com TOV.
- Integração com Varejo Online.
- Integração com Trier.
- Webhook de parceiro real.
- Geração automática de avisos.
- Envio de WhatsApp.
- Campanhas.
- Cashback.
- NPS.
- Portal da Indústria.
- Painel de integrações.
- Fila sofisticada.
- Múltiplas versões do Contrato Universal.
- Supabase Pro.
- Branching.
- Ambiente local completo.

## Dependência crítica — o endpoint não pode fingir que a RPC está homologada

Separadas explicitamente em duas entregas:

### Entrega A — Endpoint e contrato de interface

Pode ser construída e testada com camada de adaptação/mock controlado,
**sem** aplicar a migration 071 em staging.

### Entrega B — Integração real com a RPC

**Bloqueada** até existir ambiente autorizado para aplicar e homologar a
migration 071:
- Supabase Pro com Branching; ou
- Staging autorizado com gate específico; ou
- Novo computador/ambiente compatível; ou
- Outra estratégia futura aprovada.

Esta dependência não é escondida em nenhum lugar da documentação do
integrador (seção "Documentação para reunião com TI").

## Arquitetura mínima do endpoint

Rota sugerida: `POST /api/v1/eventos/venda` (confirmado no Gate 0 —
seção "Auditoria" abaixo — que o projeto usa App Router, então o caminho
físico real é `app/api/v1/eventos/venda/route.ts`).

O endpoint deverá:

1. Aceitar somente `POST`.
2. Exigir `Content-Type: application/json`.
3. Rejeitar body ausente.
4. Limitar tamanho do payload.
5. Validar que o JSON é objeto.
6. Extrair `contrato_versao`.
7. Aceitar somente versão `1.0`.
8. Autenticar a integração.
9. Gerar `correlation_id`.
10. Nunca registrar telefone, nome, CPF ou payload completo em logs.
11. Chamar um adapter interno.
12. Devolver resposta com estrutura previsível.
13. Nunca usar `service_role` no browser.
14. Nunca expor segredo ao frontend.

## Autenticação V1

Comparação no Gate 0 (nenhuma implementada ainda):

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A — API key por integração, hash armazenado | 1 chave por integrador, hash (ex. SHA-256) guardado numa tabela nova | Escopo por integração de graça; revogação = desativar 1 linha; auditável | Exige 1 tabela nova + lookup a cada request |
| B — HMAC de requisição | Segredo compartilhado assina o corpo da requisição | Protege integridade do payload, não só identidade | Mais complexo para o primeiro integrador implementar; sem precedente no projeto |
| C — Token estático interno temporário | 1 valor fixo em variável de ambiente, mesmo padrão de `ASAAS_WEBHOOK_TOKEN` já documentado em `.env.example` (mas **nunca implementado** em nenhum arquivo do projeto, confirmado por grep nesta auditoria) | Menor esforço de implementação | Sem escopo por integração, sem revogação seletiva, sem rotação — inadequado além do piloto sintético |
| D — Autenticação nativa de outro sistema | Delegar a um IdP externo | N/A | Não existe outro sistema hoje — descartada, sem aplicabilidade |

**Recomendação para o piloto sintético:** Opção **A** — é a menor
estratégia que já nasce com escopo por integração e revogação (evitando o
retrabalho de migrar de C para A mais tarde), sem a complexidade de HMAC
que o primeiro integrador (script sintético) não precisa ainda.

**Não implementar antes de aprovar, em gate próprio (1.1):**
armazenamento (nova tabela, hash, nunca a chave em claro), rotação, escopo
por integração, logs (nunca logar a chave), revogação, proteção contra
vazamento (nunca em fixture ou repositório — nenhuma chave real em
`__tests__/fixtures`).

## Mapeamento HTTP (proposta inicial, não congelada)

| Código | Situação |
|---|---|
| 200 | Duplicado com venda válida |
| 202 | Evento aceito, venda criada, avisos pendentes |
| 400 | JSON inválido ou contrato inválido |
| 401 | Autenticação ausente ou inválida |
| 409 | Conflito de identidade que não seja duplicidade válida |
| 422 | Payload semanticamente rejeitado |
| 429 | Limite de requisições, quando implementado |
| 500 | Erro interno sanitizado |
| 503 | RPC/banco indisponível |

**Não congelada** — precisa ser comparada, no Gate 1.1, contra os 8
valores reais de `status` que a RPC retorna
(`recebido`/`rejeitado`/`pendente_mapeamento`/`pendente_vendedor`/
`pendente_produto`/`nao_suportado_sem_telefone`/`processando`/
`erro_parcial`) para garantir que a tradução HTTP não perde nem inventa
informação.

## Adapter interno

Interface proposta:

```ts
processarEventoUniversal(payload, contextoIntegracao)
```

Dois modos, nunca misturados silenciosamente:

### Modo mock controlado

Usado para testar rota, autenticação, parsing, respostas HTTP, logs,
`correlation_id`. **Não grava banco.**

### Modo RPC

Usado futuramente, só quando a migration 071 estiver aplicada e
homologada (Entrega B).

O modo ativo deve ser explícito (ex. variável de ambiente dedicada,
nunca inferido) e **impossível de habilitar por acidente em produção**
(ex. RPC nunca é o padrão silencioso caso a variável esteja ausente —
padrão fail-safe a definir no Gate 1.2).

## Primeiro cliente do endpoint

Um script sintético controlado — **não** o ERP real.

Objetivo: enviar a fixture `venda-valida.json` (já existente em
`__tests__/fixtures/pilot-0006c/`) para o endpoint e verificar
autenticação, request, resposta, `correlation_id`, ausência de dados
sensíveis nos logs, idempotência da interface, comportamento do mock.

## Documentação para reunião com TI (entrega futura do PILOT-0007)

A preparar: URL conceitual, método, headers, autenticação, exemplo de
request, exemplo de response, idempotency key/`evento_externo_id`,
códigos HTTP, política de retry, limites, versionamento, dados
obrigatórios, campos opcionais, campos futuros. Permite conversar com a
TI da Cia da Saúde mesmo antes da conexão final com TOV.

## Gates do PILOT-0007

| Gate | Conteúdo |
|---|---|
| 0 | Auditoria do projeto e arquitetura do endpoint |
| 1.1 | Contrato HTTP e autenticação |
| 1.2 | Adapter interno e modo mock |
| 1.3 | Implementação da rota |
| 1.4 | Testes locais sem banco |
| 1.5 | Documentação do integrador |
| 1.6 | Revisão de segurança |
| 1.7 | PR e merge do endpoint em modo não destrutivo |
| 2 (futuro) | Integração real com RPC, somente após homologação da migration 071 |

Cada gate é pequeno e revisável — nenhuma autorização cobre o próximo
gate automaticamente.

---

## Gate 0 — Auditoria (entregue agora)

Só leitura. Nada foi escrito, alterado, instalado ou executado.

### 1–2. Framework e estrutura de rotas

- **App Router confirmado** (`app/` existe, `pages/` não existe;
  `next.config.ts` presente). A rota nova será
  `app/api/v1/eventos/venda/route.ts`.
- Rotas API existentes hoje: `app/api/auth/callback/route.ts`,
  `app/api/auth/logout/route.ts`, `app/api/version/route.ts` — todas de
  infraestrutura interna (auth/versão), nenhuma é um precedente de
  endpoint público para integração externa.

### 3–4. Autenticação e Supabase server/admin

- `middleware.ts` **bypassa explicitamente toda rota `/api/`**
  (`isApiRoute` retorna cedo, sem checar `user`) — ou seja, o middleware
  global **não protege** a nova rota; a autenticação da integração
  precisa ser implementada inteiramente dentro do próprio `route.ts`.
- `lib/supabase/{admin,client,server}.ts` já existem.
  `lib/supabase/admin.ts` expõe `createAdminClient()` com
  `SUPABASE_SERVICE_ROLE_KEY` — é o cliente correto a reusar para chamar
  a RPC no modo real (nunca o `client.ts` de browser).

### 5. Precedente de auth para integração externa

- `.env.example` já documenta `ASAAS_WEBHOOK_TOKEN` (variável para um
  webhook de billing), mas **busca em todo o código-fonte não encontrou
  nenhum arquivo `.ts`/`.tsx` que use essa variável** — ou seja, **não
  existe precedente implementado** de autenticação de integração externa
  neste projeto. A Opção C da seção "Autenticação V1" replicaria um
  padrão hoje só documentado, nunca testado em produção.

### 6. Middleware

- Confirmado acima — existe, mas não se aplica a rotas `/api/`.

### 7. Rate limiting

- Nenhuma referência a rate limiting encontrada (nem no `package.json`,
  nem em `lib/`/`app/`) — precisa ser construído do zero se o código
  429 da matriz HTTP for implementado nesta fatia (proposta: **não**
  implementar rate limiting real nesta primeira fatia, manter 429 só
  reservado na matriz para o futuro — a decidir no Gate 1.1).

### 8–9. Logs e tratamento de erro

- Nenhum padrão centralizado de logging/wrapper de erro foi encontrado
  nesta auditoria — cada rota trata isso individualmente hoje (ex.
  `app/api/version/route.ts` não tem tratamento de erro, é uma rota
  trivial). O novo endpoint precisará definir seu próprio padrão de log
  sanitizado (Gate 1.3), não herda um já existente.

### 10. Validação de schema

- **Nenhuma biblioteca de validação de schema instalada** (`zod`, `yup`,
  `joi`, `valibot` — nenhuma encontrada no `package.json`). A validação
  do envelope (Contrato Universal V1) precisará ser feita manualmente ou
  exigirá a instalação de uma dependência nova (decisão do Gate 1.1 —
  instalar uma dependência é ação AMARELO, exige aprovação própria).

### 11. Bibliotecas instaladas relevantes

- `next@16.2.9`, `react@19.2.4`, `@supabase/ssr@^0.12.0`,
  `@supabase/supabase-js@^2.108.2`. Nenhuma lib de HTTP client, schema
  validation, rate limiting ou logging estruturado além dessas.

### 12. Testes existentes

- `vitest.config.ts` presente; `__tests__/` já tem a estrutura de
  fixtures do PILOT-0006C (`__tests__/fixtures/pilot-0006c/`, incluindo
  `venda-valida.json`, reutilizável como payload do "primeiro cliente do
  endpoint"). Padrão observado em testes existentes: mocks completos,
  sem acesso a banco real — consistente com o "Modo mock controlado"
  proposto para a Entrega A.

### 13. Configuração Vercel

- `vercel.json` só define `"regions": ["gru1"]` (São Paulo) — sem
  configuração de timeout/memória por função. O novo endpoint herda o
  padrão da Vercel a menos que uma config específica seja adicionada
  (não necessário nesta fatia).

### 14. Variáveis de ambiente documentadas (nomes, sem ler valores)

`.env.example` lista: `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_ENV`,
`ASAAS_WEBHOOK_TOKEN`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_WHATSAPP_TEST_MODE`, `NEXT_PUBLIC_WHATSAPP_TEST_PHONE`,
`SUPABASE_SERVICE_ROLE_KEY`. Nenhum valor foi lido (proibido por
OPS-0001) — só os nomes, via `.env.example`, que é sempre permitido.
Nenhuma variável nova de autenticação do endpoint existe ainda — será
necessário adicionar uma (nome a definir no Gate 1.1), nunca com valor
real commitado.

### 15. Riscos de introduzir um endpoint público

- **Superfície de ataque nova:** é o primeiro endpoint do projeto pensado
  para ser chamado por um sistema externo, não por um usuário logado no
  próprio F5 — os riscos usuais de API pública (payload malformado,
  volumetria, chave vazada) não têm precedente tratado neste código.
- **Middleware não protege `/api/`** (achado 3–4) — qualquer falha em
  implementar a autenticação corretamente dentro do próprio `route.ts`
  deixa o endpoint efetivamente aberto.
- **Sem rate limiting hoje** — um cliente mal configurado (ou malicioso)
  poderia gerar volume alto sem controle, mesmo que a fatia atual não
  grave banco (modo mock) ou grave via RPC idempotente (modo real).
- **Sem lib de validação de schema** — validação manual é mais propensa
  a gaps do que uma lib madura; decisão de instalar uma nova dependência
  precisa de gate próprio.
- **Confusão mock/real:** se o modo (mock vs RPC) não for
  inequivocamente explícito, existe risco de a rota "parecer" gravar
  produção de verdade quando na verdade está em modo mock, ou vice-versa
  — daí a exigência explícita de que o modo seja impossível de habilitar
  por acidente (seção "Adapter interno").

### O que pode ser construído sem a RPC homologada (Entrega A)

Rota, autenticação, parsing, validação de Content-Type/tamanho/JSON,
extração e validação de `contrato_versao`, `correlation_id`, logs
sanitizados, respostas HTTP, e o adapter em modo mock — tudo isso não
depende da migration 071 estar aplicada em nenhum ambiente.

### O que permanece bloqueado (Entrega B)

Qualquer chamada real a `processar_evento_venda_externa_v1` contra um
banco de verdade — depende de um dos 4 caminhos listados na seção
"Dependência crítica" (nenhum disponível hoje).

### Dependências

Possível necessidade de 1 nova dependência de validação de schema (ex.
`zod`) — decisão do Gate 1.1, não instalada nesta auditoria. Nenhuma
outra dependência nova identificada como necessária para a Entrega A.

### Estimativa de tempo

Não medida — estimativa qualitativa: Entrega A (Gates 1.1–1.7, modo
mock) é um escopo pequeno e bem delimitado, compatível com poucas
sessões de trabalho; Entrega B depende de um bloqueio externo (ambiente
de homologação) sem prazo definido.

### Confirmação

Nada foi alterado, instalado ou executado nesta auditoria — só leitura
(`find`, `grep`, `ls`, `Read`) do código já existente e do
`.env.example`.
