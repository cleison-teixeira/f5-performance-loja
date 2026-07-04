'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'
import type { AvisoDetalhado } from '@/app/(app)/avisos/types'

const PAGE_SIZE = 50

export async function carregarMaisRelacionamento(cursor: string): Promise<{
  avisos: AvisoDetalhado[]
  nextCursor: string | null
}> {
  const appCtx = await getAppContext()
  if (!appCtx || !appCtx.hasMembros) return { avisos: [], nextCursor: null }

  const { ctx } = appCtx
  const admin = createAdminClient()
  const offset = parseInt(cursor, 10) || 0
  const hoje = new Date().toISOString().split('T')[0]
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))

  const [avisosRes, membrosRes] = await Promise.all([
    admin
      .from('avisos')
      .select(`
        id, loja_id, data_aviso, status, recompra_id, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao,
        clientes(nome, whatsapp),
        mensagens_produto(tipo),
        itens_venda(produto_nome, produto_id, subtotal, produtos(foto_url, galeria_urls)),
        vendas(valor)
      `)
      .in('loja_id', ctx.lojaIds)
      .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
      .order('data_aviso', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1),
    admin
      .from('membros_loja')
      .select('perfil_id, perfis(nome)')
      .in('loja_id', ctx.lojaIds)
      .eq('ativo', true),
  ])

  const vendedoraNomeMap = new Map<string, string>()
  for (const m of membrosRes.data ?? []) {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfil = Array.isArray(p) ? p[0] : p
    if (perfil?.nome) vendedoraNomeMap.set(m.perfil_id as string, perfil.nome)
  }

  const avisosRaw = avisosRes.data ?? []
  const hasMore = avisosRaw.length === PAGE_SIZE

  const avisos: AvisoDetalhado[] = avisosRaw.filter(a => {
    const mp = a.mensagens_produto as unknown as { tipo: string } | null
    const tipo = mp?.tipo ?? ''
    const status = a.status as string
    const isContatoFeito = status === 'contato_feito' || (status === 'enviado' && !(a as unknown as { recompra_id: string | null }).recompra_id)
    return (tipo === 'agradecimento' || tipo === 'relacionamento') && !isContatoFeito
  }).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as {
      produto_nome: string; produto_id: string | null; subtotal: number | null
      produtos: { foto_url: string | null; galeria_urls: string[] | null } | Array<{ foto_url: string | null; galeria_urls: string[] | null }> | null
    } | null
    const produtosRaw = itemVenda?.produtos
    const produtoFoto = Array.isArray(produtosRaw) ? produtosRaw[0] : produtosRaw
    const venda = a.vendas as unknown as { valor: number } | null
    const avisoLojaId = a.loja_id as string

    return {
      id: a.id as string,
      data_aviso: a.data_aviso as string,
      status: a.status as AvisoDetalhado['status'],
      recompra_id: (a as unknown as { recompra_id: string | null }).recompra_id ?? null,
      texto_renderizado: a.texto_renderizado as string,
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      cliente_id: a.cliente_id as string,
      produto_nome: itemVenda?.produto_nome ?? 'Produto',
      produto_id: itemVenda?.produto_id ?? null,
      produto_foto_url: produtoFoto?.foto_url || produtoFoto?.galeria_urls?.[0] || null,
      tipo: (mensagem?.tipo ?? 'agradecimento') as AvisoDetalhado['tipo'],
      valor_venda: venda?.valor ?? 0,
      valor_produto: itemVenda?.subtotal ?? 0,
      previsao_comissao: 0,
      venda_id: a.venda_id as string,
      item_venda_id: (a.item_venda_id as string | null) ?? null,
      data_compra: '',
      observacao_resultado: null,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? '',
      atrasado: a.data_aviso < hoje,
      loja_id: avisoLojaId,
      loja_nome: lojaNomeMap.get(avisoLojaId) ?? '',
    }
  })

  return {
    avisos,
    nextCursor: hasMore ? String(offset + PAGE_SIZE) : null,
  }
}
