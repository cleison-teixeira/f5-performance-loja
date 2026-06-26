'use server'
import { createClient } from '@/lib/supabase/server'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA } from '@/lib/mensagens/templates_padrao'

export async function salvarProduto(dados: {
  loja_id: string
  produto_id?: string
  nome: string
  preco_sugerido: number | null
  foto_url: string | null
  ativo: boolean
  recorrente: boolean
  comissionavel_recompra: boolean
  qtd_mensagens: 1 | 2 | 3 | 4
  nicho?: string | null
  parceiro?: string | null
  categoria?: string | null
  galeria_urls?: string[] | null
  variantes?: string[] | null
}): Promise<{ ok: boolean; produto_id?: string; erro?: string }> {
  try {
    const supabase = await createClient()

    let produtoId: string

    if (dados.produto_id) {
      const { error } = await supabase
        .from('produtos')
        .update({
          nome: dados.nome,
          preco_sugerido: dados.preco_sugerido,
          foto_url: dados.foto_url || null,
          ativo: dados.ativo,
          recorrente: dados.recorrente,
          comissionavel_recompra: dados.comissionavel_recompra,
          qtd_mensagens: dados.qtd_mensagens,
          nicho: dados.nicho || null,
          parceiro: dados.parceiro || null,
          categoria: dados.categoria || null,
          galeria_urls: dados.galeria_urls || [],
          variantes: dados.variantes || [],
        })
        .eq('id', dados.produto_id)
      if (error) return { ok: false, erro: error.message }
      produtoId = dados.produto_id
    } else {
      const { data, error } = await supabase
        .from('produtos')
        .insert({
          loja_id: dados.loja_id,
          nome: dados.nome,
          preco_sugerido: dados.preco_sugerido,
          foto_url: dados.foto_url || null,
          ativo: dados.ativo,
          recorrente: dados.recorrente,
          comissionavel_recompra: dados.comissionavel_recompra,
          qtd_mensagens: dados.qtd_mensagens,
          nicho: dados.nicho || null,
          parceiro: dados.parceiro || null,
          categoria: dados.categoria || null,
          galeria_urls: dados.galeria_urls || [],
          variantes: dados.variantes || [],
        })
        .select('id')
        .single()

      if (error || !data) return { ok: false, erro: error?.message ?? 'Erro ao criar produto' }
      produtoId = data.id as string

      // Auto-criar 3 templates padrão para o novo produto
      await supabase.from('mensagens_produto').insert(
        TEMPLATES_PADRAO.map(t => ({ produto_id: produtoId, ...t }))
      )
    }

    // Garantir slot Oferta quando modelo de 4 mensagens está ativo
    if (dados.qtd_mensagens === 4) {
      await supabase
        .from('mensagens_produto')
        .upsert(
          { produto_id: produtoId, ...TEMPLATE_OFERTA },
          { onConflict: 'produto_id,ordem', ignoreDuplicates: true }
        )
    }

    return { ok: true, produto_id: produtoId }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function salvarMensagens(dados: {
  produto_id: string
  mensagens: Array<{
    ordem: 1 | 2 | 3 | 4
    tipo: 'agradecimento' | 'relacionamento' | 'recompra' | 'oferta'
    texto: string
    dias_apos_venda: number
  }>
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()

    const validas = dados.mensagens.filter(m => m.texto.trim().length > 0)
    if (validas.length === 0) return { ok: true }

    const { error } = await supabase
      .from('mensagens_produto')
      .upsert(
        validas.map(m => ({
          produto_id: dados.produto_id,
          ordem: m.ordem,
          tipo: m.tipo,
          texto: m.texto.trim(),
          dias_apos_venda: m.dias_apos_venda,
        })),
        { onConflict: 'produto_id,ordem' }
      )

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function desativarProduto(produto_id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', produto_id)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
