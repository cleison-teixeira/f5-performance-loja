const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables manually
const envFile = fs.readFileSync('/Users/cleissonteixeira/F5-Recompra/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const storeIds = [
  'b1000000-0000-0000-0000-000000000001', // Cia Cidade Azul Angeloni (alternative/legacy)
  'b2000000-0000-0000-0000-000000000001', // CIA CIDADE AZUL - ANGELONI
  'b2000000-0000-0000-0000-000000000002', // CIA CIDADE AZUL - KOMPRÃO SÃO JOÃO
  'b2000000-0000-0000-0000-000000000003'  // CIA CIDADE AZUL - KOMPRÃO CENTRO
];

const products = [
  {
    nome: 'Piùfort Antiox',
    preco_sugerido: 149.90,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_antiox_177_1_64b6371e485d0a1131e39130941eb9b4.jpg',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_antiox_177_1_64b6371e485d0a1131e39130941eb9b4.jpg'],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Ola {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piùfort Antiox. Qualquer duvida sobre o produto, pode me chamar por aqui.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja faz duas semanas que voce comecou o Piùfort Antiox. Como esta sendo sua experiencia? Qualquer duvida e so chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 30, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piùfort Antiox deve estar no final. Quer garantir o proximo antes de acabar? Me chama aqui.' }
    ]
  },
  {
    nome: 'Piùfort Slim',
    preco_sugerido: 109.90,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_slim_185_1_b4595e7ff997dbf85c55d71f925e1bc1.jpg',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_slim_185_1_b4595e7ff997dbf85c55d71f925e1bc1.jpg'],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Ola {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piùfort Slim. Qualquer duvida sobre o produto, pode me chamar por aqui.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja faz duas semanas que voce comecou o Piùfort Slim. Como esta sendo sua experiencia? Qualquer duvida e so chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 30, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piùfort Slim deve estar no final. Quer garantir o proximo antes de acabar? Me chama aqui.' }
    ]
  },
  {
    nome: 'Piùfort Woman',
    preco_sugerido: 99.90,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_woman_183_1_64142bf4bc769ac2bc1b0459c0a21a94.jpg',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_woman_183_1_64142bf4bc769ac2bc1b0459c0a21a94.jpg'],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Ola {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piùfort Woman. Qualquer duvida sobre o produto, pode me chamar por aqui.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja faz duas semanas que voce comecou o Piùfort Woman. Como esta sendo sua experiencia? Qualquer duvida e so chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 30, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piùfort Woman deve estar no final. Quer garantir o proximo antes de acabar? Me chama aqui.' }
    ]
  },
  {
    nome: 'Piùfort Imune',
    preco_sugerido: 99.90,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_imune_181_1_f7c354d5edaa20f73c9b6e418fecdcf6.jpg',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_imune_181_1_f7c354d5edaa20f73c9b6e418fecdcf6.jpg'],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Ola {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piùfort Imune. Qualquer duvida sobre o produto, pode me chamar por aqui.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja faz duas semanas que voce comecou o Piùfort Imune. Como esta sendo sua experiencia? Qualquer duvida e so chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 30, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piùfort Imune deve estar no final. Quer garantir o proximo antes de acabar? Me chama aqui.' }
    ]
  },
  {
    nome: 'Piùfort Gestan',
    preco_sugerido: 197.00,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_gestan_179_1_1fa6d7bc258379b312651101db101f6e.jpg',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piufort_gestan_179_1_1fa6d7bc258379b312651101db101f6e.jpg'],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Ola {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piùfort Gestan. Qualquer duvida sobre o produto, pode me chamar por aqui.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja faz duas semanas que voce comecou o Piùfort Gestan. Como esta sendo sua experiencia? Qualquer duvida e so chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 30, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piùfort Gestan deve estar no final. Quer garantir o proximo antes de acabar? Me chama aqui.' }
    ]
  },
  {
    nome: 'Piu AminoMix Sachê C/30',
    preco_sugerido: 95.90,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piu_aminomix_sache_c_30_123_1_c457b99753b198020103b929f2347e4d.png',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piu_aminomix_sache_c_30_123_1_c457b99753b198020103b929f2347e4d.png'],
    variantes: ['30 sachês'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu AminoMix. Lembre-se: um sache por dia para aproveitar melhor.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo certo? Ja na metade da caixinha do AminoMix. Como esta indo? Qualquer duvida e so chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seus saches do AminoMix devem estar acabando. Quer garantir o proximo? Me chame aqui.' }
    ]
  },
  {
    nome: 'Piu Max Colágeno C/30',
    preco_sugerido: 101.10,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piu_max_colageno_c_30_137_1_608279a27c4121f4eeb8d2ed03c0c5bb.png',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piu_max_colageno_c_30_137_1_608279a27c4121f4eeb8d2ed03c0c5bb.png'],
    variantes: ['30 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Max Colageno. Lembre-se de tomar diariamente para manter a regularidade.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Voce ja esta na metade do Piu Max Colageno. Esta gostando? Qualquer duvida e so me chamar.' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Max Colageno deve estar chegando no final. Quer garantir o proximo? Me chame aqui.' }
    ]
  },
  {
    nome: 'Piu Cuore D3 C/30',
    preco_sugerido: 106.60,
    recorrente: true,
    foto_url: 'https://images.tcdn.com.br/img/img_prod/1357905/90_piu_cuore_d3_c_30_127_1_346cb0d18380ddf93869446314c98c82.png',
    galeria_urls: ['https://images.tcdn.com.br/img/img_prod/1357905/90_piu_cuore_d3_c_30_127_1_346cb0d18380ddf93869446314c98c82.png'],
    variantes: ['30 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Cuore D3. E um produto de uso diario, uma capsula por dia.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja na metade do Piu Cuore D3. Como esta sendo? Fico a disposicao se tiver alguma duvida.' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Cuore D3 deve estar acabando. Quer garantir o proximo para nao interromper o uso? Me chame.' }
    ]
  },
  {
    nome: 'Melatonina C/60',
    preco_sugerido: 48.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Melatonina. Qualquer duvida sobre o produto, pode me chamar.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz um mes desde que voce levou a Melatonina. Esta gostando? Se precisar de algo, estou por aqui.' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Melatonina deve estar quase no fim. Quer garantir a proxima? Me chame aqui.' }
    ]
  },
  {
    nome: 'Coenzima Q10 C/60',
    preco_sugerido: 100.50,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Coenzima Q10. Qualquer duvida sobre o produto, pode me chamar.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz um mes desde que voce levou a Coenzima Q10. Esta gostando? Se precisar de algo, estou por aqui.' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Coenzima Q10 deve estar quase no fim. Quer garantir a proxima? Me chame aqui.' }
    ]
  },
  {
    nome: 'Complexo B C/60',
    preco_sugerido: 48.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Complexo B. Qualquer duvida sobre o produto, pode me chamar.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz um mes desde que voce levou o Complexo B. Esta gostando? Se precisar de algo, estou por aqui.' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Complexo B deve estar quase no fim. Quer garantir o proximo? Me chame aqui.' }
    ]
  },
  // Add the remaining 19 products based on catalog audits
  {
    nome: 'Piu Brain C/60',
    preco_sugerido: 201.50,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Brain. Lembre-se do uso diario.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz 30 dias que voce esta usando o Piu Brain. Como tem sido a experiencia?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Brain deve estar no fim. Quer garantir o proximo?' }
    ]
  },
  {
    nome: 'Piu Zen C/60',
    preco_sugerido: 107.10,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Zen.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Um mes desde que comecou o Piu Zen. Como esta se sentindo?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Zen deve estar acabando. Deseja encomendar o proximo?' }
    ]
  },
  {
    nome: 'Piu NAC Pro 200mg Sachê C/30',
    preco_sugerido: 85.40,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['30 sachês'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu NAC Pro.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Voce ja esta na metade da caixa de Piu NAC Pro. Alguma duvida?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seus saches de Piu NAC Pro devem estar no fim. Quer reservar a proxima caixinha?' }
    ]
  },
  {
    nome: 'Piu Multi Mulher C/60',
    preco_sugerido: 75.70,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Multi Mulher.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz 30 dias que voce comecou a usar o Piu Multi Mulher.' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Multi Mulher deve estar acabando. Quer que eu reserve o proximo?' }
    ]
  },
  {
    nome: 'Piu Multi AZ C/60',
    preco_sugerido: 83.30,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Multi AZ.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Como tem sido sua rotina com o Piu Multi AZ?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Multi AZ esta acabando. Quer garantir o proximo para manter o uso?' }
    ]
  },
  {
    nome: 'Piu MAG + Magnésio C/60',
    preco_sugerido: 101.10,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu MAG + Magnesio.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Um mes usando o Piu MAG. Sentiu diferenca na rotina?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu MAG esta acabando. Deseja encomendar o proximo?' }
    ]
  },
  {
    nome: 'Piu Energy 2 C/30',
    preco_sugerido: 83.30,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['30 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Energy 2.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Duas semanas usando o Piu Energy 2. Como esta a disposicao?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Energy 2 esta no final. Deseja garantir a reposicao?' }
    ]
  },
  {
    nome: 'Piu Energy 1 C/60',
    preco_sugerido: 124.90,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Energy 1.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Um mes de uso do Piu Energy 1. Como tem sido?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Energy 1 esta no fim. Quer reservar o proximo?' }
    ]
  },
  {
    nome: 'Piu Cuore C/30',
    preco_sugerido: 95.20,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['30 cápsulas'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Piu Cuore.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Como esta a rotina com o Piu Cuore?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Piu Cuore esta acabando. Quer que eu reserve o proximo?' }
    ]
  },
  {
    nome: 'Cúrcuma C/60',
    preco_sugerido: 70.70,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Curcuma.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Um mes usando Curcuma. Como esta se sentindo?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Curcuma esta no final. Quer garantir a proxima?' }
    ]
  },
  {
    nome: 'Ácido Fólico C/60',
    preco_sugerido: 56.40,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Acido Folico.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Como esta a rotina de uso do Acido Folico?' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Acido Folico esta terminando. Quer reservar o proximo?' }
    ]
  },
  {
    nome: 'B12 + Metilfolato C/60',
    preco_sugerido: 65.20,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['60 cápsulas'],
    categoria: 'Saúde e Bem-estar',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do B12 + Metilfolato.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz 30 dias usando B12 + Metilfolato.' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu B12 + Metilfolato esta no fim. Quer garantir o proximo?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Uva 360g',
    preco_sugerido: 89.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['360g', 'Uva'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 45,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Uva.' },
      { tipo: 'relacionamento', ordem: 2, dias: 21, texto: 'Oi {cliente_nome}, tudo bem? Tres semanas usando a Creatina efervescente de Uva. Como esta se sentindo?' },
      { tipo: 'recompra', ordem: 3, dias: 44, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina de Uva deve estar quase no fim. Quer garantir a proxima?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Uva 180g',
    preco_sugerido: 74.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['180g', 'Uva'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Uva.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Duas semanas com a Creatina efervescente de Uva. Como estao os treinos?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina de Uva de 180g esta terminando. Quer garantir o proximo pote?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Uva 150g',
    preco_sugerido: 84.00,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['150g', 'Uva'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Uva.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Ja na metade da Creatina efervescente de Uva de 150g. Sentiu diferenca?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina de Uva de 150g esta no final. Quer garantir a proxima?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Natural 360g',
    preco_sugerido: 89.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['360g', 'Natural'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 45,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Natural.' },
      { tipo: 'relacionamento', ordem: 2, dias: 21, texto: 'Oi {cliente_nome}, tudo bem? Tres semanas com a Creatina Natural de 360g.' },
      { tipo: 'recompra', ordem: 3, dias: 44, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina Natural 360g esta no fim. Quer reservar a proxima?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Natural 150g',
    preco_sugerido: 84.00,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['150g', 'Natural'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Natural.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Como esta o uso diario da sua Creatina Natural?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina Natural de 150g esta terminando. Quer garantir a proxima?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Maçã Verde 360g',
    preco_sugerido: 89.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['360g', 'Maçã Verde'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 45,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Maca Verde.' },
      { tipo: 'relacionamento', ordem: 2, dias: 21, texto: 'Oi {cliente_nome}, tudo bem? Tres semanas usando a Creatina efervescente sabor Maca Verde.' },
      { tipo: 'recompra', ordem: 3, dias: 44, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina Maca Verde 360g deve estar quase no fim. Quer encomendar?' }
    ]
  },
  {
    nome: 'Creatina Efervescente Maçã Verde 180g',
    preco_sugerido: 74.80,
    recorrente: true,
    foto_url: null,
    galeria_urls: [],
    variantes: ['180g', 'Maçã Verde'],
    categoria: 'Suplementação',
    nicho: 'Produtos naturais / suplementos',
    parceiro: 'PiuVita',
    ciclo: 30,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra da Creatina Maca Verde.' },
      { tipo: 'relacionamento', ordem: 2, dias: 14, texto: 'Oi {cliente_nome}, tudo bem? Duas semanas usando a Creatina Maca Verde de 180g. Tudo certo?' },
      { tipo: 'recompra', ordem: 3, dias: 28, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Sua Creatina Maca Verde de 180g esta terminando. Quer garantir a proxima?' }
    ]
  }
];

async function seed() {
  console.log('Starting enriched PiuVita demo seed for 4 stores...');

  for (const storeId of storeIds) {
    console.log(`\nProcessing Store ID: ${storeId}`);
    
    // Check if store exists
    const { data: store, error: storeErr } = await supabase
      .from('lojas')
      .select('id, nome')
      .eq('id', storeId)
      .maybeSingle();

    if (storeErr || !store) {
      console.warn(`  Store ${storeId} not found. Skipping.`);
      continue;
    }

    console.log(`  Found Store: ${store.nome}`);

    for (const p of products) {
      // Find if product exists in this store
      const { data: existingProd } = await supabase
        .from('produtos')
        .select('id')
        .eq('loja_id', storeId)
        .eq('nome', p.nome)
        .maybeSingle();

      let prodId;
      if (existingProd) {
        console.log(`  Product already exists: ${p.nome} (Updating...)`);
        const { error: updateErr } = await supabase
          .from('produtos')
          .update({
            preco_sugerido: p.preco_sugerido,
            foto_url: p.foto_url,
            recorrente: p.recorrente,
            comissionavel_recompra: true,
            qtd_mensagens: p.msgs.length,
            nicho: p.nicho,
            parceiro: p.parceiro,
            categoria: p.categoria,
            galeria_urls: p.galeria_urls,
            variantes: p.variantes,
            ativo: true
          })
          .eq('id', existingProd.id);
        
        if (updateErr) {
          console.error(`    Error updating product ${p.nome}:`, updateErr.message);
          continue;
        }
        prodId = existingProd.id;
      } else {
        console.log(`  Inserting product: ${p.nome}`);
        const { data: newProd, error: insertErr } = await supabase
          .from('produtos')
          .insert({
            loja_id: storeId,
            nome: p.nome,
            preco_sugerido: p.preco_sugerido,
            foto_url: p.foto_url,
            recorrente: p.recorrente,
            comissionavel_recompra: true,
            qtd_mensagens: p.msgs.length,
            nicho: p.nicho,
            parceiro: p.parceiro,
            categoria: p.categoria,
            galeria_urls: p.galeria_urls,
            variantes: p.variantes,
            ativo: true
          })
          .select('id')
          .single();

        if (insertErr || !newProd) {
          console.error(`    Error inserting product ${p.nome}:`, insertErr?.message);
          continue;
        }
        prodId = newProd.id;
      }

      // Upsert messages for this product
      for (const m of p.msgs) {
        const { data: existingMsg } = await supabase
          .from('mensagens_produto')
          .select('id')
          .eq('produto_id', prodId)
          .eq('ordem', m.ordem)
          .maybeSingle();

        if (existingMsg) {
          const { error: updateMsgErr } = await supabase
            .from('mensagens_produto')
            .update({
              tipo: m.tipo,
              dias_apos_venda: m.dias,
              texto: m.texto
            })
            .eq('id', existingMsg.id);
          
          if (updateMsgErr) {
            console.error(`    Error updating message ${m.ordem} for ${p.nome}:`, updateMsgErr.message);
          }
        } else {
          const { error: insertMsgErr } = await supabase
            .from('mensagens_produto')
            .insert({
              produto_id: prodId,
              tipo: m.tipo,
              ordem: m.ordem,
              dias_apos_venda: m.dias,
              texto: m.texto
            });
          
          if (insertMsgErr) {
            console.error(`    Error inserting message ${m.ordem} for ${p.nome}:`, insertMsgErr.message);
          }
        }
      }
      console.log(`    Successfully upserted messages for ${p.nome}`);
    }
  }

  console.log('\nSeed completed successfully.');
}

seed().catch(err => console.error(err));
