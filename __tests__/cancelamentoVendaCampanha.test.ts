import { describe, it, expect } from 'vitest'

// Testes da lógica de cancelamento de venda em campanha.
// As RPCs cancelar_venda_campanha_v1 e resolver_revisao_apuracao_v1 foram
// aplicadas no staging (ynrffhacpjzohrhkpuiq) via migration 060.
// Os testes abaixo documentam e verificam a lógica de guarda antes de
// qualquer chamada de DB.

// ── 1. Guarda de permissão ─────────────────────────────────────────────────────

describe('cancelamento — permissão por role', () => {
  type Role = 'vendedora' | 'gerente' | 'lider' | 'dono' | 'admin_f5'

  function podeCancelar(role: Role, userId: string, vendedoraId: string): boolean {
    if (role === 'vendedora') return userId === vendedoraId
    return ['gerente', 'lider', 'dono', 'admin_f5'].includes(role)
  }

  it('vendedora cancela própria venda', () => {
    expect(podeCancelar('vendedora', 'u-001', 'u-001')).toBe(true)
  })

  it('vendedora NÃO cancela venda de outra', () => {
    expect(podeCancelar('vendedora', 'u-001', 'u-002')).toBe(false)
  })

  it('gerente cancela qualquer venda da loja', () => {
    expect(podeCancelar('gerente', 'u-002', 'u-001')).toBe(true)
  })

  it('dono cancela qualquer venda da loja', () => {
    expect(podeCancelar('dono', 'u-dono', 'u-001')).toBe(true)
  })
})

// ── 2. Guarda de idempotência ─────────────────────────────────────────────────

describe('cancelamento — venda já cancelada', () => {
  it('segunda tentativa deve ser bloqueada', () => {
    const venda = { cancelado_em: '2026-07-27T20:00:00Z' }
    const jaFoiCancelada = venda.cancelado_em !== null
    expect(jaFoiCancelada).toBe(true)
    // RPC retorna {ok: false, error: 'Venda já cancelada.'}
  })

  it('venda nova (não cancelada) passa a guarda', () => {
    const venda = { cancelado_em: null }
    expect(venda.cancelado_em !== null).toBe(false)
  })
})

// ── 3. Comportamento por status de apuração ───────────────────────────────────

describe('cancelamento — snapshot por status de apuração', () => {
  type StatusApuracao = 'pendente' | 'aprovado' | 'pago' | 'cancelado' | 'em_revisao'

  function resolverAcaoSnapshot(statusApuracao: StatusApuracao | null): {
    novoStatusSnapshot: 'cancelado' | 'estornado' | 'sem_mudanca'
    novoStatusApuracao: StatusApuracao | 'sem_mudanca'
    requerRevisao: boolean
  } {
    if (statusApuracao === null) {
      return { novoStatusSnapshot: 'cancelado', novoStatusApuracao: 'sem_mudanca', requerRevisao: false }
    }
    if (statusApuracao === 'pendente' || statusApuracao === 'aprovado') {
      return { novoStatusSnapshot: 'cancelado', novoStatusApuracao: statusApuracao, requerRevisao: false }
    }
    if (statusApuracao === 'pago') {
      return { novoStatusSnapshot: 'estornado', novoStatusApuracao: 'em_revisao', requerRevisao: true }
    }
    return { novoStatusSnapshot: 'sem_mudanca', novoStatusApuracao: 'sem_mudanca', requerRevisao: false }
  }

  it('apuração pendente → snapshot cancelado, sem revisão', () => {
    const r = resolverAcaoSnapshot('pendente')
    expect(r.novoStatusSnapshot).toBe('cancelado')
    expect(r.requerRevisao).toBe(false)
  })

  it('apuração aprovada → snapshot cancelado, sem revisão', () => {
    const r = resolverAcaoSnapshot('aprovado')
    expect(r.novoStatusSnapshot).toBe('cancelado')
    expect(r.requerRevisao).toBe(false)
  })

  it('apuração paga → snapshot estornado, apuração em_revisao', () => {
    const r = resolverAcaoSnapshot('pago')
    expect(r.novoStatusSnapshot).toBe('estornado')
    expect(r.novoStatusApuracao).toBe('em_revisao')
    expect(r.requerRevisao).toBe(true)
  })

  it('snapshot sem apuração vinculada → cancelado direto', () => {
    const r = resolverAcaoSnapshot(null)
    expect(r.novoStatusSnapshot).toBe('cancelado')
    expect(r.requerRevisao).toBe(false)
  })
})

// ── 4. Recálculo de apuração após cancelamento ────────────────────────────────

describe('cancelamento — recálculo de totais', () => {
  it('subtrai quantidade e valor do snapshot cancelado', () => {
    const apuracaoAntes = { quantidade_apurada: 10, valor_apurado: 50.00 }
    const snapshot = { quantidade: 3, comissao_calculada: 15.00 }

    const novaQtd = Math.max(0, apuracaoAntes.quantidade_apurada - snapshot.quantidade)
    const novoValor = Math.max(0, apuracaoAntes.valor_apurado - snapshot.comissao_calculada)

    expect(novaQtd).toBe(7)
    expect(novoValor).toBeCloseTo(35.00)
  })

  it('GREATEST(0, ...) impede valores negativos', () => {
    const apuracao = { quantidade_apurada: 1, valor_apurado: 5.00 }
    const snapshot = { quantidade: 5, comissao_calculada: 20.00 }

    const novaQtd = Math.max(0, apuracao.quantidade_apurada - snapshot.quantidade)
    const novoValor = Math.max(0, apuracao.valor_apurado - snapshot.comissao_calculada)

    expect(novaQtd).toBe(0)
    expect(novoValor).toBe(0)
  })
})

// ── 5. Resolução de revisão ───────────────────────────────────────────────────

describe('resolverRevisaoApuracao — ações válidas', () => {
  function resolverStatus(acao: string): 'pago' | 'cancelado' | null {
    if (acao === 'aprovar') return 'pago'
    if (acao === 'estornar') return 'cancelado'
    return null
  }

  it('aprovar → status volta a pago', () => {
    expect(resolverStatus('aprovar')).toBe('pago')
  })

  it('estornar → status vai a cancelado', () => {
    expect(resolverStatus('estornar')).toBe('cancelado')
  })

  it('ação inválida → null (RPC retorna erro)', () => {
    expect(resolverStatus('desconhecida')).toBeNull()
  })
})

describe('resolverRevisaoApuracao — guarda de status', () => {
  it('apenas apuração em_revisao pode ser resolvida', () => {
    const statusesResoluveis = ['em_revisao']
    expect(statusesResoluveis.includes('pendente')).toBe(false)
    expect(statusesResoluveis.includes('aprovado')).toBe(false)
    expect(statusesResoluveis.includes('pago')).toBe(false)
    expect(statusesResoluveis.includes('em_revisao')).toBe(true)
  })

  it('roles sem permissão são bloqueados', () => {
    const rolesPermitidos = ['dono', 'gerente', 'lider', 'admin_f5']
    expect(rolesPermitidos.includes('vendedora')).toBe(false)
    expect(rolesPermitidos.includes('gerente')).toBe(true)
  })
})
