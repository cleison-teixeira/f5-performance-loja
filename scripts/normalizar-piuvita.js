'use strict';

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Leitura do .env.local ────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local não encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) {
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key) env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PIUVITA_CATEGORIAS_MAP = {
  'acidofolicoc60': 'Saúde feminina / Gestante',
  'b12metilfolatoc60': 'Vitaminas e minerais',
  'coenzimaq10c60': 'Saúde cardiovascular',
  'complexobc60': 'Vitaminas e minerais',
  'creatinaefervescentemacaverde180g': 'Creatinas',
  'creatinaefervescentemacaverde360g': 'Creatinas',
  'creatinaefervescentenatural150g': 'Creatinas',
  'creatinaefervescentenatural360g': 'Creatinas',
  'creatinaefervescenteuva150g': 'Creatinas',
  'creatinaefervescenteuva180g': 'Creatinas',
  'creatinaefervescenteuva360g': 'Creatinas',
  'curcumac60': 'Fitoterápicos / Naturais',
  'melatoninac60': 'Sono / Relaxamento',
  'piuaminomixsachec30': 'Aminoácidos',
  'piubrainc60': 'Cérebro / Foco / Cognição',
  'piucuorec30': 'Saúde cardiovascular',
  'piucuored3c30': 'Saúde cardiovascular',
  'piuenergy1c60': 'Pré-treino / Energia',
  'piuenergy2c30': 'Pré-treino / Energia',
  'piumagmagnesioc60': 'Vitaminas e minerais',
  'piumaxcolagenoc30': 'Colágeno / Articulações',
  'piumultiazc60': 'Vitaminas e minerais',
  'piumultimulherc60': 'Saúde feminina / Gestante',
  'piunacpro200mgsachec30': 'Fígado / Detox / Antioxidantes',
  'piuzenc60': 'Sono / Relaxamento',
  'piufortantiox': 'Fígado / Detox / Antioxidantes',
  'piufortgestan': 'Saúde feminina / Gestante',
  'piufortimune': 'Imunidade',
  'piufortslim': 'Metabolismo / Controle de peso',
  'piufortwoman': 'Saúde feminina / Gestante'
};

function normalizarNome(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function main() {
  console.log('=== Iniciando Normalização PiùVita ===\n');

  // 1. Buscar a biblioteca PiùVita
  const { data: bib, error: bibErr } = await supabase
    .from('bibliotecas')
    .select('id, nome')
    .eq('slug', 'piuvita')
    .single();

  if (bibErr || !bib) {
    console.error('❌ Biblioteca piuvita não encontrada:', bibErr?.message);
    process.exit(1);
  }
  console.log(`📚 Biblioteca encontrada: ${bib.nome} (${bib.id})`);

  // 2. Normalizar biblioteca_itens
  const { data: itens, error: itensErr } = await supabase
    .from('biblioteca_itens')
    .select('id, nome, nicho, categoria')
    .eq('biblioteca_id', bib.id);

  if (itensErr || !itens) {
    console.error('❌ Erro ao buscar itens da biblioteca:', itensErr?.message);
    process.exit(1);
  }

  console.log(`📦 Encontrados ${itens.length} itens na biblioteca para normalizar.`);

  let itensNormCount = 0;
  const mapaItensCategorias = {};
  const piuvitaItemIds = [];

  for (const item of itens) {
    const key = normalizarNome(item.nome);
    const cat = PIUVITA_CATEGORIAS_MAP[key] || 'Outros';
    piuvitaItemIds.push(item.id);
    mapaItensCategorias[item.id] = { nicho: 'Suplementos / Produtos naturais', categoria: cat };

    if (item.nicho !== 'Suplementos / Produtos naturais' || item.categoria !== cat) {
      const { error: updErr } = await supabase
        .from('biblioteca_itens')
        .update({
          nicho: 'Suplementos / Produtos naturais',
          categoria: cat
        })
        .eq('id', item.id);

      if (updErr) {
        console.error(`  ❌ Erro ao atualizar item ${item.nome}:`, updErr.message);
      } else {
        itensNormCount++;
      }
    }
  }
  console.log(`✅ Biblioteca: ${itensNormCount} itens atualizados para 'Suplementos / Produtos naturais'.`);

  // 3. Identificar lojas com PiùVita instalada
  const { data: instalacoes, error: instErr } = await supabase
    .from('instalacoes_biblioteca')
    .select('loja_id')
    .eq('biblioteca_id', bib.id)
    .eq('ativo', true);

  if (instErr) {
    console.error('❌ Erro ao buscar instalações:', instErr.message);
    process.exit(1);
  }

  // Obter IDs de lojas únicas com instalações ou com produtos oriundos de biblioteca_itens da PiùVita
  const { data: prodLojas, error: prodLojasErr } = await supabase
    .from('produtos')
    .select('loja_id')
    .in('biblioteca_item_id', piuvitaItemIds);

  if (prodLojasErr) {
    console.error('❌ Erro ao buscar produtos instalados:', prodLojasErr.message);
    process.exit(1);
  }

  const lojaIdsSet = new Set();
  (instalacoes || []).forEach(i => lojaIdsSet.add(i.loja_id));
  (prodLojas || []).forEach(p => lojaIdsSet.add(p.loja_id));

  const lojaIds = Array.from(lojaIdsSet);
  console.log(`🏪 Encontradas ${lojaIds.length} lojas com PiùVita instalada/produtos vinculados.`);

  // 4. Atualizar lojas.nichos para incluir 'Suplementos / Produtos naturais'
  let lojasAtualizadas = 0;
  if (lojaIds.length > 0) {
    const { data: lojasInfo, error: infoErr } = await supabase
      .from('lojas')
      .select('id, nome, nichos')
      .in('id', lojaIds);

    if (infoErr || !lojasInfo) {
      console.error('❌ Erro ao ler informações das lojas:', infoErr?.message);
    } else {
      for (const loja of lojasInfo) {
        const nichosAtuais = Array.isArray(loja.nichos) ? loja.nichos : [];
        if (!nichosAtuais.includes('Suplementos / Produtos naturais')) {
          const novosNichos = [...nichosAtuais, 'Suplementos / Produtos naturais'];
          const { error: updLojaErr } = await supabase
            .from('lojas')
            .update({ nichos: novosNichos })
            .eq('id', loja.id);

          if (updLojaErr) {
            console.error(`  ❌ Erro ao habilitar nicho na loja ${loja.nome}:`, updLojaErr.message);
          } else {
            console.log(`  Habilitado 'Suplementos / Produtos naturais' na loja: ${loja.nome}`);
            lojasAtualizadas++;
          }
        }
      }
    }
  }
  console.log(`✅ Lojas: ${lojasAtualizadas} lojas atualizadas.`);

  // 5. Atualizar os produtos operacionais já instalados
  const { data: prodsInstalados, error: prodsErr } = await supabase
    .from('produtos')
    .select('id, nome, biblioteca_item_id, nicho, categoria')
    .in('biblioteca_item_id', piuvitaItemIds);

  if (prodsErr || !prodsInstalados) {
    console.error('❌ Erro ao buscar produtos operacionais:', prodsErr?.message);
  } else {
    console.log(`🛍️  Encontrados ${prodsInstalados.length} produtos instalados das lojas para normalizar.`);
    let prodsNormCount = 0;

    for (const prod of prodsInstalados) {
      const target = mapaItensCategorias[prod.biblioteca_item_id];
      if (target) {
        if (prod.nicho !== target.nicho || prod.categoria !== target.categoria) {
          const { error: updProdErr } = await supabase
            .from('produtos')
            .update({
              nicho: target.nicho,
              categoria: target.categoria
            })
            .eq('id', prod.id);

          if (updProdErr) {
            console.error(`  ❌ Erro ao normalizar produto operacional ${prod.nome}:`, updProdErr.message);
          } else {
            prodsNormCount++;
          }
        }
      }
    }
    console.log(`✅ Produtos: ${prodsNormCount} produtos operacionais de lojas normalizados com sucesso.`);
  }

  console.log('\n=== Processo de Normalização Concluído com Sucesso ===');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
