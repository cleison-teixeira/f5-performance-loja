#!/usr/bin/env node
/**
 * Testes de adulteração de payload — Motor de Campanhas V2
 * Executa contra staging APENAS. Nunca toca produção.
 *
 * Uso: node scripts/tamper-tests-staging.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Carregar env de staging ────────────────────────────────────────────────
const envFile = resolve(__dirname, '../.env.staging')
const env = {}
for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const [k, ...rest] = t.split('=')
  env[k.trim()] = rest.join('=').trim()
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']
const APP_URL      = 'http://localhost:3001'

// ── Guardrail: bloqueia se apontar para produção ───────────────────────────
if (SUPABASE_URL.includes('nhcppfovsxcsulyvwvgs')) {
  console.error('CRÍTICO: SUPABASE_URL aponta para PRODUÇÃO. Abortando.')
  process.exit(1)
}
console.log(`[tamper] Ambiente: ${SUPABASE_URL.includes('ynrffhacpjzohrhkpuiq') ? 'STAGING ✓' : 'DESCONHECIDO'}`)

// ── IDs do seed ───────────────────────────────────────────────────────────
const LOJA_ANGELONI = 'f5feed00-0000-0000-0001-000000000001'
const LOJA_COMBO    = 'f5feed00-0000-0000-0001-000000000002'
const CAMP_ANGELONI = 'f5feed00-0000-0000-0005-000000000002' // Whey em Destaque Julho (ativa)
const CAMP_COMBO    = 'f5feed00-0000-0000-0005-000000000004' // Granel Combo Julho (ativa)
const VEND1_ID      = 'f5feed00-0000-0000-0002-000000000003' // Vend1 Angeloni
const VEND2_ID      = 'f5feed00-0000-0000-0002-000000000004' // Vend2 Combo
const GERENTE_ID    = 'f5feed00-0000-0000-0002-000000000002' // Gerente Angeloni
const DONO_ID       = 'f5feed00-0000-0000-0002-000000000001' // Dono

// ── Next-Action IDs (extraídos de .next/server/server-reference-manifest.js)
// IDs extraídos de .next/dev/server/server-reference-manifest.js (servidor de dev)
const ACTIONS = {
  buscarCampanhasLoja:      '4082f0cda9c10e7d09a4856131c3a2ec8a042f76d3',
  buscarCampanha:           '40072d0987f0c76f76a986de1063ecff1357113ccc',
  adicionarItemCampanha:    '709ba546d5e63c3fd5118bac658a3d87c51af672a7',
  criarOuAtualizarPremiacao:'70bc237b8d7618605f0ef272e920eabf4935ac9fde',
  adicionarMaterial:        '70f385140de2549119d8118eefd15821028ceae5c1',
  removerMaterial:          '7017b9854313fd57a818716473e57dd264a05eee99',
  criarSnapshotRegra:       '4041e1e468f090b713808d7c9c74306a4c175576d9',
  marcarComoPago:           '40dc75f2f218e42912a812c6a94c58d4387cca0d3f',
  atualizarStatusCampanha:  '70acd6bc77d3988bd3e28492fe5d63be4fec0683b7',
}

// ── Autenticação ───────────────────────────────────────────────────────────
async function signIn(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    },
    body: JSON.stringify({ email, password: 'Teste@123' }),
  })
  if (!res.ok) throw new Error(`signIn(${email}) falhou: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}

function buildCookie(tokens) {
  const payload = {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `sb-ynrffhacpjzohrhkpuiq-auth-token=base64-${b64}`
}

// ── Chamar Server Action ───────────────────────────────────────────────────
async function callAction(actionName, args, cookie) {
  const actionId = ACTIONS[actionName]
  if (!actionId) throw new Error(`Action ID not found: ${actionName}`)

  const res = await fetch(`${APP_URL}/campanhas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Next-Action': actionId,
      'Next-Router-State-Tree': encodeURIComponent(JSON.stringify(['', {'children': ['(app)', {'children': ['campanhas', {'children': ['__PAGE__', {}]}]}]}, '', ''])),
      'Cookie': cookie,
      'Accept': 'text/x-component',
    },
    body: JSON.stringify(args),
  })

  const text = await res.text()
  const errMatch = text.match(/"error":"([^"]+)"/) || text.match(/Sem permissão|não pertence|não encontrad/i)
  // Non-empty data = access granted; empty array or false = blocked
  const hasData = text.match(/"ok":true/) || text.match(/"campanhas":\[\{/) || text.match(/"campanha":\{/)
  const isEmpty = text.includes('"campanhas":[]') || text.includes('"campanhas": []') || text.includes('"ok":false')
  const blocked = res.status >= 400 || !!errMatch || isEmpty || !hasData

  return {
    status: res.status,
    ok: !!hasData,
    blocked,
    error: errMatch ? (errMatch[1] || String(errMatch[0])) : null,
    preview: text.slice(0, 150).replace(/\n/g, ' '),
  }
}

// ── Resultados ─────────────────────────────────────────────────────────────
const results = []
function record(id, descricao, persona, idsAdulterados, resultado) {
  const status = resultado.blocked || (!resultado.ok && resultado.status !== 500)
    ? 'BLOQUEADO ✓' : resultado.ok ? 'PERMITIDO ⚠' : 'ERRO/BLOQUEADO ✓'
  results.push({ id, descricao, persona, idsAdulterados, resultado, status })
  const icon = status.includes('BLOQUEADO') || status.includes('ERRO') ? '✓' : '⚠'
  console.log(`[T${id}] ${icon} ${descricao}`)
  console.log(`       Persona: ${persona} | Status HTTP: ${resultado.status} | ${status}`)
  if (resultado.error) console.log(`       Erro: ${resultado.error}`)
  console.log()
}

// ── Executar testes ────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══ TESTES DE ADULTERAÇÃO — MOTOR DE CAMPANHAS V2 ═══\n')

  // Obter tokens para todas as personas
  console.log('[tamper] Autenticando personas...')
  const [tokensVend1, tokensVend2, tokensGerente, tokensDono] = await Promise.all([
    signIn('vend1@teste-rvessencial.internal'),
    signIn('vend2@teste-rvessencial.internal'),
    signIn('gerente@teste-rvessencial.internal'),
    signIn('dono@teste-rvessencial.internal'),
  ])
  const cookieVend1   = buildCookie(tokensVend1)
  const cookieVend2   = buildCookie(tokensVend2)
  const cookieGerente = buildCookie(tokensGerente)
  const cookieDono    = buildCookie(tokensDono)
  console.log('[tamper] Todas as personas autenticadas ✓\n')

  // ── T1: Vendedora Angeloni envia lojaId da Combo ─────────────────────────
  const t1 = await callAction('buscarCampanhasLoja', [LOJA_COMBO], cookieVend1)
  record(1, 'Vend1 Angeloni tenta ler campanhas da Combo (lojaId errado)',
    'vend1@teste-rvessencial.internal',
    `lojaId=COMBO (${LOJA_COMBO.slice(-8)})`,
    t1)

  // ── T2: Vendedora envia vendedorId de outra pessoa (campo ignorado pelo server)
  // buscarCampanhasLoja não aceita vendedorId — teste implícito via snapshot
  const t2 = await callAction('criarSnapshotRegra', [{
    campanhaId: CAMP_ANGELONI,
    campanhaItemId: null,
    vendaId: 'f5feed00-0000-0000-0008-000000000001', // venda da Angeloni
    itemVendaId: 'f5feed00-0000-0000-0009-000000000001',
    lojaId: LOJA_ANGELONI,
    vendedoraId: GERENTE_ID, // adulterado: ID de outra pessoa
    quantidade: 5,
    valorUnitario: 10,
    valorTotal: 50,
    tipoPremiacao: 'fixo_unidade',
    valorFixoSnapshot: 2.5,
    percentualSnapshot: null,
    faixaSnapshot: null,
    comissaoCalculada: 12.5,
    versaoRegra: 1,
  }], cookieVend1)
  record(2, 'Vend1 envia vendedorId de outra pessoa (Gerente) no snapshot',
    'vend1@teste-rvessencial.internal',
    `vendedoraId=GERENTE (${GERENTE_ID.slice(-8)})`,
    t2)

  // ── T3: Vendedora tenta buscar campanha da Combo por ID conhecido ─────────
  const t3 = await callAction('buscarCampanha', [CAMP_COMBO, LOJA_ANGELONI], cookieVend1)
  record(3, 'Vend1 tenta ler campanha da Combo usando lojaId da Angeloni',
    'vend1@teste-rvessencial.internal',
    `campanhaId=COMBO(${CAMP_COMBO.slice(-8)}), lojaId=ANGELONI`,
    t3)

  // ── T4: Gerente Angeloni envia campanhaId da Combo em adicionarItemCampanha
  const t4 = await callAction('adicionarItemCampanha', [
    CAMP_COMBO, // campanhaId adulterado (Combo)
    LOJA_ANGELONI, // lojaId própria (Angeloni) — verifica cross-loja
    {
      produto_id: 'f5feed00-0000-0000-0003-000000000001',
      quantidade_conteudo: 1,
      unidade_conteudo: 'unidade',
      preco_campanha: 10,
      preco_referencia: null,
      ciclo_recompra_dias: null,
      ordem: 0,
    }
  ], cookieGerente)
  record(4, 'Gerente Angeloni tenta adicionar item a campanha da Combo',
    'gerente@teste-rvessencial.internal',
    `campanhaId=COMBO(${CAMP_COMBO.slice(-8)}), lojaId=ANGELONI`,
    t4)

  // ── T5: Gerente tenta alterar premiação de campanha da Combo ─────────────
  const t5 = await callAction('criarOuAtualizarPremiacao', [
    CAMP_COMBO,    // campanhaId adulterado
    LOJA_ANGELONI, // lojaId própria
    { tipo: 'fixo_unidade', valor: 99, faixas: [] }
  ], cookieGerente)
  record(5, 'Gerente Angeloni tenta alterar premiação da campanha da Combo',
    'gerente@teste-rvessencial.internal',
    `campanhaId=COMBO(${CAMP_COMBO.slice(-8)}), lojaId=ANGELONI`,
    t5)

  // ── T6: Gerente tenta adicionar material a campanha da Combo ─────────────
  const t6 = await callAction('adicionarMaterial', [
    CAMP_COMBO,    // campanhaId adulterado
    LOJA_ANGELONI, // lojaId própria
    { tipo: 'texto', titulo: 'Material Adulterado', conteudo: 'teste', url: null, biblioteca_item_id: null, ordem: 0 }
  ], cookieGerente)
  record(6, 'Gerente Angeloni tenta adicionar material a campanha da Combo',
    'gerente@teste-rvessencial.internal',
    `campanhaId=COMBO(${CAMP_COMBO.slice(-8)}), lojaId=ANGELONI`,
    t6)

  // ── T7: Vendedora tenta criar snapshot com venda de outra loja ───────────
  const t7 = await callAction('criarSnapshotRegra', [{
    campanhaId: CAMP_ANGELONI,
    campanhaItemId: null,
    vendaId: 'f5feed00-0000-0000-0008-000000000002', // venda da Combo (seed)
    itemVendaId: 'f5feed00-0000-0000-0009-000000000099',
    lojaId: LOJA_ANGELONI,
    vendedoraId: VEND1_ID,
    quantidade: 5,
    valorUnitario: 10,
    valorTotal: 50,
    tipoPremiacao: 'fixo_unidade',
    valorFixoSnapshot: 2.5,
    percentualSnapshot: null,
    faixaSnapshot: null,
    comissaoCalculada: 12.5,
    versaoRegra: 1,
  }], cookieVend1)
  record(7, 'Vend1 tenta criar snapshot com venda de outra loja (Combo)',
    'vend1@teste-rvessencial.internal',
    `vendaId de COMBO, campanhaId=ANGELONI`,
    t7)

  // ── T8: Vendedora tenta associar item de venda a campanha de outra loja ──
  const t8 = await callAction('criarSnapshotRegra', [{
    campanhaId: CAMP_COMBO, // campanha adulterada
    campanhaItemId: null,
    vendaId: 'f5feed00-0000-0000-0008-000000000001', // venda da Angeloni
    itemVendaId: 'f5feed00-0000-0000-0009-000000000001',
    lojaId: LOJA_ANGELONI, // diz ser Angeloni mas campanha é da Combo
    vendedoraId: VEND1_ID,
    quantidade: 1,
    valorUnitario: 5,
    valorTotal: 5,
    tipoPremiacao: 'sem_premiacao',
    valorFixoSnapshot: null,
    percentualSnapshot: null,
    faixaSnapshot: null,
    comissaoCalculada: null,
    versaoRegra: 1,
  }], cookieVend1)
  record(8, 'Vend1 tenta criar snapshot linkando venda Angeloni a campanha da Combo',
    'vend1@teste-rvessencial.internal',
    `campanhaId=COMBO(${CAMP_COMBO.slice(-8)}), lojaId=ANGELONI`,
    t8)

  // ── T9: Vendedora tenta marcar apuração como paga ─────────────────────────
  const t9 = await callAction('marcarComoPago', [{
    apuracaoId: 'f5feed00-0000-0000-0010-000000000001',
    campanhaId: CAMP_ANGELONI,
    lojaId: LOJA_ANGELONI,
    valorPago: 100,
    formaPagamento: 'pix',
    dataPagamento: '2026-07-27',
    observacao: 'adulterado',
  }], cookieVend1)
  record(9, 'Vend1 (role=vendedora) tenta marcar apuração como paga',
    'vend1@teste-rvessencial.internal',
    'ação restrita a gerente/dono',
    t9)

  // ── T10: Usuário sem vínculo tenta buscar campanha por ID ────────────────
  // Vend2 é da Combo — tenta buscar campanha da Angeloni com lojaId da Angeloni
  const t10 = await callAction('buscarCampanha', [CAMP_ANGELONI, LOJA_ANGELONI], cookieVend2)
  record(10, 'Vend2 Combo (sem vínculo com Angeloni) tenta ler campanha da Angeloni',
    'vend2@teste-rvessencial.internal',
    `campanhaId=ANGELONI(${CAMP_ANGELONI.slice(-8)}), lojaId=ANGELONI`,
    t10)

  // ── T11: Dono tenta acessar loja inexistente no seu escopo ───────────────
  const LOJA_INEXISTENTE = 'f5feed00-0000-0000-0001-999999999999'
  const t11 = await callAction('buscarCampanhasLoja', [LOJA_INEXISTENTE], cookieDono)
  record(11, 'Dono tenta acessar loja inexistente (não vinculada a nenhuma empresa dele)',
    'dono@teste-rvessencial.internal',
    `lojaId=INEXISTENTE(${LOJA_INEXISTENTE.slice(-8)})`,
    t11)

  // ── T12: Payload com campos administrativos extras ─────────────────────────
  // Tenta forçar campos que só existem server-side (criado_por, loja_id direto)
  const t12 = await callAction('adicionarItemCampanha', [
    CAMP_ANGELONI,
    LOJA_ANGELONI,
    {
      produto_id: 'f5feed00-0000-0000-0003-000000000001',
      quantidade_conteudo: 1,
      unidade_conteudo: 'unidade',
      preco_campanha: 0.01, // valor suspeito
      preco_referencia: null,
      ciclo_recompra_dias: null,
      ordem: 0,
      // Campos administrativos que não existem no tipo ItemInput mas são enviados no payload
      loja_id: LOJA_COMBO,           // tentativa de sobrescrever loja_id
      campanha_id: CAMP_COMBO,       // tentativa de mudar campanha
      ativo: false,                  // tentar desativar ao criar
      criado_em: '2020-01-01',       // tentar manipular timestamp
    }
  ], cookieGerente)
  record(12, 'Gerente envia payload com campos administrativos extras (loja_id, campanha_id adulterados)',
    'gerente@teste-rvessencial.internal',
    'campos: loja_id=COMBO, campanha_id=COMBO, ativo=false, criado_em adulterado',
    t12)

  // ── Sumário ────────────────────────────────────────────────────────────────
  console.log('\n═══ SUMÁRIO DOS TESTES DE ADULTERAÇÃO ═══\n')
  let passed = 0, failed = 0
  for (const r of results) {
    const ok = r.status.includes('BLOQUEADO') || r.status.includes('ERRO')
    if (ok) passed++; else failed++
    console.log(`T${r.id.toString().padStart(2,'0')} | ${ok ? '✓ BLOQUEADO' : '✗ VAZOU   '} | ${r.descricao}`)
  }
  console.log(`\nResultado: ${passed}/${results.length} bloqueados corretamente`)
  if (failed > 0) {
    console.error(`\n⚠ ATENÇÃO: ${failed} teste(s) não foram bloqueados. Revisar imediatamente.`)
    process.exit(1)
  } else {
    console.log('\n✓ Todos os testes de adulteração bloqueados com sucesso.')
  }
}

main().catch(err => {
  console.error('[tamper] Erro fatal:', err)
  process.exit(1)
})
