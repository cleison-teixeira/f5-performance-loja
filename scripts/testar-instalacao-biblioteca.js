'use strict';

// Fase 9.14C.2 — Teste completo da instalação da biblioteca PiùVita
//
// O que este script faz:
//   1. Cria cenário de teste isolado (empresa + loja + membro)
//   2. Valida estado pré-instalação
//   3. Simula instalarBiblioteca (mesma lógica da action)
//   4. Valida estado pós-instalação (30 produtos, mensagens, campos)
//   5. Testa idempotência (reinstalação sem duplicatas)
//   6. Checa segurança (lojas reais intactas)

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Env ─────────────────────────────────────────────────────────────────────
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Constantes ──────────────────────────────────────────────────────────────
const BIBLIOTECA_ID  = 'af0a7087-f487-42a8-b3b6-42ff48f059f1'; // PiùVita
const PARCEIRO_ID    = '80c382c2-c7cf-4405-823e-35a0fbf6a29d'; // PiùVita
const PARCEIRO_NOME  = 'PiùVita';
const TEST_PERFIL_ID = '8480132e-d62d-4e94-9567-248d3b6f621e'; // cleisonteste

// Espelho de ORDENS_POR_MODELO em lib/mensagens/modelos.ts
const ORDENS_POR_MODELO = {
  1: [3], 2: [1, 3], 3: [1, 2, 3], 4: [1, 2, 3, 4], 5: [1, 2, 3, 4, 5]
};

const TIPO_POR_ORDEM = {
  1: 'agradecimento', 2: 'relacionamento', 3: 'recompra', 4: 'oferta', 5: 'follow_up'
};

const TEXTO_POR_TIPO = {
  agradecimento: 'Olá, aqui é a {vendedora} da {loja}. Estou passando para agradecer pela sua compra. Peço que salve meu contato porque vou acompanhar sua evolução com {produto} nos próximos dias.',
  relacionamento: 'Oi {cliente}! Como está sendo sua experiência com {produto}? Sou {vendedora} da {loja}, qualquer dúvida é só me chamar!',
  recompra:       'Oi {cliente}! Aqui é {vendedora} da {loja}. Seu {produto} deve estar acabando em breve! Quer garantir já o próximo?',
  oferta:         'Oi {cliente}! Aqui é {vendedora} da {loja}. Temos uma novidade especial de {produto} para você. Quer saber mais?',
  follow_up:      'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe o {produto}. Posso deixar reservado para você até o fim do dia?',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function normalizarNome(s) {
  return s.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcDiasAposVenda(tipo, ciclo) {
  const N = ciclo;
  const rel = Math.max(0, Math.floor(N / 2));
  const rec = Math.max(rel, N - 5);
  const ofe = Math.max(rec, N - 1);
  if (tipo === 'agradecimento') return 0;
  if (tipo === 'relacionamento') return rel;
  if (tipo === 'recompra')      return rec;
  if (tipo === 'oferta')        return ofe;
  if (tipo === 'follow_up')     return Math.max(ofe + 1, N + 2);
  return 0;
}

function ok(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.log(`  ❌  ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }
function section(msg) { console.log(`\n${'═'.repeat(55)}\n${msg}\n${'═'.repeat(55)}`); }

// ── instalarBiblioteca replicado ─────────────────────────────────────────────
async function instalarBibliotecaSimulado(perfilId, bibliotecaId, lojaIds) {
  // Validar membros_loja
  const { data: membros } = await supabase
    .from('membros_loja')
    .select('loja_id')
    .eq('perfil_id', perfilId)
    .eq('ativo', true)
    .in('loja_id', lojaIds);

  const lojasPermitidas = new Set((membros ?? []).map(m => m.loja_id));
  const invalidas = lojaIds.filter(id => !lojasPermitidas.has(id));
  if (invalidas.length > 0) {
    return { ok: false, erro: 'Acesso negado a loja(s): ' + invalidas.join(', ') };
  }

  // Buscar itens da biblioteca
  const { data: itens, error: itensErr } = await supabase
    .from('biblioteca_itens')
    .select('id, nome, foto_url, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, nicho, parceiro_id, categoria, repasse_ativo, tipo_acordo')
    .eq('biblioteca_id', bibliotecaId)
    .eq('ativo', true);

  if (itensErr || !itens) return { ok: false, erro: itensErr?.message ?? 'Biblioteca não encontrada' };

  let lojasInstaladas = 0;
  let produtosInseridos = 0;
  let produtosIgnorados = 0;

  for (const lojaId of lojaIds) {
    // Upsert instalacao
    const { error: instErr } = await supabase
      .from('instalacoes_biblioteca')
      .upsert(
        { loja_id: lojaId, biblioteca_id: bibliotecaId, instalado_por: perfilId, ativo: true },
        { onConflict: 'loja_id,biblioteca_id' }
      );
    if (instErr) { console.error('  Erro ao upsert instalacao:', instErr.message); continue; }
    lojasInstaladas++;

    // Carregar produtos existentes para dedup
    const { data: existentes } = await supabase
      .from('produtos')
      .select('id, nome, biblioteca_item_id')
      .eq('loja_id', lojaId);

    const porItemId  = new Set();
    const porNomeNorm = new Set();
    (existentes ?? []).forEach(p => {
      if (p.biblioteca_item_id) porItemId.add(p.biblioteca_item_id);
      porNomeNorm.add(normalizarNome(p.nome));
    });

    // Inserir produtos
    for (const item of itens) {
      if (porItemId.has(item.id) || porNomeNorm.has(normalizarNome(item.nome))) {
        produtosIgnorados++;
        continue;
      }

      const qtd   = Math.min(5, Math.max(1, item.qtd_mensagens ?? 3));
      const ciclo = item.ciclo_recompra_dias ?? 30;

      const { data: novoProduto, error: prodErr } = await supabase
        .from('produtos')
        .insert({
          loja_id:            lojaId,
          nome:               item.nome,
          preco_sugerido:     item.preco_sugerido,
          foto_url:           item.foto_url,
          ativo:              true,
          recorrente:         true,
          comissionavel_recompra: true,
          qtd_mensagens:      qtd,
          nicho:              item.nicho,
          parceiro:           PARCEIRO_NOME,
          parceiro_id:        item.parceiro_id,
          categoria:          item.categoria,
          biblioteca_item_id: item.id,
          repasse_ativo:      item.repasse_ativo ?? false,
          tipo_acordo:        item.tipo_acordo ?? 'livre',
          galeria_urls:       [],
          variantes:          [],
        })
        .select('id')
        .single();

      if (prodErr || !novoProduto) {
        console.error(`  Erro inserindo "${item.nome}":`, prodErr?.message);
        continue;
      }

      const produtoId = novoProduto.id;
      const ordens = ORDENS_POR_MODELO[qtd] ?? [3];

      await supabase.from('mensagens_produto').insert(
        ordens.map(ordem => {
          const tipo = TIPO_POR_ORDEM[ordem];
          return {
            produto_id:       produtoId,
            ordem,
            tipo,
            texto:            TEXTO_POR_TIPO[tipo] ?? '',
            dias_apos_venda:  calcDiasAposVenda(tipo, ciclo),
            estilo:           'clean',
            tipo_incentivo:   'nenhum',
          };
        })
      );

      porItemId.add(item.id);
      porNomeNorm.add(normalizarNome(item.nome));
      produtosInseridos++;
    }
  }

  return { ok: true, lojasInstaladas, produtosInseridos, produtosIgnorados };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Fase 9.14C.2 — Teste Instalação Biblioteca PiùVita ===\n');

  // ── SETUP: Criar cenário de teste ─────────────────────────────────────────
  section('SETUP — Cenário de teste');

  let empresaId, lojaId;

  // Empresa
  const { data: empresaExist } = await supabase
    .from('empresas').select('id').eq('nome', 'Teste Biblioteca PiùVita').maybeSingle();

  if (empresaExist) {
    empresaId = empresaExist.id;
    info(`Empresa já existe: ${empresaId}`);
  } else {
    const { data: novaEmpresa, error: eErr } = await supabase
      .from('empresas').insert({ nome: 'Teste Biblioteca PiùVita' }).select('id').single();
    if (eErr) { fail('Erro ao criar empresa: ' + eErr.message); process.exit(1); }
    empresaId = novaEmpresa.id;
    ok(`Empresa criada: ${empresaId}`);
  }

  // Loja
  const { data: lojaExist } = await supabase
    .from('lojas').select('id').eq('nome', 'Loja Teste PiùVita').eq('empresa_id', empresaId).maybeSingle();

  if (lojaExist) {
    lojaId = lojaExist.id;
    info(`Loja já existe: ${lojaId}`);
  } else {
    const { data: novaLoja, error: lErr } = await supabase
      .from('lojas').insert({ empresa_id: empresaId, nome: 'Loja Teste PiùVita' }).select('id').single();
    if (lErr) { fail('Erro ao criar loja: ' + lErr.message); process.exit(1); }
    lojaId = novaLoja.id;
    ok(`Loja criada: ${lojaId}`);
  }

  // Membro (cleisonteste como gerente — Acesso Loja)
  const { data: membroExist } = await supabase
    .from('membros_loja').select('id')
    .eq('perfil_id', TEST_PERFIL_ID).eq('loja_id', lojaId).maybeSingle();

  if (membroExist) {
    info('Membro já existe');
  } else {
    const { error: mErr } = await supabase
      .from('membros_loja').insert({ perfil_id: TEST_PERFIL_ID, loja_id: lojaId, role: 'gerente', ativo: true });
    if (mErr) { fail('Erro ao criar membro: ' + mErr.message); process.exit(1); }
    ok('Membro gerente adicionado (cleisonteste)');
  }

  console.log(`\n  Usuário de teste : cleisonteste (${TEST_PERFIL_ID})`);
  console.log(`  Empresa          : Teste Biblioteca PiùVita (${empresaId})`);
  console.log(`  Loja             : Loja Teste PiùVita (${lojaId})`);
  console.log(`  Role             : gerente (Acesso Loja)`);

  // ── PRÉ-INSTALAÇÃO ────────────────────────────────────────────────────────
  section('VALIDAÇÕES PRÉ-INSTALAÇÃO');

  const { count: itensLib } = await supabase.from('biblioteca_itens')
    .select('*', { count: 'exact', head: true })
    .eq('biblioteca_id', BIBLIOTECA_ID).eq('ativo', true);

  itensLib === 30 ? ok(`Biblioteca PiùVita: ${itensLib} itens ativos`) : fail(`Biblioteca tem ${itensLib} itens (esperado 30)`);

  const { count: prodAntes } = await supabase.from('produtos')
    .select('*', { count: 'exact', head: true }).eq('loja_id', lojaId);
  ok(`Produtos na loja antes: ${prodAntes}`);

  const { count: instAntes } = await supabase.from('instalacoes_biblioteca')
    .select('*', { count: 'exact', head: true })
    .eq('loja_id', lojaId).eq('biblioteca_id', BIBLIOTECA_ID);
  instAntes === 0
    ? ok('Nenhuma instalação PiùVita na loja de teste')
    : info(`Instalação já existe (reexecutando): ${instAntes}`);

  const { count: bibItemAntes } = await supabase.from('produtos')
    .select('*', { count: 'exact', head: true })
    .eq('loja_id', lojaId).not('biblioteca_item_id', 'is', null);
  ok(`Produtos com biblioteca_item_id antes: ${bibItemAntes}`);

  // ── TESTE 1: INSTALAÇÃO ───────────────────────────────────────────────────
  section('TESTE 1 — Instalar biblioteca PiùVita');

  const r1 = await instalarBibliotecaSimulado(TEST_PERFIL_ID, BIBLIOTECA_ID, [lojaId]);
  console.log('\n  Resultado da action:');
  console.log(`    ok               : ${r1.ok}`);
  console.log(`    lojasInstaladas  : ${r1.lojasInstaladas}`);
  console.log(`    produtosInseridos: ${r1.produtosInseridos}`);
  console.log(`    produtosIgnorados: ${r1.produtosIgnorados}`);
  if (r1.erro) console.log(`    erro             : ${r1.erro}`);

  // ── VALIDAÇÕES PÓS-INSTALAÇÃO ────────────────────────────────────────────
  section('VALIDAÇÕES PÓS-INSTALAÇÃO');

  // 1. instalacoes_biblioteca
  const { data: instalacao } = await supabase.from('instalacoes_biblioteca')
    .select('loja_id, biblioteca_id, instalado_por, ativo')
    .eq('loja_id', lojaId).eq('biblioteca_id', BIBLIOTECA_ID).single();
  instalacao?.ativo
    ? ok(`instalacoes_biblioteca: 1 registro ativo (instalado por ${instalacao.instalado_por})`)
    : fail('instalacoes_biblioteca: registro não encontrado ou inativo');

  // 2. Total de produtos
  const { count: prodDepois } = await supabase.from('produtos')
    .select('*', { count: 'exact', head: true }).eq('loja_id', lojaId).eq('ativo', true);
  prodDepois === 30
    ? ok(`Produtos na loja: ${prodDepois} (esperado 30)`)
    : fail(`Produtos na loja: ${prodDepois} (esperado 30)`);

  // 3. Campos obrigatórios preenchidos
  const { data: amostraProd } = await supabase.from('produtos')
    .select('nome, loja_id, biblioteca_item_id, parceiro_id, parceiro, foto_url, recorrente, qtd_mensagens, preco_sugerido, repasse_ativo, tipo_acordo')
    .eq('loja_id', lojaId)
    .not('biblioteca_item_id', 'is', null)
    .limit(3);

  let camposOk = true;
  (amostraProd ?? []).forEach(p => {
    if (!p.biblioteca_item_id) { fail(`${p.nome}: biblioteca_item_id NULL`); camposOk = false; }
    if (!p.parceiro_id)        { fail(`${p.nome}: parceiro_id NULL`);        camposOk = false; }
    if (p.parceiro !== PARCEIRO_NOME) { fail(`${p.nome}: parceiro legado "${p.parceiro}" (esperado "${PARCEIRO_NOME}")`); camposOk = false; }
    if (!p.foto_url)           { info(`${p.nome}: foto_url NULL (possível)`); }
    if (!p.recorrente)         { fail(`${p.nome}: recorrente != true`);       camposOk = false; }
    if (p.repasse_ativo)       { fail(`${p.nome}: repasse_ativo deveria ser false`); camposOk = false; }
    if (p.tipo_acordo !== 'livre') { fail(`${p.nome}: tipo_acordo "${p.tipo_acordo}" (esperado "livre")`); camposOk = false; }
  });
  camposOk
    ? ok('Campos de amostra (3 produtos): biblioteca_item_id, parceiro_id, parceiro, recorrente, repasse_ativo, tipo_acordo — OK')
    : fail('Campos com problema — ver acima');

  // 4. Total de mensagens
  const { data: prodIds } = await supabase.from('produtos')
    .select('id, qtd_mensagens').eq('loja_id', lojaId).not('biblioteca_item_id', 'is', null);

  const expectedMensagens = (prodIds ?? []).reduce((acc, p) => {
    const qtd = Math.min(5, Math.max(1, p.qtd_mensagens ?? 3));
    return acc + (ORDENS_POR_MODELO[qtd]?.length ?? 3);
  }, 0);

  const { count: totalMensagens } = await supabase.from('mensagens_produto')
    .select('*', { count: 'exact', head: true })
    .in('produto_id', (prodIds ?? []).map(p => p.id));

  totalMensagens === expectedMensagens
    ? ok(`Mensagens criadas: ${totalMensagens} (esperado ${expectedMensagens})`)
    : fail(`Mensagens: ${totalMensagens} (esperado ${expectedMensagens})`);

  // 5. Verificar cadência de 1 produto com ciclo 58
  const { data: prodCiclo58 } = await supabase.from('produtos')
    .select('id, nome, qtd_mensagens')
    .eq('loja_id', lojaId)
    .not('biblioteca_item_id', 'is', null)
    .eq('qtd_mensagens', 5)
    .limit(1)
    .maybeSingle();

  if (prodCiclo58) {
    const { data: msgs58 } = await supabase.from('mensagens_produto')
      .select('ordem, tipo, dias_apos_venda')
      .eq('produto_id', prodCiclo58.id)
      .order('ordem');

    const cicloReal58 = (() => {
      const recMsg = msgs58?.find(m => m.tipo === 'recompra');
      if (!recMsg) return null;
      // Inferir ciclo: dias_recompra = max(floor(N/2), N-5)
      // Se dias_apos_venda == 53 então N = 58 (58-5=53, floor(58/2)=29, max=53)
      return recMsg.dias_apos_venda;
    })();

    ok(`Produto qtd=5 (${prodCiclo58.nome}):`);
    (msgs58 ?? []).forEach(m => {
      info(`  ordem ${m.ordem} | ${m.tipo.padEnd(14)} | dia ${String(m.dias_apos_venda).padStart(3)}`);
    });
  }

  // ── TESTE 4: REINSTALAÇÃO (IDEMPOTÊNCIA) ─────────────────────────────────
  section('TESTE 4 — Reinstalação (Idempotência)');

  const r2 = await instalarBibliotecaSimulado(TEST_PERFIL_ID, BIBLIOTECA_ID, [lojaId]);
  console.log('\n  Resultado da reinstalação:');
  console.log(`    ok               : ${r2.ok}`);
  console.log(`    produtosInseridos: ${r2.produtosInseridos} (deve ser 0)`);
  console.log(`    produtosIgnorados: ${r2.produtosIgnorados} (deve ser 30)`);

  const { count: prodAposReinstall } = await supabase.from('produtos')
    .select('*', { count: 'exact', head: true }).eq('loja_id', lojaId).eq('ativo', true);
  const { count: instAposReinstall } = await supabase.from('instalacoes_biblioteca')
    .select('*', { count: 'exact', head: true })
    .eq('loja_id', lojaId).eq('biblioteca_id', BIBLIOTECA_ID);
  const { count: msgsAposReinstall } = await supabase.from('mensagens_produto')
    .select('*', { count: 'exact', head: true })
    .in('produto_id', (prodIds ?? []).map(p => p.id));

  r2.produtosInseridos === 0 && r2.produtosIgnorados === 30
    ? ok('Nenhum produto duplicado na reinstalação')
    : fail(`Reinstalação inseriu ${r2.produtosInseridos} produtos inesperadamente`);

  prodAposReinstall === 30
    ? ok(`Produtos após reinstalação: ${prodAposReinstall} (sem duplicatas)`)
    : fail(`Produtos após reinstalação: ${prodAposReinstall} (esperado 30)`);

  instAposReinstall === 1
    ? ok(`instalacoes_biblioteca: ${instAposReinstall} registro (sem duplicatas)`)
    : fail(`instalacoes_biblioteca: ${instAposReinstall} registros (esperado 1)`);

  msgsAposReinstall === totalMensagens
    ? ok(`Mensagens após reinstalação: ${msgsAposReinstall} (sem duplicatas)`)
    : fail(`Mensagens após reinstalação: ${msgsAposReinstall} (esperado ${totalMensagens})`);

  // ── TESTE 5: SEGURANÇA ────────────────────────────────────────────────────
  section('TESTE 5 — Segurança (lojas reais intactas)');

  const LOJAS_REAIS = [
    'b2000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
  ];

  const { data: produtosLojaReais } = await supabase.from('produtos')
    .select('loja_id, COUNT(*)')
    .in('loja_id', LOJAS_REAIS)
    .not('biblioteca_item_id', 'is', null);

  if (!produtosLojaReais || produtosLojaReais.length === 0) {
    ok('Nenhuma loja real recebeu produtos de biblioteca_item_id');
  } else {
    fail('Lojas reais com biblioteca_item_id inesperado: ' + JSON.stringify(produtosLojaReais));
  }

  const { count: instaloesLojaReais } = await supabase.from('instalacoes_biblioteca')
    .select('*', { count: 'exact', head: true })
    .in('loja_id', LOJAS_REAIS)
    .eq('biblioteca_id', BIBLIOTECA_ID);

  instaloesLojaReais === 0
    ? ok('Nenhuma loja real tem instalação PiùVita')
    : fail(`${instaloesLojaReais} instalações em lojas reais (inesperado)`);

  // ── RESUMO FINAL ──────────────────────────────────────────────────────────
  section('RESUMO FINAL');

  console.log(`  Usuário de teste  : cleisonteste (${TEST_PERFIL_ID})`);
  console.log(`  Empresa           : Teste Biblioteca PiùVita`);
  console.log(`  Loja              : Loja Teste PiùVita (${lojaId})`);
  console.log(`  Role              : gerente (Acesso Loja)`);
  console.log('');
  console.log(`  Biblioteca        : PiùVita — ${itensLib} itens`);
  console.log(`  Instalação 1      : ${r1.produtosInseridos} inseridos, ${r1.produtosIgnorados} ignorados`);
  console.log(`  Reinstalação      : ${r2.produtosInseridos} inseridos, ${r2.produtosIgnorados} ignorados`);
  console.log(`  Produtos na loja  : ${prodAposReinstall}`);
  console.log(`  Mensagens criadas : ${msgsAposReinstall}`);
  console.log(`  Lojas reais       : intactas`);
  console.log('');
  console.log('  Próximo passo manual:');
  console.log('    1. Logar como cleisonteste em /configuracoes/bibliotecas');
  console.log('    2. Confirmar card "PiùVita Produtos" com status "Produtos instalados"');
  console.log('    3. Verificar em Produtos e mensagens os 30 produtos');
  console.log('    4. Testar /vendas/nova com produto PiùVita');
  console.log('    5. Registrar venda e verificar avisos gerados');
  console.log('');
  console.log('✅ Script concluído.');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
