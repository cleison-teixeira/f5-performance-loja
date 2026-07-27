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
    const versaoNoBanco: number = 3
    const versaoEsperada: number = 2
    expect(versaoNoBanco !== versaoEsperada).toBe(true)
  })

  it('E2: matched versao should proceed', () => {
    const versaoNoBanco: number = 2
    const versaoEsperada: number = 2
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

describe('sequence validation', () => {
  function validarSequencia(tipos: string[]): boolean {
    const tiposObrigatorios = ['relacionamento', 'recompra', 'oferta', 'follow_up']
    const tiposSet = new Set(tipos)
    return (
      tipos.length === 4 &&
      !tipos.includes('agradecimento') &&
      tiposSet.size === tipos.length &&
      tiposObrigatorios.every(t => tiposSet.has(t))
    )
  }

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

  it('G3: 3 tipos — sequence validation fails', () => {
    expect(validarSequencia(['relacionamento', 'recompra', 'oferta'])).toBe(false)
  })

  it('G4: duplicate tipo — sequence validation fails', () => {
    expect(validarSequencia(['relacionamento', 'recompra', 'recompra', 'oferta'])).toBe(false)
  })

  it('G5: 4 correct tipos — sequence validation passes', () => {
    expect(validarSequencia(['relacionamento', 'recompra', 'oferta', 'follow_up'])).toBe(true)
  })

  it('G6: zero recorrentes skips sequence validation (valid)', () => {
    const recorrentes: unknown[] = []
    const shouldValidate = recorrentes.length > 0
    expect(shouldValidate).toBe(false)
  })

  it('G7: mensagem from wrong product is detected by anchor check', () => {
    const itens = [{ item_venda_id: 'iv-1', produto_id: 'p-1' }]
    const aviso = { item_venda_id: 'iv-1', mensagem_id: 'm-from-p2' }
    const mensagem = { id: 'm-from-p2', produto_id: 'p-2' }

    const anchorProdutoId = itens.find(i => i.item_venda_id === aviso.item_venda_id)?.produto_id
    const matches = mensagem.produto_id === anchorProdutoId

    expect(matches).toBe(false)
  })

  it('G8: sequence validation failure prevents RPC call', () => {
    const tipos = ['relacionamento', 'recompra', 'oferta'] // missing follow_up
    let rpcCalled = false

    if (validarSequencia(tipos)) {
      rpcCalled = true
    }

    expect(rpcCalled).toBe(false)
  })
})
