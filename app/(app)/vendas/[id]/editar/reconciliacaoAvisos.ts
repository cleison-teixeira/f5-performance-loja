// Fase 2 — reconciliação pura de avisos existentes na edição de venda manual.
//
// Extraído de actions.ts (e não colocado ali) porque arquivos 'use server'
// só podem exportar funções assíncronas (Server Actions) — funções puras
// síncronas causam erro de build ("Server Actions must be async functions").
//
// Decide, a partir do estado atual de avisos da venda e de quais itens foram
// removidos nesta edição, quais avisos devem ser desancorados (preservados,
// porém sem item_venda_id — necessário porque avisos.item_venda_id tem
// ON DELETE CASCADE para itens_venda, então um aviso protegido de um item
// removido precisa perder a referência ANTES do item ser apagado, senão
// seria destruído em cascata) e quais podem ser removidos por serem
// substituíveis.
//
// Não decide a âncora — isso é responsabilidade exclusiva de
// planejarAvisosParaVenda (lib/avisos/planejarParaVenda.ts), reutilizada sem
// modificação em actions.ts para não duplicar a regra de menor
// ciclo_recompra_dias.

// Mesma política conservadora da RPC editar_recompra_transacional: só
// pendente/reagendada, nunca enviado, nunca vinculado a recompra. Tudo fora
// disso é histórico/protegido e nunca é tocado.
const STATUS_SUBSTITUIVEL = ['pendente', 'reagendada'] as const

export interface AvisoExistenteParaReconciliacao {
  id: string
  item_venda_id: string | null
  status: string
  enviado_em: string | null
  recompra_id: string | null
}

export interface PlanoReconciliacaoAvisos {
  idsParaRemover: string[]
  idsParaDesancorar: string[]
}

export function avisoESubstituivel(aviso: Pick<AvisoExistenteParaReconciliacao, 'status' | 'enviado_em' | 'recompra_id'>): boolean {
  return (STATUS_SUBSTITUIVEL as readonly string[]).includes(aviso.status)
    && aviso.enviado_em === null
    && aviso.recompra_id === null
}

export function planejarReconciliacaoAvisos(params: {
  avisos: AvisoExistenteParaReconciliacao[]
  itensRemovidosIds: string[]
}): PlanoReconciliacaoAvisos {
  const { avisos, itensRemovidosIds } = params
  const removidosSet = new Set(itensRemovidosIds)

  const idsParaRemover: string[] = []
  const idsParaDesancorar: string[] = []

  for (const aviso of avisos) {
    if (avisoESubstituivel(aviso)) {
      // Substituível: independente do item, será superado pelo novo plano
      // de âncora única — nunca deixamos 2 conjuntos ativos coexistindo.
      idsParaRemover.push(aviso.id)
      continue
    }
    // Não-substituível (enviado / com recompra_id / outro status histórico):
    // nunca é removido. Se o item dele foi removido nesta edição, precisa
    // ser desancorado antes do item_venda_id ser deletado (evita cascade).
    if (aviso.item_venda_id !== null && removidosSet.has(aviso.item_venda_id)) {
      idsParaDesancorar.push(aviso.id)
    }
  }

  return { idsParaRemover, idsParaDesancorar }
}

// ── Fase 2: resolução do ciclo real de itens novos ──────────────────────────
//
// ItemEditarInput não carrega ciclo_recompra_dias (só itens já persistidos em
// itens_venda têm esse campo). Sem resolver o ciclo real de um item novo, ele
// cairia sempre no fallback 30 do planner, podendo eleger a âncora errada
// quando o ciclo real do produto novo é diferente de 30.
//
// Mesma fonte já usada em app/(app)/vendas/nova/page.tsx (cicloMap) e como
// fallback interno de gerarAvisos (lib/avisos/gerador.ts):
// mensagens_produto.dias_apos_venda onde tipo='recompra'. Produto sem essa
// mensagem preserva o fallback 30 já usado em todo o sistema — não bloqueia
// a edição, não gera erro.
//
// A busca em si (SELECT) permanece em actions.ts; aqui fica só a
// transformação pura (linha a linha, testável sem banco).

export interface MensagemRecompraProduto {
  produto_id: string
  dias_apos_venda: number
}

export function resolverCicloRecompraPorProduto(mensagens: MensagemRecompraProduto[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const m of mensagens) {
    if (m.dias_apos_venda > 0) mapa.set(m.produto_id, m.dias_apos_venda)
  }
  return mapa
}
