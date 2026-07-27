#!/usr/bin/env node
/**
 * Inicializador seguro do servidor Next.js para o ambiente de staging.
 * Carrega .env.staging com override sobre qualquer .env.local, valida o
 * project ref e interrompe se detectar qualquer referência à produção.
 *
 * Uso: npm run dev:staging
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const STAGING_REF = 'ynrffhacpjzohrhkpuiq'
const PROD_REF    = 'nhcppfovsxcsulyvwvgs'

// ── 1. Ler .env.staging manualmente (sem usar dotenv de propósito:
//        dotenv também leria .env.local se chamado normalmente).
//        Fazemos o parse linha a linha e injetamos em process.env com override.
const envFile = resolve(ROOT, '.env.staging')

let raw
try {
  raw = readFileSync(envFile, 'utf-8')
} catch {
  console.error('[dev-staging] ERRO: .env.staging não encontrado.')
  process.exit(1)
}

for (const line of raw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  const value = trimmed.slice(idx + 1).trim()
  // override: true — sobrescreve qualquer valor já presente (incluindo .env.local)
  process.env[key] = value
}

// ── 2. Coletar variáveis relevantes
const vars = {
  NEXT_PUBLIC_SUPABASE_URL:    process.env.NEXT_PUBLIC_SUPABASE_URL    ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY:   process.env.SUPABASE_SERVICE_ROLE_KEY   ?? '',
  SUPABASE_URL:                process.env.SUPABASE_URL                ?? '',
}

// ── 3. Guardrails
const failures = []

for (const [name, value] of Object.entries(vars)) {
  if (!value) continue
  if (value.includes(PROD_REF)) {
    failures.push(`BLOQUEADO: ${name} contém ref de PRODUÇÃO.`)
  }
}

// URL pública obrigatória
if (!vars.NEXT_PUBLIC_SUPABASE_URL) {
  failures.push('BLOQUEADO: NEXT_PUBLIC_SUPABASE_URL ausente.')
} else if (!vars.NEXT_PUBLIC_SUPABASE_URL.includes(STAGING_REF)) {
  failures.push('BLOQUEADO: NEXT_PUBLIC_SUPABASE_URL não aponta para staging.')
}

// Anon key obrigatória
if (!vars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  failures.push('BLOQUEADO: NEXT_PUBLIC_SUPABASE_ANON_KEY ausente.')
}

// Service role obrigatória
if (!vars.SUPABASE_SERVICE_ROLE_KEY || vars.SUPABASE_SERVICE_ROLE_KEY.startsWith('REPLACE_')) {
  failures.push('BLOQUEADO: SUPABASE_SERVICE_ROLE_KEY ausente ou placeholder.')
}

// Mistura: se SUPABASE_URL (admin) existir, deve ser staging também
if (vars.SUPABASE_URL && !vars.SUPABASE_URL.includes(STAGING_REF)) {
  failures.push('BLOQUEADO: SUPABASE_URL não é staging (mistura de ambientes).')
}

if (failures.length > 0) {
  for (const f of failures) console.error(`[dev-staging] ${f}`)
  process.exit(1)
}

// ── 4. Saída de confirmação (sem segredos)
const maskedRef = `${STAGING_REF.slice(0, 3)}...${STAGING_REF.slice(-4)}`
console.log('[dev-staging] ─────────────────────────────────────')
console.log('[dev-staging] Ambiente:              STAGING')
console.log(`[dev-staging] Project ref:           ${maskedRef}`)
console.log('[dev-staging] Service role presente: sim')
console.log('[dev-staging] Produção detectada:    não')
console.log('[dev-staging] Porta:                 3001')
console.log('[dev-staging] ─────────────────────────────────────')

// ── 5. Iniciar Next.js com o env já injetado em process.env
//        O processo filho herda process.env, que agora tem os valores de staging.
//        O Next.js tentará carregar .env.local de novo, mas como as variáveis
//        já estão definidas em process.env o override manual acima prevalece
//        somente para este processo pai — precisamos bloquear o carregamento
//        interno do Next.js de .env.local definindo as vars antes do spawn.
//        O Next.js respeita process.env existente e não sobrescreve.

const child = spawn(
  process.execPath,
  ['node_modules/.bin/next', 'dev', '--port', '3001'],
  {
    cwd: ROOT,
    env: process.env,   // env já contém o override do staging
    stdio: 'inherit',
  }
)

function cleanup(signal) {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT',  () => cleanup('SIGINT'))
process.on('SIGTERM', () => cleanup('SIGTERM'))

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0))
})
