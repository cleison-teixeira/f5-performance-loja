import { describe, it, expect } from 'vitest'
import { planejarAvisosParaVenda, type ItemParaPlanejamento } from '@/lib/avisos/planejarParaVenda'
import {
  avisoESubstituivel,
  planejarReconciliacaoAvisos,
  resolverCicloRecompraPorProduto,
  type AvisoExistenteParaReconciliacao,
  type MensagemRecompraProduto,
} from '../app/(app)/vendas/[id]/editar/reconciliacaoAvisos'

// ── Fase 2 — testes de âncora única na edição de venda manual ──────────────
//
// Duas frentes, ambas exercitando código real de produção (não réplicas):
//
// A) planejarReconciliacaoAvisos / avisoESubstituivel (actions.ts): funções
//    puras que decidem o que preservar/desancorar/remover. Testadas
//    diretamente, sem mock — são as mesmas usadas por editarVenda().
//
// B) planejarAvisosParaVenda (lib/avisos/planejarParaVenda.ts, NÃO
//    modificada nesta fase): reutilizada por editarVenda() para eleger a
//    âncora sobre o estado final da venda. Testada aqui com o mesmo padrão
//    de mock de __tests__/editarRecompra.test.ts (db.from(...).eq(...).order()/.single()),
//    passando origem: 'venda_manual' — o cenário real usado por editarVenda().

// ── Helpers de mock (mesmo padrão de editarRecompra.test.ts) ───────────────

interface MensagemFixture {
  id: string
  tipo: string
  ordem: number
  texto: string
  dias_apos_venda: number
}

function criarDbMock(mensagensPorProduto: Record<string, MensagemFixture[]>) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => ({
          order: () => ({ data: table === 'mensagens_produto' ? (mensagensPorProduto[val] ?? []) : null }),
          single: () => ({ data: table === 'produtos' ? { qtd_mensagens: 3 } : null }),
        }),
      }),
    }),
  }
}

const CTX_BASE = {
  venda_id: 'v-001',
  loja_id: 'l-001',
  cliente_id: 'c-001',
  vendedora_id: 'u-001',
  cliente_nome: 'Ana Silva',
  vendedora_nome: 'Carol',
  loja_nome: 'Verde Essencial',
}

function msg(produtoId: string): MensagemFixture[] {
  // ordem: 3 cai dentro de obterOrdensPorModelo(undefined, 3) = [1,2,3]
  // (qtd_mensagens=3 é o valor fixo devolvido pelo mock de 'produtos').
  return [{ id: `m-${produtoId}`, tipo: 'recompra', ordem: 3, texto: `Oi {{cliente}}, hora de repor {{produto}}`, dias_apos_venda: 30 }]
}

function item(overrides: Partial<ItemParaPlanejamento> & { id: string; produto_id: string }): ItemParaPlanejamento {
  return {
    produto_nome: overrides.produto_id,
    recorrente: true,
    ciclo_recompra_dias: 30,
    ...overrides,
  }
}

// ── A. planejarReconciliacaoAvisos / avisoESubstituivel ─────────────────────

function aviso(overrides: Partial<AvisoExistenteParaReconciliacao> & { id: string }): AvisoExistenteParaReconciliacao {
  return {
    item_venda_id: 'iv-1',
    status: 'pendente',
    enviado_em: null,
    recompra_id: null,
    ...overrides,
  }
}

describe('avisoESubstituivel', () => {
  it('7/8: pendente sem enviado_em e sem recompra_id é substituível', () => {
    expect(avisoESubstituivel(aviso({ id: 'a1', status: 'pendente' }))).toBe(true)
  })

  it('reagendada sem enviado_em e sem recompra_id é substituível', () => {
    expect(avisoESubstituivel(aviso({ id: 'a1', status: 'reagendada' }))).toBe(true)
  })

  it('7: status "enviado" NUNCA é substituível, mesmo sem enviado_em preenchido', () => {
    expect(avisoESubstituivel(aviso({ id: 'a1', status: 'enviado' }))).toBe(false)
  })

  it('8: enviado_em preenchido nunca é substituível, mesmo com status pendente', () => {
    expect(avisoESubstituivel(aviso({ id: 'a1', status: 'pendente', enviado_em: '2026-01-01T00:00:00Z' }))).toBe(false)
  })

  it('9: recompra_id preenchido nunca é substituível, mesmo com status pendente', () => {
    expect(avisoESubstituivel(aviso({ id: 'a1', status: 'pendente', recompra_id: 'rec-1' }))).toBe(false)
  })

  it('status histórico (convertida) não é substituível', () => {
    expect(avisoESubstituivel(aviso({ id: 'a1', status: 'convertida' }))).toBe(false)
  })
})

describe('planejarReconciliacaoAvisos', () => {
  it('10: avisos substituíveis de qualquer item entram em idsParaRemover', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [
        aviso({ id: 'a1', item_venda_id: 'iv-1', status: 'pendente' }),
        aviso({ id: 'a2', item_venda_id: 'iv-2', status: 'reagendada' }),
      ],
      itensRemovidosIds: [],
    })
    expect(plano.idsParaRemover.sort()).toEqual(['a1', 'a2'])
    expect(plano.idsParaDesancorar).toEqual([])
  })

  it('7: aviso enviado nunca aparece em idsParaRemover', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [aviso({ id: 'a1', status: 'enviado' })],
      itensRemovidosIds: [],
    })
    expect(plano.idsParaRemover).toEqual([])
  })

  it('9: aviso com recompra_id nunca aparece em idsParaRemover nem idsParaDesancorar (item não removido)', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [aviso({ id: 'a1', item_venda_id: 'iv-1', status: 'pendente', recompra_id: 'rec-1' })],
      itensRemovidosIds: [],
    })
    expect(plano.idsParaRemover).toEqual([])
    expect(plano.idsParaDesancorar).toEqual([])
  })

  it('5: item removido com aviso substituível → remove (não desancora)', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [aviso({ id: 'a1', item_venda_id: 'iv-removido', status: 'pendente' })],
      itensRemovidosIds: ['iv-removido'],
    })
    expect(plano.idsParaRemover).toEqual(['a1'])
    expect(plano.idsParaDesancorar).toEqual([])
  })

  it('5: item removido com aviso enviado → desancora (nunca remove)', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [aviso({ id: 'a1', item_venda_id: 'iv-removido', status: 'enviado' })],
      itensRemovidosIds: ['iv-removido'],
    })
    expect(plano.idsParaRemover).toEqual([])
    expect(plano.idsParaDesancorar).toEqual(['a1'])
  })

  it('5/9: item removido com aviso com recompra_id → desancora (nunca remove)', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [aviso({ id: 'a1', item_venda_id: 'iv-removido', status: 'pendente', recompra_id: 'rec-1' })],
      itensRemovidosIds: ['iv-removido'],
    })
    expect(plano.idsParaRemover).toEqual([])
    expect(plano.idsParaDesancorar).toEqual(['a1'])
  })

  it('item não removido, não substituível → não é tocado (nem remove nem desancora)', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [aviso({ id: 'a1', item_venda_id: 'iv-1', status: 'convertida' })],
      itensRemovidosIds: [],
    })
    expect(plano.idsParaRemover).toEqual([])
    expect(plano.idsParaDesancorar).toEqual([])
  })

  it('12: aviso convertido de outro item não interfere na reconciliação de um item novo', () => {
    const plano = planejarReconciliacaoAvisos({
      avisos: [
        aviso({ id: 'a-convertido', item_venda_id: 'iv-antigo', status: 'convertida' }),
        aviso({ id: 'a-pendente', item_venda_id: 'iv-outro', status: 'pendente' }),
      ],
      itensRemovidosIds: [],
    })
    expect(plano.idsParaRemover).toEqual(['a-pendente'])
    expect(plano.idsParaDesancorar).toEqual([])
  })
})

// ── B. planejarAvisosParaVenda reaplicada ao cenário de editarVenda ────────

describe('planejarAvisosParaVenda — âncora única no contexto de editarVenda (origem: venda_manual)', () => {
  it('1: 1 item recorrente → 1 conjunto de avisos para esse item', async () => {
    const db = criarDbMock({ p1: msg('p1') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [item({ id: 'iv-1', produto_id: 'p1' })],
      db,
    })
    expect(result.avisos).toHaveLength(1)
    expect(result.avisos[0].item_venda_id).toBe('iv-1')
    expect(result.ancora?.item_venda_id).toBe('iv-1')
  })

  it('2: 2 itens passam a recorrentes na mesma edição → só o de menor ciclo gera avisos', async () => {
    const db = criarDbMock({ p1: msg('p1'), p2: msg('p2') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-1', produto_id: 'p1', ciclo_recompra_dias: 60 }),
        item({ id: 'iv-2', produto_id: 'p2', ciclo_recompra_dias: 30 }),
      ],
      db,
    })
    expect(result.avisos.length).toBeGreaterThan(0)
    expect(result.avisos.every(a => a.item_venda_id === 'iv-2')).toBe(true)
    expect(result.ancora?.item_venda_id).toBe('iv-2')
  })

  it('3: âncora existente (ciclo 30) + novo item com ciclo maior (60) → âncora não muda', async () => {
    const db = criarDbMock({ p1: msg('p1'), p2: msg('p2') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-ancora', produto_id: 'p1', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-novo', produto_id: 'p2', ciclo_recompra_dias: 60 }),
      ],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-ancora')
    expect(result.avisos.length).toBeGreaterThan(0)
    expect(result.avisos.every(a => a.item_venda_id === 'iv-ancora')).toBe(true)
  })

  it('4: âncora existente (ciclo 30) + novo item com ciclo menor (15) → nova âncora vence', async () => {
    const db = criarDbMock({ p1: msg('p1'), p2: msg('p2') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-antigo', produto_id: 'p1', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-novo', produto_id: 'p2', ciclo_recompra_dias: 15 }),
      ],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-novo')
    expect(result.avisos.length).toBeGreaterThan(0)
    expect(result.avisos.every(a => a.item_venda_id === 'iv-novo')).toBe(true)
  })

  it('5: âncora removida + outro item recorrente remanescente → o remanescente vence', async () => {
    const db = criarDbMock({ p2: msg('p2') })
    // item removido simplesmente não entra na lista de itens finais
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [item({ id: 'iv-2', produto_id: 'p2', ciclo_recompra_dias: 45 })],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-2')
    expect(result.avisos.length).toBeGreaterThan(0)
  })

  it('6: âncora removida + nenhum outro recorrente → nenhum aviso novo', async () => {
    const db = criarDbMock({})
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [item({ id: 'iv-x', produto_id: 'px', recorrente: false })],
      db,
    })
    expect(result.avisos).toHaveLength(0)
    expect(result.ancora).toBeNull()
  })

  it('11: 3 itens recorrentes distintos → somente uma âncora gera avisos', async () => {
    const db = criarDbMock({ p1: msg('p1'), p2: msg('p2'), p3: msg('p3') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-1', produto_id: 'p1', ciclo_recompra_dias: 90 }),
        item({ id: 'iv-2', produto_id: 'p2', ciclo_recompra_dias: 20 }),
        item({ id: 'iv-3', produto_id: 'p3', ciclo_recompra_dias: 45 }),
      ],
      db,
    })
    const itensDistintos = new Set(result.avisos.map(a => a.item_venda_id))
    expect(itensDistintos.size).toBe(1)
    expect(result.ancora?.item_venda_id).toBe('iv-2')
  })

  it('12: item convertido/histórico (fora do planejamento) não bloqueia a eleição do único item recorrente', async () => {
    // avisos convertidos não fazem parte de "itens" — a função só recebe o
    // estado FINAL dos itens da venda, nunca avisos existentes.
    const db = criarDbMock({ p2: msg('p2') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [item({ id: 'iv-2', produto_id: 'p2' })],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-2')
    expect(result.avisos.length).toBeGreaterThan(0)
  })

  it('13: ordem dos itens no array não altera a âncora final (menor ciclo sempre vence)', async () => {
    const db = criarDbMock({ p1: msg('p1'), p2: msg('p2'), p3: msg('p3') })
    const itensOrdem1: ItemParaPlanejamento[] = [
      item({ id: 'iv-1', produto_id: 'p1', ciclo_recompra_dias: 90 }),
      item({ id: 'iv-2', produto_id: 'p2', ciclo_recompra_dias: 20 }),
      item({ id: 'iv-3', produto_id: 'p3', ciclo_recompra_dias: 45 }),
    ]
    const itensOrdem2: ItemParaPlanejamento[] = [
      item({ id: 'iv-3', produto_id: 'p3', ciclo_recompra_dias: 45 }),
      item({ id: 'iv-2', produto_id: 'p2', ciclo_recompra_dias: 20 }),
      item({ id: 'iv-1', produto_id: 'p1', ciclo_recompra_dias: 90 }),
    ]

    const r1 = await planejarAvisosParaVenda({ ...CTX_BASE, data_base: '2026-01-01', origem: 'venda_manual', itens: itensOrdem1, db })
    const r2 = await planejarAvisosParaVenda({ ...CTX_BASE, data_base: '2026-01-01', origem: 'venda_manual', itens: itensOrdem2, db })

    expect(r1.ancora?.item_venda_id).toBe('iv-2')
    expect(r2.ancora?.item_venda_id).toBe('iv-2')
  })

  it('14: dois itens novos recorrentes na mesma edição não geram dois conjuntos (mesmo padrão do caso 2)', async () => {
    const db = criarDbMock({ pnovo1: msg('pnovo1'), pnovo2: msg('pnovo2') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-novo-1', produto_id: 'pnovo1', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-novo-2', produto_id: 'pnovo2', ciclo_recompra_dias: 30 }),
      ],
      db,
    })
    const itensDistintos = new Set(result.avisos.map(a => a.item_venda_id))
    expect(itensDistintos.size).toBe(1)
  })

  it('15: réplica conceitual do bug real — 3 produto_id na mesma venda nunca resulta em 3 conjuntos', async () => {
    const db = criarDbMock({
      'prod-a': msg('prod-a'),
      'prod-b': msg('prod-b'),
      'prod-c': msg('prod-c'),
    })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-a', produto_id: 'prod-a', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-b', produto_id: 'prod-b', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-c', produto_id: 'prod-c', ciclo_recompra_dias: 30 }),
      ],
      db,
    })
    const itensDistintos = new Set(result.avisos.map(a => a.item_venda_id))
    expect(itensDistintos.size).toBe(1)
  })

  it('item não recorrente nunca participa da eleição', async () => {
    const db = criarDbMock({ p1: msg('p1') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-1', produto_id: 'p1', recorrente: true, ciclo_recompra_dias: 40 }),
        item({ id: 'iv-2', produto_id: 'p2', recorrente: false, ciclo_recompra_dias: 5 }),
      ],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-1')
  })
})

// ── C. resolverCicloRecompraPorProduto — resolução pura do ciclo real ──────
// de itens novos (achado da auditoria: ItemEditarInput não carrega
// ciclo_recompra_dias; sem resolver o ciclo real, todo item novo caía no
// fallback 30 do planner, podendo eleger a âncora errada).

function mensagemRecompra(produtoId: string, diasAposVenda: number): MensagemRecompraProduto {
  return { produto_id: produtoId, dias_apos_venda: diasAposVenda }
}

describe('resolverCicloRecompraPorProduto', () => {
  it('lista vazia → mapa vazio', () => {
    const mapa = resolverCicloRecompraPorProduto([])
    expect(mapa.size).toBe(0)
  })

  it('resolve dias_apos_venda por produto_id', () => {
    const mapa = resolverCicloRecompraPorProduto([
      mensagemRecompra('p-a', 15),
      mensagemRecompra('p-b', 10),
    ])
    expect(mapa.get('p-a')).toBe(15)
    expect(mapa.get('p-b')).toBe(10)
  })

  it('produto sem mensagem de recompra não aparece no mapa (fica a cargo do fallback do chamador)', () => {
    const mapa = resolverCicloRecompraPorProduto([mensagemRecompra('p-a', 15)])
    expect(mapa.has('p-sem-mensagem')).toBe(false)
    expect(mapa.get('p-sem-mensagem') ?? 30).toBe(30)
  })

  it('dias_apos_venda <= 0 é ignorado (mesma guarda de vendas/nova/page.tsx)', () => {
    const mapa = resolverCicloRecompraPorProduto([mensagemRecompra('p-a', 0)])
    expect(mapa.has('p-a')).toBe(false)
  })
})

// ── D. Pipeline completo: mensagens_produto → ciclo resolvido → itensFinal
// → planejarAvisosParaVenda → âncora. Os 6 cenários exigidos pela correção,
// usando a função REAL de resolução (não um valor calculado à mão no teste).

describe('Correção: ciclo real de itens novos chegando ao planner (origem: venda_manual)', () => {
  function cicloResolvidoOuFallback(mapa: Map<string, number>, produtoId: string): number {
    // Mesma expressão usada em actions.ts: cicloRealPorProduto.get(produtoId) ?? 30
    return mapa.get(produtoId) ?? 30
  }

  it('Caso 1: existente=30, novo com mensagem de recompra dias_apos_venda=15 → novo é a âncora', async () => {
    const mapa = resolverCicloRecompraPorProduto([mensagemRecompra('p-novo', 15)])
    const cicloNovo = cicloResolvidoOuFallback(mapa, 'p-novo')
    expect(cicloNovo).toBe(15)

    const db = criarDbMock({ 'p-existente': msg('p-existente'), 'p-novo': msg('p-novo') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-novo', produto_id: 'p-novo', ciclo_recompra_dias: cicloNovo }),
      ],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-novo')
    expect(result.avisos.length).toBeGreaterThan(0)
    expect(result.avisos.every(a => a.item_venda_id === 'iv-novo')).toBe(true)
  })

  it('Caso 2: existente=15, novo com mensagem de recompra dias_apos_venda=30 → existente continua âncora', async () => {
    const mapa = resolverCicloRecompraPorProduto([mensagemRecompra('p-novo', 30)])
    const cicloNovo = cicloResolvidoOuFallback(mapa, 'p-novo')
    expect(cicloNovo).toBe(30)

    const db = criarDbMock({ 'p-existente': msg('p-existente'), 'p-novo': msg('p-novo') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 15 }),
        item({ id: 'iv-novo', produto_id: 'p-novo', ciclo_recompra_dias: cicloNovo }),
      ],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-existente')
    expect(result.avisos.length).toBeGreaterThan(0)
    expect(result.avisos.every(a => a.item_venda_id === 'iv-existente')).toBe(true)
  })

  it('Caso 3: existente=15, novo com mensagem de recompra dias_apos_venda=10 → novo assume a âncora', async () => {
    const mapa = resolverCicloRecompraPorProduto([mensagemRecompra('p-novo', 10)])
    const cicloNovo = cicloResolvidoOuFallback(mapa, 'p-novo')
    expect(cicloNovo).toBe(10)

    const db = criarDbMock({ 'p-existente': msg('p-existente'), 'p-novo': msg('p-novo') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 15 }),
        item({ id: 'iv-novo', produto_id: 'p-novo', ciclo_recompra_dias: cicloNovo }),
      ],
      db,
    })
    expect(result.ancora?.item_venda_id).toBe('iv-novo')
    expect(result.avisos.length).toBeGreaterThan(0)
    expect(result.avisos.every(a => a.item_venda_id === 'iv-novo')).toBe(true)
  })

  it('Caso 4: novo sem mensagem de recompra → fallback 30, sem erro e sem bloquear', async () => {
    // mapa resolvido a partir de mensagens de OUTRO produto — p-novo não tem
    // mensagem tipo='recompra', simulando exatamente a consulta filtrada por
    // tipo='recompra' não retornando linha para esse produto_id.
    const mapa = resolverCicloRecompraPorProduto([mensagemRecompra('p-outro', 20)])
    expect(mapa.has('p-novo')).toBe(false)
    const cicloNovo = cicloResolvidoOuFallback(mapa, 'p-novo')
    expect(cicloNovo).toBe(30)

    const db = criarDbMock({ 'p-existente': msg('p-existente'), 'p-novo': msg('p-novo') })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 40 }),
        item({ id: 'iv-novo', produto_id: 'p-novo', ciclo_recompra_dias: cicloNovo }),
      ],
      db,
    })
    // ciclo novo (30, fallback) < existente (40) → novo vence, sem erro nenhum
    expect(result.ancora?.item_venda_id).toBe('iv-novo')
    expect(result.avisos.length).toBeGreaterThan(0)
  })

  it('Caso 5: múltiplos produtos novos — existente=30, novoA=20, novoB=10 → novoB é a única âncora', async () => {
    const mapa = resolverCicloRecompraPorProduto([
      mensagemRecompra('p-novo-a', 20),
      mensagemRecompra('p-novo-b', 10),
    ])
    const cicloA = cicloResolvidoOuFallback(mapa, 'p-novo-a')
    const cicloB = cicloResolvidoOuFallback(mapa, 'p-novo-b')
    expect(cicloA).toBe(20)
    expect(cicloB).toBe(10)

    const db = criarDbMock({
      'p-existente': msg('p-existente'),
      'p-novo-a': msg('p-novo-a'),
      'p-novo-b': msg('p-novo-b'),
    })
    const result = await planejarAvisosParaVenda({
      ...CTX_BASE,
      data_base: '2026-01-01',
      origem: 'venda_manual',
      itens: [
        item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 30 }),
        item({ id: 'iv-novo-a', produto_id: 'p-novo-a', ciclo_recompra_dias: cicloA }),
        item({ id: 'iv-novo-b', produto_id: 'p-novo-b', ciclo_recompra_dias: cicloB }),
      ],
      db,
    })
    const itensDistintos = new Set(result.avisos.map(a => a.item_venda_id))
    expect(itensDistintos.size).toBe(1)
    expect(result.ancora?.item_venda_id).toBe('iv-novo-b')
  })

  it('Caso 6: ordem do array não altera a âncora quando os ciclos resolvidos são diferentes', async () => {
    const mapa = resolverCicloRecompraPorProduto([
      mensagemRecompra('p-novo-a', 20),
      mensagemRecompra('p-novo-b', 10),
    ])
    const cicloA = cicloResolvidoOuFallback(mapa, 'p-novo-a')
    const cicloB = cicloResolvidoOuFallback(mapa, 'p-novo-b')

    const db = criarDbMock({
      'p-existente': msg('p-existente'),
      'p-novo-a': msg('p-novo-a'),
      'p-novo-b': msg('p-novo-b'),
    })

    const itensOrdem1: ItemParaPlanejamento[] = [
      item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 30 }),
      item({ id: 'iv-novo-a', produto_id: 'p-novo-a', ciclo_recompra_dias: cicloA }),
      item({ id: 'iv-novo-b', produto_id: 'p-novo-b', ciclo_recompra_dias: cicloB }),
    ]
    const itensOrdem2: ItemParaPlanejamento[] = [
      item({ id: 'iv-novo-b', produto_id: 'p-novo-b', ciclo_recompra_dias: cicloB }),
      item({ id: 'iv-existente', produto_id: 'p-existente', ciclo_recompra_dias: 30 }),
      item({ id: 'iv-novo-a', produto_id: 'p-novo-a', ciclo_recompra_dias: cicloA }),
    ]

    const r1 = await planejarAvisosParaVenda({ ...CTX_BASE, data_base: '2026-01-01', origem: 'venda_manual', itens: itensOrdem1, db })
    const r2 = await planejarAvisosParaVenda({ ...CTX_BASE, data_base: '2026-01-01', origem: 'venda_manual', itens: itensOrdem2, db })

    expect(r1.ancora?.item_venda_id).toBe('iv-novo-b')
    expect(r2.ancora?.item_venda_id).toBe('iv-novo-b')
  })
})
