'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolverOuCriarProduto } from '@/lib/produtos/resolver'
import { normalizarNomePessoa, normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'
import { getAppContext } from '@/lib/app/contexto'
import type { RegistroListaEspera } from './ListaEsperaCards'

const LISTA_PAGE_SIZE = 50

export async function carregarMaisListaEspera(cursor: string): Promise<{
  registros: RegistroListaEspera[]
  nextCursor: string | null
}> {
  const appCtx = await getAppContext()
  if (!appCtx || !appCtx.hasMembros) return { registros: [], nextCursor: null }

  const { ctx } = appCtx
  const admin = createAdminClient()
  const offset = parseInt(cursor, 10) || 0
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))

  const { data } = await admin
    .from('lista_espera')
    .select('id, cliente_nome, cliente_whatsapp, produto_nome, produto_id, categoria_id, categoria_nome, valor_potencial, quantidade, status, observacao, criado_em, data_registro, vendedora_id, loja_id')
    .in('loja_id', ctx.lojaIds)
    .order('criado_em', { ascending: false })
    .range(offset, offset + LISTA_PAGE_SIZE - 1)

  const items = data ?? []
  const hasMore = items.length === LISTA_PAGE_SIZE

  const vendedoraIds = [...new Set(items.map(r => r.vendedora_id as string).filter(Boolean))]
  const nomeMap: Record<string, string> = {}
  if (vendedoraIds.length > 0) {
    const { data: perfisData } = await admin
      .from('perfis')
      .select('id, nome')
      .in('id', vendedoraIds)
    for (const p of perfisData ?? []) nomeMap[p.id as string] = p.nome as string
  }

  const registros: RegistroListaEspera[] = items.map(r => ({
    id: r.id as string,
    loja_id: r.loja_id as string,
    cliente_nome: r.cliente_nome as string,
    cliente_whatsapp: r.cliente_whatsapp as string,
    produto_nome: r.produto_nome as string,
    produto_id: r.produto_id as string | null,
    categoria_nome: r.categoria_nome as string | null,
    valor_potencial: r.valor_potencial as number | null,
    quantidade: (r.quantidade as number) ?? 1,
    status: r.status as string,
    observacao: r.observacao as string | null,
    criado_em: r.criado_em as string,
    data_registro: (r as unknown as { data_registro: string | null }).data_registro ?? null,
    vendedora_id: r.vendedora_id as string | null,
    vendedora_nome: nomeMap[r.vendedora_id as string] ?? '—',
    loja_nome: mostrarLoja ? (lojaNomeMap.get(r.loja_id as string) ?? '') : undefined,
  }))

  return {
    registros,
    nextCursor: hasMore ? String(offset + LISTA_PAGE_SIZE) : null,
  }
}

export type StatusListaEspera =
  | 'aguardando'
  | 'encontrado_outra_loja'
  | 'avisado'
  | 'convertido'
  | 'perdido'

export async function buscarClienteListaEspera(
  whatsapp: string,
  loja_id: string
): Promise<{ id: string; nome: string } | null> {
  const normalizado = whatsapp.replace(/\D/g, '')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('loja_id', loja_id)
    .eq('whatsapp', normalizado)
    .maybeSingle()
  if (error || !data) return null
  return { id: data.id as string, nome: data.nome as string }
}

async function resolverProdutoId(produtoNome: string, lojaId: string): Promise<string> {
  const { id } = await resolverOuCriarProduto(produtoNome, lojaId, {
    recorrente: false,
    comissionavel_recompra: false,
  })
  return id
}

export interface CriarListaEsperaInput {
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  categoria_id?: string
  valor_potencial?: number | null
  quantidade: number
  observacao?: string
  vendedora_id: string
  data_registro: string
}

export async function criarListaEspera(
  input: CriarListaEsperaInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  const whatsappDigits = input.cliente_whatsapp.replace(/\D/g, '')

  let clienteId: string | null = null
  const { data: clienteData } = await supabase
    .from('clientes')
    .upsert(
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: normalizarNomePessoa(input.cliente_nome) },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  clienteId = clienteData?.id ?? null

  let produtoId: string
  try {
    produtoId = await resolverProdutoId(input.produto_nome, input.loja_id)
  } catch {
    return { ok: false, error: 'Não foi possível criar ou vincular o produto. Tente novamente.' }
  }

  const { error } = await supabase.from('lista_espera').insert({
    loja_id: input.loja_id,
    cliente_id: clienteId,
    cliente_nome: normalizarNomePessoa(input.cliente_nome),
    cliente_whatsapp: whatsappDigits,
    produto_nome: normalizarNomeProduto(input.produto_nome),
    produto_id: produtoId,
    categoria_id: input.categoria_id || null,
    valor_potencial: input.valor_potencial ?? null,
    quantidade: input.quantidade,
    observacao: input.observacao?.trim() || null,
    vendedora_id: input.vendedora_id,
    data_registro: input.data_registro,
    status: 'aguardando',
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/lista-espera')
  return { ok: true }
}

export interface EditarListaEsperaInput {
  id: string
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  valor_potencial?: number | null
  quantidade: number
  observacao?: string
  vendedora_id: string
  status: StatusListaEspera
  data_registro: string
}

export async function editarListaEspera(
  input: EditarListaEsperaInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  // Validate item belongs to this loja
  const { data: item } = await supabase
    .from('lista_espera')
    .select('id')
    .eq('id', input.id)
    .eq('loja_id', input.loja_id)
    .maybeSingle()
  if (!item) return { ok: false, error: 'Item não encontrado ou sem permissão.' }

  // Validate vendedora belongs to same loja
  const { data: vendedoraMembro } = await supabase
    .from('membros_loja')
    .select('id')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', input.vendedora_id)
    .eq('ativo', true)
    .maybeSingle()
  if (!vendedoraMembro) return { ok: false, error: 'Vendedora não pertence a esta loja.' }

  const whatsappDigits = input.cliente_whatsapp.replace(/\D/g, '')

  let clienteId: string | null = null
  const { data: clienteData } = await supabase
    .from('clientes')
    .upsert(
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: normalizarNomePessoa(input.cliente_nome) },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  clienteId = clienteData?.id ?? null

  let produtoId: string
  try {
    produtoId = await resolverProdutoId(input.produto_nome, input.loja_id)
  } catch {
    return { ok: false, error: 'Não foi possível criar ou vincular o produto. Tente novamente.' }
  }

  let vendaId: string | null = null
  if (input.status === 'convertido') {
    vendaId = await processarConversaoVenda(
      input.id,
      input.status,
      input.vendedora_id,
      input.cliente_nome,
      input.cliente_whatsapp,
      input.produto_nome,
      produtoId,
      input.valor_potencial,
      input.quantidade
    )
    if (!vendaId) {
      return { ok: false, error: 'Não foi possível converter em venda.' }
    }
  }

  const updatePayload: any = {
    cliente_id: clienteId,
    cliente_nome: normalizarNomePessoa(input.cliente_nome),
    cliente_whatsapp: whatsappDigits,
    produto_nome: normalizarNomeProduto(input.produto_nome),
    produto_id: produtoId,
    valor_potencial: input.valor_potencial ?? null,
    quantidade: input.quantidade,
    observacao: input.observacao?.trim() || null,
    vendedora_id: input.vendedora_id,
    data_registro: input.data_registro,
    status: input.status,
    atualizado_em: new Date().toISOString(),
  }
  if (vendaId) {
    updatePayload.venda_id = vendaId
  }

  const { error } = await supabase
    .from('lista_espera')
    .update(updatePayload)
    .eq('id', input.id)
    .eq('loja_id', input.loja_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

async function processarConversaoVenda(
  itemId: string,
  status: StatusListaEspera,
  vendedoraIdInput?: string,
  clienteNomeInput?: string,
  clienteWhatsappInput?: string,
  produtoNomeInput?: string,
  produtoIdInput?: string,
  valorPotencialInput?: number | null,
  quantidadeInput?: number,
  responsavelVendaId?: string
): Promise<string | null> {
  if (status !== 'convertido') return null

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: item } = await supabase
    .from('lista_espera')
    .select('id, loja_id, cliente_id, cliente_nome, cliente_whatsapp, produto_id, produto_nome, valor_potencial, quantidade, vendedora_id, venda_id')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) return null
  if (item.venda_id) return item.venda_id

  const loja_id = item.loja_id

  // Choose responsible:
  // 1. Use responsavelVendaId if provided and active in the store
  // 2. Fallback to vendedoraIdInput (if set in edit form)
  // 3. Fallback to item.vendedora_id (default seller)
  let vendedora_id = vendedoraIdInput ?? item.vendedora_id
  if (responsavelVendaId) {
    const { data: membroAtivo } = await admin
      .from('membros_loja')
      .select('id')
      .eq('loja_id', loja_id)
      .eq('perfil_id', responsavelVendaId)
      .eq('ativo', true)
      .maybeSingle()
    if (membroAtivo) {
      vendedora_id = responsavelVendaId
    }
  }

  const cliente_nome = (clienteNomeInput ?? item.cliente_nome ?? 'Cliente').trim()
  const cliente_whatsapp = (clienteWhatsappInput ?? item.cliente_whatsapp ?? '').replace(/\D/g, '')
  const produto_nome = (produtoNomeInput ?? item.produto_nome ?? 'Produto').trim()
  const valor_potencial = valorPotencialInput !== undefined ? valorPotencialInput : item.valor_potencial
  const quantidade = quantidadeInput !== undefined ? quantidadeInput : (item.quantidade ?? 1)

  let finalClienteId = item.cliente_id
  const { data: clienteData } = await admin
    .from('clientes')
    .upsert(
      { loja_id, whatsapp: cliente_whatsapp, nome: cliente_nome },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  if (clienteData) {
    finalClienteId = clienteData.id
  }

  let finalProdutoId = produtoIdInput ?? item.produto_id
  if (!finalProdutoId) {
    try {
      const info = await resolverOuCriarProduto(produto_nome, loja_id, {
        recorrente: false,
        comissionavel_recompra: false,
      })
      finalProdutoId = info.id
    } catch {
      // ignore
    }
  }

  const valPot = valor_potencial ? Number(valor_potencial) : 0
  const valorTotal = valPot * quantidade

  const { data: vendaData } = await admin
    .from('vendas')
    .insert({
      loja_id,
      cliente_id: finalClienteId,
      vendedora_id,
      valor: valorTotal,
      data_compra: new Date().toISOString().split('T')[0],
      origem: 'lista_espera',
    })
    .select('id')
    .single()

  if (!vendaData) return null
  const newVendaId = vendaData.id

  await admin.from('itens_venda').insert({
    venda_id: newVendaId,
    produto_id: finalProdutoId,
    produto_nome: produto_nome,
    recorrente: false,
    comissionavel: false,
    quantidade,
    valor_unitario: valPot,
    subtotal: valorTotal,
  })

  const { gravarComissaoVenda } = await import('@/lib/comissoes/gravar')
  await gravarComissaoVenda({
    loja_id,
    venda_id: newVendaId,
    vendedora_id,
    data_venda: new Date().toISOString().split('T')[0],
    itens: [{
      produto_id: finalProdutoId,
      produto_nome,
      subtotal: valorTotal,
      comissionavel: false,
    }],
  })

  return newVendaId
}

export async function buscarMembrosAtivosLoja(lojaId: string): Promise<Array<{ id: string; nome: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: membroLogado } = await admin
    .from('membros_loja')
    .select('id')
    .eq('loja_id', lojaId)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membroLogado) return []

  const { data: membros } = await admin
    .from('membros_loja')
    .select('perfil_id, perfis(id, nome)')
    .eq('loja_id', lojaId)
    .eq('ativo', true)

  return (membros ?? []).map(m => {
    const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
    const perfil = Array.isArray(p) ? p[0] : p
    return { id: m.perfil_id as string, nome: perfil?.nome ?? 'Sem nome' }
  })
}

export async function atualizarStatusListaEspera(
  id: string,
  status: StatusListaEspera,
  responsavelVendaId?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: item } = await supabase
    .from('lista_espera')
    .select('loja_id, vendedora_id')
    .eq('id', id)
    .maybeSingle()
  if (!item) return { ok: false, error: 'Item não encontrado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', item.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  let vendaId: string | null = null
  if (status === 'convertido') {
    vendaId = await processarConversaoVenda(id, status, undefined, undefined, undefined, undefined, undefined, undefined, undefined, responsavelVendaId)
    if (!vendaId) {
      return { ok: false, error: 'Não foi possível converter em venda.' }
    }
  }

  const updatePayload: any = {
    status,
    atualizado_em: new Date().toISOString(),
  }
  if (vendaId) {
    updatePayload.venda_id = vendaId
  }

  const { error } = await supabase
    .from('lista_espera')
    .update(updatePayload)
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
