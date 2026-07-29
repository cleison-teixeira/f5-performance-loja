import { describe, it, expect } from 'vitest'
import { filtrarAvisosPorBusca } from '@/lib/avisos/filtrarAvisos'
import type { AvisoDetalhado, ItemVendaGrupo } from '@/app/(app)/avisos/types'

function makeAviso(overrides: Partial<AvisoDetalhado> & { id: string }): AvisoDetalhado {
  return {
    id: overrides.id,
    data_aviso: '2026-08-01',
    status: 'pendente',
    recompra_id: null,
    texto_renderizado: '',
    cliente_nome: overrides.cliente_nome ?? 'Cliente Teste',
    cliente_whatsapp: overrides.cliente_whatsapp ?? '5511999999999',
    cliente_id: 'c-1',
    produto_nome: overrides.produto_nome ?? 'Produto',
    produto_id: null,
    produto_foto_url: null,
    tipo: 'recompra',
    valor_venda: 100,
    valor_produto: 100,
    previsao_comissao: 0,
    venda_id: overrides.venda_id ?? 'v-1',
    item_venda_id: null,
    data_compra: '2026-07-01',
    vendedora_id: 'u-1',
    vendedora_nome: 'Carol',
    atrasado: false,
    observacao_resultado: null,
    ...overrides,
  }
}

const ALCIDES = makeAviso({ id: 'a1', cliente_nome: 'Alcides da Silva', venda_id: 'v-alcides', produto_nome: 'Whey Leitinho', cliente_whatsapp: '5511912345678' })
const JULIA   = makeAviso({ id: 'a2', cliente_nome: 'Júlia Santos',    venda_id: 'v-julia',   produto_nome: 'Creatina',       cliente_whatsapp: '5521987654321' })

const ITENS_ALCIDES: Record<string, ItemVendaGrupo[]> = {
  'v-alcides': [
    { id: 'iv-1', produto_nome: 'Creatina Monohidratada', produto_id: 'p-1', produto_foto_url: null, valor_produto: 80, quantidade: 1, valor_unitario: 80, ciclo_recompra_dias: 30 },
    { id: 'iv-2', produto_nome: 'Whey Leitinho',          produto_id: 'p-2', produto_foto_url: null, valor_produto: 120, quantidade: 1, valor_unitario: 120, ciclo_recompra_dias: 30 },
  ],
}

describe('filtrarAvisosPorBusca', () => {
  it('S1: busca exata por nome — retorna somente o cliente correspondente', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'Alcides da Silva')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('S2: busca parcial por nome — retorna cliente cujo nome contém o trecho', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'Alcides')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('S3: busca case insensitive — minúsculas encontram nome com maiúsculas', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'alcides da silva')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('S4: busca por telefone parcial (≥4 dígitos)', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], '912345678')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('S5: busca por produto — encontra via produto_nome do aviso', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'Creatina')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a2')
  })

  it('S5b: busca por produto de grupo (não-âncora) — encontra via itensVendaPorVenda', () => {
    // Alcides anchor is "Whey Leitinho" — searching "Creatina Monohidratada" would miss anchor
    // but should find Alcides via itensVendaPorVenda (group product)
    const result = filtrarAvisosPorBusca([ALCIDES], 'Creatina Monohidratada', ITENS_ALCIDES)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('S6: nenhum resultado — retorna lista vazia', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'Nenhum Cliente Esse')
    expect(result).toHaveLength(0)
  })

  it('S7: lista com dois clientes — busca retorna apenas o correspondente', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'Julia')
    expect(result).toHaveLength(1)
    expect(result[0].cliente_nome).toBe('Júlia Santos')
  })

  it('S7b: busca com acento ignorado — "Julia" encontra "Júlia"', () => {
    const result = filtrarAvisosPorBusca([ALCIDES, JULIA], 'Julia')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a2')
  })
})
