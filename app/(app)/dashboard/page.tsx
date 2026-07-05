export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DashboardView } from './DashboardView'
import { DashboardLojasBlock } from './DashboardLojasBlock'
import { ListaSkeleton } from './DashboardSkeletons'
import { calcularTaxaRecompraGeral } from '@/lib/metricas/taxa-conversao'
import { getAppContext } from '@/lib/app/contexto'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { measureAsync } from '@/lib/performance/timing'

export interface DashboardAviso {
  id: string
  data_aviso: string
  venda_id: string
  status: string
  recompra_id: string | null
  texto_renderizado: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  tipo: string
  atrasado: boolean
  vendedora_id: string
  vendedora_nome: string
  previsao_comissao: number
  valor_venda: number
  produto_id?: string | null
  valor_produto?: number
}

export interface ProdutoRadarItem {
  nome: string
  total: number
  foto_url: string | null
  avisos_pendentes: number
}

export interface FunilStep {
  label: string
  value: number
  cor: string
}

export interface VendedoraRanking {
  nome: string
  total: number
  qtd: number
}

export interface VendedoraComPendencia {
  vendedora_id: string
  nome: string
  atrasados: number
  hoje: number
}

export interface VendedoraRankingMeta {
  vendedora_id: string
  nome: string
  totalMes: number
  qtdMes: number
  meta: number | null
}

export interface AvisosBucket {
  qtd: number
  valor: number
}

export interface AvisosPrazoInfo {
  atrasados: AvisosBucket
  hoje: AvisosBucket
  amanha: AvisosBucket
  em2a3: AvisosBucket
  em4a7: AvisosBucket
}

export interface DinheiroMesaInfo {
  totalPotencial: number
  qtdOportunidades: number
  potencial7Dias: number
  qtdClientes7Dias: number
}

export interface ProdutoTopMes {
  nome: string
  total: number
  pct: number
  foto_url: string | null
}

export interface ListaEsperaInfo {
  qtdAguardando: number
  potencialEmAberto: number
  qtdAvisados: number
  convertidoValor: number
  qtdClientes: number
}

export interface RankingRecomprasItem {
  vendedora_id: string
  nome: string
  valorRecuperado: number
  qtd: number
}

export interface TopProdutoRecompra {
  nome: string
  qtd: number
  foto_url: string | null
}

export interface RankingLojasItem {
  lojaId: string
  lojaNome: string
  totalPotencial: number
  qtdOportunidades: number
  valorRecuperadoMes: number
  qtdRecomprasMes: number
}

function addDias(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default async function DashboardPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  if (!appCtx.hasMembros) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const { role, ctx } = appCtx
  const admin = createAdminClient()

  // appCtx.perfil já contém o nome — sem query extra
  const nomeVendedora = appCtx.perfil?.nome ?? '—'

  // dono e admin_f5 usam DashboardDono, que não precisa de vendas/produtos/metas/comissão
  const isDono = !isAcessoLoja(role)

  const isVendedora = false
  const vidFilter: string | null = null

  const multiLoja = ctx.escopo === 'rede'
  const lojaIds = ctx.lojaIds.length > 0 ? ctx.lojaIds : []
  const loja_id = ctx.lojaId ?? lojaIds[0]

  const lojaDisplay = ctx.lojas.find(l => l.id === loja_id) ?? ctx.lojas[0] ?? null
  const lojaFallbackNome = lojaDisplay?.nome ?? ''

  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'} · Dinheiro na mesa, recompras em aberto e fila da equipe.`
    : `${ctx.lojaNome} · Visão da loja selecionada.`

  const loja = {
    id: lojaDisplay?.id ?? loja_id,
    nome: ctx.escopo === 'rede' ? 'Toda a rede' : (ctx.lojaNome || lojaFallbackNome),
  }

  const data30 = new Date()
  data30.setDate(data30.getDate() - 30)
  const hoje = new Date().toISOString().split('T')[0]

  const agora = new Date()
  const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasMes: string[] = []
  for (let i = 1; i <= diasNoMes; i++) {
    diasMes.push(`${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`)
  }
  const hojeDia = agora.getDate()

  // Batch único: sempre + condicionais por role
  const [
    avisosRes, recomprasRes, enviadosRes, membrosRes, metasRes, listaEsperaRes, taxaConversao,
    vendasRes, produtosRes, comissaoVendaRes,
  ] = await measureAsync('dashboard:queries', () => Promise.all([
    // ── Sempre necessário ────────────────────────────────────────────────────
    (() => {
      let q = admin
        .from('avisos')
        .select(`
          id, data_aviso, venda_id, status, recompra_id, vendedora_id, previsao_comissao,
          clientes(nome, whatsapp),
          mensagens_produto(tipo),
          itens_venda(produto_nome, produto_id, subtotal),
          vendas(valor)
        `)
        .in('loja_id', lojaIds)
        .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
        .order('data_aviso', { ascending: true })
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    (() => {
      let q = admin
        .from('recompras')
        .select(`
          id, criado_em, valor_total, vendedora_id,
          perfis!recompras_vendedora_id_fkey(nome)
        `)
        .in('loja_id', lojaIds)
        .gte('criado_em', data30.toISOString())
        .not('venda_id', 'is', null)
        .order('criado_em', { ascending: false })
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    (() => {
      let q = admin
        .from('avisos')
        .select('id', { count: 'exact', head: true })
        .in('loja_id', lojaIds)
        .or('status.eq.enviado,status.eq.convertida')
        .gte('enviado_em', data30.toISOString())
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    !isVendedora
      ? admin
          .from('membros_loja')
          .select('perfil_id, perfis(nome)')
          .in('loja_id', lojaIds)
          .eq('ativo', true)
      : Promise.resolve({ data: [] as Array<{ perfil_id: unknown; perfis: unknown }> }),
    admin.from('metas_vendedora').select('valor_meta, vendedora_id').in('loja_id', lojaIds).eq('mes', inicioMes),
    (() => {
      let q = admin
        .from('lista_espera')
        .select('id, valor_potencial, cliente_nome, status')
        .in('loja_id', lojaIds)
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    // taxa de conversão agora paralela (era sequential)
    calcularTaxaRecompraGeral(lojaIds, admin, hoje),

    // ── Apenas para gerente/vendedora (isDono = skip) ────────────────────────
    isDono
      ? Promise.resolve({ data: [] as Array<unknown> })
      : (() => {
          let q = admin
            .from('vendas')
            .select(`
              id, criado_em, valor, vendedora_id,
              perfis!vendas_vendedora_id_fkey(nome),
              itens_venda(produto_nome, subtotal, recorrente)
            `)
            .in('loja_id', lojaIds)
            .gte('criado_em', data30.toISOString())
            .order('criado_em', { ascending: false })
          if (vidFilter) q = q.eq('vendedora_id', vidFilter)
          return q
        })(),
    isDono
      ? Promise.resolve({ data: [] as Array<unknown> })
      : admin
          .from('produtos')
          .select('nome, foto_url')
          .in('loja_id', lojaIds)
          .eq('ativo', true)
          .limit(300),
    isDono
      ? Promise.resolve({ data: [] as Array<unknown> })
      : (() => {
          let q = admin
            .from('vendas')
            .select('data_compra, vendedora_id, comissao_venda!inner(valor_comissao)')
            .in('loja_id', lojaIds)
            .gte('criado_em', data30.toISOString())
          if (vidFilter) q = q.eq('vendedora_id', vidFilter)
          return q
        })(),
  ]))

  // Build vendedora name map
  const vendedoraNomeMap = new Map<string, string>()
  ;(membrosRes.data ?? []).forEach(m => {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(p) ? p[0] : p
    if (perfilObj?.nome) vendedoraNomeMap.set(m.perfil_id as string, perfilObj.nome)
  })

  // Normalize vendas
  const vendas = (vendasRes.data ?? []).map(v => {
    const vRaw = v as unknown as {
      id: string; criado_em: string; valor: number; vendedora_id: string
      perfis: { nome: string } | Array<{ nome: string }> | null
      itens_venda: Array<{ produto_nome: string; subtotal: number; recorrente: boolean }> | null
    }
    const perfilObj = Array.isArray(vRaw.perfis) ? vRaw.perfis[0] : vRaw.perfis
    return {
      id: vRaw.id,
      criado_em: vRaw.criado_em,
      valor: vRaw.valor,
      vendedora_id: vRaw.vendedora_id,
      vendedora_nome: perfilObj?.nome ?? vendedoraNomeMap.get(vRaw.vendedora_id) ?? '—',
      itens: (vRaw.itens_venda ?? []).map(i => ({
        produto_nome: i.produto_nome,
        subtotal: i.subtotal,
        recorrente: i.recorrente ?? false,
      })),
    }
  })

  // Normalize avisos
  const avisos: DashboardAviso[] = (avisosRes.data ?? []).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as { produto_nome: string; produto_id: string | null; subtotal: number | null } | null
    const vendaRaw = (a as unknown as { vendas: { valor: number } | null }).vendas
    return {
      id: a.id as string,
      data_aviso: a.data_aviso as string,
      venda_id: a.venda_id as string,
      status: a.status as string,
      recompra_id: (a as unknown as { recompra_id: string | null }).recompra_id ?? null,
      texto_renderizado: '',
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      produto_nome: itemVenda?.produto_nome ?? 'Produto',
      tipo: mensagem?.tipo ?? 'agradecimento',
      atrasado: (a.data_aviso as string) < hoje,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? nomeVendedora,
      previsao_comissao: (a.previsao_comissao as number | null) ?? 0,
      valor_venda: vendaRaw?.valor ?? 0,
      produto_id: itemVenda?.produto_id ?? null,
      valor_produto: itemVenda?.subtotal ?? 0,
    }
  })

  // Normalize recompras
  const recompras = (recomprasRes.data ?? []).map(r => {
    const perfil = r.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    return {
      id: r.id as string,
      criado_em: r.criado_em as string,
      valor_total: r.valor_total as number,
      vendedora_id: r.vendedora_id as string,
      vendedora_nome: perfilObj?.nome ?? '—',
    }
  })

  // Comissão canônica
  const comissoesCanon = ((comissaoVendaRes as { data: Array<{ data_compra: string; vendedora_id: string; comissao_venda: unknown }> | null }).data ?? []).map(v => {
    const cvRaw = v.comissao_venda as unknown as
      | Array<{ valor_comissao: number }> | { valor_comissao: number } | null
    const cv = Array.isArray(cvRaw) ? cvRaw[0] : cvRaw
    return {
      data_compra: v.data_compra as string,
      vendedora_id: v.vendedora_id as string,
      valor_comissao: cv?.valor_comissao ?? 0,
    }
  })

  // Aggregate metrics
  const totalVendasValor = vendas.reduce((s, v) => s + v.valor, 0)
  const totalRecomprasValor = recompras.reduce((s, r) => s + r.valor_total, 0)
  const totalComissoes = comissoesCanon.reduce((s, c) => s + c.valor_comissao, 0)
  const avisosAtrasados = avisos.filter(a => a.atrasado && (a.tipo === 'recompra' || a.tipo === 'oferta'))
  const avisosHojeList = avisos.filter(a => a.data_aviso === hoje && !a.atrasado && (a.tipo === 'recompra' || a.tipo === 'oferta'))
  const avisosEnviadosCount = enviadosRes.count ?? 0
  const seenPrevisao = new Set<string>()
  const previsaoEmAberto = avisos
    .filter(a => a.tipo === 'recompra' || a.tipo === 'oferta')
    .filter(a => {
      if (!a.venda_id) return true
      if (seenPrevisao.has(a.venda_id)) return false
      seenPrevisao.add(a.venda_id)
      return true
    })
    .reduce((s, a) => s + Number(a.previsao_comissao || 0), 0)
  const dinheiroNaMesa = avisos.filter(a => a.tipo === 'recompra' || a.tipo === 'oferta').length

  // Chart de comissão acumulada do mês
  const comissaoBucket: Record<string, number> = Object.fromEntries(diasMes.map(d => [d, 0]))
  comissoesCanon.forEach(c => {
    const d = c.data_compra
    if (d in comissaoBucket) comissaoBucket[d] += c.valor_comissao
  })
  const comissaoDiaria = diasMes.map(d => comissaoBucket[d] ?? 0)
  const metasData = (metasRes as { data: Array<{ valor_meta: number; vendedora_id: string }> | null }).data ?? []
  const metaComissao = metasData.reduce((s, m) => s + m.valor_meta, 0) || null

  // Funil
  const vendaIds = new Set(vendas.map(v => v.id))
  const avisosDe30d = avisos.filter(a => vendaIds.has(a.venda_id))
  const funil: FunilStep[] = [
    { label: 'Vendas registradas', value: vendas.length, cor: 'bg-blue-500' },
    { label: 'Mensagens programadas', value: avisosDe30d.length + avisosEnviadosCount, cor: 'bg-amber-500' },
    { label: 'Mensagens enviadas', value: avisosEnviadosCount, cor: 'bg-green-500' },
    { label: 'Recompras confirmadas', value: recompras.length, cor: 'bg-emerald-600' },
  ]

  // Product radar (empty for dono — produtoFotoMap remains empty)
  const produtoFotoMap = new Map<string, string | null>()
  ;(produtosRes.data ?? []).forEach(p => {
    const pRaw = p as unknown as { nome: string; foto_url: string | null }
    produtoFotoMap.set(pRaw.nome, pRaw.foto_url ?? null)
  })
  const avisosPorProduto = new Map<string, number>()
  avisos.forEach(a => {
    avisosPorProduto.set(a.produto_nome, (avisosPorProduto.get(a.produto_nome) ?? 0) + 1)
  })
  const produtoMap = new Map<string, number>()
  vendas.forEach(v => v.itens.forEach(i => {
    if (!produtoFotoMap.has(i.produto_nome)) return
    produtoMap.set(i.produto_nome, (produtoMap.get(i.produto_nome) ?? 0) + i.subtotal)
  }))
  const produtosRadar: ProdutoRadarItem[] = Array.from(produtoMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([nome, total]) => ({
      nome,
      total,
      foto_url: produtoFotoMap.get(nome) ?? null,
      avisos_pendentes: avisosPorProduto.get(nome) ?? 0,
    }))

  // Recompras do mês corrente
  const recomprasMes = recompras.filter(r => r.criado_em.split('T')[0] >= inicioMes)
  const totalRecomprasValorMes = recomprasMes.reduce((s, r) => s + r.valor_total, 0)
  const qtdRecomprasMes = recomprasMes.length

  // Ranking de recuperação por recompras confirmadas no mês
  const rankingRecomprasMap = new Map<string, RankingRecomprasItem>()
  recomprasMes.forEach(r => {
    const entry = rankingRecomprasMap.get(r.vendedora_id) ?? {
      vendedora_id: r.vendedora_id,
      nome: r.vendedora_nome,
      valorRecuperado: 0,
      qtd: 0,
    }
    entry.valorRecuperado += r.valor_total
    entry.qtd += 1
    rankingRecomprasMap.set(r.vendedora_id, entry)
  })
  const rankingRecompras: RankingRecomprasItem[] = Array.from(rankingRecomprasMap.values())
    .sort((a, b) => b.valorRecuperado - a.valorRecuperado)

  // Top produtos de recompra (por avisos pendentes na fila)
  const topProdutosRecompra: TopProdutoRecompra[] = Array.from(avisosPorProduto.entries())
    .filter(([, qtd]) => qtd > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, qtd]) => ({
      nome,
      qtd,
      foto_url: produtoFotoMap.get(nome) ?? null,
    }))

  // Ranking de vendas (30d)
  const vendedoraMap = new Map<string, { nome: string; total: number; qtd: number }>()
  vendas.forEach(v => {
    const entry = vendedoraMap.get(v.vendedora_id) ?? { nome: v.vendedora_nome, total: 0, qtd: 0 }
    entry.total += v.valor
    entry.qtd += 1
    vendedoraMap.set(v.vendedora_id, entry)
  })
  const rankingVendedoras: VendedoraRanking[] = Array.from(vendedoraMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Vendedoras com pendências
  const pendenciasMap = new Map<string, VendedoraComPendencia>()
  avisos.forEach(a => {
    const entry = pendenciasMap.get(a.vendedora_id) ?? {
      vendedora_id: a.vendedora_id,
      nome: a.vendedora_nome,
      atrasados: 0,
      hoje: 0,
    }
    if (a.atrasado) entry.atrasados++
    else if (a.data_aviso === hoje) entry.hoje++
    pendenciasMap.set(a.vendedora_id, entry)
  })
  const vendedorasComPendencias = Array.from(pendenciasMap.values())
    .filter(v => v.atrasados > 0 || v.hoje > 0)
    .sort((a, b) => b.atrasados - a.atrasados || b.hoje - a.hoje)

  // Datas auxiliares
  const amanhaStr = addDias(hoje, 1)
  const em2Str = addDias(hoje, 2)
  const em3Str = addDias(hoje, 3)
  const em4Str = addDias(hoje, 4)
  const em7DiasStr = addDias(hoje, 7)
  const em90DiasStr = addDias(hoje, 90)

  const seenComissao7d = new Set<string>()
  const comissao7Dias = avisos
    .filter(a => (a.tipo === 'recompra' || a.tipo === 'oferta') && a.data_aviso >= hoje && a.data_aviso <= em7DiasStr)
    .filter(a => {
      if (!a.venda_id) return true
      if (seenComissao7d.has(a.venda_id)) return false
      seenComissao7d.add(a.venda_id)
      return true
    })
    .reduce((s, a) => s + Number(a.previsao_comissao || 0), 0)

  const vendasMes = vendas.filter(v => v.criado_em.split('T')[0] >= inicioMes)
  const totalVendasMes = vendasMes.reduce((s, v) => s + v.valor, 0)

  const metaPorVendedora: Record<string, number> = {}
  metasData.forEach(m => { metaPorVendedora[m.vendedora_id] = m.valor_meta })
  const metaVendasMes = metasData.length > 0 ? metasData.reduce((s, m) => s + m.valor_meta, 0) : null

  const rankingMesMap = new Map<string, VendedoraRankingMeta>()
  vendasMes.forEach(v => {
    const entry = rankingMesMap.get(v.vendedora_id) ?? {
      vendedora_id: v.vendedora_id,
      nome: v.vendedora_nome,
      totalMes: 0,
      qtdMes: 0,
      meta: metaPorVendedora[v.vendedora_id] ?? null,
    }
    entry.totalMes += v.valor
    entry.qtdMes += 1
    rankingMesMap.set(v.vendedora_id, entry)
  })
  ;(membrosRes.data ?? []).forEach(m => {
    const vid = m.perfil_id as string
    if (!rankingMesMap.has(vid) && metaPorVendedora[vid]) {
      const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
      const perfilObj = Array.isArray(p) ? p[0] : p
      rankingMesMap.set(vid, {
        vendedora_id: vid,
        nome: perfilObj?.nome ?? vendedoraNomeMap.get(vid) ?? '—',
        totalMes: 0,
        qtdMes: 0,
        meta: metaPorVendedora[vid],
      })
    }
  })
  const rankingMes: VendedoraRankingMeta[] = Array.from(rankingMesMap.values())
    .sort((a, b) => b.totalMes - a.totalMes)

  // Dinheiro na Mesa (regra canônica 90 dias)
  const seenOport = new Set<string>()
  const oportunidades = avisos
    .filter(a => (a.tipo === 'recompra' || a.tipo === 'oferta') && a.data_aviso <= em90DiasStr)
    .filter(a => {
      const key = `${a.venda_id ?? ''}__${a.produto_id ?? ''}`
      if (seenOport.has(key)) return false
      seenOport.add(key)
      return true
    })
  const oport7Dias = oportunidades.filter(a => a.data_aviso >= hoje && a.data_aviso <= em7DiasStr)
  const dinheiroMesaInfo: DinheiroMesaInfo = {
    totalPotencial: oportunidades.reduce((s, a) => s + (a.valor_produto || a.valor_venda || 0), 0),
    qtdOportunidades: oportunidades.length,
    potencial7Dias: oport7Dias.reduce((s, a) => s + (a.valor_produto || a.valor_venda || 0), 0),
    qtdClientes7Dias: new Set(oport7Dias.map(a => a.cliente_nome)).size,
  }

  // rankingLojas: single-loja sincrono, multi-loja via Suspense (DashboardLojasBlock)
  let rankingLojas: RankingLojasItem[] = []
  if (!multiLoja && !isVendedora && role !== 'gerente') {
    rankingLojas = [{
      lojaId: loja_id,
      lojaNome: loja.nome,
      totalPotencial: dinheiroMesaInfo.totalPotencial,
      qtdOportunidades: dinheiroMesaInfo.qtdOportunidades,
      valorRecuperadoMes: totalRecomprasValorMes,
      qtdRecomprasMes: qtdRecomprasMes,
    }]
  }

  function mkBucket(list: DashboardAviso[]): AvisosBucket {
    return { qtd: list.length, valor: list.reduce((s, a) => s + a.valor_venda, 0) }
  }
  const isFilaType = (a: DashboardAviso) => a.tipo === 'recompra' || a.tipo === 'oferta'
  const avisosPrazo: AvisosPrazoInfo = {
    atrasados: mkBucket(avisos.filter(a => isFilaType(a) && a.data_aviso < hoje)),
    hoje: mkBucket(avisos.filter(a => isFilaType(a) && a.data_aviso === hoje)),
    amanha: mkBucket(avisos.filter(a => isFilaType(a) && a.data_aviso === amanhaStr)),
    em2a3: mkBucket(avisos.filter(a => isFilaType(a) && a.data_aviso >= em2Str && a.data_aviso <= em3Str)),
    em4a7: mkBucket(avisos.filter(a => isFilaType(a) && a.data_aviso >= em4Str && a.data_aviso <= em7DiasStr)),
  }

  const produtoMesMap = new Map<string, { total: number; foto_url: string | null }>()
  vendasMes.forEach(v => v.itens.forEach(i => {
    if (!produtoFotoMap.has(i.produto_nome)) return
    const prev = produtoMesMap.get(i.produto_nome) ?? { total: 0, foto_url: produtoFotoMap.get(i.produto_nome) ?? null }
    prev.total += i.subtotal
    produtoMesMap.set(i.produto_nome, prev)
  }))
  const totalProdutosMes = Array.from(produtoMesMap.values()).reduce((s, p) => s + p.total, 0)
  const topProdutosMes: ProdutoTopMes[] = Array.from(produtoMesMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([nome, { total, foto_url }]) => ({
      nome, total,
      pct: totalProdutosMes > 0 ? Math.round((total / totalProdutosMes) * 100) : 0,
      foto_url,
    }))

  const vendasBucketMes: Record<string, number> = Object.fromEntries(diasMes.map(d => [d, 0]))
  vendasMes.forEach(v => {
    const d = v.criado_em.split('T')[0]
    if (d in vendasBucketMes) vendasBucketMes[d] += v.valor
  })
  const vendasDiariaMes = diasMes.map(d => vendasBucketMes[d] ?? 0)

  const diasRestantes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate() - agora.getDate()
  const mesLabel = agora.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const listaEsperaItens = (listaEsperaRes.data ?? []) as Array<{ valor_potencial: number | null; cliente_nome: string; status: string }>
  const ABERTO_LE = new Set(['aguardando', 'encontrado_outra_loja', 'avisado'])
  const listaEsperaInfo: ListaEsperaInfo = {
    qtdAguardando: listaEsperaItens.filter(i => i.status === 'aguardando').length,
    potencialEmAberto: listaEsperaItens.filter(i => ABERTO_LE.has(i.status)).reduce((s, i) => s + (i.valor_potencial ?? 0), 0),
    qtdAvisados: listaEsperaItens.filter(i => i.status === 'avisado').length,
    convertidoValor: listaEsperaItens.filter(i => i.status === 'convertido').reduce((s, i) => s + (i.valor_potencial ?? 0), 0),
    qtdClientes: new Set(listaEsperaItens.filter(i => i.status === 'aguardando').map(i => i.cliente_nome)).size,
  }

  return (
    <>
      <DashboardView
        loja={loja}
        role={role}
        nomeVendedora={nomeVendedora}
        totalVendasValor={totalVendasValor}
        qtdVendas={vendas.length}
        totalRecomprasValor={totalRecomprasValor}
        qtdRecompras={recompras.length}
        totalComissoes={totalComissoes}
        previsaoEmAberto={previsaoEmAberto}
        avisosPendentes={avisos.length}
        avisosAtrasados={avisosAtrasados.slice(0, 5)}
        avisosHoje={avisosHojeList.slice(0, 5)}
        avisosEnviadosCount={avisosEnviadosCount}
        dinheiroNaMesa={dinheiroNaMesa}
        funil={funil}
        produtosRadar={produtosRadar}
        rankingVendedoras={rankingVendedoras}
        vendedorasComPendencias={vendedorasComPendencias}
        diasMes={diasMes}
        comissaoDiaria={comissaoDiaria}
        metaComissao={metaComissao}
        hojeDia={hojeDia}
        dinheiroMesaInfo={dinheiroMesaInfo}
        totalVendasMes={totalVendasMes}
        metaVendasMes={metaVendasMes}
        diasRestantes={diasRestantes}
        rankingMes={rankingMes}
        avisosPrazo={avisosPrazo}
        topProdutosMes={topProdutosMes}
        vendasDiariaMes={vendasDiariaMes}
        mesLabel={mesLabel}
        listaEsperaInfo={listaEsperaInfo}
        rankingRecompras={rankingRecompras}
        topProdutosRecompra={topProdutosRecompra}
        totalRecomprasValorMes={totalRecomprasValorMes}
        qtdRecomprasMes={qtdRecomprasMes}
        comissao7Dias={comissao7Dias}
        rankingLojas={rankingLojas}
        subtitulo={subtitulo}
        taxaConversao={taxaConversao}
        multiLoja={multiLoja}
      />

      {/* Bloco de performance multi-loja: carrega em paralelo via Suspense */}
      {multiLoja && lojaIds.length > 0 && (
        <Suspense fallback={<ListaSkeleton />}>
          <DashboardLojasBlock lojaIds={lojaIds} inicioMes={inicioMes} />
        </Suspense>
      )}
    </>
  )
}
