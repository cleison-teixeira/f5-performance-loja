'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'
import type { VendaExtrato } from './page'

const PAGE_SIZE = 50

export async function carregarMaisVendas(cursor: string): Promise<{
  vendas: VendaExtrato[]
  nextCursor: string | null
}> {
  const appCtx = await getAppContext()
  if (!appCtx || !appCtx.hasMembros) return { vendas: [], nextCursor: null }

  const { user, role: userRole, ctx } = appCtx
  const admin = createAdminClient()
  const offset = parseInt(cursor, 10) || 0
  const isVendedora = userRole === 'vendedora'
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))

  let vendasQuery = admin
    .from('vendas')
    .select(`
      id, valor, criado_em, data_compra, vendedora_id, origem, loja_id,
      clientes(nome, whatsapp),
      perfis!vendas_vendedora_id_fkey(nome),
      itens_venda(produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente),
      comissao_venda(valor_comissao),
      avisos(id)
    `)
    .in('loja_id', ctx.lojaIds)
    .order('data_compra', { ascending: false })
    .order('criado_em', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (isVendedora) {
    vendasQuery = vendasQuery.eq('vendedora_id', user.id)
  }

  const vendasRes = await vendasQuery
  const vendasRaw = vendasRes.data ?? []
  const hasMore = vendasRaw.length === PAGE_SIZE

  const vendas: VendaExtrato[] = vendasRaw.map(v => {
    const clienteRaw = v.clientes as unknown as { nome: string; whatsapp: string } | Array<{ nome: string; whatsapp: string }> | null
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw
    const perfil = v.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    const itensRaw = v.itens_venda as unknown as Array<{
      produto_id: string | null; produto_nome: string; quantidade: number
      valor_unitario: number; subtotal: number; recorrente: boolean
    }> | null
    const avisosArr = v.avisos as unknown as Array<{ id: string }> | null
    const cvRaw = v.comissao_venda as unknown as Array<{ valor_comissao: number }> | { valor_comissao: number } | null
    const cv = Array.isArray(cvRaw) ? cvRaw[0] : cvRaw
    const vendaLojaId = (v as unknown as { loja_id: string }).loja_id

    const itens = (itensRaw ?? []).map(i => ({
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      subtotal: i.subtotal,
      recorrente: i.recorrente ?? false,
    }))

    return {
      id: v.id as string,
      criado_em: v.criado_em as string,
      data_compra: (v as unknown as { data_compra: string }).data_compra ?? (v.criado_em as string).split('T')[0],
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      vendedora_nome: perfilObj?.nome ?? '—',
      vendedora_id: v.vendedora_id as string,
      valor_total: v.valor as number,
      itens,
      tem_recorrente: itens.some(i => i.recorrente),
      valor_comissao: cv?.valor_comissao ?? 0,
      origem: (v as unknown as { origem: string }).origem ?? 'venda_manual',
      qtd_avisos: (avisosArr ?? []).length,
      loja_nome: mostrarLoja ? (lojaNomeMap.get(vendaLojaId) ?? '') : undefined,
    }
  })

  return {
    vendas,
    nextCursor: hasMore ? String(offset + PAGE_SIZE) : null,
  }
}
