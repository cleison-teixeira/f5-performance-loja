import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks de dependências externas ───────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { calcularComissaoSemGravar, gravarComissaoVenda } from '@/lib/comissoes/gravar'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Helper de mock chainable (funciona com qualquer sequência de
//    .eq()/.in()/.lte()/.gte()/.or()/.order()/.limit()/.select() antes de
//    .maybeSingle()/.single(), ou sem terminal — como a query de vendas do
//    cálculo de meta, que resolve direto no await do último .lt()). ──

type QueryResult = { data: unknown; error?: unknown }

function makeChainable(result: QueryResult) {
  const resolved = Promise.resolve({ data: result.data, error: result.error ?? null })
  const chain = {
    eq: () => chain,
    in: () => chain,
    lte: () => chain,
    gte: () => chain,
    lt: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    select: () => chain,
    maybeSingle: () => resolved,
    single: () => resolved,
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      resolved.then(onFulfilled, onRejected),
  }
  return chain
}

function mockAdmin(perTable: Record<string, QueryResult>) {
  const from = vi.fn((table: string) => makeChainable(perTable[table] ?? { data: null }))
  const insertChain = (result: QueryResult) => ({
    select: () => ({ single: () => Promise.resolve({ data: result.data, error: result.error ?? null }) }),
  })
  vi.mocked(createAdminClient).mockReturnValue({ from } as never)
  return { from, insertChain }
}

const ITEM_BASE = {
  produto_id: 'produto-1',
  produto_nome: 'Óleo Essencial Lavanda 10ml',
  subtotal: 100,
  comissionavel: true,
}

describe('calcularComissaoSemGravar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('A: regra padrão — sem fixo/campanha/meta, aplica percentual de regras_comissao', async () => {
    mockAdmin({
      comissao_fixa_produto: { data: [] },
      campanhas_produto: { data: null },
      metas_vendedora: { data: null },
      regras_comissao: { data: { percentual: 5 } },
    })

    const resultado = await calcularComissaoSemGravar({
      loja_id: 'loja-1',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
    })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor_base).toBe(100)
      expect(resultado.percentual).toBe(5)
      expect(resultado.valor_comissao).toBe(5)
      expect(resultado.tipo_comissao).toBe('padrao')
    }
  })

  it('B: comissão fixa por produto tem prioridade — ignora meta/regra padrão', async () => {
    mockAdmin({
      comissao_fixa_produto: { data: [{ produto_id: 'produto-1', valor_fixo: 12, id: 'fixa-1' }] },
    })

    const resultado = await calcularComissaoSemGravar({
      loja_id: 'loja-1',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
    })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor_comissao).toBe(12)
      expect(resultado.tipo_comissao).toBe('produto_fixo')
      expect(resultado.comissao_fixa_produto_id).toBe('fixa-1')
    }
  })

  it('C: meta — sem ajuste, total do mês fica abaixo do limiar, usa comissao_base', async () => {
    mockAdmin({
      comissao_fixa_produto: { data: [] },
      campanhas_produto: { data: null },
      metas_vendedora: { data: { valor_meta: 1000, comissao_base: 5, comissao_meta: 10, multiplicador: null } },
      vendas: { data: [{ valor: 900 }] }, // total persistido = 900, abaixo dos 1000 de meta
    })

    const resultado = await calcularComissaoSemGravar({
      loja_id: 'loja-1',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
      // sem ajusteTotalVendasMes — total para cálculo = 900
    })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.percentual).toBe(5) // comissao_base, meta não batida
      expect(resultado.tipo_comissao).toBe('base')
    }
  })

  it('D: PROVA — ajusteTotalVendasMes cruza o limiar de meta e muda o percentual aplicado', async () => {
    // Mesmo cenário do teste C (persistido = 900, meta = 1000), mas agora
    // somando explicitamente o valor desta própria recompra (150) — total
    // para cálculo = 1050 >= 1000 → deve bater a meta e usar comissao_meta.
    mockAdmin({
      comissao_fixa_produto: { data: [] },
      campanhas_produto: { data: null },
      metas_vendedora: { data: { valor_meta: 1000, comissao_base: 5, comissao_meta: 10, multiplicador: null } },
      vendas: { data: [{ valor: 900 }] },
    })

    const semAjuste = await calcularComissaoSemGravar({
      loja_id: 'loja-1',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
      ajusteTotalVendasMes: 0,
    })

    mockAdmin({
      comissao_fixa_produto: { data: [] },
      campanhas_produto: { data: null },
      metas_vendedora: { data: { valor_meta: 1000, comissao_base: 5, comissao_meta: 10, multiplicador: null } },
      vendas: { data: [{ valor: 900 }] },
    })

    const comAjuste = await calcularComissaoSemGravar({
      loja_id: 'loja-1',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
      ajusteTotalVendasMes: 150, // valor_total da própria recompra sendo confirmada
    })

    expect(semAjuste.ok && semAjuste.percentual).toBe(5)
    expect(semAjuste.ok && semAjuste.tipo_comissao).toBe('base')

    expect(comAjuste.ok && comAjuste.percentual).toBe(10)
    expect(comAjuste.ok && comAjuste.tipo_comissao).toBe('meta_batida')
  })

  it('E: nenhum item comissionável — retorna zero sem consultar comissao_fixa_produto/campanha/meta', async () => {
    const { from } = mockAdmin({})

    const resultado = await calcularComissaoSemGravar({
      loja_id: 'loja-1',
      vendedora_id: 'vend-1',
      itens: [{ ...ITEM_BASE, comissionavel: false }],
      data_venda: '2026-07-31',
    })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor_base).toBe(0)
      expect(resultado.valor_comissao).toBe(0)
      expect(resultado.tipo_comissao).toBeNull()
    }
    expect(from).not.toHaveBeenCalled()
  })
})

describe('gravarComissaoVenda (regressão do caminho existente)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('F: guard — comissão já existe para a venda, não insere de novo', async () => {
    const { from } = mockAdmin({
      comissao_venda: {
        data: { id: 'com-1', percentual: 5, valor_comissao: 5, tipo_comissao: 'padrao', valor_venda: 100 },
      },
    })

    const resultado = await gravarComissaoVenda({
      loja_id: 'loja-1',
      venda_id: 'venda-1',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
    })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.ja_existia).toBe(true)
      expect(resultado.comissao_id).toBe('com-1')
    }
    // só a query de guard (comissao_venda) — nenhuma tabela de cálculo consultada
    expect(from).toHaveBeenCalledWith('comissao_venda')
    expect(from).not.toHaveBeenCalledWith('regras_comissao')
  })

  it('G: fluxo novo — calcula (sem ajuste) e insere em comissao_venda', async () => {
    const insertedRows: unknown[] = []
    const from = vi.fn((table: string) => {
      if (table === 'comissao_venda') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          insert: (row: unknown) => {
            insertedRows.push(row)
            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'com-novo' }, error: null }) }) }
          },
        }
      }
      if (table === 'regras_comissao') return makeChainable({ data: { percentual: 5 } })
      return makeChainable({ data: null })
    })
    vi.mocked(createAdminClient).mockReturnValue({ from } as never)

    const resultado = await gravarComissaoVenda({
      loja_id: 'loja-1',
      venda_id: 'venda-2',
      vendedora_id: 'vend-1',
      itens: [ITEM_BASE],
      data_venda: '2026-07-31',
    })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.ja_existia).toBe(false)
      expect(resultado.valor_comissao).toBe(5)
      expect(resultado.comissao_id).toBe('com-novo')
    }
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toMatchObject({ venda_id: 'venda-2', percentual: 5, valor_comissao: 5 })
  })
})
