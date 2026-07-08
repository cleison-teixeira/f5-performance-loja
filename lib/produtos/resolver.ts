import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarNome } from '@/lib/normalizar-nome'
import { normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP } from '@/lib/mensagens/templates_padrao'

export interface ProdutoResolvido {
  id: string
  nome: string
  qtd_mensagens: number
}

// Busca produto por nome normalizado (find-or-create) com dedup.
// Sempre usa admin client para contornar RLS do INSERT em produtos.
export async function resolverOuCriarProduto(
  nome: string,
  lojaId: string,
  opts: { recorrente?: boolean; comissionavel_recompra?: boolean } = {}
): Promise<ProdutoResolvido> {
  const admin = createAdminClient()
  const norm = normalizarNome(nome)

  const { data: produtosLoja } = await admin
    .from('produtos')
    .select('id, nome, qtd_mensagens')
    .eq('loja_id', lojaId)
    .eq('ativo', true)

  const existente = (produtosLoja ?? []).find(
    p => normalizarNome(p.nome as string) === norm
  )
  if (existente) {
    return {
      id: existente.id as string,
      nome: existente.nome as string,
      qtd_mensagens: (existente as unknown as { qtd_mensagens: number }).qtd_mensagens ?? 3,
    }
  }

  const isRecorrente = opts.recorrente ?? false
  const { data: novo, error } = await admin
    .from('produtos')
    .insert({
      loja_id: lojaId,
      nome: normalizarNomeProduto(nome),
      recorrente: isRecorrente,
      comissionavel_recompra: opts.comissionavel_recompra ?? false,
      ...(isRecorrente ? { qtd_mensagens: 5 } : {}),
    })
    .select('id, nome, qtd_mensagens')
    .single()

  if (error || !novo) throw new Error('Falha ao criar produto: ' + (error?.message ?? ''))

  if (isRecorrente) {
    const todosPadroes = [...TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP]
    await admin.from('mensagens_produto').insert(
      todosPadroes.map(t => ({ produto_id: novo.id as string, ...t }))
    )
  }

  return {
    id: novo.id as string,
    nome: novo.nome as string,
    qtd_mensagens: (novo as unknown as { qtd_mensagens: number }).qtd_mensagens ?? 3,
  }
}
