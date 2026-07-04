'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'
import type { ClienteItem } from './ClientesLista'

const PAGE_SIZE = 50

export async function carregarMaisClientes(cursor: string): Promise<{
  clientes: ClienteItem[]
  nextCursor: string | null
}> {
  const appCtx = await getAppContext()
  if (!appCtx || !appCtx.hasMembros) return { clientes: [], nextCursor: null }

  const { ctx } = appCtx
  const admin = createAdminClient()
  const offset = parseInt(cursor, 10) || 0
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))

  const clientesRes = await admin
    .from('clientes')
    .select('id, nome, whatsapp, criado_em, loja_id')
    .in('loja_id', ctx.lojaIds)
    .order('nome')
    .range(offset, offset + PAGE_SIZE - 1)

  const items = clientesRes.data ?? []
  const hasMore = items.length === PAGE_SIZE

  const clienteIds = items.map(c => c.id as string)
  const vendasRes = clienteIds.length > 0
    ? await admin
        .from('vendas')
        .select('cliente_id, valor, data_compra')
        .in('cliente_id', clienteIds)
        .order('data_compra', { ascending: false })
    : { data: [] }

  type VendaStats = { qtd: number; total: number; ultima: string }
  const vendasPorCliente: Record<string, VendaStats> = {}
  for (const v of vendasRes.data ?? []) {
    const cid = v.cliente_id as string | null
    if (!cid) continue
    if (!vendasPorCliente[cid]) {
      vendasPorCliente[cid] = { qtd: 0, total: 0, ultima: v.data_compra as string }
    }
    vendasPorCliente[cid].qtd++
    vendasPorCliente[cid].total += (v.valor as number) ?? 0
  }

  const clientes: ClienteItem[] = items.map(c => {
    const stats = vendasPorCliente[c.id as string]
    return {
      id: c.id as string,
      nome: c.nome as string,
      whatsapp: c.whatsapp as string,
      criado_em: c.criado_em as string,
      qtd: stats?.qtd ?? 0,
      total: stats?.total ?? 0,
      ultima: stats?.ultima ?? null,
      loja_nome: mostrarLoja ? (lojaNomeMap.get(c.loja_id as string) ?? '') : null,
    }
  })

  return {
    clientes,
    nextCursor: hasMore ? String(offset + PAGE_SIZE) : null,
  }
}
