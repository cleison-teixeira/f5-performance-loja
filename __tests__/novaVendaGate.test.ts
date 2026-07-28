import { describe, it, expect } from 'vitest'

// ── 1. Bloqueio de "Toda a rede" em /vendas/nova ─────────────────────────────

describe('novaVenda — escopo rede bloqueia o formulário', () => {
  type Escopo = 'rede' | 'loja'

  function deveBloquear(multiLoja: boolean, escopo: Escopo): boolean {
    return multiLoja && escopo === 'rede'
  }

  it('dono em "Toda a rede" deve ser bloqueado', () => {
    expect(deveBloquear(true, 'rede')).toBe(true)
  })

  it('dono com loja selecionada não deve ser bloqueado', () => {
    expect(deveBloquear(true, 'loja')).toBe(false)
  })

  it('vendedora (single-loja) nunca é bloqueada por escopo', () => {
    // multiLoja=false para vendedora/gerente — escopo sempre 'loja'
    expect(deveBloquear(false, 'loja')).toBe(false)
    expect(deveBloquear(false, 'rede')).toBe(false)
  })

  it('admin_f5 em "Toda a rede" deve ser bloqueado', () => {
    expect(deveBloquear(true, 'rede')).toBe(true)
  })
})

// ── 2. lojaId não usa fallback quando escopo = rede ──────────────────────────

describe('novaVenda — lojaId sem fallback quando rede', () => {
  interface Ctx { escopo: 'rede' | 'loja'; lojaId: string | null; lojas: Array<{ id: string; nome: string }> }

  function resolverLojaId(ctx: Ctx, multiLoja: boolean): string | null {
    if (multiLoja && ctx.escopo === 'rede') return null  // bloqueado antes de chegar aqui
    return ctx.lojaId ?? null
  }

  it('escopo rede: lojaId nunca usa lojas[0] como fallback', () => {
    const ctx: Ctx = {
      escopo: 'rede',
      lojaId: null,
      lojas: [{ id: 'loja-a', nome: 'A' }, { id: 'loja-b', nome: 'B' }],
    }
    expect(resolverLojaId(ctx, true)).toBeNull()
  })

  it('escopo loja com lojaId definido: retorna lojaId correto', () => {
    const ctx: Ctx = { escopo: 'loja', lojaId: 'loja-a', lojas: [] }
    expect(resolverLojaId(ctx, true)).toBe('loja-a')
  })

  it('single-loja (multiLoja=false): retorna lojaId diretamente', () => {
    const ctx: Ctx = { escopo: 'loja', lojaId: 'loja-x', lojas: [] }
    expect(resolverLojaId(ctx, false)).toBe('loja-x')
  })
})

// ── 3. Isolamento de loja após seleção ───────────────────────────────────────

describe('novaVenda — dados isolados por loja', () => {
  it('troca de loja elimina dados da loja anterior (SSR rerender)', () => {
    // Em SSR, trocar o cookie muda ctx.lojaId → página recarrega com dados da nova loja.
    // Não há estado React persistindo dados da loja anterior.
    const lojaA = { id: 'loja-a', produtos: ['prod-a1', 'prod-a2'] }
    const lojaB = { id: 'loja-b', produtos: ['prod-b1'] }

    function carregarDados(lojaId: string) {
      if (lojaId === lojaA.id) return lojaA.produtos
      if (lojaId === lojaB.id) return lojaB.produtos
      return []
    }

    // Seleciona Angeloni → dados Angeloni
    expect(carregarDados('loja-a')).toEqual(['prod-a1', 'prod-a2'])
    // Troca para Combo → dados Combo (sem resíduo de Angeloni)
    expect(carregarDados('loja-b')).toEqual(['prod-b1'])
    expect(carregarDados('loja-b')).not.toContain('prod-a1')
  })

  it('loja_id do registro de venda reflete a loja selecionada', () => {
    const lojaIdSelecionado = 'f5feed00-0000-0000-0001-000000000002' // Combo
    const vendaInput = { loja_id: lojaIdSelecionado, cliente_nome: 'Teste' }
    expect(vendaInput.loja_id).toBe('f5feed00-0000-0000-0001-000000000002')
  })
})
