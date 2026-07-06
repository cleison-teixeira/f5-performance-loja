export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AvisosPageClient } from './AvisosPageClient'
import { getAppContext } from '@/lib/app/contexto'
import type { AvisoDetalhado, ItemVendaGrupo } from './types'
import { calcularTaxaRecompraMes } from '@/lib/metricas/taxa-conversao'
import { measureAsync } from '@/lib/performance/timing'

export interface CatalogoProduto {
  id: string
  nome: string
  preco_sugerido: number | null
  comissionavel_recompra: boolean
}

export default async function AvisosPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { user, role: userRole, ctx } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Fila de Recompra</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  // supabase (RLS) necessário para a query de produtos (catálogo)
  const supabase = await createClient()

  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const mostrarLoja = ctx.escopo === 'rede'
  const hoje = new Date().toISOString().split('T')[0]
  const isVendedora = false

  // Fallback loja_id for catalog/recompras queries in single-loja mode
  const lojaIdFallback = ctx.lojaId ?? ctx.lojaIds[0]

  const inicioMes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  const data90DaysAgo = new Date()
  data90DaysAgo.setDate(data90DaysAgo.getDate() - 90)
  const dataInicio90 = data90DaysAgo.toISOString().split('T')[0]

  // Parallelizar: avisos + catalogo + recompras + membros em um único batch
  const [avisosRes, catalogoRes, recomprasRes, membrosRes] = await measureAsync('avisos:queries', () => Promise.all([
    admin
      .from('avisos')
      .select(`
        id, loja_id, data_aviso, status, recompra_id, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao, observacao_resultado,
        clientes(nome, whatsapp),
        mensagens_produto(tipo),
        itens_venda(produto_nome, produto_id, subtotal, produtos(foto_url, galeria_urls)),
        vendas(valor, data_compra)
      `)
      .in('loja_id', ctx.lojaIds)
      .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
      .in('mensagens_produto.tipo', ['recompra', 'oferta', 'follow_up'])
      .gte('data_aviso', dataInicio90)
      .order('data_aviso', { ascending: true })
      .limit(50),
    supabase
      .from('produtos')
      .select('id, nome, preco_sugerido, comissionavel_recompra')
      .in('loja_id', ctx.lojaIds)
      .eq('ativo', true)
      .order('nome'),
    admin
      .from('recompras')
      .select('valor_total')
      .in('loja_id', ctx.lojaIds)
      .gte('criado_em', inicioMes)
      .not('venda_id', 'is', null),
    admin
      .from('membros_loja')
      .select('perfil_id, perfis(nome)')
      .in('loja_id', ctx.lojaIds)
      .eq('ativo', true),
  ]))

  const avisosRaw = avisosRes.data
  const catalogoRaw = catalogoRes.data
  const recomprasData = recomprasRes.data
  const membrosAtivos = membrosRes.data

  const catalogo: CatalogoProduto[] = (catalogoRaw ?? []).map(p => ({
    id: p.id as string,
    nome: p.nome as string,
    preco_sugerido: p.preco_sugerido as number | null,
    comissionavel_recompra: (p as unknown as { comissionavel_recompra: boolean }).comissionavel_recompra ?? true,
  }))

  const totalRecomprasValorMes = (recomprasData ?? []).reduce((s, r) => s + ((r.valor_total as number) ?? 0), 0)
  const qtdRecomprasMes = (recomprasData ?? []).length

  const todosMembrosIds = (membrosAtivos ?? []).map(m => m.perfil_id as string)

  // Percentuais de comissão + nomes
  const vendedoraIds = [...new Set((avisosRaw ?? []).map(a => a.vendedora_id as string).filter(Boolean))]
  const percentuaisPorVendedora: Record<string, number> = {}
  const vendedoraNomeMap = new Map<string, string>()

  for (const m of membrosAtivos ?? []) {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfil = Array.isArray(p) ? p[0] : p
    if (perfil?.nome) vendedoraNomeMap.set(m.perfil_id as string, perfil.nome)
  }

  const allIds = [...new Set([...vendedoraIds, ...todosMembrosIds])]
  if (allIds.length > 0) {
    const regrasRes = await admin
      .from('regras_comissao')
      .select('vendedora_id, percentual')
      .in('vendedora_id', allIds)
      .in('loja_id', ctx.lojaIds)
      .eq('ativo', true)
    for (const r of regrasRes.data ?? []) {
      percentuaisPorVendedora[r.vendedora_id as string] = r.percentual as number
    }
  }

  const vendedorasLoja = (membrosAtivos ?? []).map(m => ({
    id: m.perfil_id as string,
    nome: vendedoraNomeMap.get(m.perfil_id as string) ?? '—',
    percentual: percentuaisPorVendedora[m.perfil_id as string] ?? 0,
  }))

  const avisos: AvisoDetalhado[] = (avisosRaw ?? []).filter(a => {
    const mp = a.mensagens_produto as unknown as { tipo: string } | null
    const tipo = mp?.tipo ?? ''
    return tipo === 'recompra' || tipo === 'oferta' || tipo === 'follow_up'
  }).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as {
      produto_nome: string
      produto_id: string | null
      subtotal: number | null
      produtos: { foto_url: string | null; galeria_urls: string[] | null } | Array<{ foto_url: string | null; galeria_urls: string[] | null }> | null
    } | null
    const produtosRaw = itemVenda?.produtos
    const produtoFoto = Array.isArray(produtosRaw) ? produtosRaw[0] : produtosRaw
    const venda = a.vendas as unknown as { valor: number; data_compra: string | null } | null
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
      previsao_comissao: (a.previsao_comissao as number | null) ?? 0,
      venda_id: a.venda_id as string,
      item_venda_id: (a.item_venda_id as string | null) ?? null,
      data_compra: venda?.data_compra?.slice(0, 10) ?? '',
      observacao_resultado: (a as unknown as { observacao_resultado: string | null }).observacao_resultado ?? null,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? '',
      atrasado: a.data_aviso < hoje,
      loja_id: avisoLojaId,
      loja_nome: lojaNomeMap.get(avisoLojaId) ?? '',
    }
  })

  const taxaConversao = await calcularTaxaRecompraMes(ctx.lojaIds, admin, inicioMes)

  // Fetch all recurrent itens_venda for every unique venda_id that has active avisos
  const vendaIdsUnicos = [...new Set(avisos.map(a => a.venda_id))]
  const itensVendaPorVenda: Record<string, ItemVendaGrupo[]> = {}
  if (vendaIdsUnicos.length > 0) {
    const { data: itensVendaData } = await admin
      .from('itens_venda')
      .select('id, venda_id, produto_nome, produto_id, subtotal, produtos(foto_url, galeria_urls)')
      .in('venda_id', vendaIdsUnicos)
      .eq('recorrente', true)
    for (const item of itensVendaData ?? []) {
      const vId = item.venda_id as string
      const prodRaw = (item as unknown as { produtos: { foto_url: string | null; galeria_urls: string[] | null } | Array<{ foto_url: string | null; galeria_urls: string[] | null }> | null }).produtos
      const prodFoto = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw
      if (!itensVendaPorVenda[vId]) itensVendaPorVenda[vId] = []
      itensVendaPorVenda[vId].push({
        id: item.id as string,
        produto_nome: item.produto_nome as string,
        produto_id: (item.produto_id as string | null) ?? null,
        produto_foto_url: prodFoto?.foto_url || prodFoto?.galeria_urls?.[0] || null,
        valor_produto: (item.subtotal as number | null) ?? 0,
      })
    }
  }

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Fila de Recompra
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{ctx.lojaNome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Clientes para retornar no momento certo e recuperar dinheiro na mesa.
        </p>
      </div>

      {/* ── Lista de avisos (inclui cards de resumo reativos) ── */}
      <AvisosPageClient
        initialAvisos={avisos}
        initialItensVenda={itensVendaPorVenda}
        initialNextCursor={(avisosRaw?.length ?? 0) === 50 ? '50' : null}
        hoje={hoje}
        catalogo={catalogo}
        percentuaisPorVendedora={percentuaisPorVendedora}
        vendedorasLoja={vendedorasLoja}
        loja_id={lojaIdFallback}
        loja_nome={ctx.lojaNome}
        isVendedora={isVendedora}
        totalRecomprasValorMes={totalRecomprasValorMes}
        qtdRecomprasMes={qtdRecomprasMes}
        mostrarLoja={mostrarLoja}
        taxaConversao={taxaConversao}
      />

    </div>
  )
}
