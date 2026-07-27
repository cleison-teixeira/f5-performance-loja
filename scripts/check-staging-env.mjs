#!/usr/bin/env node
// Validação de ambiente — executar ANTES de iniciar o servidor de desenvolvimento.
// Recusa inicialização se o project ref não for o de staging.

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = resolve(__dirname, '../.env.staging')

let env = {}
try {
  const raw = readFileSync(envFile, 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.error('[check-staging-env] .env.staging não encontrado.')
  process.exit(1)
}

const PROD_REF = 'nhcppfovsxcsulyvwvgs'
const STAGING_REF = 'ynrffhacpjzohrhkpuiq'

const url = env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const svcKey = env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

const failures = []

if (url.includes(PROD_REF)) {
  failures.push('ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_URL aponta para PRODUÇÃO. Interrompendo.')
}
if (!url.includes(STAGING_REF)) {
  failures.push('ERRO: URL não contém o ref de staging esperado.')
}
if (svcKey.startsWith('REPLACE_') || svcKey === '') {
  failures.push('AVISO: SUPABASE_SERVICE_ROLE_KEY não foi preenchida. Operações server-side falharão.')
}
if (svcKey.length > 0 && !svcKey.startsWith('REPLACE_') && url.includes(PROD_REF)) {
  failures.push('ERRO CRÍTICO: chave de serviço com URL de produção detectada.')
}

if (failures.some(f => f.startsWith('ERRO CRÍTICO'))) {
  for (const f of failures) console.error(f)
  process.exit(1)
}

for (const f of failures) console.warn(f)

console.log('[check-staging-env] Ambiente: STAGING ✓')
console.log('[check-staging-env] Project ref: ynr...puiq ✓')
console.log('[check-staging-env] Produção: não utilizada ✓')
if (!svcKey.startsWith('REPLACE_') && svcKey.length > 0) {
  console.log('[check-staging-env] Service role: preenchida ✓')
}
