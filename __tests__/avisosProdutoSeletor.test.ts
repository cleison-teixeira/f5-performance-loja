import { describe, it, expect } from 'vitest'
import { listarProdutosUnicos, avisoCombinaProduto } from '@/app/(app)/avisos/AvisosLista'
import type { AvisoDetalhado, ItemVendaGrupo } from '@/app/(app)/avisos/types'

function makeAviso(overrides: Partial<AvisoDetalhado> & { id: string }): AvisoDetalhado {
  return {
    id: overrides.id,
    data_aviso: '2026-08-01',
    status: 'pendente',
    recompra_id: null,
    texto_renderizado: '',
    cliente_nome: 'Cliente Teste',
    cliente_whatsapp: '5511999999999',
    cliente_id: 'c-1',
    produto_nome: overrides.produto_nome ?? 'Produto Âncora',
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

// Cenário real: venda multiproduto onde todos os avisos carregam o
// produto_nome do item âncora (Óleo), mas a venda também tem um item
// não-âncora (Whey) que só aparece em itensVendaPorVenda.
const AVISO_MULTIPRODUTO = makeAviso({
  id: 'a1',
  venda_id: 'v-multi',
  produto_nome: 'Óleo Essencial Lavanda 10ml',
})
const AVISO_OUTRO = makeAviso({
  id: 'a2',
  venda_id: 'v-outra',
  produto_nome: 'Kit Difusor + Óleo',
})

const ITENS_POR_VENDA: Record<string, ItemVendaGrupo[]> = {
  'v-multi': [
    { id: 'iv-1', produto_nome: 'Óleo Essencial Lavanda 10ml', produto_id: 'p-1', produto_foto_url: null, valor_produto: 89.9, quantidade: 1, valor_unitario: 89.9, ciclo_recompra_dias: 30 },
    { id: 'iv-2', produto_nome: 'Whey Protein Baunilha 900g', produto_id: 'p-2', produto_foto_url: null, valor_produto: 129.9, quantidade: 1, valor_unitario: 129.9, ciclo_recompra_dias: 60 },
  ],
}

describe('listarProdutosUnicos — seletor de produtos deve incluir itens não-âncora', () => {
  it('S1: inclui o produto não-âncora (Whey) mesmo ele nunca aparecendo em produto_nome de nenhum aviso', () => {
    const opcoes = listarProdutosUnicos([AVISO_MULTIPRODUTO, AVISO_OUTRO], ITENS_POR_VENDA)
    expect(opcoes).toContain('Whey Protein Baunilha 900g')
    expect(opcoes).toContain('Óleo Essencial Lavanda 10ml')
    expect(opcoes).toContain('Kit Difusor + Óleo')
  })

  it('S2: sem itensVendaPorVenda, cai de volta para os nomes de produto_nome (comportamento anterior preservado)', () => {
    const opcoes = listarProdutosUnicos([AVISO_MULTIPRODUTO, AVISO_OUTRO])
    expect(opcoes).toEqual(['Kit Difusor + Óleo', 'Óleo Essencial Lavanda 10ml'])
  })

  it('S3: não duplica quando o mesmo nome aparece em produto_nome e em itensVendaPorVenda', () => {
    const opcoes = listarProdutosUnicos([AVISO_MULTIPRODUTO], ITENS_POR_VENDA)
    const ocorrencias = opcoes.filter(o => o === 'Óleo Essencial Lavanda 10ml').length
    expect(ocorrencias).toBe(1)
  })
})

describe('avisoCombinaProduto — filtro por produto deve casar com itens não-âncora', () => {
  it('F1: sem filtro (string vazia), sempre combina', () => {
    expect(avisoCombinaProduto(AVISO_MULTIPRODUTO, '', ITENS_POR_VENDA)).toBe(true)
  })

  it('F2: filtro pelo produto âncora combina', () => {
    expect(avisoCombinaProduto(AVISO_MULTIPRODUTO, 'Óleo Essencial Lavanda 10ml', ITENS_POR_VENDA)).toBe(true)
  })

  it('F3: filtro pelo produto NÃO-âncora (Whey) também combina — busca na venda inteira', () => {
    expect(avisoCombinaProduto(AVISO_MULTIPRODUTO, 'Whey Protein Baunilha 900g', ITENS_POR_VENDA)).toBe(true)
  })

  it('F4: filtro por produto que não pertence à venda não combina', () => {
    expect(avisoCombinaProduto(AVISO_MULTIPRODUTO, 'Creatina Monohidratada', ITENS_POR_VENDA)).toBe(false)
  })

  it('F5: aviso de outra venda não combina com produto da primeira venda', () => {
    expect(avisoCombinaProduto(AVISO_OUTRO, 'Whey Protein Baunilha 900g', ITENS_POR_VENDA)).toBe(false)
  })
})
