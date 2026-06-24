export type StatusCanonicoOportunidade =
  | 'aberta'
  | 'contato_feito'
  | 'reagendada'
  | 'convertida'
  | 'perdida'

// Legacy status values from before canonical status was introduced
type StatusLegado = 'pendente' | 'enviado' | 'ignorado'

type StatusQualquer = StatusCanonicoOportunidade | StatusLegado | string

interface AvisoComStatus {
  status: StatusQualquer
  recompra_id?: string | null
}

export function normalizarStatusOportunidade(aviso: AvisoComStatus): StatusCanonicoOportunidade {
  const s = aviso.status
  if (s === 'pendente' || s === 'aberta') return 'aberta'
  if (s === 'contato_feito') return 'contato_feito'
  if (s === 'reagendada') return 'reagendada'
  if (s === 'convertida') return 'convertida'
  if (s === 'perdida' || s === 'ignorado') return 'perdida'
  // Legacy 'enviado': if linked to a recompra it's converted, otherwise contato made
  if (s === 'enviado') return aviso.recompra_id ? 'convertida' : 'contato_feito'
  return 'aberta'
}

export function isOportunidadeAtiva(aviso: AvisoComStatus): boolean {
  const s = normalizarStatusOportunidade(aviso)
  return s === 'aberta' || s === 'contato_feito' || s === 'reagendada'
}

export function isOportunidadeConvertida(aviso: AvisoComStatus): boolean {
  return normalizarStatusOportunidade(aviso) === 'convertida'
}

export function isOportunidadePerdida(aviso: AvisoComStatus): boolean {
  return normalizarStatusOportunidade(aviso) === 'perdida'
}

export function isOportunidadeEncerrada(aviso: AvisoComStatus): boolean {
  const s = normalizarStatusOportunidade(aviso)
  return s === 'convertida' || s === 'perdida'
}

// PostgREST filter string for all active (non-closed) opportunities
// Handles legacy 'enviado' without recompra_id as active (contato_feito semantics)
export const FILTRO_ATIVAS_POSTGREST =
  'status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)'
