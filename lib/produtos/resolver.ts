import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarNome } from '@/lib/normalizar-nome'

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

  const { data: novo, error } = await admin
    .from('produtos')
    .insert({
      loja_id: lojaId,
      nome: nome.trim(),
      recorrente: opts.recorrente ?? false,
      comissionavel_recompra: opts.comissionavel_recompra ?? false,
    })
    .select('id, nome, qtd_mensagens')
    .single()

  if (error || !novo) throw new Error('Falha ao criar produto: ' + (error?.message ?? ''))

  return {
    id: novo.id as string,
    nome: novo.nome as string,
    qtd_mensagens: (novo as unknown as { qtd_mensagens: number }).qtd_mensagens ?? 3,
  }
}
