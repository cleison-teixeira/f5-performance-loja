# PiùVita — Auditoria Completa do Catálogo · Fase 8.6D

**Data:** 2026-06-21
**Loja alvo:** Cia Cidade Azul Angeloni
**loja_id:** `b1000000-0000-0000-0000-000000000001`
**Status:** AUDITORIA — nenhuma alteração no banco nesta fase

---

## Páginas auditadas

| Página | URL |
|---|---|
| Formulados pg=1 | https://www.ngpiuvita.com.br/suplementos/formulados?pg=1 |
| Formulados pg=2 | https://www.ngpiuvita.com.br/suplementos/formulados?pg=2 |
| Isolados | https://www.ngpiuvita.com.br/suplementos/isolados |

---

## Resumo da coleta

| Origem | Quantidade |
|---|---|
| Formulados pg=1 | 15 produtos |
| Formulados pg=2 | 2 produtos |
| Isolados | 13 produtos |
| **Total no site (sem duplicidade)** | **30 produtos** |
| Já no banco (PiùVita) | 11 produtos |
| Extra no banco (teste) | 1 produto (`Creatina Teste`) |
| **Faltantes no banco** | **19 produtos** |
| Com divergência | 1 produto (Piùfort Antiox — pendência conhecida) |

> **Atenção sobre imagens:** Todas as URLs retornaram `empty.png` durante a coleta (CDN de tema, não de produto). As URLs de imagem do seed anterior (`img_prod/1357905/...`) foram coletadas de páginas individuais de produto e podem ainda estar válidas — precisam de verificação manual. Recomendação: hospedar todas as imagens no Supabase Storage da loja.

---

## Catálogo completo — Formulados pg=1 (15 produtos)

| # | Nome site | Preço | URL produto |
|---|---|---|---|
| 1 | PIUFORT ANTIOX | R$149,90 | /suplementos/formulados/piufort-antiox |
| 2 | PIUFORT SLIM | R$109,90 | /suplementos/formulados/piufort-slim |
| 3 | PIUFORT WOMAN | R$99,90 | /suplementos/formulados/piufort-woman |
| 4 | PIUFORT IMUNE | R$99,90 | /suplementos/formulados/piufort-imune |
| 5 | PIUFORT GESTAN | R$197,00 | /suplementos/formulados/piufort-gestan |
| 6 | PIU BRAIN C/60 | R$201,50 | /formulados/piu-brain-c60 |
| 7 | PIU ZEN C/60 | R$107,10 | /formulados/piu-zen-c60 |
| 8 | PIU NAC PRO 200MG SACHE C/30 | R$85,40 | /formulados/piu-nac-pro-200mg-sache-c30 |
| 9 | PIU MULTI MULHER C/60 | R$75,70 | /formulados/piu-multi-mulher-c60 |
| 10 | PIU MULTI AZ C/60 | R$83,30 | /formulados/piu-multi-az-c60 |
| 11 | PIU MAX COLAGENO C/30 | R$101,10 | /formulados/piu-max-colageno-c30 |
| 12 | PIU MAG + MAGNESIO C/60 | R$101,10 | /formulados/piu-mag-magnesio-c60 |
| 13 | PIU ENERGY 2 C/30 | R$83,30 | /formulados/piu-energy-2-c30 |
| 14 | PIU ENERGY 1 C/60 | R$124,90 | /formulados/piu-energy-1-c60 |
| 15 | PIU CUORE D3 C/30 | R$106,60 | /formulados/piu-cuore-d3-c30 |

---

## Catálogo completo — Formulados pg=2 (2 produtos)

| # | Nome site | Preço | URL produto |
|---|---|---|---|
| 16 | PIU CUORE C/30 | R$95,20 | /formulados/piu-cuore-c30 |
| 17 | PIU AMINOMIX SACHE C/30 | R$95,90 | /formulados/piu-aminomix-sache-c30 |

---

## Catálogo completo — Isolados (13 produtos)

| # | Nome site | Preço | URL produto |
|---|---|---|---|
| 18 | MELATONINA C/60 | R$48,80 | /isolados/melatonina-c60 |
| 19 | COMPLEXO B C/60 | R$48,80 | /isolados/complexo-b-c60 |
| 20 | COENZIMA Q10 C/60 | R$100,50 | /isolados/coenzima-q10-c60 |
| 21 | CURCUMA C/60 | R$70,70 | /isolados/curcuma-c60 |
| 22 | ACIDO FOLICO C/60 | R$56,40 | /isolados/acido-folico-c60 |
| 23 | B12 + METILFOLATO C/60 | R$65,20 | /formulados/b12-metilfolato-c60 |
| 24 | CREATINA EFERVESCENTE UVA 360 GR | R$89,80 | /suplementos/isolados/creatina-efervescente-uva-360-gr |
| 25 | CREATINA EFERVESCENTE UVA 180 GR | R$74,80 | /suplementos/isolados/creatina-efervescente-uva-180-gr |
| 26 | CREATINA EFERVESCENTE UVA 150 GR | R$84,00 | /isolados/creatina-efervescente-uva-150-gr |
| 27 | CREATINA EFERVESCENTE NATURAL 360 GR | R$89,80 | /suplementos/isolados/creatina-efervescente-natural-360-gr |
| 28 | CREATINA EFERVESCENTE NATURAL 150 GR | R$84,00 | /isolados/creatina-efervescente-natural-150-gr |
| 29 | CREATINA EFERVESCENTE MACA VERDE 360 GR | R$89,80 | /suplementos/isolados/creatina-efervescente-maca-verde-360-gr |
| 30 | CREATINA EFERVESCENTE MACA VERDE 180 GR | R$74,80 | /suplementos/isolados/creatina-efervescente-maca-verde-180-gr |

> **Nota:** o site classifica B12 + Metilfolato em `/formulados/`, mas a página de listagem era `/isolados`. Cadastrar como `categoria = Isolados` para manter consistência com a página de origem.

---

## Comparação com banco — Tabela completa

### Status A — Já existe correto (11 produtos)

| Nome no banco | Preço banco | Preço site | foto_url | Obs |
|---|---|---|---|---|
| Piùfort Antiox | R$149,90 ✅ | R$149,90 | Supabase Storage | Pendências em mensagens (ver seção Antiox) |
| Piùfort Slim | R$109,90 ✅ | R$109,90 | tcdn CDN* | ok |
| Piùfort Woman | R$99,90 ✅ | R$99,90 | tcdn CDN* | ok |
| Piùfort Imune | R$99,90 ✅ | R$99,90 | tcdn CDN* | ok |
| Piùfort Gestan | R$197,00 ✅ | R$197,00 | tcdn CDN* | ok |
| Piu AminoMix Sachê C/30 | R$95,90 ✅ | R$95,90 | tcdn CDN* | ok |
| Piu Max Colágeno C/30 | R$101,10 ✅ | R$101,10 | tcdn CDN* | ok |
| Piu Cuore D3 C/30 | R$106,60 ✅ | R$106,60 | tcdn CDN* | ok |
| Melatonina C/60 | R$48,80 ✅ | R$48,80 | null | ok |
| Coenzima Q10 C/60 | R$100,50 ✅ | R$100,50 | null | ok |
| Complexo B C/60 | R$48,80 ✅ | R$48,80 | null | ok |

> \* **tcdn CDN:** URLs do tipo `images.tcdn.com.br/img/img_prod/1357905/...` — coletadas na fase 8.6A. O site agora retorna `empty.png` nas páginas de listagem, mas as URLs img_prod/ podem ainda funcionar. **Verificar antes do deploy da demo.** Se inválidas, subir para Supabase Storage.

### Status B — Divergência conhecida (1 produto)

| Nome | Divergência | Ação necessária |
|---|---|---|
| Piùfort Antiox | msg3 dias=25 (deve ser 30); textos usam `{vendedora}`, `{loja}`, `{produto}`, `{cliente}` (deve ser `{vendedora_nome}` etc.) | Fase 8.6E — normalização |

### Status C — Faltante no banco (19 produtos)

#### Formulados faltantes (9)

| # | Nome sugerido para banco | Preço | Ciclo | Grupo msgs |
|---|---|---|---|---|
| 1 | Piu Brain C/60 | R$201,50 | C/60 → msg3: 58 dias | Formulados C/60 |
| 2 | Piu Zen C/60 | R$107,10 | C/60 → msg3: 58 dias | Formulados C/60 |
| 3 | Piu NAC Pro 200mg Sachê C/30 | R$85,40 | C/30 → msg3: 28 dias | Formulados C/30 |
| 4 | Piu Multi Mulher C/60 | R$75,70 | C/60 → msg3: 58 dias | Formulados C/60 |
| 5 | Piu Multi AZ C/60 | R$83,30 | C/60 → msg3: 58 dias | Formulados C/60 |
| 6 | Piu MAG + Magnésio C/60 | R$101,10 | C/60 → msg3: 58 dias | Formulados C/60 |
| 7 | Piu Energy 2 C/30 | R$83,30 | C/30 → msg3: 28 dias | Formulados C/30 |
| 8 | Piu Energy 1 C/60 | R$124,90 | C/60 → msg3: 58 dias | Formulados C/60 |
| 9 | Piu Cuore C/30 | R$95,20 | C/30 → msg3: 28 dias | Formulados C/30 |

#### Isolados faltantes (10)

| # | Nome sugerido para banco | Preço | Ciclo | Grupo msgs |
|---|---|---|---|---|
| 10 | Cúrcuma C/60 | R$70,70 | C/60 → msg3: 58 dias | Isolados C/60 |
| 11 | Ácido Fólico C/60 | R$56,40 | C/60 → msg3: 58 dias | Isolados C/60 |
| 12 | B12 + Metilfolato C/60 | R$65,20 | C/60 → msg3: 58 dias | Isolados C/60 |
| 13 | Creatina Efervescente Uva 360g | R$89,80 | ~45 dias → msg3: 44 dias | Creatinas 360g |
| 14 | Creatina Efervescente Uva 180g | R$74,80 | ~30 dias → msg3: 28 dias | Creatinas 150/180g |
| 15 | Creatina Efervescente Uva 150g | R$84,00 | ~30 dias → msg3: 28 dias | Creatinas 150/180g |
| 16 | Creatina Efervescente Natural 360g | R$89,80 | ~45 dias → msg3: 44 dias | Creatinas 360g |
| 17 | Creatina Efervescente Natural 150g | R$84,00 | ~30 dias → msg3: 28 dias | Creatinas 150/180g |
| 18 | Creatina Efervescente Maçã Verde 360g | R$89,80 | ~45 dias → msg3: 44 dias | Creatinas 360g |
| 19 | Creatina Efervescente Maçã Verde 180g | R$74,80 | ~30 dias → msg3: 28 dias | Creatinas 150/180g |

### Status Extra — Produto no banco sem correspondência no catálogo

| Nome | Obs |
|---|---|
| Creatina Teste | Produto de teste cadastrado manualmente. Não faz parte do catálogo PiùVita. Sugerir remoção ou manutenção como produto interno. Não deve entrar no seed complementar. |

---

## Produtos com foto_url pendente

| Produto | Situação |
|---|---|
| Melatonina C/60 | foto_url = null. Imagem não encontrada no CDN. |
| Coenzima Q10 C/60 | foto_url = null. Imagem não encontrada no CDN. |
| Complexo B C/60 | foto_url = null. Imagem não encontrada no CDN. |
| Todos os 19 faltantes | foto_url = null no seed. Imagens a serem obtidas manualmente. |
| Piùfort Slim / Woman / Imune / Gestan / AminoMix / Colágeno / Cuore D3 | foto_url via tcdn CDN — verificar validade antes da demo. |

---

## Ciclos sugeridos por grupo

| Grupo | Ciclo | msg1 | msg2 | msg3 |
|---|---|---|---|---|
| Piùfort C/30 (Antiox/Slim/Woman/Imune/Gestan) | 30 dias | 2 | 14 | 30 |
| Formulados C/30 (Colágeno/Cuore D3/AminoMix/NAC Pro/Energy 2/Cuore) | 30 dias | 2 | 14 | 28 |
| Formulados C/60 (Brain/Zen/Multi Mulher/Multi AZ/MAG+Mag/Energy 1) | 60 dias | 2 | 30 | 58 |
| Isolados C/60 (Melatonina/Q10/Complexo B/Cúrcuma/Ácido Fólico/B12+Met) | 60 dias | 2 | 30 | 58 |
| Creatinas 150/180g | ~30 dias | 2 | 14 | 28 |
| Creatinas 360g | ~45 dias | 2 | 21 | 44 |

> **Justificativa dos ciclos:** Antecipação de 2 dias antes do fim para formulados (28 vs 30, 58 vs 60) garante que a cliente receba o aviso antes de ficar sem o produto. Piùfort mantém 30 dias exatos por consistência com entrada histórica. Creatinas 360g usam ciclo de 45 dias assumindo ~5g/dia (72 doses ÷ 1,6 porções/dia ≈ 45 dias).

---

## Templates de mensagens por grupo

> Variáveis: `{cliente_nome}`, `{vendedora_nome}`, `{loja_nome}`, `{produto_nome}`
> Sem promessas terapêuticas, diagnósticos ou alegações de cura/tratamento.

---

### Grupo 1 — Formulados Piùfort (Antiox, Slim, Woman, Imune, Gestan)

**Mensagem 1 — Agradecimento** `dias_apos_venda: 2`
```
Olá, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}! Espero que goste muito.

Qualquer dúvida sobre o produto, pode me chamar aqui. 🙌
```

**Mensagem 2 — Relacionamento** `dias_apos_venda: 14`
```
Oi, {cliente_nome}! Tudo bem?

Já faz duas semanas desde que você começou o {produto_nome}.
Como está sendo a experiência? Qualquer dúvida é só chamar! 🌿
```

**Mensagem 3 — Recompra** `dias_apos_venda: 30`
```
Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final — que tal garantir o próximo antes de acabar?

Pode me chamar aqui ou passar na loja. 😊
```

---

### Grupo 2 — Formulados C/30 (Colágeno, Cuore D3, AminoMix, NAC Pro, Energy 2, Cuore C/30)

**Mensagem 1 — Agradecimento** `dias_apos_venda: 2`
```
Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Lembre-se de usar diariamente para aproveitar melhor. 🌿
```

**Mensagem 2 — Relacionamento** `dias_apos_venda: 14`
```
Oi, {cliente_nome}! Tudo certo?

Você já está na metade do {produto_nome} — como está indo?
Qualquer dúvida, pode me chamar. 😊
```

**Mensagem 3 — Recompra** `dias_apos_venda: 28`
```
Oi, {cliente_nome}! 💊 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar chegando no final!
Quer garantir o próximo? Me chame aqui ou passe na loja. 😊
```

---

### Grupo 3 — Formulados C/60 (Brain, Zen, Multi Mulher, Multi AZ, MAG+Magnésio, Energy 1)

**Mensagem 1 — Agradecimento** `dias_apos_venda: 2`
```
Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Qualquer dúvida sobre o produto, pode me chamar. 🙌
```

**Mensagem 2 — Relacionamento** `dias_apos_venda: 30`
```
Oi, {cliente_nome}! Tudo bem?

Já faz um mês desde que você começou o {produto_nome} — como está sendo?
Estou por aqui se precisar de algo. 🌿
```

**Mensagem 3 — Recompra** `dias_apos_venda: 58`
```
Oi, {cliente_nome}! 🌿 Aqui é {vendedora_nome} da {loja_nome}.

Seu {produto_nome} deve estar quase no fim —
quer garantir o próximo antes de acabar? Me chame aqui ou passe na loja! 😊
```

---

### Grupo 4 — Isolados C/60 (Melatonina, Q10, Complexo B, Cúrcuma, Ácido Fólico, B12+Metilfolato)

**Mensagem 1 — Agradecimento** `dias_apos_venda: 2`
```
Oi, {cliente_nome}! 😊 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra do {produto_nome}!
Qualquer dúvida sobre o produto, pode me chamar. 🙌
```

**Mensagem 2 — Relacionamento** `dias_apos_venda: 30`
```
Oi, {cliente_nome}! Tudo bem?

Já faz um mês desde que você levou o {produto_nome} — está gostando?
Se precisar de alguma coisa, estou por aqui. 🌿
```

**Mensagem 3 — Recompra** `dias_apos_venda: 58`
```
Oi, {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}. 😊

Seu {produto_nome} deve estar quase no fim —
quer garantir o próximo antes de acabar? Me chame aqui ou passe na loja! 🙌
```

---

### Grupo 5 — Creatinas 150/180g (ciclo ~30 dias)

**Mensagem 1 — Agradecimento** `dias_apos_venda: 2`
```
Oi, {cliente_nome}! 💪 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra da {produto_nome}!
Qualquer dúvida sobre o uso, pode me chamar. 😊
```

**Mensagem 2 — Relacionamento** `dias_apos_venda: 14`
```
Oi, {cliente_nome}! Tudo certo?

Já na metade da {produto_nome} — como está indo?
Estou por aqui se precisar de algo. 💪
```

**Mensagem 3 — Recompra** `dias_apos_venda: 28`
```
Oi, {cliente_nome}! 💪 Aqui é {vendedora_nome} da {loja_nome}.

Sua {produto_nome} deve estar acabando — quer garantir a próxima?
Me chame aqui ou passe na {loja_nome}! 😊
```

---

### Grupo 6 — Creatinas 360g (ciclo ~45 dias)

**Mensagem 1 — Agradecimento** `dias_apos_venda: 2`
```
Oi, {cliente_nome}! 💪 Aqui é {vendedora_nome} da {loja_nome}.

Obrigada pela compra da {produto_nome}!
Qualquer dúvida sobre o uso, pode me chamar. 😊
```

**Mensagem 2 — Relacionamento** `dias_apos_venda: 21`
```
Oi, {cliente_nome}! Tudo certo?

Três semanas com a {produto_nome} — como está sendo?
Estou por aqui se tiver alguma dúvida. 💪
```

**Mensagem 3 — Recompra** `dias_apos_venda: 44`
```
Oi, {cliente_nome}! 💪 Aqui é {vendedora_nome} da {loja_nome}.

Sua {produto_nome} deve estar chegando no final — quer garantir a próxima?
Me chame aqui ou passe na {loja_nome}! 😊
```

---

## Pendência — Piùfort Antiox (não corrigir nesta fase)

| Campo | Situação atual | Deve ficar |
|---|---|---|
| `preco_sugerido` | R$149,90 ✅ | R$149,90 |
| `qtd_mensagens` | 3 ✅ | 3 |
| msg1 `dias_apos_venda` | 2 ✅ | 2 |
| msg2 `dias_apos_venda` | 14 ✅ | 14 |
| msg3 `dias_apos_venda` | **25** ⚠️ | 30 |
| msg1 texto | variáveis antigas (`{vendedora}`, `{loja}`, `{produto}`, `{cliente}`) ⚠️ | variáveis novas |
| msg2 texto | variáveis antigas ⚠️ | variáveis novas |
| msg3 texto | variáveis antigas ⚠️ | variáveis novas |

**Ação Fase 8.6E:** substituir textos e corrigir msg3 `dias_apos_venda` de 25 para 30.

---

## Recomendação para Fase 8.6E — Seed complementar

### Escopo

1. **Inserir 19 produtos faltantes** com `foto_url = null` (imagens a confirmar):
   - 9 formulados
   - 10 isolados (incluindo 7 creatinas em 3 sabores e 2 tamanhos + 150g)

2. **Normalizar Piùfort Antiox:**
   - Corrigir `msg3 dias_apos_venda` de 25 para 30
   - Substituir textos de msg1, msg2 e msg3 para usar variáveis `{_nome}` atuais (Grupo 1 padrão)

3. **Mensagens para novos produtos:**
   - Grupo 2 (Formulados C/30): Cuore C/30, NAC Pro, Energy 2
   - Grupo 3 (Formulados C/60): Brain, Zen, Multi Mulher, Multi AZ, MAG+Magnésio, Energy 1
   - Grupo 4 (Isolados C/60): Cúrcuma, Ácido Fólico, B12+Metilfolato
   - Grupo 5 (Creatinas 150/180g): Uva 180g, Uva 150g, Natural 150g, Maçã Verde 180g
   - Grupo 6 (Creatinas 360g): Uva 360g, Natural 360g, Maçã Verde 360g

4. **Pendências não bloqueantes:**
   - Verificar validade das URLs tcdn CDN existentes
   - Definir se `Creatina Teste` deve ser removida ou mantida

### Total do seed 8.6E

| Ação | Quantidade |
|---|---|
| INSERT produtos | 19 |
| INSERT mensagens | 57 (3 por produto) |
| UPDATE Antiox msg3 dias | 1 |
| UPDATE Antiox msg1/msg2/msg3 textos | 3 |
| **Total de operações** | **80** |

---

## Confirmações desta fase

| Item | Status |
|---|---|
| Banco alterado | ❌ Não |
| Antiox corrigido nesta fase | ❌ Não |
| Código alterado | ❌ Não |
| RLS alterado | ❌ Não |
| Migrations criadas | ❌ Não |
