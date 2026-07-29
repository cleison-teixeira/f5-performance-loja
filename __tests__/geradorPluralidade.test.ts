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
}

const MSG_RECOMPRA = {
  id: 'm-rec',
  tipo: 'recompra',
  texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. {produto_artigo} {produto} {produto_devem} estar acabando em breve! Quer garantir já {produto_proximos}?',
  dias_apos_venda: 30,
}

const MSG_OFERTA = {
  id: 'm-ofe',
  tipo: 'oferta',
  texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. Temos uma novidade especial {oferta_frase}. Quer saber mais?',
  dias_apos_venda: 29,
}

const MSG_FOLLOW_UP = {
  id: 'm-fup',
  tipo: 'follow_up',
  texto: 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe {produto_possessivo} {produto}. Posso deixar reservado para você até o fim do dia?',
  dias_apos_venda: 32,
}

const MSG_AGRADECIMENTO = {
  id: 'm-agr',
  tipo: 'agradecimento',
  texto: 'Olá, aqui é a {vendedora} da {loja}. Estou passando para agradecer pela sua compra. Peço que salve meu contato porque vou acompanhar sua evolução com {produto} nos próximos dias.',
  dias_apos_venda: 0,
}

const MSG_RELACIONAMENTO = {
  id: 'm-rel',
  tipo: 'relacionamento',
  texto: 'Oi {cliente}! Como está sendo sua experiência com {produto}? Sou {vendedora} da {loja}, qualquer dúvida é só me chamar!',
  dias_apos_venda: 15,
}

describe('gerarAvisos — concordância singular/plural', () => {
  it('P1: recompra singular — artigo e verbos no singular', () => {
    const [aviso] = gerarAvisos([MSG_RECOMPRA], { ...CTX, produto_nome: 'Whey Leitinho', n_produtos: 1 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('Seu Whey Leitinho deve estar acabando em breve!')
    expect(aviso.texto_renderizado).toContain('Quer garantir já o próximo?')
  })

  it('P2: recompra dois produtos — artigo e verbos no plural', () => {
    const [aviso] = gerarAvisos([MSG_RECOMPRA], { ...CTX, produto_nome: 'Creatina Monohidratada e Whey Leitinho', n_produtos: 2 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('Seus produtos Creatina Monohidratada e Whey Leitinho devem estar acabando em breve!')
    expect(aviso.texto_renderizado).toContain('Quer garantir já os próximos?')
  })

  it('P3: recompra três produtos — plural correto com todos os nomes', () => {
    const [aviso] = gerarAvisos([MSG_RECOMPRA], { ...CTX, produto_nome: 'Creatina, Whey e BCAA', n_produtos: 3 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('Seus produtos Creatina, Whey e BCAA devem estar acabando em breve!')
    expect(aviso.texto_renderizado).toContain('os próximos')
  })

  it('P4: agradecimento multi-produto — menciona todos os produtos normalmente', () => {
    const [aviso] = gerarAvisos([MSG_AGRADECIMENTO], { ...CTX, produto_nome: 'Creatina e Whey', n_produtos: 2 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('Creatina e Whey')
  })

  it('P5: relacionamento multi-produto — menciona todos os produtos', () => {
    const [aviso] = gerarAvisos([MSG_RELACIONAMENTO], { ...CTX, produto_nome: 'Creatina e Whey', n_produtos: 2 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('Creatina e Whey')
    expect(aviso.texto_renderizado).toContain('Ana')
  })

  it('P6: oferta singular — "de {produto} para você"', () => {
    const [aviso] = gerarAvisos([MSG_OFERTA], { ...CTX, produto_nome: 'Whey Leitinho', n_produtos: 1 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('de Whey Leitinho para você')
  })

  it('P7: oferta multi-produto — "para seus produtos: {produto}"', () => {
    const [aviso] = gerarAvisos([MSG_OFERTA], { ...CTX, produto_nome: 'Creatina e Whey', n_produtos: 2 }, '2026-01-01', 30)
    expect(aviso.texto_renderizado).toContain('para seus produtos: Creatina e Whey')
  })

  it('P8: follow_up singular vs plural — possessivo correto', () => {
    const [single] = gerarAvisos([MSG_FOLLOW_UP], { ...CTX, produto_nome: 'Whey Leitinho', n_produtos: 1 }, '2026-01-01', 30)
    expect(single.texto_renderizado).toContain('separe seu Whey Leitinho')

    const [multi] = gerarAvisos([MSG_FOLLOW_UP], { ...CTX, produto_nome: 'Creatina e Whey', n_produtos: 2 }, '2026-01-01', 30)
    expect(multi.texto_renderizado).toContain('separe seus produtos: Creatina e Whey')
  })
})
