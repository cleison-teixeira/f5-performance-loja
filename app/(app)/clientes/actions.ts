'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'
import { normalizarNomePessoa } from '@/lib/utils/normalizacao-texto'
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
    .select('id, nome, whatsapp, observacao, criado_em, loja_id, nao_contatar')
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
      observacao: (c as unknown as { observacao: string | null }).observacao ?? null,
      criado_em: c.criado_em as string,
      qtd: stats?.qtd ?? 0,
      total: stats?.total ?? 0,
      ultima: stats?.ultima ?? null,
      loja_nome: mostrarLoja ? (lojaNomeMap.get(c.loja_id as string) ?? '') : null,
      nao_contatar: (c.nao_contatar as boolean) ?? false,
      loja_id: c.loja_id as string,
    }
  })

  return {
    clientes,
    nextCursor: hasMore ? String(offset + PAGE_SIZE) : null,
  }
}

export async function editarCliente(dados: {
  cliente_id: string
  loja_id: string
  nome: string
  whatsapp: string
  observacao: string | null
}): Promise<{ ok: boolean; erro?: string }> {
  const appCtx = await getAppContext()
  if (!appCtx || !appCtx.hasMembros) return { ok: false, erro: 'Sem acesso.' }

  const { ctx } = appCtx
  if (!ctx.lojaIds.includes(dados.loja_id)) return { ok: false, erro: 'Acesso negado à loja.' }

  const nomeTrimado = dados.nome.trim()
  if (nomeTrimado.length < 2) return { ok: false, erro: 'O nome deve ter pelo menos 2 caracteres.' }

  const whatsappNormalizado = dados.whatsapp.replace(/\D/g, '')
  if (whatsappNormalizado.length < 10) return { ok: false, erro: 'WhatsApp inválido. Informe DDD + número.' }

  const admin = createAdminClient()

  const { data: duplicado } = await admin
    .from('clientes')
    .select('id')
    .eq('loja_id', dados.loja_id)
    .eq('whatsapp', whatsappNormalizado)
    .neq('id', dados.cliente_id)
    .maybeSingle()

  if (duplicado) return { ok: false, erro: 'Já existe outro cliente nesta loja com este WhatsApp.' }

  const { error: errCliente } = await admin
    .from('clientes')
    .update({
      nome: normalizarNomePessoa(nomeTrimado),
      whatsapp: whatsappNormalizado,
      observacao: dados.observacao?.trim() || null,
    })
    .eq('id', dados.cliente_id)
    .eq('loja_id', dados.loja_id)

  if (errCliente) return { ok: false, erro: errCliente.message }

  await admin
    .from('lista_espera')
    .update({ cliente_whatsapp: whatsappNormalizado })
    .eq('cliente_id', dados.cliente_id)
    .in('loja_id', ctx.lojaIds)
    .in('status', ['aguardando', 'encontrado_outra_loja', 'avisado'])

  return { ok: true }
}
