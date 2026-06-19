'use server'
import { createClient } from '@/lib/supabase/server'

export async function salvarComissao(dados: {
  loja_id: string
  vendedora_id: string
  percentual: number
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('regras_comissao')
      .upsert(
        { loja_id: dados.loja_id, vendedora_id: dados.vendedora_id, percentual: dados.percentual, ativo: true },
        { onConflict: 'loja_id,vendedora_id' }
      )
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function salvarMetaMensal(dados: {
  loja_id: string
  vendedora_id: string
  mes: string
  valor_meta: number
  comissao_base: number
  comissao_meta: number
  multiplicador: number | null
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('metas_vendedora')
      .upsert(
        {
          loja_id: dados.loja_id,
          vendedora_id: dados.vendedora_id,
          mes: dados.mes,
          valor_meta: dados.valor_meta,
          comissao_base: dados.comissao_base,
          comissao_meta: dados.comissao_meta,
          multiplicador: dados.multiplicador,
        },
        { onConflict: 'loja_id,vendedora_id,mes' }
      )
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function salvarComissaoFixaProduto(dados: {
  loja_id: string
  produto_id: string
  vendedora_id: string
  valor_fixo: number
}): Promise<{ ok: boolean; erro?: string; id?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comissao_fixa_produto')
      .upsert(
        {
          loja_id: dados.loja_id,
          produto_id: dados.produto_id,
          vendedora_id: dados.vendedora_id,
          valor_fixo: dados.valor_fixo,
          ativo: true,
        },
        { onConflict: 'loja_id,produto_id,vendedora_id' }
      )
      .select('id')
      .single()
    if (error) return { ok: false, erro: error.message }
    return { ok: true, id: data?.id as string }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function atualizarComissaoFixaProduto(dados: {
  id: string
  valor_fixo: number
  ativo: boolean
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('comissao_fixa_produto')
      .update({ valor_fixo: dados.valor_fixo, ativo: dados.ativo })
      .eq('id', dados.id)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function excluirComissaoFixaProduto(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('comissao_fixa_produto')
      .delete()
      .eq('id', id)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
