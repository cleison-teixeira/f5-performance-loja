import { describe, it, expect } from 'vitest'
import { calcularPremiacao } from '@/lib/campanhas/premiacao'
import type { RegraPremiacao, FaixaPremiacao } from '@/lib/campanhas/premiacao'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function faixa(de: number, ate: number | null, valor: number, ordem: number): FaixaPremiacao {
  return { id: `f-${ordem}`, premiacao_id: 'p-001', quantidade_de: de, quantidade_ate: ate, valor_por_unidade: valor, ordem }
}

const FAIXAS_SIMPLES: FaixaPremiacao[] = [
  faixa(1, 5, 1.00, 0),
  faixa(6, 10, 2.00, 1),
  faixa(11, null, 3.00, 2),
]

// ── 1. Sem premiação ──────────────────────────────────────────────────────────

describe('sem_premiacao', () => {
  it('retorna comissão zero independentemente da quantidade', () => {
    const regra: RegraPremiacao = { tipo: 'sem_premiacao' }
    expect(calcularPremiacao(100, 50, regra).comissao).toBe(0)
  })
})

// ── 2. Fixo por unidade ───────────────────────────────────────────────────────

describe('fixo_unidade', () => {
  it('multiplica valor pelo número de unidades', () => {
    const regra: RegraPremiacao = { tipo: 'fixo_unidade', valor: 2.5 }
    expect(calcularPremiacao(10, 50, regra).comissao).toBe(25)
  })

  it('retorna zero quando valor não está configurado', () => {
    const regra: RegraPremiacao = { tipo: 'fixo_unidade', valor: null }
    expect(calcularPremiacao(5, 50, regra).comissao).toBe(0)
  })

  it('calcula fracionado corretamente (arredondamento 2 casas)', () => {
    const regra: RegraPremiacao = { tipo: 'fixo_unidade', valor: 0.33 }
    expect(calcularPremiacao(3, 10, regra).comissao).toBe(0.99)
  })
})

// ── 3. Percentual ─────────────────────────────────────────────────────────────

describe('percentual', () => {
  it('calcula percentual sobre o valor total (qty × unitário)', () => {
    const regra: RegraPremiacao = { tipo: 'percentual', percentual: 0.05 }
    // qty=10, unit=100 → total=1000 → 5% = 50
    expect(calcularPremiacao(10, 100, regra).comissao).toBe(50)
  })

  it('retorna zero quando percentual é null', () => {
    const regra: RegraPremiacao = { tipo: 'percentual', percentual: null }
    expect(calcularPremiacao(10, 100, regra).comissao).toBe(0)
  })
})

// ── 4. Bônus por meta ─────────────────────────────────────────────────────────

describe('bonus_meta', () => {
  const regra: RegraPremiacao = { tipo: 'bonus_meta', valor: 100, meta_gatilho: 10 }

  it('paga o bônus quando quantidade >= gatilho', () => {
    expect(calcularPremiacao(10, 50, regra).comissao).toBe(100)
    expect(calcularPremiacao(15, 50, regra).comissao).toBe(100)
  })

  it('não paga quando quantidade < gatilho', () => {
    expect(calcularPremiacao(9, 50, regra).comissao).toBe(0)
    expect(calcularPremiacao(0, 50, regra).comissao).toBe(0)
  })
})

// ── 5. Faixas progressivas (não retroativa) ───────────────────────────────────

describe('faixa_progressiva não retroativa', () => {
  const regra: RegraPremiacao = {
    tipo: 'faixa_progressiva',
    progressiva_retroativa: false,
    faixas: FAIXAS_SIMPLES,
  }

  it('aplica faixa 1 (1-5 unidades)', () => {
    // 3 unidades na faixa 1 → 3 × 1,00 = 3,00
    expect(calcularPremiacao(3, 50, regra).comissao).toBe(3)
  })

  it('aplica faixa 2 (6-10 unidades)', () => {
    // 8 unidades na faixa 2 → 8 × 2,00 = 16,00
    expect(calcularPremiacao(8, 50, regra).comissao).toBe(16)
  })

  it('aplica faixa 3 (11+ unidades)', () => {
    // 15 unidades na faixa 3 → 15 × 3,00 = 45,00
    expect(calcularPremiacao(15, 50, regra).comissao).toBe(45)
  })

  it('retorna zero quando não entra em nenhuma faixa', () => {
    // Faixas começam em 1, então qty=0 não cobre nenhuma
    expect(calcularPremiacao(0, 50, regra).comissao).toBe(0)
  })

  it('expõe a faixa aplicada no resultado', () => {
    const res = calcularPremiacao(8, 50, regra)
    expect(res.faixa_aplicada).not.toBeNull()
    expect(res.faixa_aplicada?.valor_por_unidade).toBe(2)
  })
})

// ── 6. Faixas progressivas retroativa ─────────────────────────────────────────

describe('faixa_progressiva retroativa', () => {
  const regra: RegraPremiacao = {
    tipo: 'faixa_progressiva',
    progressiva_retroativa: true,
    faixas: FAIXAS_SIMPLES,
  }

  it('soma acumuladamente: 1-5 na faixa1, 6-10 na faixa2, 11+ na faixa3', () => {
    // qty=12: 5 × 1,00 + 5 × 2,00 + 2 × 3,00 = 5 + 10 + 6 = 21
    expect(calcularPremiacao(12, 50, regra).comissao).toBe(21)
  })

  it('acumula apenas as faixas abrangidas', () => {
    // qty=6: 5 × 1,00 + 1 × 2,00 = 7
    expect(calcularPremiacao(6, 50, regra).comissao).toBe(7)
  })

  it('qty menor que início da primeira faixa retorna zero', () => {
    expect(calcularPremiacao(0, 50, regra).comissao).toBe(0)
  })
})

// ── 7. Prêmio físico ─────────────────────────────────────────────────────────

describe('premio_fisico', () => {
  it('retorna comissão monetária zero (prêmio físico não tem valor automático)', () => {
    const regra: RegraPremiacao = { tipo: 'premio_fisico' }
    expect(calcularPremiacao(20, 100, regra).comissao).toBe(0)
    expect(calcularPremiacao(20, 100, regra).faixa_aplicada).toBeNull()
  })
})

// ── 8. Snapshot isolado por campanha ─────────────────────────────────────────

describe('isolamento de campanhas', () => {
  it('duas campanhas com tipos diferentes não interferem entre si', () => {
    const regraA: RegraPremiacao = { tipo: 'fixo_unidade', valor: 5 }
    const regraB: RegraPremiacao = { tipo: 'percentual', percentual: 0.1 }

    const resultA = calcularPremiacao(4, 50, regraA)
    const resultB = calcularPremiacao(4, 50, regraB)

    expect(resultA.comissao).toBe(20)
    expect(resultB.comissao).toBe(20)
    // ambos 20, mas por cálculos totalmente independentes
  })
})

// ── 9. Compatibilidade com campanhas antigas (sem premiacao) ──────────────────

describe('campanha antiga sem premiação', () => {
  it('tipo sem_premiacao não lança exceção com qualquer quantidade', () => {
    const regra: RegraPremiacao = { tipo: 'sem_premiacao' }
    expect(() => calcularPremiacao(0, 0, regra)).not.toThrow()
    expect(() => calcularPremiacao(999, 999, regra)).not.toThrow()
  })

  it('faixas vazia não lança exceção', () => {
    const regra: RegraPremiacao = { tipo: 'faixa_progressiva', faixas: [], progressiva_retroativa: false }
    expect(() => calcularPremiacao(5, 50, regra)).not.toThrow()
    expect(calcularPremiacao(5, 50, regra).comissao).toBe(0)
  })
})

// ── 10. Alteração de regra não altera snapshot existente ─────────────────────

describe('imutabilidade do snapshot', () => {
  it('cálculo com regra v1 não é afetado por nova regra v2', () => {
    const regraV1: RegraPremiacao = { tipo: 'fixo_unidade', valor: 2 }
    const regraV2: RegraPremiacao = { tipo: 'fixo_unidade', valor: 5 }

    const resultV1 = calcularPremiacao(10, 50, regraV1)
    const resultV2 = calcularPremiacao(10, 50, regraV2)

    // O resultado v1 é calculado e armazenado; v2 não o modifica
    expect(resultV1.comissao).toBe(20)
    expect(resultV2.comissao).toBe(50)
  })
})

// ── 11. Faixas progressivas retroativa vs não retroativa ─────────────────────

describe('retroativa vs não retroativa side-by-side', () => {
  const faixas: FaixaPremiacao[] = [
    faixa(1, 10, 1.0, 0),
    faixa(11, null, 3.0, 1),
  ]

  it('não retroativa: qty=15 aplica apenas faixa 11+ ao total', () => {
    const regra: RegraPremiacao = { tipo: 'faixa_progressiva', progressiva_retroativa: false, faixas }
    // faixa 11+ → 15 × 3,00 = 45
    expect(calcularPremiacao(15, 50, regra).comissao).toBe(45)
  })

  it('retroativa: qty=15 soma 10 × 1,00 + 5 × 3,00 = 25', () => {
    const regra: RegraPremiacao = { tipo: 'faixa_progressiva', progressiva_retroativa: true, faixas }
    expect(calcularPremiacao(15, 50, regra).comissao).toBe(25)
  })
})

// ── 12. Percentual com valor unitário zero ────────────────────────────────────

describe('casos extremos', () => {
  it('percentual com preço zero retorna zero', () => {
    const regra: RegraPremiacao = { tipo: 'percentual', percentual: 0.1 }
    expect(calcularPremiacao(10, 0, regra).comissao).toBe(0)
  })

  it('fixo_unidade com quantidade zero retorna zero', () => {
    const regra: RegraPremiacao = { tipo: 'fixo_unidade', valor: 10 }
    expect(calcularPremiacao(0, 50, regra).comissao).toBe(0)
  })

  it('bonus_meta com gatilho zero é sempre ativado', () => {
    const regra: RegraPremiacao = { tipo: 'bonus_meta', valor: 50, meta_gatilho: 0 }
    expect(calcularPremiacao(0, 50, regra).comissao).toBe(50)
  })
})
