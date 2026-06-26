'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolverOuCriarProduto } from '@/lib/produtos/resolver'

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
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: input.cliente_nome.trim() },
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
    cliente_nome: input.cliente_nome.trim(),
    cliente_whatsapp: whatsappDigits,
    produto_nome: input.produto_nome.trim(),
    produto_id: produtoId,
    categoria_id: input.categoria_id || null,
    valor_potencial: input.valor_potencial ?? null,
    quantidade: input.quantidade,
    observacao: input.observacao?.trim() || null,
    vendedora_id: input.vendedora_id,
    status: 'aguardando',
  })
  if (error) return { ok: false, error: error.message }
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
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: input.cliente_nome.trim() },
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

  const { error } = await supabase
    .from('lista_espera')
    .update({
      cliente_id: clienteId,
      cliente_nome: input.cliente_nome.trim(),
      cliente_whatsapp: whatsappDigits,
      produto_nome: input.produto_nome.trim(),
      produto_id: produtoId,
      valor_potencial: input.valor_potencial ?? null,
      quantidade: input.quantidade,
      observacao: input.observacao?.trim() || null,
      vendedora_id: input.vendedora_id,
      status: input.status,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('loja_id', input.loja_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function atualizarStatusListaEspera(
  id: string,
  status: StatusListaEspera
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lista_espera')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
