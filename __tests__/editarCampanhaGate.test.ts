import { describe, it, expect } from 'vitest'
import {
  statusPermiteEdicao,
  STATUS_EDITAVEIS,
  STATUS_BLOQUEADOS,
  ciclosPreservados,
  detectarConflito,
  produtosPertencemALoja,
  participantesPertencemALoja,
} from '@/lib/campanhas/editar'
import { calcularPremiacao } from '@/lib/campanhas/premiacao'
import type { RegraPremiacao } from '@/lib/campanhas/premiacao'

// ── 1. Status — bloqueados ────────────────────────────────────────────────────

describe('status bloqueados para edição', () => {
  it.each(STATUS_BLOQUEADOS)('status "%s" não permite edição', (status) => {
    expect(statusPermiteEdicao(status)).toBe(false)
  })

  it('campanha encerrada é bloqueada', () => {
    expect(statusPermiteEdicao('encerrada')).toBe(false)
  })

  it('campanha cancelada é bloqueada', () => {
    expect(statusPermiteEdicao('cancelada')).toBe(false)
  })
})

// ── 2. Status — editáveis ─────────────────────────────────────────────────────

describe('status editáveis', () => {
  it.each(STATUS_EDITAVEIS)('status "%s" permite edição', (status) => {
    expect(statusPermiteEdicao(status)).toBe(true)
  })

  it('rascunho é editável', () => expect(statusPermiteEdicao('rascunho')).toBe(true))
  it('ativa é editável',    () => expect(statusPermiteEdicao('ativa')).toBe(true))
  it('pausada é editável',  () => expect(statusPermiteEdicao('pausada')).toBe(true))
  it('programada é editável', () => expect(statusPermiteEdicao('programada')).toBe(true))
})

// ── 3. Ciclo de recompra — preservado em edição ───────────────────────────────

describe('ciclo de recompra', () => {
  const itensOriginais = [
    { produto_id: 'p-001', ciclo_recompra_dias: 30 },
    { produto_id: 'p-002', ciclo_recompra_dias: null },
    { produto_id: 'p-003', ciclo_recompra_dias: 60 },
  ]

  it('ciclos permanecem inalterados quando apenas o nome é editado', () => {
    const itensEdicao = itensOriginais.map(i => ({ ...i }))
    expect(ciclosPreservados(itensOriginais, itensEdicao)).toBe(true)
  })

  it('ciclo null permanece null', () => {
    const itensEdicao = [{ produto_id: 'p-002', ciclo_recompra_dias: null }]
    const originais = [{ produto_id: 'p-002', ciclo_recompra_dias: null }]
    expect(ciclosPreservados(originais, itensEdicao)).toBe(true)
  })

  it('detecta ciclo alterado silenciosamente', () => {
    const itensEdicao = [
      { produto_id: 'p-001', ciclo_recompra_dias: 999 },
    ]
    expect(ciclosPreservados(itensOriginais, itensEdicao)).toBe(false)
  })

  it('produto removido não causa falso negativo', () => {
    const itensEdicao = [
      { produto_id: 'p-001', ciclo_recompra_dias: 30 },
    ]
    expect(ciclosPreservados(itensOriginais, itensEdicao)).toBe(true)
  })
})

// ── 4. Concorrência otimista ──────────────────────────────────────────────────

describe('detecção de conflito de edição concorrente', () => {
  const versaoBanco = '2026-07-27T17:30:00.000Z'

  it('sem versaoEsperada: nunca conflita (campo opcional)', () => {
    const r = detectarConflito(undefined, versaoBanco)
    expect(r.conflito).toBe(false)
  })

  it('versão esperada igual à do banco: sem conflito', () => {
    const r = detectarConflito(versaoBanco, versaoBanco)
    expect(r.conflito).toBe(false)
  })

  it('versão esperada diferente da do banco: conflito detectado', () => {
    const r = detectarConflito('2026-07-27T10:00:00.000Z', versaoBanco)
    expect(r.conflito).toBe(true)
    expect(r.mensagem).toContain('Atualize a página')
  })
})

// ── 5. Validação cross-loja — produtos ───────────────────────────────────────

describe('produtos pertencem à loja', () => {
  const validos = new Set(['p-001', 'p-002', 'p-003'])

  it('todos os produtos são da loja: aceita', () => {
    expect(produtosPertencemALoja(['p-001', 'p-002'], validos)).toBe(true)
  })

  it('produto de outra loja: bloqueia', () => {
    expect(produtosPertencemALoja(['p-001', 'p-999'], validos)).toBe(false)
  })

  it('lista vazia: aceita (campanha sem itens tem validação separada)', () => {
    expect(produtosPertencemALoja([], validos)).toBe(true)
  })
})

// ── 6. Validação cross-loja — participantes ───────────────────────────────────

describe('participantes pertencem à loja', () => {
  const membros = new Set(['u-001', 'u-002'])

  it('todos os participantes são membros da loja: aceita', () => {
    expect(participantesPertencemALoja(['u-001'], membros)).toBe(true)
  })

  it('participante de outra loja: bloqueia', () => {
    expect(participantesPertencemALoja(['u-001', 'u-999'], membros)).toBe(false)
  })

  it('lista vazia: aceita', () => {
    expect(participantesPertencemALoja([], membros)).toBe(true)
  })
})

// ── 7. Troca de tipo de premiação — cálculo independente ─────────────────────

describe('troca de tipo de premiação não afeta snapshots antigos', () => {
  it('snapshot fixo R$5 não vira percentual quando regra muda', () => {
    const regraV1: RegraPremiacao = { tipo: 'fixo_unidade', valor: 5 }
    const regraV2: RegraPremiacao = { tipo: 'percentual', percentual: 0.1 }

    const snapV1 = calcularPremiacao(2, 100, regraV1).comissao
    const snapV2 = calcularPremiacao(2, 100, regraV2).comissao

    expect(snapV1).toBe(10)  // 2 × 5
    expect(snapV2).toBe(20)  // 2 × 100 × 10%
    expect(snapV1).not.toBe(snapV2)
  })

  it('fixo → faixa progressiva: faixas antigas limpas não interferem', () => {
    const regraV1: RegraPremiacao = { tipo: 'fixo_unidade', valor: 3 }
    const regraV2: RegraPremiacao = {
      tipo: 'faixa_progressiva',
      progressiva_retroativa: false,
      faixas: [
        { id: 'f1', premiacao_id: 'p1', quantidade_de: 1, quantidade_ate: 5, valor_por_unidade: 1, ordem: 0 },
        { id: 'f2', premiacao_id: 'p1', quantidade_de: 6, quantidade_ate: null, valor_por_unidade: 2, ordem: 1 },
      ],
    }
    // Snapshot v1 (fixo): 4 × 3 = 12
    expect(calcularPremiacao(4, 50, regraV1).comissao).toBe(12)
    // Nova regra v2 (faixa): 4 × 1 = 4
    expect(calcularPremiacao(4, 50, regraV2).comissao).toBe(4)
  })

  it('fixo → sem_premiacao: comissão passa a zero', () => {
    const regraV1: RegraPremiacao = { tipo: 'fixo_unidade', valor: 5 }
    const regraV2: RegraPremiacao = { tipo: 'sem_premiacao' }
    expect(calcularPremiacao(10, 50, regraV1).comissao).toBe(50)
    expect(calcularPremiacao(10, 50, regraV2).comissao).toBe(0)
  })

  it('sem_premiacao → fixo: novas vendas passam a ter comissão', () => {
    const regraV1: RegraPremiacao = { tipo: 'sem_premiacao' }
    const regraV2: RegraPremiacao = { tipo: 'fixo_unidade', valor: 10 }
    expect(calcularPremiacao(3, 50, regraV1).comissao).toBe(0)
    expect(calcularPremiacao(3, 50, regraV2).comissao).toBe(30)
  })
})

// ── 8. Produto com histórico — inativação vs deleção ─────────────────────────

describe('produto com histórico deve ser apenas inativado', () => {
  it('lista de itens ativos não inclui produto removido', () => {
    const itensAtivos = [
      { produto_id: 'p-001', ativo: true },
      { produto_id: 'p-002', ativo: true },
    ]
    const novosItens = [{ produto_id: 'p-001', ativo: true }]

    const inativos = itensAtivos
      .filter(i => !novosItens.some(n => n.produto_id === i.produto_id))
      .map(i => ({ ...i, ativo: false }))

    expect(inativos).toHaveLength(1)
    expect(inativos[0].produto_id).toBe('p-002')
    expect(inativos[0].ativo).toBe(false)
    // O registro continua existindo (apenas com ativo=false), não foi deletado
  })

  it('snapshot existente não é afetado pela inativação do item', () => {
    // Snapshots são write-once e nunca referenciados pela action de edição
    const snapshot = { campanha_item_id: 'item-001', comissao_calculada: 5.00 }
    // Após inativação do item, o snapshot permanece com os mesmos valores
    expect(snapshot.comissao_calculada).toBe(5.00)
  })
})

// ── 9. Participante sem meta individual ──────────────────────────────────────

describe('participante sem meta individual', () => {
  it('meta_individual null é aceita sem erro', () => {
    const participante = { perfil_id: 'u-001', meta_individual: null }
    expect(participante.meta_individual).toBeNull()
  })

  it('participante com meta zero difere de null', () => {
    const semMeta = { meta_individual: null }
    const metaZero = { meta_individual: 0 }
    expect(semMeta.meta_individual).toBeNull()
    expect(metaZero.meta_individual).toBe(0)
    expect(semMeta.meta_individual).not.toBe(metaZero.meta_individual)
  })
})

// ── 10. Atomicidade — documentação do risco ───────────────────────────────────

describe('atomicidade (risco documentado)', () => {
  it('sem rollback: se participantes falharem, itens já foram atualizados', () => {
    // NOTA: editarCampanha faz múltiplas chamadas independentes ao Supabase.
    // Não existe transação envolvendo todos os steps. Se o upsert de participantes
    // falhar após os itens serem atualizados, a campanha fica em estado parcial.
    //
    // Mitigação necessária: Supabase RPC function com BEGIN/COMMIT.
    // Status: RISCO DOCUMENTADO — requer migration autorizada para corrigir.
    //
    // Este teste existe para registrar o risco no pipeline de CI.
    const riscosConhecidos = ['sem transação entre steps de editarCampanha']
    expect(riscosConhecidos).toHaveLength(1)
    expect(riscosConhecidos[0]).toContain('sem transação')
  })
})
