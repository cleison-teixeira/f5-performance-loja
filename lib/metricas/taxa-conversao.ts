import type { SupabaseClient } from '@supabase/supabase-js'

export interface TaxaConversaoRecompra {
  elegiveis: number
  convertidas: number
  taxa: number
}

/**
 * Taxa de recompra do mês: recompras fechadas / (recompras fechadas + perdas do mês).
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
      .gte('criado_em', inicioMes),
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
 * Taxa de recompra geral: vendas elegíveis (ciclo vencido, 90 dias) que geraram recompra real.
 * Usada no Dashboard (/dashboard).
 *
 * Denominador: vendas registradas nos últimos 90 dias com pelo menos um item recorrente
 *              cujo ciclo já venceu (data_compra + ciclo_recompra_dias <= hoje).
 * Numerador: dentre essas, quantas geraram uma recompra real via recompras.venda_original_id.
 */
export async function calcularTaxaRecompraGeral(
  lojaIds: string[],
  admin: SupabaseClient,
  hoje: string
): Promise<TaxaConversaoRecompra> {
  if (lojaIds.length === 0) return { elegiveis: 0, convertidas: 0, taxa: 0 }

  const d90 = new Date(hoje + 'T12:00:00')
  d90.setDate(d90.getDate() - 90)
  const dataInicio = d90.toISOString().split('T')[0]

  const { data: vendasData } = await admin
    .from('vendas')
    .select('id, data_compra')
    .in('loja_id', lojaIds)
    .gte('data_compra', dataInicio)

  const vendaIds = (vendasData ?? []).map(v => v.id as string)
  if (vendaIds.length === 0) return { elegiveis: 0, convertidas: 0, taxa: 0 }

  const { data: itensData } = await admin
    .from('itens_venda')
    .select('venda_id, ciclo_recompra_dias')
    .in('venda_id', vendaIds)
    .eq('recorrente', true)

  const dataCompraMap = new Map<string, string>()
  for (const v of vendasData ?? []) {
    if (v.data_compra) dataCompraMap.set(v.id as string, v.data_compra as string)
  }

  const vendaIdsElegiveis = new Set<string>()
  for (const item of itensData ?? []) {
    const dataCompra = dataCompraMap.get(item.venda_id as string)
    if (!dataCompra) continue
    const ciclo = (item.ciclo_recompra_dias as number | null) ?? 30
    const venc = new Date(dataCompra + 'T12:00:00')
    venc.setDate(venc.getDate() + ciclo)
    if (venc.toISOString().split('T')[0] <= hoje) {
      vendaIdsElegiveis.add(item.venda_id as string)
    }
  }

  const elegiveis = vendaIdsElegiveis.size
  if (elegiveis === 0) return { elegiveis: 0, convertidas: 0, taxa: 0 }

  const { data: recomprasData } = await admin
    .from('recompras')
    .select('venda_original_id')
    .in('loja_id', lojaIds)
    .in('venda_original_id', [...vendaIdsElegiveis])

  const convertidas = new Set(
    (recomprasData ?? []).map(r => r.venda_original_id as string)
  ).size

  return {
    elegiveis,
    convertidas,
    taxa: Math.round((convertidas / elegiveis) * 100),
  }
}
