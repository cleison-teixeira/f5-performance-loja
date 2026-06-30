'use strict';

// Fase 9.14B.2 — Importar produtos PiùVita para biblioteca_itens
//
// O que este script faz:
//   • Lê data/bibliotecas/piuvita-produtos.csv
//   • Busca biblioteca slug='piuvita' e parceiro slug='piuvita'
//   • Faz upsert em biblioteca_itens (idempotente por nome normalizado)
//
// O que NÃO faz:
//   • NÃO instala produtos em lojas
//   • NÃO altera produtos operacionais
//   • NÃO cria vendas, avisos, recompras

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Leitura do .env.local ────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
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

// ── Parser de CSV simples ────────────────────────────────────────────────────
// Suporta campos com vírgula entre aspas (ex: "56,4")
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

// ── Normalização de nome (para dedup) ────────────────────────────────────────
function normalizarNome(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // remove acentos
    .replace(/[^a-z0-9\s]/g, '')       // remove especiais
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Conversão de preço BR → numeric ─────────────────────────────────────────
function parsePreco(raw) {
  if (!raw || raw.trim() === '') return null;
  // Remove aspas residuais, substitui vírgula por ponto
  const cleaned = raw.replace(/"/g, '').replace(',', '.').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : parseFloat(val.toFixed(2));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Importação biblioteca PiùVita — Fase 9.14B.2 ===\n');

  // 1. Ler CSV
  const csvPath = path.join(__dirname, '..', 'data', 'bibliotecas', 'piuvita-produtos.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  console.log(`📄 CSV lido: ${rows.length} linhas`);

  if (rows.length !== 30) {
    console.warn(`⚠️  Esperado 30 produtos, encontrado ${rows.length}. Continuando...`);
  }

  // 2. Validar linhas antes de qualquer INSERT
  const erros = [];
  rows.forEach((row, i) => {
    const nome = (row['Produto'] || '').trim();
    const preco = parsePreco(row['Preço (R$)']);
    const ciclo = parseInt(row['Recompra (dias)'], 10);
    const avisos = parseInt(row['avisos configurados'], 10);

    if (!nome) erros.push(`Linha ${i + 2}: nome vazio`);
    if (preco === null || preco <= 0) erros.push(`Linha ${i + 2} (${nome}): preço inválido: "${row['Preço (R$)']}"`);
    if (isNaN(ciclo) || ciclo <= 0) erros.push(`Linha ${i + 2} (${nome}): ciclo inválido: "${row['Recompra (dias)']}"`);
    if (isNaN(avisos) || avisos < 1 || avisos > 5) erros.push(`Linha ${i + 2} (${nome}): qtd_mensagens fora de 1..5: "${row['avisos configurados']}"`);
  });

  if (erros.length > 0) {
    console.error('❌ Erros de validação:\n' + erros.join('\n'));
    process.exit(1);
  }
  console.log('✅ Validação do CSV: OK\n');

  // 3. Buscar parceiro e biblioteca
  const { data: parceiro, error: parcErr } = await supabase
    .from('parceiros')
    .select('id, nome')
    .eq('slug', 'piuvita')
    .single();

  if (parcErr || !parceiro) {
    console.error('❌ Parceiro piuvita não encontrado:', parcErr?.message);
    process.exit(1);
  }
  console.log(`✅ Parceiro: ${parceiro.nome} (${parceiro.id})`);

  const { data: biblioteca, error: bibErr } = await supabase
    .from('bibliotecas')
    .select('id, nome')
    .eq('slug', 'piuvita')
    .single();

  if (bibErr || !biblioteca) {
    console.error('❌ Biblioteca piuvita não encontrada:', bibErr?.message);
    process.exit(1);
  }
  console.log(`✅ Biblioteca: ${biblioteca.nome} (${biblioteca.id})\n`);

  // 4. Carregar itens existentes na biblioteca (para lógica de upsert)
  const { data: existentes } = await supabase
    .from('biblioteca_itens')
    .select('id, nome')
    .eq('biblioteca_id', biblioteca.id);

  const mapaExistentes = {};
  (existentes || []).forEach(item => {
    mapaExistentes[normalizarNome(item.nome)] = item.id;
  });
  console.log(`📦 Itens já na biblioteca: ${Object.keys(mapaExistentes).length}\n`);

  // 5. Processar cada produto
  let inseridos = 0;
  let atualizados = 0;
  let erroCount = 0;

  for (const row of rows) {
    const nome = row['Produto'].trim();
    const foto_url = (row['Link imagem'] || '').trim() || null;
    const preco_sugerido = parsePreco(row['Preço (R$)']);
    const ciclo_recompra_dias = parseInt(row['Recompra (dias)'], 10);
    const qtd_mensagens = parseInt(row['avisos configurados'], 10);
    const nomNorm = normalizarNome(nome);

    const piuvitaMap = {
      'acido folico c60': 'Saúde feminina / Gestante',
      'b12 metilfolato c60': 'Vitaminas e minerais',
      'coenzima q10 c60': 'Saúde cardiovascular',
      'complexo b c60': 'Vitaminas e minerais',
      'creatina efervescente maca verde 180g': 'Creatinas',
      'creatina efervescente maca verde 360g': 'Creatinas',
      'creatina efervescente natural 150g': 'Creatinas',
      'creatina efervescente natural 360g': 'Creatinas',
      'creatina efervescente uva 150g': 'Creatinas',
      'creatina efervescente uva 180g': 'Creatinas',
      'creatina efervescente uva 360g': 'Creatinas',
      'curcuma c60': 'Fitoterápicos / Naturais',
      'melatonina c60': 'Sono / Relaxamento',
      'piu aminomix sache c30': 'Aminoácidos',
      'piu brain c60': 'Cérebro / Foco / Cognição',
      'piu cuore c30': 'Saúde cardiovascular',
      'piu cuore d3 c30': 'Saúde cardiovascular',
      'piu energy 1 c60': 'Pré-treino / Energia',
      'piu energy 2 c30': 'Pré-treino / Energia',
      'piu mag magnesio c60': 'Vitaminas e minerais',
      'piu max colageno c30': 'Colágeno / Articulações',
      'piu multi az c60': 'Vitaminas e minerais',
      'piu multi mulher c60': 'Saúde feminina / Gestante',
      'piu nac pro 200mg sache c30': 'Fígado / Detox / Antioxidantes',
      'piu zen c60': 'Sono / Relaxamento',
      'piufort antiox': 'Fígado / Detox / Antioxidantes',
      'piufort gestan': 'Saúde feminina / Gestante',
      'piufort imune': 'Imunidade',
      'piufort slim': 'Metabolismo / Controle de peso',
      'piufort woman': 'Saúde feminina / Gestante'
    };

    const key = nomNorm.replace(/[^a-z0-9]/g, '');
    const categoriaResolvida = piuvitaMap[key] || 'Outros';

    const payload = {
      biblioteca_id: biblioteca.id,
      parceiro_id: parceiro.id,
      nome,
      foto_url,
      preco_sugerido,
      ciclo_recompra_dias,
      qtd_mensagens,
      categoria: categoriaResolvida,
      nicho: 'Suplementos / Produtos naturais',
      recorrente: true,
      comissionavel: true,
      repasse_ativo: false,
      tipo_acordo: 'livre',
      ativo: true,
    };

    const idExistente = mapaExistentes[nomNorm];

    if (idExistente) {
      // Atualizar campos seguros
      const { error } = await supabase
        .from('biblioteca_itens')
        .update({
          foto_url,
          preco_sugerido,
          ciclo_recompra_dias,
          qtd_mensagens,
          categoria: categoriaResolvida,
          nicho: 'Suplementos / Produtos naturais',
          ativo: true,
        })
        .eq('id', idExistente);

      if (error) {
        console.error(`  ❌ Erro ao atualizar "${nome}":`, error.message);
        erroCount++;
      } else {
        console.log(`  ↻  Atualizado: ${nome}`);
        atualizados++;
      }
    } else {
      // Inserir novo
      const { error } = await supabase
        .from('biblioteca_itens')
        .insert(payload);

      if (error) {
        console.error(`  ❌ Erro ao inserir "${nome}":`, error.message);
        erroCount++;
      } else {
        console.log(`  +  Inserido:   ${nome}`);
        inseridos++;
      }
    }
  }

  // 6. Resumo
  console.log('\n═══════════════════════════════════════');
  console.log('RESUMO DA IMPORTAÇÃO');
  console.log('═══════════════════════════════════════');
  console.log(`  CSV lidos:    ${rows.length}`);
  console.log(`  Inseridos:    ${inseridos}`);
  console.log(`  Atualizados:  ${atualizados}`);
  console.log(`  Erros:        ${erroCount}`);
  console.log('═══════════════════════════════════════');

  if (erroCount > 0) {
    console.error('\n❌ Importação concluída COM ERROS.');
    process.exit(1);
  }

  // 7. Validação pós-importação
  const { data: total } = await supabase
    .from('biblioteca_itens')
    .select('id', { count: 'exact', head: true })
    .eq('biblioteca_id', biblioteca.id)
    .eq('ativo', true);

  // Supabase retorna count via cabeçalho; buscamos a contagem diretamente
  const { count } = await supabase
    .from('biblioteca_itens')
    .select('*', { count: 'exact', head: true })
    .eq('biblioteca_id', biblioteca.id)
    .eq('ativo', true);

  console.log(`\n✅ Total de itens ativos na biblioteca PiùVita: ${count}`);

  if (count !== 30) {
    console.warn(`⚠️  Esperado 30, encontrado ${count}. Verificar duplicatas ou erros.`);
  }

  console.log('\n✅ Importação concluída com sucesso.');
  console.log('   Nenhuma loja recebeu produtos automaticamente.');
  console.log('   Produtos operacionais não foram alterados.');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
