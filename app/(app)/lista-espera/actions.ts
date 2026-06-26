'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarNome } from '@/lib/normalizar-nome'

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
  const admin = createAdminClient()
  const norm = normalizarNome(produtoNome)

  const { data: produtosLoja } = await admin
    .from('produtos')
    .select('id, nome')
    .eq('loja_id', lojaId)
    .eq('ativo', true)

  const existente = (produtosLoja ?? []).find(
    p => normalizarNome(p.nome as string) === norm
  )
  if (existente) return existente.id as string

  const { data: novo, error } = await admin
    .from('produtos')
    .insert({
      loja_id: lojaId,
      nome: produtoNome.trim(),
      recorrente: false,
      comissionavel_recompra: false,
    })
    .select('id')
    .single()

  if (error || !novo) throw new Error('Falha ao criar produto: ' + (error?.message ?? ''))
  return novo.id as string
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
