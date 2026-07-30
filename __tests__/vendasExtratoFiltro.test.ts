import { describe, it, expect } from 'vitest'
import { itemDestaque } from '@/app/(app)/vendas/VendasLista'
import type { VendaItemExtrato } from '@/app/(app)/vendas/page'

const ITENS: VendaItemExtrato[] = [
  { produto_nome: 'Óleo Essencial Lavanda 10ml', quantidade: 1, valor_unitario: 89.9, subtotal: 89.9, recorrente: true },
  { produto_nome: 'Whey Protein Baunilha 900g', quantidade: 1, valor_unitario: 129.9, subtotal: 129.9, recorrente: true },
]

describe('itemDestaque — resumo do Extrato deve refletir o produto filtrado', () => {
  it('D1: sem filtro, mantém o comportamento anterior — sempre o primeiro item', () => {
    expect(itemDestaque(ITENS)?.produto_nome).toBe('Óleo Essencial Lavanda 10ml')
  })

  it('D2: com filtro pelo item não-primeiro (Whey), destaca o Whey em vez do primeiro item', () => {
    expect(itemDestaque(ITENS, 'Whey Protein Baunilha 900g')?.produto_nome).toBe('Whey Protein Baunilha 900g')
  })

  it('D3: com filtro pelo primeiro item, continua destacando o primeiro', () => {
    expect(itemDestaque(ITENS, 'Óleo Essencial Lavanda 10ml')?.produto_nome).toBe('Óleo Essencial Lavanda 10ml')
  })

  it('D4: filtro que não corresponde a nenhum item da venda cai de volta para o primeiro (nunca undefined)', () => {
    expect(itemDestaque(ITENS, 'Produto Inexistente')?.produto_nome).toBe('Óleo Essencial Lavanda 10ml')
  })

  it('D5: lista vazia retorna undefined independentemente do filtro', () => {
    expect(itemDestaque([], 'Whey Protein Baunilha 900g')).toBeUndefined()
    expect(itemDestaque([])).toBeUndefined()
  })
})
