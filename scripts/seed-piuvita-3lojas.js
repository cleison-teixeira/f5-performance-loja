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
  'b1000000-0000-0000-0000-000000000001', // Cia Cidade Azul Angeloni (alternative)
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
    ciclo: 60,
    msgs: [
      { tipo: 'agradecimento', ordem: 1, dias: 2, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Obrigada pela compra do Complexo B. Qualquer duvida sobre o produto, pode me chamar.' },
      { tipo: 'relacionamento', ordem: 2, dias: 30, texto: 'Oi {cliente_nome}, tudo bem? Ja faz um mes desde que voce levou o Complexo B. Esta gostando? Se precisar de algo, estou por aqui.' },
      { tipo: 'recompra', ordem: 3, dias: 58, texto: 'Oi {cliente_nome}, aqui e {vendedora_nome} da {loja_nome}. Seu Complexo B deve estar quase no fim. Quer garantir o proximo? Me chame aqui.' }
    ]
  }
];

async function seed() {
  console.log('Starting PiuVita demo seed for 4 stores...');

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

      // Upsert messages for this product instead of deleting to avoid FK constraint issues
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
      console.log(`    Successfully upserted 3 messages for ${p.nome}`);
    }
  }

  console.log('\nSeed completed successfully.');
}

seed().catch(err => console.error(err));
