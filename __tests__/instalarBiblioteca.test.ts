import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks de dependências externas ───────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { instalarBiblioteca } from '@/app/(app)/configuracoes/bibliotecas/actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Helpers de mock ──────────────────────────────────────────────────────────

function chain(resolved: unknown, singleResolved: unknown = resolved) {
  const c: Record<string, unknown> = {}
  const self = () => c as never
  c.select = vi.fn(self)
  c.eq = vi.fn(self)
  c.in = vi.fn(self)
  c.not = vi.fn(self)
  c.order = vi.fn(self)
  c.single = vi.fn(() => Promise.resolve(singleResolved))
  c.upsert = vi.fn(() => Promise.resolve(resolved))
  c.update = vi.fn(self)
  c.insert = vi.fn(self)
  c.then = (resolve: (v: unknown) => unknown) => resolve(resolved)
  return c
}

function mockAuthUser(userId: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
  } as never)
}

// PILOT-0005: causa raiz — biblioteca_itens vazia fazia a instalação "suceder"
// sem inserir nenhum produto (0 produtos, mas instalacao/nicho eram gravados).
// O fix retorna erro explícito antes de qualquer efeito colateral no banco.
describe('instalarBiblioteca — PILOT-0005 causa raiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('biblioteca sem itens ativos: retorna erro claro e não toca em instalacoes_biblioteca/lojas', async () => {
    mockAuthUser('user-dono-1')

    const tables: Record<string, unknown> = {
      membros_loja: chain({ data: [{ loja_id: 'loja-combo', role: 'dono' }], error: null }),
      bibliotecas: chain({ data: { nicho: 'suplementos' }, error: null }),
      biblioteca_itens: chain({ data: [], error: null }), // ← catálogo vazio (causa raiz)
      lojas: chain({ data: null, error: null }),
      instalacoes_biblioteca: chain({ data: null, error: null }),
      produtos: chain({ data: [], error: null }),
    }
    const from = vi.fn((table: string) => tables[table])
    vi.mocked(createAdminClient).mockReturnValue({ from } as never)

    const res = await instalarBiblioteca({ biblioteca_id: 'piuvita-id', loja_ids: ['loja-combo'] })

    expect(res.ok).toBe(false)
    expect(res.erro).toBe('Esta biblioteca ainda não possui produtos cadastrados')
    expect(res.produtosInseridos).toBe(0)
    expect(res.lojasInstaladas).toBe(0)

    // efeito colateral algum: nem a instalação nem o nicho da loja podem ser alterados
    // quando não há produto nenhum para instalar
    expect((tables.instalacoes_biblioteca as { upsert: ReturnType<typeof vi.fn> }).upsert).not.toHaveBeenCalled()
    expect((tables.lojas as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled()
  })

  it('biblioteca com itens: segue o fluxo normal (não é bloqueada pelo guard novo)', async () => {
    mockAuthUser('user-dono-1')

    const tables: Record<string, unknown> = {
      membros_loja: chain({ data: [{ loja_id: 'loja-combo', role: 'dono' }], error: null }),
      bibliotecas: chain({ data: { nicho: 'suplementos' }, error: null }),
      biblioteca_itens: chain({
        data: [{ id: 'item-1', nome: 'Complexo B C/60', foto_url: null, preco_sugerido: 48.8, ciclo_recompra_dias: 58, qtd_mensagens: 5, nicho: 'suplementos', parceiro_id: null, categoria: 'Vitaminas', repasse_ativo: false, tipo_acordo: 'livre' }],
        error: null,
      }),
      lojas: chain({ data: { nichos: [] }, error: null }),
      instalacoes_biblioteca: chain({ data: null, error: null }),
      // bare await (select existentes) -> lista vazia; .single() (insert novo produto) -> produto criado
      produtos: chain({ data: [], error: null }, { data: { id: 'novo-produto-1' }, error: null }),
      mensagens_produto: chain({ data: null, error: null }),
    }
    const from = vi.fn((table: string) => tables[table])
    vi.mocked(createAdminClient).mockReturnValue({ from } as never)

    const res = await instalarBiblioteca({ biblioteca_id: 'piuvita-id', loja_ids: ['loja-combo'] })

    expect(res.ok).toBe(true)
    expect(res.erro).toBeUndefined()
  })
})
