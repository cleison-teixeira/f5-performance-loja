# PiùVita — Preview de Seed para Demo Recway

**Data de coleta:** 2026-06-20  
**Fonte:** https://www.ngpiuvita.com.br/  
**Loja de destino:** Cia Cidade Azul Angeloni  
**loja_id destino:** `b1000000-0000-0000-0000-000000000001`  
**Status:** REVISÃO PENDENTE — não aplicar no banco sem aprovação do Cleison

---

## Resumo da coleta

| Campo | Resultado |
|---|---|
| Produtos encontrados | 14 |
| Com imagem disponível | 8 (linha Piùfort + Formulados premium) |
| Sem imagem (pendente) | 6 (Isolados — site retornou empty.png) |
| Preços encontrados | 14/14 (todos com preço público) |
| Produtos selecionados para seed | 11 (ver tabela abaixo) |
| Produtos descartados desta fase | 3 (variantes de Creatina com pouca relevância para o perfil da loja) |

---

## Produtos selecionados para seed

> **Legenda recorrente:** `true` = produto de uso contínuo, gera avisos de recompra. `false` = produto pontual.  
> **Ciclo:** dias comerciais/operacionais de recompra — não representam prazo médico ou terapêutico.

| # | Nome | Linha | Preço (R$) | recorrente | Ciclo (dias) | qtd_msgs | foto_url | Status imagem |
|---|---|---|---|---|---|---|---|---|
| 1 | Piùfort Antiox | Formulados | 149,90 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 2 | Piùfort Slim | Formulados | 109,90 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 3 | Piùfort Woman | Formulados | 99,90 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 4 | Piùfort Imune | Formulados | 99,90 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 5 | Piùfort Gestan | Formulados | 197,00 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 6 | Piu AminoMix Sachê C/30 | Formulados | 95,90 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 7 | Piu Max Colágeno C/30 | Formulados | 101,10 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 8 | Piu Cuore D3 C/30 | Formulados | 106,60 | true | 30 | 3 | ver abaixo | ✅ disponível |
| 9 | Melatonina C/60 | Isolados | 48,80 | true | 60 | 3 | ⚠️ pendente | ❌ sem imagem |
| 10 | Coenzima Q10 C/60 | Isolados | 100,50 | true | 60 | 3 | ⚠️ pendente | ❌ sem imagem |
| 11 | Complexo B C/60 | Isolados | 48,80 | true | 60 | 3 | ⚠️ pendente | ❌ sem imagem |

### Descartados desta fase

| Nome | Motivo |
|---|---|
| Creatina Efervescente Uva (3 tamanhos) | Produto mais voltado a público de academia; relevância menor para o perfil Angeloni |
| Ácido Fólico C/60 | Coberto pelo Piùfort Gestan no contexto da loja |
| Cúrcuma C/60 | Avaliar se a loja trabalha; pendente de confirmação |

---

## URLs de imagens confirmadas

```
Piùfort Antiox:
https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_antiox_177_1_64b6371e485d0a1131e39130941eb9b4.jpg

Piùfort Slim:
https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_slim_185_1_b4595e7ff997dbf85c55d71f925e1bc1.jpg

Piùfort Woman:
https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_woman_183_1_64142bf4bc769ac2bc1b0459c0a21a94.jpg

Piùfort Imune:
https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_imune_181_1_f7c354d5edaa20f73c9b6e418fecdcf6.jpg

Piùfort Gestan:
https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_gestan_179_1_1fa6d7bc258379b312651101db101f6e.jpg

Piu AminoMix Sachê:
https://images.tcdn.com.br/img/img_prod/1357905/90_piu_aminomix_sache_c_30_123_1_c457b99753b198020103b929f2347e4d.png

Piu Max Colágeno:
https://images.tcdn.com.br/img/img_prod/1357905/90_piu_max_colageno_c_30_137_1_608279a27c4121f4eeb8d2ed03c0c5bb.png

Piu Cuore D3:
https://images.tcdn.com.br/img/img_prod/1357905/90_piu_cuore_d3_c_30_127_1_346cb0d18380ddf93869446314c98c82.png
```

> **Atenção:** URLs de CDN externo (tcdn.com.br). Confirmar estabilidade antes de armazenar em `foto_url`. Alternativa: baixar e hospedar no Supabase Storage da loja.

---

## Templates de mensagens por produto

> **Variáveis disponíveis:** `{cliente_nome}`, `{produto_nome}`, `{loja_nome}`, `{vendedora_nome}`  
> **Restrição:** nenhuma mensagem faz promessa terapêutica, diagnóstico ou alegação de cura/tratamento.

---

### Grupo A — Linha Piùfort (Antiox, Slim, Woman, Imune, Gestan)

Compartilham o mesmo padrão de mensagem, personalizados pelo `{produto_nome}`.

**Mensagem 1 — Agradecimento** `tipo: agradecimento | dias_apos_venda: 2`

```
Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌
```

**Mensagem 2 — Relacionamento** `tipo: relacionamento | dias_apos_venda: 14`

```
Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}. 
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿
```

**Mensagem 3 — Recompra** `tipo: recompra | dias_apos_venda: 30`

```
Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊
```

---

### Grupo B — Piu AminoMix Sachê C/30

**Mensagem 1 — Agradecimento** `tipo: agradecimento | dias_apos_venda: 2`

```
Oi, {cliente_nome}! 👋 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do Piu AminoMix! 
Lembre-se: um sachê por dia para aproveitar melhor. 💪
```

**Mensagem 2 — Relacionamento** `tipo: relacionamento | dias_apos_venda: 14`

```
Oi, {cliente_nome}! Tudo certo?

Já na metade da caixinha do AminoMix! Como está indo?
Qualquer dúvida, pode chamar. 😊
```

**Mensagem 3 — Recompra** `tipo: recompra | dias_apos_venda: 28`

```
Oi, {cliente_nome}! 💪 Aqui é {vendedora_nome} da {loja_nome}.

Seus sachês do AminoMix devem estar acabando — quer garantir o próximo?

Me chame aqui ou passe na {loja_nome}! 🙌
```

---

### Grupo C — Piu Max Colágeno C/30

**Mensagem 1 — Agradecimento** `tipo: agradecimento | dias_apos_venda: 2`

```
Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do Piu Max Colágeno!
Lembre-se de tomar diariamente para manter a regularidade. 🌿
```

**Mensagem 2 — Relacionamento** `tipo: relacionamento | dias_apos_venda: 14`

```
Oi, {cliente_nome}! Tudo bem?

Você já está na metade do Piu Max Colágeno — está gostando?
Qualquer dúvida, pode me chamar! 💬
```

**Mensagem 3 — Recompra** `tipo: recompra | dias_apos_venda: 28`

```
Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 🌿

Seu Piu Max Colágeno deve estar chegando no final!
Quer garantir o próximo? Me chame ou passe na loja. 😊
```

---

### Grupo D — Piu Cuore D3 C/30

**Mensagem 1 — Agradecimento** `tipo: agradecimento | dias_apos_venda: 2`

```
Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do Piu Cuore D3!
É um produto de uso diário — uma cápsula por dia é o suficiente. 🙌
```

**Mensagem 2 — Relacionamento** `tipo: relacionamento | dias_apos_venda: 14`

```
Oi, {cliente_nome}! Tudo bem?

Já na metade do Piu Cuore D3 — como está sendo?
Fico à disposição se tiver alguma dúvida. 💬
```

**Mensagem 3 — Recompra** `tipo: recompra | dias_apos_venda: 28`

```
Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 💊

Seu Piu Cuore D3 deve estar acabando em breve!
Quer garantir o próximo antes de interromper o uso? Me chame aqui. 😊
```

---

### Grupo E — Isolados (Melatonina, Q10, Complexo B) · ciclo 60 dias

**Mensagem 1 — Agradecimento** `tipo: agradecimento | dias_apos_venda: 2`

```
Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Qualquer dúvida sobre o produto, pode me chamar. 🙌
```

**Mensagem 2 — Relacionamento** `tipo: relacionamento | dias_apos_venda: 30`

```
Oi, {cliente_nome}! Tudo bem?

Já faz um mês desde que você levou o {produto_nome} — está gostando?
Se precisar de alguma coisa, estou por aqui. 🌿
```

**Mensagem 3 — Recompra** `tipo: recompra | dias_apos_venda: 58`

```
Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 😊

Seu {produto_nome} deve estar quase no fim —
quer garantir o próximo antes de acabar? Me chame aqui ou passe na loja! 🙌
```

---

## Campos pendentes de confirmação

| Produto | Campo pendente | Ação necessária |
|---|---|---|
| Melatonina C/60 | foto_url | Baixar do site manualmente ou solicitar à PiùVita |
| Coenzima Q10 C/60 | foto_url | Baixar do site manualmente ou solicitar à PiùVita |
| Complexo B C/60 | foto_url | Baixar do site manualmente ou solicitar à PiùVita |
| Todos | comissionavel_recompra | Confirmar percentual com Cleison antes do seed |
| Todos | modelo_id | Verificar se há modelo padrão de mensagens no banco |
| Piùfort Gestan | Público-alvo | Confirmar se a loja vende para gestantes — pode precisar de mensagem adaptada |

---

## Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| URLs de imagem CDN externo podem expirar | Médio | Baixar imagens e hospedar no Supabase Storage da loja |
| Nenhuma mensagem deve fazer promessa terapêutica | Alto | Templates revisados — nenhum afirma que produto trata, cura ou previne doença |
| Preços podem variar com promoções | Baixo | `preco_sugerido` é campo não-obrigatório; atualizar quando necessário |
| Piùfort Gestan é produto para gestantes | Médio | Equipe deve ser orientada sobre o público específico; mensagem neutra já preparada |

---

## Sugestão de seed SQL (fase 8.6B — não executar agora)

```sql
-- Executar APENAS após aprovação do Cleison
-- loja_id = 'b1000000-0000-0000-0000-000000000001'

-- INSERT INTO produtos (loja_id, nome, preco_sugerido, ativo, recorrente, comissionavel_recompra, qtd_mensagens, foto_url)
-- VALUES
--   ('b1000000-...', 'Piùfort Antiox', 149.90, true, true, true, 3, 'https://images.tcdn.com.br/...'),
--   ('b1000000-...', 'Piùfort Slim',   109.90, true, true, true, 3, 'https://images.tcdn.com.br/...'),
--   ...
-- Seguido de INSERT INTO mensagens_produto para cada produto.

-- SQL completo será gerado na Fase 8.6B após revisão deste documento.
```

---

## Próximos passos

- [ ] **Cleison revisar** esta lista de produtos e mensagens
- [ ] **Confirmar** quais produtos a Cia Cidade Azul Angeloni realmente trabalha
- [ ] **Decidir** sobre fotos: usar CDN externo ou hospedar no Supabase Storage
- [ ] **Confirmar** `comissionavel_recompra` e percentuais com a loja
- [ ] **Aprovar mensagens** para cada grupo de produto
- [ ] **Executar Fase 8.6B** (seed SQL + migration) após aprovação
