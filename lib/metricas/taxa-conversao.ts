import type { SupabaseClient } from '@supabase/supabase-js'

export interface TaxaConversaoRecompra {
  elegiveis: number
  convertidas: number
  taxa: number
}

/**
 * Taxa de recompra do mês: recompras reais / (recompras reais + perdas) no mês atual.
 * Recompra real = registro em `recompras` com venda_id IS NOT NULL (criada pela action confirmarRecompra).
 * Usada na Fila de Recompra (/avisos).
 */
export async function calcularTaxaRecompraMes(
  lojaIds: string[],
  admin: SupabaseClient,
  inicioMes: string
): Promise<TaxaConversaoRecompra> {
  if (lojaIds.length === 0) return { elegiveis: 0, convertidas: 0, taxa: 0 }

  const [recomprasRes, perdasRes] = await Promise.all([
    admin
      .from('recompras')
      .select('id', { count: 'exact', head: true })
      .in('loja_id', lojaIds)
      .gte('criado_em', inicioMes)
      .not('venda_id', 'is', null),
    admin
      .from('avisos')
      .select('id', { count: 'exact', head: true })
      .in('loja_id', lojaIds)
      .eq('status', 'perdida')
      .gte('encerrado_em', inicioMes),
  ])

  const recuperadas = recomprasRes.count ?? 0
  const perdidas = perdasRes.count ?? 0
  const total = recuperadas + perdidas

  return {
    elegiveis: total,
    convertidas: recuperadas,
    taxa: total === 0 ? 0 : Math.round((recuperadas / total) * 100),
  }
}

/**
 * Taxa de recompra 90 dias: recompras reais / (recompras reais + perdas) nos últimos 90 dias.
 * Recompra real = registro em `recompras` com venda_id IS NOT NULL (criada pela action confirmarRecompra).
 * Usada no Dashboard (/dashboard).
 */
export async function calcularTaxaRecompraGeral(
  lojaIds: string[],
  admin: SupabaseClient,
  hoje: string
): Promise<TaxaConversaoRecompra> {
  if (lojaIds.length === 0) return { elegiveis: 0, convertidas: 0, taxa: 0 }

  const d90 = new Date(hoje + 'T12:00:00')
  d90.setDate(d90.getDate() - 90)
  const dataInicio90 = d90.toISOString().split('T')[0]

  const [recomprasRes, perdasRes] = await Promise.all([
    admin
      .from('recompras')
      .select('id', { count: 'exact', head: true })
      .in('loja_id', lojaIds)
      .gte('criado_em', dataInicio90)
      .not('venda_id', 'is', null),
    admin
      .from('avisos')
      .select('id', { count: 'exact', head: true })
      .in('loja_id', lojaIds)
      .eq('status', 'perdida')
      .gte('encerrado_em', dataInicio90),
  ])

  const recuperadas = recomprasRes.count ?? 0
  const perdidas = perdasRes.count ?? 0
  const total = recuperadas + perdidas

  return {
    elegiveis: total,
    convertidas: recuperadas,
    taxa: total === 0 ? 0 : Math.round((recuperadas / total) * 100),
  }
}
