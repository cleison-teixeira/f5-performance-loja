'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'
import type { ProdutoCard } from './ProdutosLista'

const PAGE_SIZE = 50

type ProdutoRaw = {
  id: string
  nome: string
  preco_sugerido: number | null
  foto_url: string | null
  recorrente: boolean
  qtd_mensagens: number | null
  loja_id: string
  nicho: string | null
  parceiro: string | null
  categoria: string | null
  galeria_urls: string[] | null
  variantes: string[] | null
  mensagens_produto: Array<{ tipo: string; dias_apos_venda: number }>
}

export async function carregarMaisProdutos(cursor: string): Promise<{
  lista: ProdutoCard[]
  nextCursor: string | null
}> {
  const appCtx = await getAppContext()
  if (!appCtx || !appCtx.hasMembros) return { lista: [], nextCursor: null }

  const { ctx } = appCtx
  const admin = createAdminClient()
  const offset = parseInt(cursor, 10) || 0
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))

  const { data } = await admin
    .from('produtos')
    .select('id, nome, preco_sugerido, foto_url, recorrente, qtd_mensagens, loja_id, nicho, parceiro, categoria, galeria_urls, variantes, mensagens_produto(tipo, dias_apos_venda)')
    .in('loja_id', ctx.lojaIds)
    .eq('ativo', true)
    .order('nome')
    .range(offset, offset + PAGE_SIZE - 1)

  const items = (data ?? []) as unknown as ProdutoRaw[]
  const hasMore = items.length === PAGE_SIZE

  const lista: ProdutoCard[] = items.map(p => ({
    ...p,
    lojaNome: mostrarLoja ? (lojaNomeMap.get(p.loja_id) ?? '') : null,
  }))

  return {
    lista,
    nextCursor: hasMore ? String(offset + PAGE_SIZE) : null,
  }
}
