# F5 Recompra — Regras permanentes para Claude Code

## Produto

F5 Recompra é um micro SaaS para lojas recuperarem recompras de clientes que já compraram produtos recorrentes.

O produto NÃO é ERP, PDV, CRM completo, financeiro ou sistema de comissão.

O 80/20 do MVP é:

1. Registrar compra recorrente.
2. Gerar avisos automáticos.
3. Fila de Recompra.
4. Relacionamento.
5. Confirmar recompra.
6. Reagendar.
7. Cliente não quer mais.
8. Dashboard de dinheiro na mesa.

## Modelo comercial

O MVP usa:

* Acesso Loja
* Acesso Dono Multi-loja
* Admin F5

Não vender por usuário/vendedora/gerente.

Vendedora e gerente são perfis técnicos, mas comercialmente viram Acesso Loja.

## Definições

Oportunidade de Recompra = cliente + produto + venda de origem, preferencialmente dedup por venda_id + produto_id/item_venda_id.

Aviso = mensagem/tentativa de contato dentro da oportunidade.

Fila de Recompra = somente tipos recompra/oferta.

Relacionamento = somente tipos agradecimento/relacionamento.

## Regras técnicas críticas

Antes de qualquer alteração:

* Rodar git status.
* Não sobrescrever mudanças pendentes.
* Não criar migration sem autorização explícita.
* Não alterar RLS sem autorização explícita.
* Não deletar dados sem autorização explícita.
* Não resetar banco/seed sem autorização explícita.
* Não mudar regra de cálculo aprovada sem explicar impacto.

Sempre rodar:
npm run build

Antes de commit.

## Segurança

Quando usar admin client:

* Validar auth.
* Validar pertencimento à loja.
* Validar escopo de loja.
* Nunca expor dados de loja que o usuário não pertence.

## UI/Produto

Evitar linguagem de comissão no MVP.
Evitar linguagem de ERP.
Priorizar:

* dinheiro na mesa;
* recompra em aberto;
* recuperado;
* cliente para acionar;
* responsável pela ação;
* loja/unidade.

## Acesso Loja

Vendedora e gerente devem operar a loja inteira.
A rastreabilidade vem do campo responsável, não necessariamente do usuário logado.

## Multi-loja

Dono deve ver consolidado das lojas vinculadas.
Dashboard de dono/multi-loja deve somar todas as lojas permitidas, não apenas a loja ativa.

## Contexto de loja

Cookie `f5_loja_ctx` guarda a loja selecionada pelo dono (UUID) ou vazio para "Toda a rede".

Helper `getContextoLoja(userId, multiLoja)` em `lib/loja/contexto.ts`:
- Retorna `{ lojas, lojaId, escopo: 'rede'|'loja', lojaIds, lojaNome }`
- Para usuários single-loja: sempre `escopo = 'loja'`
- Para multi-loja sem cookie: `escopo = 'rede'`, `lojaIds = [todas]`

Regra de telas:
- Dashboard / Fila / Relacionamento: aceitam `escopo = 'rede'` (agrega tudo)
- Registrar Compra / Equipe / Produtos: requerem loja específica — mostrar aviso se `escopo = 'rede'`

O seletor global `SeletorLojaGlobal` fica no layout, abaixo do Header, visível apenas para dono/admin_f5 com mais de 1 loja.

## Testes no navegador — regra permanente

É proibido utilizar contas, lojas, vendedores ou clientes reais em testes.

Antes de qualquer ação de escrita no navegador:

1. Identificar o usuário logado (email visível na tela ou via Supabase auth.users).
2. Identificar o perfil_id.
3. Identificar a loja selecionada no contexto.
4. Comparar com a allowlist de contas de teste abaixo.
5. Se não estiver na allowlist, abortar imediatamente. Não clicar em salvar. Não preencher formulários. Fazer logout.

Contas reais — NUNCA usar em testes:

* Fábio (fabiomedeirosmagalhaes@gmail.com)
* Júlia, Carla, Débora, Juçara e demais gestores e vendedores reais
* Qualquer conta de loja operacional (Cia Cidade Azul, etc.)
* Qualquer cliente real

Contas controladas — permitidas somente com autorização explícita:

* cleisonimarketing+dono2@gmail.com
* cleisonimarketing+loja2@gmail.com
* Outros perfis fictícios da Rede Verde Essencial ou lojas de teste claramente identificadas

Condições obrigatórias para gravar dados em produção via browser:

1. Conta na allowlist.
2. Loja fictícia/controlada.
3. Cliente fictício.
4. Produtos de teste.
5. Autorização explícita do usuário para aquela gravação específica.

Sem todas as cinco condições, realizar somente smoke test de leitura (navegação visual, sem submissão de formulários).

Em caso de dúvida: abortar, fazer logout, auditar banco antes de continuar.

## Proteção de segredos (OPS-0001) — regra permanente

Nunca ler, imprimir, resumir, copiar, codificar ou transmitir o conteúdo de arquivos sensíveis: `.env` e variantes (`.local`/`.development`/`.preview`/`.production`/`.staging`/`.test`), `*.pem`, `*.key`, `id_rsa*`, `credentials*`, `secrets*`, `service-account*`, arquivos de autenticação da Vercel/Supabase/GitHub/Claude Code. `.env.example` (sanitizado) é sempre permitido.

Se uma tarefa precisar de um segredo:
- Pedir para o usuário inserir o valor diretamente no dashboard do serviço (Vercel/Supabase), nunca no chat.
- Validar apenas presença, nome ou tamanho de uma variável, quando isso não permitir inferir o valor.
- Nunca pedir para o usuário colar uma chave no chat.

Controles técnicos (não remover sem autorização explícita):
- `.claude/settings.json` → `permissions.deny`: bloqueia leitura direta, utilitários shell, interpretadores inline, cópia/renomeio e `git add` desses arquivos.
- `.claude/hooks/block_secret_reads.py` (`hooks.PreToolUse`): defesa em profundidade para os vetores que as regras declarativas não cobrem sozinhas (ex.: variantes menos comuns, `env`/`printenv` que imprimem, execução de código inline). Falha fechada: erro interno ou JSON inesperado bloqueia a chamada, não libera.

**Limitação conhecida:** um script Node/Python que abra um arquivo sensível diretamente pelo próprio código (não via um comando reconhecível na string do Bash) pode não ser bloqueado pelas camadas acima. Proteção completa exigiria `sandbox.enabled` (isolamento a nível de SO via Seatbelt no macOS) — não implementado nesta tarefa por isolar também a rede, exigindo allowlist de domínio para todo comando Bash (Supabase/Vercel/GitHub/npm); ver recomendação registrada em STATE.md/HANDOFF.md.

## Tradutor Técnico (SEC-TRAD-0001) — regra permanente

Antes de qualquer chamada de ferramenta que não seja leitura segura, é
obrigatório comunicar a ação em português simples ANTES da tool call (nunca
depois). O nível de detalhe depende do risco:

- **AMARELO e VERMELHO**: sempre exigem o painel completo (formato abaixo).
- **VERDE que já é auto-aprovado** por `.claude/settings.json` (não gera
  prompt de aprovação ao usuário): basta uma frase curta, de uma linha,
  dizendo o que será lido — sem o painel completo.
- **VERDE que gerar um prompt de aprovação** (ex.: comando não coberto por
  uma regra `allow`): exibir o painel completo normalmente, como qualquer
  outra ação que peça aprovação.

### Formato do painel completo

RISCO:
🟢 VERDE | 🟡 AMARELO | 🔴 VERMELHO

AMBIENTE:
LOCAL | GitHub (pode gerar Preview) | STAGING | PRODUÇÃO | NÃO SE APLICA

AFETA:
☐ Arquivos do projeto
☐ Git local
☐ GitHub
☐ Banco
☐ Produção
☐ Configuração global

O QUE VAI FAZER:
(máximo 3 linhas, português simples, sem jargão técnico)

O QUE PODE ALTERAR:
(uma ou mais opções: nada / arquivos do projeto / Git local / GitHub / Deploy Preview (automático, se configurado) / staging / banco / produção / configuração global / arquivos fora do repositório)

EFEITOS INDIRETOS CONHECIDOS:
(ex.: "push para esta branch pode disparar deploy Preview na Vercel";
"merge em main pode disparar deploy de produção"; ou "nenhum conhecido")

POR QUE ESTA APROVAÇÃO É NECESSÁRIA:
(uma frase)

REVERSIBILIDADE:
reversível | reversível com rollback | parcialmente reversível | irreversível | não determinado — parar para revisão

MINHA RECOMENDAÇÃO:
EXECUTAR — SOMENTE LEITURA (só para VERDE) | APROVAR UMA VEZ | 🛑 PARAR PARA REVISÃO | NÃO APROVAR

### Regra de preenchimento do AFETA

No painel efetivamente exibido, marcar (☑) somente os itens realmente
afetados pela ação; os demais permanecem desmarcados (☐). Exemplos:

- Editar arquivo → ☑ Arquivos do projeto
- Commit → ☑ Arquivos do projeto, ☑ Git local
- Push → ☑ Arquivos do projeto, ☑ Git local, ☑ GitHub
- Migration em produção → ☑ Arquivos do projeto, ☑ Git local, ☑ GitHub, ☑ Banco, ☑ Produção
- Alteração de ~/.claude → ☑ Configuração global

### Regra de preenchimento do AMBIENTE

Push/PR que afetam apenas o repositório remoto usam
`GitHub (pode gerar Preview)`, não `STAGING` — o push em si não coloca nada
em staging; o deploy Preview é uma consequência automática da Vercel, não o
ambiente da própria ação.

### Classificação mínima

VERDE:
- git status / diff / log / show
- build
- testes
- leitura segura
- consultas somente leitura

AMARELO:
- criação/edição de arquivo, **incluindo criar/editar um arquivo de
  migration** (o arquivo em si, ainda não aplicado)
- git add
- commit
- push para branch de feature
- instalação de dependência
- deploy Preview
- configuração local do projeto

VERMELHO:
- **aplicar migration em staging**
- **aplicar migration em produção** — gate crítico separado (ver seção
  abaixo)
- SQL de escrita
- Supabase produção
- Vercel produção
- push para main
- merge
- force push
- reset --hard
- rm -rf
- segredos
- configuração global
- alteração de permissões

### Regras de desempate

- Em caso de dúvida sobre a classificação, classificar como AMARELO — nunca
  como VERDE.
- Comandos compostos (`a && b`, pipelines, scripts que disparam múltiplas
  ações) recebem a classificação da ação mais arriscada entre as que os
  compõem.
- Nunca recomendar "sempre aprovar"/"always allow" para ações AMARELAS ou
  VERMELHAS.

### Gate crítico de produção (ações VERMELHAS)

- Nunca recomendar "APROVAR UMA VEZ" para uma ação VERMELHA sem citar
  explicitamente o gate aplicável e as pré-condições necessárias (ex.:
  autorização explícita já dada pelo usuário para esta ação específica,
  ambiente confirmado, plano de rollback/backup disponível).
- As categorias **produção, merge para main, migration aplicada (staging ou
  produção), SQL de escrita e alteração de permissões** sempre recomendam
  PARAR PARA REVISÃO até que exista autorização explícita do usuário para
  aquela ação específica. Somente depois dessa autorização explícita uma
  nova invocação do painel pode citar o gate/pré-condições atendidas e
  recomendar APROVAR UMA VEZ.
- Ao recomendar 🛑 PARAR PARA REVISÃO, incluir logo abaixo uma linha
  "Motivo:" com uma frase curta explicando por que a ação exige o processo
  completo de Gate do F5, além do gate e das pré-condições já exigidos
  acima.

### Limites desta regra

Este painel é uma camada informativa e comportamental. Ele não substitui,
não simula e não deve ser apresentado como equivalente ao controle técnico
de `.claude/settings.json` (allow/ask/deny) nem a qualquer hook. O painel
deve ser exibido mesmo quando a ação já é tecnicamente auto-aprovada — e,
mesmo quando recomendar PARAR PARA REVISÃO ou NÃO APROVAR, a trava real
depende das permissões configuradas, não do texto do painel. Esta regra não
modifica hooks: o `PreToolUse` de proteção de segredos
(`block_secret_reads.py`) permanece a única camada técnica de bloqueio
automático.

## Relatórios finais

Ao finalizar uma fase, responder curto:

1. Arquivos alterados
2. O que mudou
3. O que não foi alterado
4. Build
5. Commit/push
6. Testes recomendados

Evitar relatórios longos demais.
