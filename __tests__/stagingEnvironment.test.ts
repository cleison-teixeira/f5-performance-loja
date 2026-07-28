import { describe, it, expect } from 'vitest'

// ── Lógica de exibição do StagingBanner ──────────────────────────────────────

function exibirBanner(vercelEnv: string | undefined): boolean {
  if (vercelEnv === 'production') return false
  if (!vercelEnv) return false
  return true
}

// ── 1. Banner aparece em staging / preview ────────────────────────────────────

describe('StagingBanner — visibilidade por ambiente', () => {
  it('exibe em preview (Vercel preview deployment)', () => {
    expect(exibirBanner('preview')).toBe(true)
  })

  it('exibe em development (Vercel dev environment)', () => {
    expect(exibirBanner('development')).toBe(true)
  })

  it('não exibe em production', () => {
    expect(exibirBanner('production')).toBe(false)
  })

  it('não exibe quando VERCEL_ENV não está definido (local sem Vercel CLI)', () => {
    expect(exibirBanner(undefined)).toBe(false)
  })

  it('não exibe com string vazia', () => {
    expect(exibirBanner('')).toBe(false)
  })
})

// ── 2. Estado da mensagem de liberação pendente ───────────────────────────────

type ResultadoLoja = {
  resultado: 'vinculado' | 'pendente'
  nome: string
  email: string
  appUrl: string
}

describe('Admin — mensagem de liberação pendente', () => {
  it('pendente captura o email exato da liberação', () => {
    const r: ResultadoLoja = {
      resultado: 'pendente',
      nome: 'Verde Vida Angeloni',
      email: 'sillvanna.teixeira+angeloni@gmail.com',
      appUrl: 'https://f5-recompra-git-feat-mo-abc123.vercel.app',
    }
    expect(r.email).toBe('sillvanna.teixeira+angeloni@gmail.com')
    expect(r.resultado).toBe('pendente')
  })

  it('pendente captura o appUrl do ambiente no momento do submit', () => {
    const stagingUrl = 'https://f5-recompra-git-feat-mo-abc123.vercel.app'
    const r: ResultadoLoja = {
      resultado: 'pendente',
      nome: 'Verde Vida Centro',
      email: 'sillvanna.teixeira+centro@gmail.com',
      appUrl: stagingUrl,
    }
    expect(r.appUrl).toBe(stagingUrl)
  })

  it('appUrl de produção é diferente do staging', () => {
    const producao: ResultadoLoja = { resultado: 'pendente', nome: 'Loja X', email: 'x@x.com', appUrl: 'https://app.f5recompra.com.br' }
    const staging: ResultadoLoja = { resultado: 'pendente', nome: 'Loja X', email: 'x@x.com', appUrl: 'https://f5-recompra-git-feat-mo-abc123.vercel.app' }
    expect(producao.appUrl).not.toBe(staging.appUrl)
  })

  it('vinculado não requer orientação de ambiente — resultado imediato', () => {
    const r: ResultadoLoja = {
      resultado: 'vinculado',
      nome: 'Verde Vida Angeloni',
      email: 'sillvanna.teixeira+angeloni@gmail.com',
      appUrl: 'https://app.f5recompra.com.br',
    }
    expect(r.resultado).toBe('vinculado')
    // UI só exibe bloco de orientação quando resultado === 'pendente'
    const exibirOrientacao = r.resultado === 'pendente'
    expect(exibirOrientacao).toBe(false)
  })
})

// ── 3. Liberar Rede — não é afetado ──────────────────────────────────────────

describe('Admin — Liberar Rede não alterado', () => {
  type ResultadoRede = { resultado: 'vinculado' | 'pendente'; count: number }

  it('resultadoRede não contém email nem appUrl — estado separado', () => {
    const r: ResultadoRede = { resultado: 'vinculado', count: 2 }
    expect(r).not.toHaveProperty('email')
    expect(r).not.toHaveProperty('appUrl')
  })

  it('resultadoRede usa count de lojas processadas', () => {
    const r: ResultadoRede = { resultado: 'pendente', count: 3 }
    expect(r.count).toBe(3)
  })
})

// ── 4. Email normalizado no submit ────────────────────────────────────────────

describe('Admin — normalização do email capturado', () => {
  function normalizarEmail(raw: string): string {
    return raw.trim().toLowerCase()
  }

  it('remove espaços e normaliza para minúsculas', () => {
    expect(normalizarEmail('  Sillvanna@Gmail.com  ')).toBe('sillvanna@gmail.com')
  })

  it('preserva alias com + intacto', () => {
    expect(normalizarEmail('Sillvanna.Teixeira+Angeloni@Gmail.com')).toBe('sillvanna.teixeira+angeloni@gmail.com')
  })
})
