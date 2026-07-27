import type { StatusCampanha } from '@/app/(app)/campanhas/types'

export const STATUS_EDITAVEIS: StatusCampanha[] = ['rascunho', 'programada', 'ativa', 'pausada']
export const STATUS_BLOQUEADOS: StatusCampanha[] = ['encerrada', 'cancelada']

export function statusPermiteEdicao(status: StatusCampanha): boolean {
  return STATUS_EDITAVEIS.includes(status)
}

export interface ItemCiclo {
  produto_id: string
  ciclo_recompra_dias: number | null
}

/** Verifica que todos os itens iniciais têm ciclo preservado na lista de edição. */
export function ciclosPreservados(
  itensIniciais: ItemCiclo[],
  itensEdicao: ItemCiclo[]
): boolean {
  for (const original of itensIniciais) {
    const editado = itensEdicao.find(i => i.produto_id === original.produto_id)
    if (!editado) continue
    if (editado.ciclo_recompra_dias !== original.ciclo_recompra_dias) return false
  }
  return true
}

export interface ConflitoConcorrencia {
  conflito: boolean
  mensagem?: string
}

/** Detecta conflito de edição concorrente comparando atualizado_em. */
export function detectarConflito(
  versaoEsperada: string | undefined,
  versaoAtual: string
): ConflitoConcorrencia {
  if (!versaoEsperada) return { conflito: false }
  if (versaoEsperada !== versaoAtual) {
    return {
      conflito: true,
      mensagem: 'Esta campanha foi alterada por outra pessoa. Atualize a página antes de salvar novamente.',
    }
  }
  return { conflito: false }
}

/** Verifica que todos os produto_ids pertencem ao conjunto permitido (loja). */
export function produtosPertencemALoja(
  produtosIds: string[],
  produtosValidos: Set<string>
): boolean {
  return produtosIds.every(id => produtosValidos.has(id))
}

/** Verifica que todos os perfil_ids são membros ativos da loja. */
export function participantesPertencemALoja(
  perfisIds: string[],
  membrosValidos: Set<string>
): boolean {
  return perfisIds.every(id => membrosValidos.has(id))
}
