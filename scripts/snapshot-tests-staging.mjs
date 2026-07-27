#!/usr/bin/env node
/**
 * Testes específicos de criarSnapshotRegra — 7 cenários
 * Complementa tamper-tests-staging.mjs (T2, T7, T8 já cobertos lá).
 * Cenários adicionais: sem sessão, sem vínculo, duplicado, válido.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = resolve(__dirname, '../.env.staging')
const env = {}
for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const [k, ...rest] = t.split('=')
  env[k.trim()] = rest.join('=').trim()
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const ANON_KEY     = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const APP_URL      = 'http://localhost:3001'

if (SUPABASE_URL.includes('nhcppfovsxcsulyvwvgs')) {
  console.error('CRÍTICO: SUPABASE_URL aponta para PRODUÇÃO. Abortando.')
  process.exit(1)
}
console.log(`[snapshot] Ambiente: ${SUPABASE_URL.includes('ynrffhacpjzohrhkpuiq') ? 'STAGING ✓' : 'DESCONHECIDO'}`)

// ── IDs do seed ────────────────────────────────────────────────────────────
const LOJA_ANGELONI     = 'f5feed00-0000-0000-0001-000000000001'
const LOJA_COMBO        = 'f5feed00-0000-0000-0001-000000000002'
const CAMP_ANGELONI     = 'f5feed00-0000-0000-0005-000000000002'
const CAMP_ITEM_ANGEL   = 'f5feed00-0000-0000-0006-000000000002'
// Venda válida (não snapshot'd ainda)
const VENDA_ANGEL_1     = 'f5feed00-0000-0000-0008-000000000001'
const ITEM_VENDA_1      = 'f5feed00-0000-0000-0009-000000000001'
// Venda já snapshot'd
const VENDA_ANGEL_3     = 'f5feed00-0000-0000-0008-000000000003'
const ITEM_VENDA_3      = 'f5feed00-0000-0000-0009-000000000003'
const VEND1_ID          = 'f5feed00-0000-0000-0002-000000000003'

// ID extraído de .next/dev/server/server-reference-manifest.js (servidor de dev)
const ACTION_ID = '4041e1e468f090b713808d7c9c74306a4c175576d9'

async function signIn(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email, password: 'Teste@123' }),
  })
  if (!res.ok) throw new Error(`signIn(${email}) falhou: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data
}

function buildCookie(tokens) {
  const payload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }
  return `sb-ynrffhacpjzohrhkpuiq-auth-token=base64-${Buffer.from(JSON.stringify(payload)).toString('base64')}`
}

async function callSnapshot(args, cookie) {
  const headers = {
    'Content-Type': 'text/plain;charset=UTF-8',
    'Next-Action': ACTION_ID,
    'Next-Router-State-Tree': encodeURIComponent(JSON.stringify(['', {'children': ['(app)', {'children': ['campanhas', {'children': ['__PAGE__', {}]}]}]}, '', ''])),
    'Accept': 'text/x-component',
  }
  if (cookie) headers['Cookie'] = cookie
  const res = await fetch(`${APP_URL}/campanhas`, {
    method: 'POST',
    headers,
    body: JSON.stringify([args]),
  })
  const text = await res.text()
  return { status: res.status, text }
}

function isBlocked(status, text) {
  if (status === 401 || status === 302 || status === 307) return true
  if (status === 404) return true
  if (/Sem permissão|não pertence|não encontrad|Unauthorized/i.test(text)) return true
  if (text.includes('"ok":false')) return true
  return false
}

function isSuccess(text) {
  return text.includes('"ok":true') || text.includes('"id":"')
}

const validPayload = {
  campanhaId: CAMP_ANGELONI,
  campanhaItemId: CAMP_ITEM_ANGEL,
  vendaId: VENDA_ANGEL_1,
  itemVendaId: ITEM_VENDA_1,
  lojaId: LOJA_ANGELONI,
  vendedoraId: VEND1_ID,
  quantidade: 2,
  valorUnitario: 50.0,
  valorTotal: 100.0,
  tipoPremiacao: 'fixo',
  valorFixoSnapshot: 10.0,
  percentualSnapshot: null,
  faixaSnapshot: null,
  comissaoCalculada: 10.0,
  versaoRegra: 1,
}

const results = []
let passed = 0
let failed = 0

function record(id, label, blocked, expected, detail) {
  const ok = blocked === expected
  if (ok) passed++; else failed++
  results.push({ id, label, ok, blocked, expected, detail })
  const icon = ok ? '✓' : '✗'
  console.log(`\n[S${id}] ${icon} ${label}`)
  console.log(`       Status HTTP: ${detail.status} | ${ok ? (expected ? 'BLOQUEADO ✓' : 'PERMITIDO ✓') : (expected ? 'DEVERIA BLOQUEAR ✗' : 'DEVERIA PERMITIR ✗')}`)
}

async function run() {
  console.log('\n═══ TESTES criarSnapshotRegra — 7 CENÁRIOS ═══\n')

  // S1: Sem sessão (nenhum cookie)
  {
    const r = await callSnapshot(validPayload, null)
    record(1, 'Sem sessão (nenhum cookie de auth)', isBlocked(r.status, r.text), true, r)
  }

  // S2: Usuário sem vínculo (vend2 Combo tentando Angeloni)
  {
    const t = await signIn('vend2@teste-rvessencial.internal')
    const cookie = buildCookie(t)
    const r = await callSnapshot(validPayload, cookie)
    record(2, 'Vend2 Combo (sem vínculo) tenta snapshot em Angeloni', isBlocked(r.status, r.text), true, r)
  }

  // S3: Campanha correta (Angeloni) + venda de outra loja (replicado de T7)
  {
    const t = await signIn('vend1@teste-rvessencial.internal')
    const cookie = buildCookie(t)
    const payload = {
      ...validPayload,
      vendaId: 'f5feed00-0000-0000-0008-000000000004',
      itemVendaId: 'f5feed00-0000-0000-0009-000000000004',
    }
    const r = await callSnapshot(payload, cookie)
    record(3, 'Campanha Angeloni + venda da Combo (venda_id adulterado)', isBlocked(r.status, r.text), true, r)
  }

  // S4: Venda correta (Angeloni) + campanha de outra loja (replicado de T8)
  {
    const t = await signIn('vend1@teste-rvessencial.internal')
    const cookie = buildCookie(t)
    const payload = {
      ...validPayload,
      campanhaId: 'f5feed00-0000-0000-0005-000000000004',
      lojaId: LOJA_ANGELONI,
    }
    const r = await callSnapshot(payload, cookie)
    record(4, 'Venda Angeloni + campanha da Combo (campanha_id adulterado)', isBlocked(r.status, r.text), true, r)
  }

  // S5: vendedoraId de outra pessoa (replicado de T2)
  {
    const t = await signIn('vend1@teste-rvessencial.internal')
    const cookie = buildCookie(t)
    const payload = {
      ...validPayload,
      vendedoraId: 'f5feed00-0000-0000-0002-000000000004',
    }
    const r = await callSnapshot(payload, cookie)
    record(5, 'vendedoraId adulterado (Vend2 ID enviado por Vend1)', isBlocked(r.status, r.text), true, r)
  }

  // S6: Item já snapshot'd (UNIQUE constraint em item_venda_id)
  {
    const t = await signIn('vend1@teste-rvessencial.internal')
    const cookie = buildCookie(t)
    const payload = {
      ...validPayload,
      vendaId: VENDA_ANGEL_3,
      itemVendaId: ITEM_VENDA_3,
    }
    const r = await callSnapshot(payload, cookie)
    record(6, 'Item já snapshot\'d (UNIQUE em item_venda_id)', isBlocked(r.status, r.text), true, r)
  }

  // S7: Todos corretos — deve PERMITIR (1 escrita real no staging)
  {
    const t = await signIn('vend1@teste-rvessencial.internal')
    const cookie = buildCookie(t)
    const r = await callSnapshot(validPayload, cookie)
    const succeeded = isSuccess(r.text)
    const ok = succeeded
    if (ok) passed++; else failed++
    results.push({ id: 7, label: 'Todos corretos (deve ser PERMITIDO)', ok, blocked: !succeeded, expected: false, detail: r })
    console.log(`\n[S7] ${ok ? '✓' : '✗'} Todos corretos (deve ser PERMITIDO)`)
    console.log(`       Status HTTP: ${r.status} | ${ok ? 'PERMITIDO ✓' : 'FALHOU ✗ — snapshot não criado'}`)
    if (ok) {
      const idMatch = r.text.match(/"id":"([^"]+)"/)
      if (idMatch) console.log(`       Snapshot ID criado: ${idMatch[1]}`)
    }
  }

  // ── Sumário ──
  console.log('\n═══ SUMÁRIO criarSnapshotRegra ═══\n')
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗'
    const label = r.expected ? (r.blocked ? 'BLOQUEADO' : 'NÃO BLOQUEADO') : (r.blocked ? 'NÃO PERMITIDO' : 'PERMITIDO')
    console.log(`S0${r.id} | ${r.ok ? '✓ OK' : '✗ FALHOU'} | ${r.label}`)
  }
  console.log(`\nResultado: ${passed}/7 corretos`)

  if (failed > 0) {
    console.error(`\n✗ ${failed} cenário(s) com falha.`)
    process.exit(1)
  } else {
    console.log('\n✓ Todos os cenários de criarSnapshotRegra validados.')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
