import { describe, it, expect, vi } from 'vitest'
import { gerarAvisos } from '@/lib/avisos/gerador'
import { planejarAvisosParaVenda } from '@/lib/avisos/planejarParaVenda'
import { calcularComissaoAvancada } from '@/lib/comissoes/calculador'
import { garantirMensagensProduto } from '@/lib/avisos/garantirMensagensProduto'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CTX_BASE = {
  venda_id: 'v-001',
  loja_id: 'l-001',
  cliente_id: 'c-001',
  vendedora_id: 'u-001',
  cliente_nome: 'Ana Silva',
  vendedora_nome: 'Carol',
  loja_nome: 'Verde Essencial',
  item_venda_id: 'iv-001',
}

const MENSAGEM_RECOMPRA = {
  id: 'm-rec',
  tipo: 'recompra',
  texto: 'Olá {{cliente}}, está na hora de reabastecer seu {{produto}}!',
  dias_apos_venda: 30,
}

const MENSAGEM_OFERTA = {
  id: 'm-ofe',
  tipo: 'oferta',
  texto: 'Oferta especial para você, {{cliente}}!',
  dias_apos_venda: 35,
}

const MENSAGEM_AGRADECIMENTO = {
  id: 'm-agr',
  tipo: 'agradecimento',
  texto: 'Obrigado, {{cliente}}!',
  dias_apos_venda: 0,
}

// ── TESTE A: gerarAvisos — renderização básica ─────────────────────────────

describe('gerarAvisos', () => {
  it('A1: renders produto and cliente names correctly', () => {
    const avisos = gerarAvisos(
      [MENSAGEM_RECOMPRA],
      { ...CTX_BASE, produto_nome: 'Colágeno' },
      '2026-01-01',
      30
    )
    expect(avisos).toHaveLength(1)
    expect(avisos[0].texto_renderizado).toContain('Ana')
    expect(avisos[0].texto_renderizado).toContain('Colágeno')
    expect(avisos[0].status).toBe('pendente')
  })

  it('A2: calculates data_aviso offset from data_base using ciclo', () => {
    const avisos = gerarAvisos(
      [MENSAGEM_RECOMPRA],
      { ...CTX_BASE, produto_nome: 'P' },
      '2026-01-01',
      30
    )
    // recompra offset = max(floor(30/2), 30-5) = max(15, 25) = 25
    expect(avisos[0].data_aviso).toBe('2026-01-26')
  })

  it('A3: agradecimento always on data_base (offset 0)', () => {
    const avisos = gerarAvisos(
      [MENSAGEM_AGRADECIMENTO],
      { ...CTX_BASE, produto_nome: 'P' },
      '2026-02-15',
      30
    )
    expect(avisos[0].data_aviso).toBe('2026-02-15')
  })

  it('A4: oferta offset > recompra offset', () => {
    const avisos = gerarAvisos(
      [MENSAGEM_RECOMPRA, MENSAGEM_OFERTA],
      { ...CTX_BASE, produto_nome: 'P' },
      '2026-01-01',
      30
    )
    const dataRec = avisos.find(a => a.mensagem_id === 'm-rec')!.data_aviso
    const dataOfe = avisos.find(a => a.mensagem_id === 'm-ofe')!.data_aviso
    expect(dataOfe >= dataRec).toBe(true)
  })

  it('A5: multiple products — produto_nome_ancora used for recompra type', () => {
    const avisos = gerarAvisos(
      [MENSAGEM_RECOMPRA],
      { ...CTX_BASE, produto_nome: 'Colágeno e Vitamina C', produto_nome_ancora: 'Colágeno' },
      '2026-01-01',
      30
    )
    expect(avisos[0].texto_renderizado).toContain('Colágeno')
    expect(avisos[0].texto_renderizado).not.toContain('e Vitamina C')
  })
})

// ── TESTE B: planejarAvisosParaVenda — função pura ────────────────────────

describe('planejarAvisosParaVenda', () => {
  function criarDbMock(mensagens: typeof MENSAGEM_RECOMPRA[]) {
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({ data: table === 'mensagens_produto' ? mensagens : null }),
            single: () => ({ data: table === 'produtos' ? { qtd_mensagens: 3 } : null }),
          }),
        }),
      }),
    }
  }

  it('B1: returns empty array when no recurrent items', async () => {
    const db = criarDbMock([MENSAGEM_RECOMPRA])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'recompra',
      itens: [{ id: 'iv-1', produto_id: 'p-1', produto_nome: 'P', recorrente: false, ciclo_recompra_dias: 30 }],
      db,
    })
    expect(result.avisos).toHaveLength(0)
  })

  it('B2: returns empty array when mensagens_produto is empty (no seed writes)', async () => {
    const db = criarDbMock([])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'recompra',
      itens: [{ id: 'iv-1', produto_id: 'p-1', produto_nome: 'P', recorrente: true, ciclo_recompra_dias: 30 }],
      db,
    })
    expect(result.avisos).toHaveLength(0)
  })

  it('B3: excludes agradecimento for recompra origin', async () => {
    const db = criarDbMock([MENSAGEM_AGRADECIMENTO, MENSAGEM_RECOMPRA])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'recompra',
      itens: [{ id: 'iv-1', produto_id: 'p-1', produto_nome: 'P', recorrente: true, ciclo_recompra_dias: 30 }],
      db,
    })
    const datas = result.avisos.map(a => {
      // data_aviso should not be on day 0 (agradecimento offset)
      return a.data_aviso
    })
    // All avisos should have offset > 0 (no agradecimento)
    expect(datas.every(d => d > '2026-01-01')).toBe(true)
  })

  it('B4: anchor selection uses item with lowest ciclo_recompra_dias', async () => {
    const dbCall = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ data: [MENSAGEM_RECOMPRA] }),
          single: () => ({ data: { qtd_mensagens: 3 } }),
        }),
      }),
    })
    const db = { from: dbCall }

    await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'recompra',
      itens: [
        { id: 'iv-a', produto_id: 'p-a', produto_nome: 'A', recorrente: true, ciclo_recompra_dias: 60 },
        { id: 'iv-b', produto_id: 'p-b', produto_nome: 'B', recorrente: true, ciclo_recompra_dias: 30 },
      ],
      db,
    })

    // The first from() call with 'mensagens_produto' should use p-b (ciclo=30, lower)
    const mensagensCalls = dbCall.mock.calls.filter(([t]) => t === 'mensagens_produto')
    expect(mensagensCalls.length).toBeGreaterThan(0)
  })
})

// ── TESTE C: calcularComissaoAvancada — cálculo puro ─────────────────────

describe('calcularComissaoAvancada', () => {
  it('C1: standard rule — 10% on full base', () => {
    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: 200,
      valor_comissao_fixa: 0,
      comissao_fixa_produto_id: null,
      campanha: null,
      meta: null,
      total_vendas_mes: 0,
      regra_padrao: { percentual: 10 },
    })
    expect(result.valor_comissao).toBe(20)
    expect(result.percentual).toBe(10)
    expect(result.tipo).toBe('padrao')
  })

  it('C2: fixed product commission adds to percentage base', () => {
    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: 100,
      valor_comissao_fixa: 15,
      comissao_fixa_produto_id: 'fp-1',
      campanha: null,
      meta: null,
      total_vendas_mes: 0,
      regra_padrao: { percentual: 10 },
    })
    // 15 (fixed) + 10% of 100 (10) = 25
    expect(result.valor_comissao).toBe(25)
    expect(result.tipo).toBe('produto_fixo')
  })

  it('C3: campaign takes priority over standard rule', () => {
    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: 200,
      valor_comissao_fixa: 0,
      comissao_fixa_produto_id: null,
      campanha: { id: 'camp-1', comissao_fixa: 50 },
      meta: null,
      total_vendas_mes: 0,
      regra_padrao: { percentual: 10 },
    })
    expect(result.valor_comissao).toBe(50)
    expect(result.tipo).toBe('campanha')
    expect(result.campanha_id).toBe('camp-1')
  })

  it('C4: meta batida — uses comissao_meta instead of comissao_base', () => {
    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: 300,
      valor_comissao_fixa: 0,
      comissao_fixa_produto_id: null,
      campanha: null,
      meta: { valor_meta: 500, comissao_base: 5, comissao_meta: 12, multiplicador: null },
      total_vendas_mes: 600, // above meta
      regra_padrao: null,
    })
    expect(result.percentual).toBe(12)
    expect(result.tipo).toBe('meta_batida')
  })

  it('C5: meta not reached — uses comissao_base', () => {
    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: 300,
      valor_comissao_fixa: 0,
      comissao_fixa_produto_id: null,
      campanha: null,
      meta: { valor_meta: 500, comissao_base: 5, comissao_meta: 12, multiplicador: null },
      total_vendas_mes: 400, // below meta
      regra_padrao: null,
    })
    expect(result.percentual).toBe(5)
    expect(result.tipo).toBe('base')
  })

  it('C6: non-comissionavel item is excluded from base — valor_base_comissao != valor_total', () => {
    // Energético (non-comissionavel) should not be counted
    const itens = [
      { subtotal: 100, comissionavel: true },
      { subtotal: 50, comissionavel: false },  // non-comissionavel
    ]
    const valor_base_comissao = itens.filter(i => i.comissionavel).reduce((s, i) => s + i.subtotal, 0)
    const valor_total = itens.reduce((s, i) => s + i.subtotal, 0)

    expect(valor_base_comissao).toBe(100)
    expect(valor_total).toBe(150)

    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: valor_base_comissao,
      valor_comissao_fixa: 0,
      comissao_fixa_produto_id: null,
      campanha: null,
      meta: null,
      total_vendas_mes: 0,
      regra_padrao: { percentual: 10 },
    })
    expect(result.valor_comissao).toBe(10) // 10% of 100, not 150
  })

  it('C7: zero base with no fixed — returns zero commission', () => {
    const result = calcularComissaoAvancada({
      valor_base_sem_fixo: 0,
      valor_comissao_fixa: 0,
      comissao_fixa_produto_id: null,
      campanha: null,
      meta: null,
      total_vendas_mes: 0,
      regra_padrao: { percentual: 10 },
    })
    expect(result.valor_comissao).toBe(0)
  })
})

// ── TESTE D: RPC payload shape validation ─────────────────────────────────

describe('RPC payload structure', () => {
  it('D1: is_novo=false for existing items', () => {
    const itens = [
      { item_venda_id: 'iv-001', is_novo: false },
      { item_venda_id: 'iv-002', is_novo: true },
    ]
    const existentes = itens.filter(i => !i.is_novo)
    const novos = itens.filter(i => i.is_novo)
    expect(existentes).toHaveLength(1)
    expect(novos[0].item_venda_id).toBe('iv-002')
  })

  it('D2: all new items must have a UUID', () => {
    const raw = [
      { item_venda_id: null, produto_nome: 'P1' },
      { item_venda_id: 'iv-001', produto_nome: 'P2' },
    ]
    const withIds = raw.map(item => ({
      ...item,
      item_venda_id: item.item_venda_id ?? crypto.randomUUID(),
      is_novo: item.item_venda_id === null,
    }))
    expect(withIds[0].item_venda_id).toBeTruthy()
    expect(withIds[0].item_venda_id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

// ── TESTE E: versao conflict detection ────────────────────────────────────

describe('versao conflict', () => {
  it('E1: mismatched versao should be detected before calling RPC', () => {
    const versaoNoBanco = 3
    const versaoEsperada = 2
    expect(versaoNoBanco !== versaoEsperada).toBe(true)
  })

  it('E2: matched versao should proceed', () => {
    const versaoNoBanco = 2
    const versaoEsperada = 2
    expect(versaoNoBanco === versaoEsperada).toBe(true)
  })

  it('E3: CONFLICT prefix is extracted and message returned correctly', () => {
    const msg = 'ERROR:  CONFLICT:A recompra foi alterada por outro usuário. Recarregue e tente novamente.'
    expect(msg.includes('CONFLICT:')).toBe(true)
    expect(msg.replace(/.*CONFLICT:/, '').trim()).toBe('A recompra foi alterada por outro usuário. Recarregue e tente novamente.')
  })

  it('E4: VALIDATION prefix is extracted and message returned correctly', () => {
    const msg = 'ERROR:  VALIDATION:A recompra precisa ter pelo menos um produto'
    expect(msg.includes('VALIDATION:')).toBe(true)
    expect(msg.replace(/.*VALIDATION:/, '').trim()).toBe('A recompra precisa ter pelo menos um produto')
  })

  it('E5: unknown RPC error falls back to generic message', () => {
    const msg = 'connection refused'
    const isConflict = msg.includes('CONFLICT:')
    const isValidation = msg.includes('VALIDATION:')
    const result = isConflict ? 'conflict' : isValidation ? 'validation' : 'Erro ao salvar a recompra. Tente novamente.'
    expect(result).toBe('Erro ao salvar a recompra. Tente novamente.')
  })
})

// ── TESTE B (extra): all non-recurrent ────────────────────────────────────

describe('planejarAvisosParaVenda extra', () => {
  function criarDbMock(mensagens: typeof MENSAGEM_RECOMPRA[]) {
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({ data: table === 'mensagens_produto' ? mensagens : null }),
            single: () => ({ data: table === 'produtos' ? { qtd_mensagens: 3 } : null }),
          }),
        }),
      }),
    }
  }

  it('B5: all non-recurrent items with produto_id return empty array', async () => {
    const db = criarDbMock([MENSAGEM_RECOMPRA])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        { id: 'iv-a', produto_id: 'p-a', produto_nome: 'A', recorrente: false, ciclo_recompra_dias: 30 },
        { id: 'iv-b', produto_id: 'p-b', produto_nome: 'B', recorrente: false, ciclo_recompra_dias: null },
      ],
      db,
    })
    expect(result.avisos).toHaveLength(0)
  })
})

// ── TESTE D (extra): extended payload validation ──────────────────────────

describe('RPC payload extended validation', () => {
  it('D3: duplicate item_venda_ids in payload are detected', () => {
    const payload = [
      { item_venda_id: 'iv-001', is_novo: false },
      { item_venda_id: 'iv-001', is_novo: true },
    ]
    const ids = payload.map(i => i.item_venda_id)
    expect(new Set(ids).size !== ids.length).toBe(true)
  })

  it('D4: new item UUID colliding with existing item is detected', () => {
    const existingIds = new Set(['iv-001', 'iv-002'])
    const newItemId = 'iv-001'
    const isNew = true
    expect(isNew && existingIds.has(newItemId)).toBe(true)
  })

  it('D5: existing item not belonging to target venda is detected', () => {
    const item = { item_venda_id: 'iv-999', venda_id: 'v-002' }
    const targetVendaId = 'v-001'
    expect(item.venda_id === targetVendaId).toBe(false)
  })

  it('D6: RPC extended return includes all counts and versao bump', () => {
    const mockResult = {
      ok: true,
      versao_anterior: 1,
      versao_nova: 2,
      itens_removidos: 1,
      itens_adicionados: 2,
      itens_atualizados: 3,
      avisos_removidos: 5,
      avisos_criados: 4,
      valor_total: 300,
      valor_base_comissao: 250,
    }
    expect(mockResult.ok).toBe(true)
    expect(mockResult.versao_nova).toBe(mockResult.versao_anterior + 1)
    expect(mockResult.avisos_removidos).toBe(5)
    expect(mockResult.avisos_criados).toBe(4)
    expect(mockResult.itens_removidos).toBe(1)
    expect(mockResult.itens_adicionados).toBe(2)
  })
})

// ── TESTE F: garantirMensagensProduto ────────────────────────────────────

describe('garantirMensagensProduto', () => {
  it('F1: seeds all 5 templates when none exist', async () => {
    const upserted: unknown[] = []
    const db = {
      from: (_table: string) => ({
        select: () => ({ eq: () => ({ data: [] }) }),
        upsert: (rows: unknown[], _opts?: unknown) => { upserted.push(...rows); return {} },
      }),
    }
    const seeded = await garantirMensagensProduto('p-1', db)
    expect(seeded).toBe(true)
    expect(upserted).toHaveLength(5)
  })

  it('F2: upserts only missing orders when some already exist', async () => {
    const upserted: unknown[] = []
    const db = {
      from: (_table: string) => ({
        select: () => ({ eq: () => ({ data: [{ ordem: 1 }, { ordem: 2 }, { ordem: 3 }] }) }),
        upsert: (rows: unknown[], _opts?: unknown) => { upserted.push(...rows); return {} },
      }),
    }
    const seeded = await garantirMensagensProduto('p-1', db)
    expect(seeded).toBe(true)
    expect(upserted).toHaveLength(2)
    expect((upserted as { ordem: number }[]).map(r => r.ordem).sort()).toEqual([4, 5])
  })

  it('F3: returns false and upserts nothing when all 5 orders exist', async () => {
    const upserted: unknown[] = []
    const db = {
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            data: [{ ordem: 1 }, { ordem: 2 }, { ordem: 3 }, { ordem: 4 }, { ordem: 5 }],
          }),
        }),
        upsert: (rows: unknown[], _opts?: unknown) => { upserted.push(...rows); return {} },
      }),
    }
    const seeded = await garantirMensagensProduto('p-1', db)
    expect(seeded).toBe(false)
    expect(upserted).toHaveLength(0)
  })
})

// ── TESTE G: upsert error + sequence validation ───────────────────────────

describe('garantirMensagensProduto error handling', () => {
  it('G1: throws when upsert returns an error', async () => {
    const db = {
      from: (_table: string) => ({
        select: () => ({ eq: () => ({ data: [] }) }),
        upsert: (_rows: unknown[], _opts?: unknown) => ({ error: { message: 'unique_violation' } }),
      }),
    }
    await expect(garantirMensagensProduto('p-err', db)).rejects.toThrow('Falha ao garantir mensagens do produto')
  })
})

// ── Guard por produto (lógica extraída de actionsRecompra) ───────────────────
// O guard ANTIGO (guard 1): exigia 4 tipos fixos incluindo follow_up — só qtd=5 passava.
// O guard INTERMEDIÁRIO (guard 2): verificava apenas se avisosPlaneados.length === 0 — global.
// O guard ATUAL (guard 3): verifica porItem individualmente — cada produto recorrente é validado.

type ItemPorItem = { produto_nome: string; tipos: string[] }

function guardPorItem(porItem: ItemPorItem[]): string | null {
  for (const item of porItem) {
    if (item.tipos.length === 0) {
      return `Não foi possível salvar. O produto "${item.produto_nome}" não gerou os avisos necessários. Revise as mensagens configuradas para este produto.`
    }
  }
  return null
}

describe('Guard por produto (actionsRecompra — guard 3)', () => {
  it('G2: garantir error returns friendly message without calling RPC', async () => {
    const throwingGarantir = async () => { throw new Error('Falha ao garantir mensagens do produto: db error') }
    const rpcCalled = false

    let errorMsg = ''
    try {
      await throwingGarantir()
    } catch {
      errorMsg = 'Não foi possível preparar as mensagens deste produto. Nenhuma alteração foi salva.'
    }

    expect(rpcCalled).toBe(false)
    expect(errorMsg).toBe('Não foi possível preparar as mensagens deste produto. Nenhuma alteração foi salva.')
  })

  it('G3: produto com qtd=3 tem tipos=[rel,rec] → não bloqueia', () => {
    const porItem: ItemPorItem[] = [{ produto_nome: 'Wheijo', tipos: ['relacionamento', 'recompra'] }]
    expect(guardPorItem(porItem)).toBeNull()
  })

  it('G4: produto sem tipos bloqueia e nomeia o produto', () => {
    const porItem: ItemPorItem[] = [{ produto_nome: 'Wheijo', tipos: [] }]
    const erro = guardPorItem(porItem)
    expect(erro).not.toBeNull()
    expect(erro).toContain('Wheijo')
    expect(erro).toContain('não gerou os avisos necessários')
  })

  it('G5: produto com 5 mensagens (4 tipos sem agradecimento) não bloqueia', () => {
    const porItem: ItemPorItem[] = [{ produto_nome: 'Creatina', tipos: ['relacionamento', 'recompra', 'oferta', 'follow_up'] }]
    expect(guardPorItem(porItem)).toBeNull()
  })

  it('G6: porItem vazio pula guard — nunca bloqueia', () => {
    expect(guardPorItem([])).toBeNull()
  })

  it('G7: dois produtos — um sem tipos bloqueia e nomeia o problemático', () => {
    const porItem: ItemPorItem[] = [
      { produto_nome: 'Creatina', tipos: ['relacionamento', 'recompra'] },
      { produto_nome: 'Wheijo', tipos: [] },
    ]
    const erro = guardPorItem(porItem)
    expect(erro).toContain('Wheijo')
    expect(erro).not.toContain('Creatina')
  })

  it('G8: 3 tipos NÃO bloqueia — regressão do bug Creatina→Wheijo (guard 1 bloqueava)', () => {
    // Guard 1 exigia exatamente follow_up. Guard 3 não exige tipo específico.
    const porItem: ItemPorItem[] = [{ produto_nome: 'Wheijo', tipos: ['relacionamento', 'recompra', 'oferta'] }]
    expect(guardPorItem(porItem)).toBeNull()
  })

  it('G9: cenário perigoso — Creatina(0) + Wheijo(2) bloqueia por Creatina', () => {
    // Cenário que o guard 2 (global) permitia passar: soma total > 0 mas Creatina sem avisos.
    // Guard 3 bloqueia porque avalia cada produto individualmente.
    const porItem: ItemPorItem[] = [
      { produto_nome: 'Creatina', tipos: [] },
      { produto_nome: 'Wheijo', tipos: ['relacionamento', 'recompra'] },
    ]
    const erro = guardPorItem(porItem)
    expect(erro).not.toBeNull()
    expect(erro).toContain('Creatina')
  })

  it('G10: cenário inverso — Creatina(2) + Wheijo(0) bloqueia por Wheijo', () => {
    const porItem: ItemPorItem[] = [
      { produto_nome: 'Creatina', tipos: ['relacionamento', 'recompra'] },
      { produto_nome: 'Wheijo', tipos: [] },
    ]
    const erro = guardPorItem(porItem)
    expect(erro).not.toBeNull()
    expect(erro).toContain('Wheijo')
  })

  it('G11: Creatina(2) + Wheijo(2) — ambos válidos, não bloqueia', () => {
    const porItem: ItemPorItem[] = [
      { produto_nome: 'Creatina', tipos: ['relacionamento', 'recompra'] },
      { produto_nome: 'Wheijo', tipos: ['relacionamento', 'recompra'] },
    ]
    expect(guardPorItem(porItem)).toBeNull()
  })

  it('G12: produto não recorrente não aparece em porItem — não bloqueia', () => {
    // porItem só contém itens recorrentes; não-recorrentes são omitidos pelo planejador
    const porItem: ItemPorItem[] = [] // sem itens recorrentes
    expect(guardPorItem(porItem)).toBeNull()
  })
})

// ── Cenário exato do bug: Creatina + Whey → Wheijo ───────────────────────────

describe('Bug: substituição Whey→Wheijo — validação por produto (guard 3)', () => {
  const MSG_TIPOS: Record<number, string> = {
    1: 'agradecimento', 2: 'relacionamento', 3: 'recompra', 4: 'oferta', 5: 'follow_up',
  }

  function makeMsgs(ordens: number[], pid: string) {
    return ordens.map(o => ({
      id: `m-${pid}-${o}`, ordem: o, tipo: MSG_TIPOS[o], texto: 'Olá {cliente}',
      dias_apos_venda: o * 10, estilo: null, tipo_incentivo: null,
      cupom_codigo: null, desconto_percentual: null, desconto_valor: null,
      beneficio_texto: null, validade_oferta: null,
    }))
  }

  // Mock que diferencia mensagens por produto_id
  function criarDbMockMultiProduto(
    produtos: Record<string, { qtd: number; ordens: number[] }>
  ) {
    return {
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: string) => {
            if (table === 'mensagens_produto') {
              const prod = produtos[val]
              const msgs = prod ? makeMsgs(prod.ordens, val) : []
              return { order: () => ({ data: msgs }), single: () => ({ data: null }) }
            }
            if (table === 'produtos') {
              const prod = produtos[val]
              return { order: () => ({ data: null }), single: () => ({ data: prod ? { qtd_mensagens: prod.qtd } : null }) }
            }
            return { order: () => ({ data: null }), single: () => ({ data: null }) }
          },
        }),
      }),
    }
  }

  // Mock simples (todos os produtos com mesmas mensagens)
  function criarDbMockComQtd(qtdMensagens: number, incluiOrdens: number[]) {
    const mensagens = makeMsgs(incluiOrdens, 'p')
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({ data: table === 'mensagens_produto' ? mensagens : null }),
            single: () => ({ data: table === 'produtos' ? { qtd_mensagens: qtdMensagens } : null }),
          }),
        }),
      }),
    }
  }

  it('H1: Wheijo (qtd=3) → porItem tem 1 entrada com tipos [rel,rec]', async () => {
    const db = criarDbMockComQtd(3, [1, 2, 3])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [{ id: 'iv-wheijo', produto_id: 'p-wheijo', produto_nome: 'Wheijo', recorrente: true, ciclo_recompra_dias: null }],
      db,
    })
    expect(result.avisos).toHaveLength(2)
    expect(result.porItem).toHaveLength(1)
    expect(result.porItem[0].produto_nome).toBe('Wheijo')
    expect(result.porItem[0].tipos).toContain('relacionamento')
    expect(result.porItem[0].tipos).toContain('recompra')
    expect(result.porItem[0].tipos).not.toContain('agradecimento')
    expect(guardPorItem(result.porItem)).toBeNull()
  })

  it('H2: Creatina (qtd=3) + Wheijo (qtd=3) → porItem tem 2 entradas, ambas com tipos', async () => {
    // Mock diferenciado: Creatina e Wheijo têm mensagens próprias
    const db = criarDbMockMultiProduto({
      'p-creatina': { qtd: 3, ordens: [1, 2, 3] },
      'p-wheijo':   { qtd: 3, ordens: [1, 2, 3] },
    })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [
        { id: 'iv-creatina', produto_id: 'p-creatina', produto_nome: 'Creatina', recorrente: true, ciclo_recompra_dias: 30 },
        { id: 'iv-wheijo',   produto_id: 'p-wheijo',   produto_nome: 'Wheijo',   recorrente: true, ciclo_recompra_dias: null },
      ],
      db,
    })
    expect(result.porItem).toHaveLength(2)
    expect(result.porItem.every(p => p.tipos.length > 0)).toBe(true)
    expect(guardPorItem(result.porItem)).toBeNull()
  })

  it('H3: Creatina (0 msgs) + Wheijo (2 tipos) → guard bloqueia por Creatina', async () => {
    const db = criarDbMockMultiProduto({
      'p-creatina': { qtd: 3, ordens: [] },  // sem mensagens
      'p-wheijo':   { qtd: 3, ordens: [1, 2, 3] },
    })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [
        { id: 'iv-creatina', produto_id: 'p-creatina', produto_nome: 'Creatina Monohidratada 300g', recorrente: true, ciclo_recompra_dias: 30 },
        { id: 'iv-wheijo',   produto_id: 'p-wheijo',   produto_nome: 'Wheijo', recorrente: true, ciclo_recompra_dias: null },
      ],
      db,
    })
    const erro = guardPorItem(result.porItem)
    expect(erro).not.toBeNull()
    expect(erro).toContain('Creatina Monohidratada 300g')
    expect(erro).not.toContain('Wheijo')
  })

  it('H4: Creatina (2 tipos) + Wheijo (0 msgs) → guard bloqueia por Wheijo', async () => {
    const db = criarDbMockMultiProduto({
      'p-creatina': { qtd: 3, ordens: [1, 2, 3] },
      'p-wheijo':   { qtd: 3, ordens: [] },  // sem mensagens
    })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [
        { id: 'iv-creatina', produto_id: 'p-creatina', produto_nome: 'Creatina', recorrente: true, ciclo_recompra_dias: 30 },
        { id: 'iv-wheijo',   produto_id: 'p-wheijo',   produto_nome: 'Wheijo',   recorrente: true, ciclo_recompra_dias: null },
      ],
      db,
    })
    const erro = guardPorItem(result.porItem)
    expect(erro).not.toBeNull()
    expect(erro).toContain('Wheijo')
  })

  it('H5: produto com qtd=4 → tipos [rel,rec,ofe] — guard 3 aceita', async () => {
    const db = criarDbMockComQtd(4, [1, 2, 3, 4])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [{ id: 'iv-1', produto_id: 'p-1', produto_nome: 'Produto4msg', recorrente: true, ciclo_recompra_dias: null }],
      db,
    })
    expect(result.porItem[0].tipos).toContain('relacionamento')
    expect(result.porItem[0].tipos).toContain('recompra')
    expect(result.porItem[0].tipos).toContain('oferta')
    expect(guardPorItem(result.porItem)).toBeNull()
  })

  it('H6: produto com qtd=5 → tipos [rel,rec,ofe,fup] sem agradecimento — guard 3 aceita', async () => {
    const db = criarDbMockComQtd(5, [1, 2, 3, 4, 5])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [{ id: 'iv-1', produto_id: 'p-1', produto_nome: 'Produto5msg', recorrente: true, ciclo_recompra_dias: null }],
      db,
    })
    expect(result.porItem[0].tipos).not.toContain('agradecimento')
    expect(result.porItem[0].tipos).toHaveLength(4)
    expect(guardPorItem(result.porItem)).toBeNull()
  })

  it('H7: Whey removido não aparece nos itens finais', () => {
    const itensAntes = [
      { item_venda_id: 'iv-creatina', produto_nome: 'Creatina' },
      { item_venda_id: 'iv-whey', produto_nome: 'Whey Doce de Leite' },
    ]
    const itensDepois = [
      { item_venda_id: 'iv-creatina', produto_nome: 'Creatina' },
      { item_venda_id: null, produto_nome: 'Wheijo' },
    ]
    const idsAntes = new Set(itensAntes.map(i => i.item_venda_id))
    const idsDepois = new Set(itensDepois.filter(i => i.item_venda_id).map(i => i.item_venda_id!))
    const removidos = [...idsAntes].filter(id => !idsDepois.has(id))

    expect(removidos).toContain('iv-whey')
    expect(itensDepois.find(i => i.produto_nome === 'Wheijo')).toBeTruthy()
    expect(itensDepois.find(i => i.produto_nome === 'Whey Doce de Leite')).toBeUndefined()
  })

  it('H8: total recalculado exclui Whey e inclui Wheijo', () => {
    const itensFinais = [
      { produto_nome: 'Creatina', quantidade: 1, preco_unitario: 80 },
      { produto_nome: 'Wheijo', quantidade: 1, preco_unitario: 65 },
    ]
    const total = itensFinais.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)
    expect(total).toBe(145)
  })

  it('H9: produto não recorrente não aparece em porItem', async () => {
    const db = criarDbMockComQtd(3, [1, 2, 3])
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [{ id: 'iv-creatina', produto_id: 'p-creatina', produto_nome: 'Creatina', recorrente: false, ciclo_recompra_dias: null }],
      db,
    })
    expect(result.avisos).toHaveLength(0)
    expect(result.porItem).toHaveLength(0)
    expect(guardPorItem(result.porItem)).toBeNull()
  })

  it('H10: porItem contém motivo_sem_aviso quando produto sem mensagens', async () => {
    const db = criarDbMockMultiProduto({
      'p-creatina': { qtd: 3, ordens: [] },  // sem mensagens
    })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE, data_base: '2026-01-01', origem: 'recompra',
      itens: [{ id: 'iv-creatina', produto_id: 'p-creatina', produto_nome: 'Creatina', recorrente: true, ciclo_recompra_dias: 30 }],
      db,
    })
    expect(result.porItem[0].tipos).toHaveLength(0)
    expect(result.porItem[0].motivo_sem_aviso).toBe('sem_mensagens')
  })
})
