import { describe, it, expect } from 'vitest'
import { gerarAvisos } from '@/lib/avisos/gerador'

const CTX = {
  venda_id: 'v-1',
  loja_id: 'l-1',
  cliente_id: 'c-1',
  vendedora_id: 'u-1',
  item_venda_id: 'iv-1',
  cliente_nome: 'Ana Silva',
  vendedora_nome: 'Carol',
  loja_nome: 'Verde Essencial',
  produto_nome: 'Whey Leitinho',
  n_produtos: 1,
}

// dias_apos_venda "de fábrica" gravados em mensagens_produto (TEMPLATES_PADRAO /
// TEMPLATE_OFERTA / TEMPLATE_FOLLOW_UP) — propositalmente DIFERENTES da fórmula
// de cadência para expor que gerarAvisos() ignora esse valor bruto para os 5
// tipos conhecidos e recalcula a partir do ciclo real (N).
const MENSAGENS = [
  { id: 'm-agr', tipo: 'agradecimento', texto: 'x', dias_apos_venda: 0 },
  { id: 'm-rel', tipo: 'relacionamento', texto: 'x', dias_apos_venda: 15 },
  { id: 'm-rec', tipo: 'recompra', texto: 'x', dias_apos_venda: 30 },
  { id: 'm-ofe', tipo: 'oferta', texto: 'x', dias_apos_venda: 45 },
  { id: 'm-fup', tipo: 'follow_up', texto: 'x', dias_apos_venda: 32 },
]

describe('gerarAvisos — data_aviso é sempre recomputado pela fórmula de cadência (ciclo N), nunca pelo dias_apos_venda bruto', () => {
  it('CAD1: N=30, base=2026-07-30 (cenário de CRIAÇÃO da venda no gate multiproduto)', () => {
    const avisos = gerarAvisos(MENSAGENS, CTX, '2026-07-30', 30)
    const porTipo = Object.fromEntries(avisos.map((a, i) => [MENSAGENS[i].tipo, a.data_aviso]))
    expect(porTipo.agradecimento).toBe('2026-07-30')   // D0
    expect(porTipo.relacionamento).toBe('2026-08-14')  // D15
    expect(porTipo.recompra).toBe('2026-08-24')        // D25 (não D30, que seria o dias_apos_venda bruto)
    expect(porTipo.oferta).toBe('2026-08-28')          // D29 (não D45, que seria o dias_apos_venda bruto)
    expect(porTipo.follow_up).toBe('2026-08-31')       // D32
  })

  it('CAD2: N=30, base=2026-07-29 (mesma venda, um dia antes — cenário de EDIÇÃO de data_compra)', () => {
    const avisos = gerarAvisos(MENSAGENS, CTX, '2026-07-29', 30)
    const porTipo = Object.fromEntries(avisos.map((a, i) => [MENSAGENS[i].tipo, a.data_aviso]))
    // Toda a cadência deve andar -1 dia em bloco, preservando os offsets da fórmula (D0/D15/D25/D29/D32)
    expect(porTipo.agradecimento).toBe('2026-07-29')
    expect(porTipo.relacionamento).toBe('2026-08-13')
    expect(porTipo.recompra).toBe('2026-08-23')
    expect(porTipo.oferta).toBe('2026-08-27')
    expect(porTipo.follow_up).toBe('2026-08-30')
  })
})
