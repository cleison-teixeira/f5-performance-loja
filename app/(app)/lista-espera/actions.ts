'use server'

import { createClient } from '@/lib/supabase/server'

export type StatusListaEspera =
  | 'aguardando'
  | 'encontrado_outra_loja'
  | 'avisado'
  | 'convertido'
  | 'perdido'

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
  const { error } = await supabase.from('lista_espera').insert({
    loja_id: input.loja_id,
    cliente_nome: input.cliente_nome.trim(),
    cliente_whatsapp: input.cliente_whatsapp.replace(/\D/g, ''),
    produto_nome: input.produto_nome.trim(),
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
