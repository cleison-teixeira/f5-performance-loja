import { describe, it, expect } from 'vitest'

// ── Réplica exata do bloco "Dinheiro na Mesa" de app/(app)/dashboard/page.tsx ──
// Cobre a regra de status ativos aplicada na query Supabase (.or(...)) e o
// cálculo de dinheiroMesaInfo (deve ser mantida idêntica à produção).
//
// Granularidade documentada em CLAUDE.md: "Oportunidade de Recompra = cliente +
// produto + venda de origem, dedup por venda_id + produto_id/item_venda_id."
// Essa definição é preservada para qtdOportunidades/qtdClientes7Dias.
// O valor financeiro (totalPotencial/potencial7Dias), por outro lado, deve ser
// contado uma única vez por venda_id — valor_produto já representa o total
// recorrente da venda inteira (hotfix 322ecd7), então somar por linha de aviso
// multiplicaria o valor quando a venda tem mais de um produto_id ativo.

interface AvisoMin {
  id: string
  venda_id: string
  produto_id: string | null
  tipo: 'agradecimento' | 'relacionamento' | 'recompra' | 'oferta' | 'follow_up'
  data_aviso: string
  status: string
  recompra_id: string | null
  valor_produto: number
  valor_venda: number
  cliente_nome: string
}

function statusAtivo(a: Pick<AvisoMin, 'status' | 'recompra_id'>): boolean {
  // Réplica do filtro da query Supabase em page.tsx:
  // .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
  const ATIVOS = ['pendente', 'aberta', 'contato_feito', 'reagendada']
  if (ATIVOS.includes(a.status)) return true
  if (a.status === 'enviado' && a.recompra_id === null) return true
  return false
}

function calcularDinheiroMesaInfo(
  avisosRaw: AvisoMin[],
  hoje: string,
  em7DiasStr: string,
  em90DiasStr: string
) {
  const avisos = avisosRaw.filter(statusAtivo)

  const oportunidadesBase = avisos
    .filter(a => (a.tipo === 'recompra' || a.tipo === 'oferta') && a.data_aviso <= em90DiasStr)

  // Oportunidade = venda + produto (granularidade documentada em CLAUDE.md).
  const seenOport = new Set<string>()
  const oportunidades = oportunidadesBase.filter(a => {
    const key = `${a.venda_id ?? ''}__${a.produto_id ?? ''}`
    if (seenOport.has(key)) return false
    seenOport.add(key)
    return true
  })
  const oport7Dias = oportunidades.filter(a => a.data_aviso >= hoje && a.data_aviso <= em7DiasStr)

  // Valor financeiro = uma vez por venda.
  const seenVendaValor = new Set<string>()
  const oportunidadesPorVenda = oportunidadesBase.filter(a => {
    if (seenVendaValor.has(a.venda_id)) return false
    seenVendaValor.add(a.venda_id)
    return true
  })
  const oportunidadesPorVenda7Dias = oportunidadesPorVenda
    .filter(a => a.data_aviso >= hoje && a.data_aviso <= em7DiasStr)

  return {
    totalPotencial: oportunidadesPorVenda.reduce((s, a) => s + (a.valor_produto || a.valor_venda || 0), 0),
    qtdOportunidades: oportunidades.length,
    potencial7Dias: oportunidadesPorVenda7Dias.reduce((s, a) => s + (a.valor_produto || a.valor_venda || 0), 0),
    qtdClientes7Dias: new Set(oport7Dias.map(a => a.cliente_nome)).size,
  }
}

// ── Helper ───────────────────────────────────────────────────────────────

function aviso(overrides: Partial<AvisoMin> & { id: string; venda_id: string }): AvisoMin {
  return {
    produto_id: 'p1',
    tipo: 'recompra',
    data_aviso: '2026-08-05',
    status: 'pendente',
    recompra_id: null,
    valor_produto: 100,
    valor_venda: 0,
    cliente_nome: 'Cliente',
    ...overrides,
  }
}

const HOJE = '2026-08-01'
const EM_7_DIAS = '2026-08-08'
const EM_90_DIAS = '2026-10-30'

const calc = (avisos: AvisoMin[]) => calcularDinheiroMesaInfo(avisos, HOJE, EM_7_DIAS, EM_90_DIAS)

// ── Testes ───────────────────────────────────────────────────────────────

describe('Dinheiro na Mesa — dedupe de valor por venda (Fase 1)', () => {

  // 1. Venda simples com um produto recorrente
  it('1: venda com 1 produto → totalPotencial = valor do produto, qtdOportunidades = 1', () => {
    const r = calc([aviso({ id: 'a1', venda_id: 'v1', produto_id: 'p1', valor_produto: 100 })])
    expect(r.totalPotencial).toBe(100)
    expect(r.qtdOportunidades).toBe(1)
  })

  // 2. Venda com múltiplos produtos recorrentes criada normalmente (âncora única —
  //    só existe 1 produto_id em avisos, valor_produto já é a soma dos itens)
  it('2: venda criada com múltiplos itens recorrentes (âncora única) → 1 oportunidade, valor correto', () => {
    const r = calc([aviso({ id: 'a1', venda_id: 'v2', produto_id: 'p1', valor_produto: 300 })])
    expect(r.totalPotencial).toBe(300)
    expect(r.qtdOportunidades).toBe(1)
  })

  // 3. Venda editada adicionando produto recorrente (2 produto_id ativos)
  it('3: venda editada com produto adicionado → 2 oportunidades, valor contado 1x', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v3', produto_id: 'pA', valor_produto: 382.10 }),
      aviso({ id: 'a2', venda_id: 'v3', produto_id: 'pB', valor_produto: 382.10, data_aviso: '2026-08-06' }),
    ]
    const r = calc(avisos)
    expect(r.qtdOportunidades).toBe(2)
    expect(r.totalPotencial).toBe(382.10)
  })

  // 4. Venda editada tornando item existente recorrente (réplica do caso real de
  //    produção: venda 0a0e78ef-f43b-4abc-82c9-cddbc79b5ac5, 3 produto_id, R$382,10)
  it('4: réplica do caso real de produção (3 produto_id) → totalPotencial = R$382,10, não R$1.146,30', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: '0a0e78ef-f43b-4abc-82c9-cddbc79b5ac5', produto_id: '2ad939f8', valor_produto: 382.10 }),
      aviso({ id: 'a2', venda_id: '0a0e78ef-f43b-4abc-82c9-cddbc79b5ac5', produto_id: '7d104b2a', valor_produto: 382.10 }),
      aviso({ id: 'a3', venda_id: '0a0e78ef-f43b-4abc-82c9-cddbc79b5ac5', produto_id: 'f3c3fe82', valor_produto: 382.10 }),
    ]
    const r = calc(avisos)
    expect(r.qtdOportunidades).toBe(3)
    expect(r.totalPotencial).toBe(382.10)
    expect(r.totalPotencial).not.toBe(1146.30)
  })

  // 5. Múltiplos avisos (datas/tipos diferentes) para o MESMO produto da mesma venda
  it('5: múltiplos avisos do mesmo produto (sequência de mensagens) → dedup para 1 oportunidade', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v5', produto_id: 'p1', tipo: 'recompra', valor_produto: 150, data_aviso: '2026-08-05' }),
      aviso({ id: 'a2', venda_id: 'v5', produto_id: 'p1', tipo: 'oferta', valor_produto: 150, data_aviso: '2026-08-10' }),
    ]
    const r = calc(avisos)
    expect(r.qtdOportunidades).toBe(1)
    expect(r.totalPotencial).toBe(150)
  })

  // 6. Duas vendas diferentes da mesma loja
  it('6: duas vendas distintas → somam sem se misturar', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v6a', produto_id: 'p1', valor_produto: 100 }),
      aviso({ id: 'a2', venda_id: 'v6b', produto_id: 'p1', valor_produto: 200 }),
    ]
    const r = calc(avisos)
    expect(r.totalPotencial).toBe(300)
    expect(r.qtdOportunidades).toBe(2)
  })

  // 7. Mesma estrutura de venda (mesmo produto_id) em "lojas" (vendas) diferentes
  it('7: mesmo produto_id em vendas diferentes não é indevidamente deduplicado', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v7a', produto_id: 'pX', valor_produto: 120 }),
      aviso({ id: 'a2', venda_id: 'v7b', produto_id: 'pX', valor_produto: 120 }),
    ]
    const r = calc(avisos)
    expect(r.totalPotencial).toBe(240)
    expect(r.qtdOportunidades).toBe(2)
  })

  // 8. Recompra + oferta em produtos diferentes da mesma venda
  it('8: recompra em um produto + oferta em outro, mesma venda → 2 oportunidades, valor 1x', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v8', produto_id: 'p1', tipo: 'recompra', valor_produto: 500 }),
      aviso({ id: 'a2', venda_id: 'v8', produto_id: 'p2', tipo: 'oferta', valor_produto: 500, data_aviso: '2026-08-06' }),
    ]
    const r = calc(avisos)
    expect(r.qtdOportunidades).toBe(2)
    expect(r.totalPotencial).toBe(500)
  })

  // 9. Avisos fora dos 90 dias
  it('9: aviso com data_aviso além de 90 dias é excluído', () => {
    const r = calc([aviso({ id: 'a1', venda_id: 'v9', valor_produto: 999, data_aviso: '2026-12-31' })])
    expect(r.qtdOportunidades).toBe(0)
    expect(r.totalPotencial).toBe(0)
  })

  // 10. Status que não entram na regra
  it('10: status "convertida" e "enviado com recompra_id" são excluídos; "enviado" sem recompra_id entra', () => {
    const excluidos = calc([
      aviso({ id: 'a1', venda_id: 'v10a', valor_produto: 999, status: 'convertida' }),
      aviso({ id: 'a2', venda_id: 'v10b', valor_produto: 999, status: 'enviado', recompra_id: 'rec-1' }),
    ])
    expect(excluidos.qtdOportunidades).toBe(0)
    expect(excluidos.totalPotencial).toBe(0)

    const incluido = calc([
      aviso({ id: 'a3', venda_id: 'v10c', valor_produto: 80, status: 'enviado', recompra_id: null }),
    ])
    expect(incluido.qtdOportunidades).toBe(1)
    expect(incluido.totalPotencial).toBe(80)
  })

  // 11. Fallback de valor_produto / valor_venda
  it('11: valor_produto=0 usa fallback valor_venda', () => {
    const r = calc([aviso({ id: 'a1', venda_id: 'v11', valor_produto: 0, valor_venda: 250 })])
    expect(r.totalPotencial).toBe(250)
  })

  // 12. Garantia explícita: uma venda nunca é contabilizada duas vezes
  it('12: venda com N produto_id distintos nunca soma o valor mais de uma vez', () => {
    const gerarAvisos = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        aviso({ id: `a${i}`, venda_id: 'v12', produto_id: `p${i}`, valor_produto: 500 })
      )
    for (const n of [1, 2, 3, 5]) {
      const r = calc(gerarAvisos(n))
      expect(r.qtdOportunidades).toBe(n)
      expect(r.totalPotencial).toBe(500)
    }
  })

  // 13. potencial7Dias segue a mesma regra de dedupe por venda (não duplica)
  it('13: potencial7Dias soma o valor da venda uma única vez dentro da janela de 7 dias', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v13', produto_id: 'pA', valor_produto: 200, data_aviso: '2026-08-03' }),
      aviso({ id: 'a2', venda_id: 'v13', produto_id: 'pB', valor_produto: 200, data_aviso: '2026-08-05' }),
    ]
    const r = calc(avisos)
    expect(r.potencial7Dias).toBe(200)
  })

  // 14. qtdClientes7Dias não é afetado pela mudança (continua granularidade venda+produto)
  it('14: qtdClientes7Dias conta clientes distintos na janela de 7 dias, sem alteração de regra', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v14a', produto_id: 'p1', data_aviso: '2026-08-03', cliente_nome: 'Ana' }),
      aviso({ id: 'a2', venda_id: 'v14b', produto_id: 'p1', data_aviso: '2026-08-05', cliente_nome: 'Bia' }),
      aviso({ id: 'a3', venda_id: 'v14b', produto_id: 'p2', data_aviso: '2026-08-06', cliente_nome: 'Bia' }),
    ]
    const r = calc(avisos)
    expect(r.qtdClientes7Dias).toBe(2)
  })

  // K. Aviso fora dos 7 dias mas dentro dos 90 dias (janela intermediária)
  it('K: aviso entre o dia 7 e o dia 90 conta em totalPotencial/qtdOportunidades, mas não em potencial7Dias/qtdClientes7Dias', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'vK', produto_id: 'p1', valor_produto: 300, data_aviso: '2026-08-20', cliente_nome: 'Carlos' }),
    ]
    const r = calc(avisos)
    expect(r.totalPotencial).toBe(300)
    expect(r.qtdOportunidades).toBe(1)
    expect(r.potencial7Dias).toBe(0)
    expect(r.qtdClientes7Dias).toBe(0)
  })
})
