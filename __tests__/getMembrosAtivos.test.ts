import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks de dependências externas ───────────────────────────────────────────

vi.mock('react', () => ({
  cache: <T>(fn: T) => fn,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/performance/timing', () => ({
  measureAsync: vi.fn((_: string, fn: () => unknown) => fn()),
  startTimer: vi.fn(() => () => {}),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getMembrosAtivos } from '@/lib/loja/contexto'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Helper para configurar o mock do admin client ─────────────────────────────

type SupabaseError = { code: string; message: string; details: string; hint: string }
type Membro = { loja_id: string; role: string }

function mockAdminQuery(result: { data: Membro[] | null; error: SupabaseError | null }) {
  const eq2 = vi.fn().mockResolvedValue(result)
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  const from = vi.fn().mockReturnValue({ select })
  vi.mocked(createAdminClient).mockReturnValue({ from } as never)
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('getMembrosAtivos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // A: query bem-sucedida com dois vínculos
  it('A: data com dois vínculos e error=null — retorna os dois registros', async () => {
    const vinculos: Membro[] = [
      { loja_id: 'loja-uuid-1', role: 'vendedora' },
      { loja_id: 'loja-uuid-2', role: 'gerente' },
    ]
    mockAdminQuery({ data: vinculos, error: null })

    const result = await getMembrosAtivos('user-uuid-a')

    expect(result).toHaveLength(2)
    expect(result).toEqual(vinculos)
  })

  // B: query bem-sucedida com zero registros — usuário legítimo sem loja
  it('B: data=[] e error=null — retorna [] representando usuário sem loja', async () => {
    mockAdminQuery({ data: [], error: null })

    const result = await getMembrosAtivos('user-uuid-b')

    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })

  // C: query com erro — não retorna [], lança exceção com mensagem genérica
  it('C: data=null e error preenchido — lança mensagem genérica sem expor internos', async () => {
    mockAdminQuery({
      data: null,
      error: { code: '401', message: 'JWT invalid', details: '', hint: '' },
    })

    await expect(getMembrosAtivos('user-uuid-c')).rejects.toThrow(
      'Não foi possível carregar os vínculos de acesso às lojas.'
    )
  })

  it('C2: mensagem lançada não expõe detalhes internos do Supabase', async () => {
    mockAdminQuery({
      data: null,
      error: { code: '401', message: 'JWT invalid — service_role rejected', details: '', hint: '' },
    })

    let thrownMessage = ''
    try {
      await getMembrosAtivos('user-uuid-c2')
    } catch (e) {
      thrownMessage = (e as Error).message
    }

    expect(thrownMessage).toBe('Não foi possível carregar os vínculos de acesso às lojas.')
    expect(thrownMessage).not.toContain('JWT')
    expect(thrownMessage).not.toContain('service_role')
    expect(thrownMessage).not.toContain('401')
  })

  // D: segurança — console.error não vaza userId, secrets nem tokens
  it('D: console.error não registra userId, service_role nem e-mail no payload', async () => {
    const sensitiveUserId = 'usr-9f8e7d6c-5b4a-3210-fedc-ba9876543210'

    mockAdminQuery({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired', details: '', hint: '' },
    })

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await getMembrosAtivos(sensitiveUserId)
    } catch {
      // esperado
    }

    expect(spy).toHaveBeenCalledOnce()

    const loggedPayload = JSON.stringify(spy.mock.calls[0])

    // userId não deve aparecer no log
    expect(loggedPayload).not.toContain(sensitiveUserId)
    // sem padrão de service_role key (JWT longo)
    expect(loggedPayload).not.toMatch(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{100,}/)
    // sem e-mail
    expect(loggedPayload).not.toMatch(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)

    spy.mockRestore()
  })

  it('D2: erro com error=null nunca chama console.error', async () => {
    mockAdminQuery({ data: [], error: null })

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await getMembrosAtivos('user-uuid-d2')

    expect(spy).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})
