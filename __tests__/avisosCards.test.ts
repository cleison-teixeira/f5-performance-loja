import { describe, it, expect } from 'vitest'

// ── Tipos mínimos para testar a lógica de agrupamento ──────────────────────

type MensagemTipo = 'agradecimento' | 'relacionamento' | 'recompra' | 'oferta' | 'follow_up'

interface AvisoMin {
  id: string
  venda_id: string
  tipo: MensagemTipo
  data_aviso: string
  status: string
  recompra_id: string | null
  produto_nome: string
  produto_id: string | null
  valor_produto: number
  cliente_nome: string
  cliente_whatsapp: string
  cliente_id: string
  vendedora_id: string
  vendedora_nome: string
  texto_renderizado: string
  atrasado: boolean
  item_venda_id: string | null
  loja_id?: string
  loja_nome?: string
  nao_contatar?: boolean
  // outros campos opcionais
  data_compra: string
  valor_venda: number
  previsao_comissao: number
  produto_foto_url: string | null
  observacao_resultado: string | null
}

interface ItemVendaMin {
  id: string
  produto_nome: string
  produto_id: string | null
  produto_foto_url: string | null
  valor_produto: number
  quantidade: number
  valor_unitario: number
  ciclo_recompra_dias: number | null
}

// ── Réplica exata da função de agrupamento (deve ser idêntica à produção) ──

function agruparPorVenda(
  avisos: AvisoMin[],
  itensVendaPorVenda?: Record<string, ItemVendaMin[]>
): {
  venda_id: string
  avisos: AvisoMin[]
  itens_venda: ItemVendaMin[]
  data_aviso: string
  valor_total: number
  cliente_nome: string
  atrasado: boolean
}[] {
  const mapa = new Map<string, AvisoMin[]>()
  for (const a of avisos) {
    const chave = `${a.venda_id}:${a.tipo}`
    if (!mapa.has(chave)) mapa.set(chave, [])
    mapa.get(chave)!.push(a)
  }
  return Array.from(mapa.values()).map(grupo => {
    const sorted = [...grupo].sort((a, b) => a.data_aviso.localeCompare(b.data_aviso))
    const primary = sorted[0]
    const itens = itensVendaPorVenda?.[primary.venda_id] ?? []
    const valor_total = itens.length > 0
      ? itens.reduce((s, i) => s + i.valor_produto, 0)
      : grupo.reduce((s, a) => s + a.valor_produto, 0)
    return {
      venda_id: primary.venda_id,
      avisos: sorted,
      itens_venda: itens,
      data_aviso: primary.data_aviso,
      valor_total,
      cliente_nome: primary.cliente_nome,
      atrasado: primary.atrasado,
    }
  })
}

function nProdutos(grupo: ReturnType<typeof agruparPorVenda>[0]): number {
  return grupo.itens_venda.length > 0 ? grupo.itens_venda.length : 1
}

// ── Helpers ────────────────────────────────────────────────────────────────

function aviso(overrides: Partial<AvisoMin> & { id: string; venda_id: string; tipo: MensagemTipo }): AvisoMin {
  return {
    data_aviso: '2026-09-01',
    status: 'pendente',
    recompra_id: null,
    produto_nome: 'Produto',
    produto_id: 'prod-1',
    valor_produto: 100,
    cliente_nome: 'Cliente',
    cliente_whatsapp: '48999999999',
    cliente_id: 'cli-1',
    vendedora_id: 'vend-1',
    vendedora_nome: 'Vendedora',
    texto_renderizado: 'Oi! Passando para lembrar.',
    atrasado: false,
    item_venda_id: 'iv-1',
    data_compra: '2026-08-01',
    valor_venda: 200,
    previsao_comissao: 10,
    produto_foto_url: null,
    observacao_resultado: null,
    ...overrides,
  }
}

function item(overrides: Partial<ItemVendaMin> & { id: string }): ItemVendaMin {
  return {
    produto_nome: 'Produto',
    produto_id: 'prod-1',
    produto_foto_url: null,
    valor_produto: 100,
    quantidade: 1,
    valor_unitario: 100,
    ciclo_recompra_dias: 30,
    ...overrides,
  }
}

// ── Testes ────────────────────────────────────────────────────────────────

describe('Padronização de cards de avisos', () => {

  // 1. Venda com 1 produto
  it('1: venda com 1 produto recorrente → nProdutos=1 → CardAviso', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'recompra' })]
    const itens = { v1: [item({ id: 'iv1', valor_produto: 100, quantidade: 1, valor_unitario: 100 })] }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos).toHaveLength(1)
    expect(nProdutos(grupos[0])).toBe(1)
  })

  // 2. Venda com 2 produtos
  it('2: venda com 2 produtos recorrentes → nProdutos=2 → CardGrupoRecompra', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'recompra' })]
    const itens = {
      v1: [
        item({ id: 'iv1', produto_nome: 'Creatina', valor_produto: 90, quantidade: 1, valor_unitario: 90 }),
        item({ id: 'iv2', produto_nome: 'Whey', valor_produto: 200, quantidade: 2, valor_unitario: 100 }),
      ],
    }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos).toHaveLength(1)
    expect(nProdutos(grupos[0])).toBe(2)
    expect(grupos[0].valor_total).toBe(290)
  })

  // 3. Visão "Todos" — 1 produto, 3 tipos → 3 grupos distintos
  it('3: visão Todos com 1 produto e 3 tipos → 3 grupos independentes', () => {
    const v = 'v1'
    const avisos = [
      aviso({ id: 'a1', venda_id: v, tipo: 'recompra', data_aviso: '2026-09-25' }),
      aviso({ id: 'a2', venda_id: v, tipo: 'oferta',   data_aviso: '2026-09-29' }),
      aviso({ id: 'a3', venda_id: v, tipo: 'follow_up',data_aviso: '2026-10-01' }),
    ]
    const grupos = agruparPorVenda(avisos, {})
    expect(grupos).toHaveLength(3)
    const tipos = grupos.map(g => g.avisos[0].tipo).sort()
    expect(tipos).toEqual(['follow_up', 'oferta', 'recompra'])
  })

  // 4. Filtro Relacionamento — 1 produto → CardAviso
  it('4: relacionamento com 1 produto → nProdutos=1', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'relacionamento' })]
    const itens = { v1: [item({ id: 'iv1' })] }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos).toHaveLength(1)
    expect(nProdutos(grupos[0])).toBe(1)
  })

  // 5. Filtro Recompra — 2 produtos → 1 grupo com 2 itens
  it('5: filtro Recompra, 2 produtos → 1 grupo, nProdutos=2', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'recompra' })]
    const itens = {
      v1: [
        item({ id: 'iv1', produto_nome: 'A', valor_produto: 50, quantidade: 1, valor_unitario: 50 }),
        item({ id: 'iv2', produto_nome: 'B', valor_produto: 150, quantidade: 2, valor_unitario: 75 }),
      ],
    }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos).toHaveLength(1)
    expect(nProdutos(grupos[0])).toBe(2)
  })

  // 6. Filtro Oferta — 2 produtos → 1 grupo com 2 itens
  it('6: filtro Oferta, 2 produtos → 1 grupo, nProdutos=2', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'oferta' })]
    const itens = { v1: [item({ id: 'iv1' }), item({ id: 'iv2', produto_nome: 'B' })] }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos).toHaveLength(1)
    expect(nProdutos(grupos[0])).toBe(2)
  })

  // 7. Filtro Confirmação — 2 produtos → 1 grupo com 2 itens
  it('7: filtro Confirmação (follow_up), 2 produtos → 1 grupo, nProdutos=2', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'follow_up' })]
    const itens = { v1: [item({ id: 'iv1' }), item({ id: 'iv2', produto_nome: 'B' })] }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos).toHaveLength(1)
    expect(nProdutos(grupos[0])).toBe(2)
  })

  // 8. Potencial total usa soma dos itens_venda
  it('8: potencial total = soma dos subtotais dos itens_venda', () => {
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'recompra', valor_produto: 50 })]
    const itens = {
      v1: [
        item({ id: 'iv1', valor_produto: 80, quantidade: 1, valor_unitario: 80 }),
        item({ id: 'iv2', valor_produto: 220, quantidade: 2, valor_unitario: 110 }),
      ],
    }
    const grupos = agruparPorVenda(avisos, itens)
    expect(grupos[0].valor_total).toBe(300)
  })

  // 9. texto_renderizado vem do aviso primário (não gerado em runtime)
  it('9: texto_renderizado é preservado do aviso; primaryAviso.texto_renderizado é fonte', () => {
    const txt = 'Oi Fulano! Creatina e Whey. Posso separar?'
    const avisos = [aviso({ id: 'a1', venda_id: 'v1', tipo: 'recompra', texto_renderizado: txt })]
    const grupos = agruparPorVenda(avisos)
    expect(grupos[0].avisos[0].texto_renderizado).toBe(txt)
  })

  // 10. Sem duplicação: 2 vendas com mesmo tipo → 2 grupos separados
  it('10: dois clientes diferentes não se mesclam', () => {
    const avisos = [
      aviso({ id: 'a1', venda_id: 'v1', tipo: 'recompra', cliente_nome: 'Ana' }),
      aviso({ id: 'a2', venda_id: 'v2', tipo: 'recompra', cliente_nome: 'Bia' }),
    ]
    const grupos = agruparPorVenda(avisos)
    expect(grupos).toHaveLength(2)
    const nomes = grupos.map(g => g.cliente_nome).sort()
    expect(nomes).toEqual(['Ana', 'Bia'])
  })
})
