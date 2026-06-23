import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DashboardView } from './DashboardView'

export interface DashboardAviso {
  id: string
  data_aviso: string
  venda_id: string
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
  valorPotencial: number
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
}

function addDias(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(id, nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const loja_id = membro.loja_id as string
  const role = membro.role as string
  const isVendedora = role === 'vendedora'
  const vidFilter = isVendedora ? user.id : null

  const data30 = new Date()
  data30.setDate(data30.getDate() - 30)
  const hoje = new Date().toISOString().split('T')[0]

  // 30-day buckets for chart
  const dias30: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dias30.push(d.toISOString().split('T')[0])
  }

  const agora = new Date()
  const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasMes: string[] = []
  for (let i = 1; i <= diasNoMes; i++) {
    diasMes.push(`${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`)
  }
  const hojeDia = agora.getDate()

  const [vendasRes, avisosRes, recomprasRes, enviadosRes, produtosRes, membrosRes, perfilRes, metasRes, comissaoVendaRes, listaEsperaRes] = await Promise.all([
    (() => {
      let q = supabase
        .from('vendas')
        .select(`
          id, criado_em, valor, vendedora_id,
          perfis!vendas_vendedora_id_fkey(nome),
          itens_venda(produto_nome, subtotal, recorrente)
        `)
        .eq('loja_id', loja_id)
        .gte('criado_em', data30.toISOString())
        .order('criado_em', { ascending: false })
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    (() => {
      let q = supabase
        .from('avisos')
        .select(`
          id, data_aviso, venda_id, status, texto_renderizado, vendedora_id, previsao_comissao,
          clientes(nome, whatsapp),
          mensagens_produto(tipo),
          itens_venda(produto_nome),
          vendas(valor)
        `)
        .eq('loja_id', loja_id)
        .eq('status', 'pendente')
        .order('data_aviso', { ascending: true })
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    (() => {
      let q = supabase
        .from('recompras')
        .select(`
          id, criado_em, valor_total, vendedora_id,
          perfis!recompras_vendedora_id_fkey(nome)
        `)
        .eq('loja_id', loja_id)
        .gte('criado_em', data30.toISOString())
        .order('criado_em', { ascending: false })
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    (() => {
      let q = supabase
        .from('avisos')
        .select('id', { count: 'exact', head: true })
        .eq('loja_id', loja_id)
        .eq('status', 'enviado')
        .gte('enviado_em', data30.toISOString())
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    supabase
      .from('produtos')
      .select('nome, foto_url')
      .eq('loja_id', loja_id)
      .eq('ativo', true),
    // Vendedoras da loja (para mapa de nomes nos avisos)
    !isVendedora
      ? supabase
          .from('membros_loja')
          .select('perfil_id, perfis(nome)')
          .eq('loja_id', loja_id)
          .eq('ativo', true)
      : Promise.resolve({ data: [] as Array<{ perfil_id: unknown; perfis: unknown }> }),
    // Nome do usuário atual
    supabase.from('perfis').select('nome').eq('id', user.id).single(),
    // metas do mês corrente
    // vendedora: usa client autenticado (só vê a própria meta via RLS)
    // dono/gerente: usa admin client para garantir soma de todas as metas da equipe
    isVendedora
      ? supabase.from('metas_vendedora').select('valor_meta, vendedora_id').eq('loja_id', loja_id).eq('mes', inicioMes).eq('vendedora_id', user.id)
      : createAdminClient().from('metas_vendedora').select('valor_meta, vendedora_id').eq('loja_id', loja_id).eq('mes', inicioMes),
    // Comissão canônica: vendas + comissao_venda (inclui venda_manual e recompra)
    (() => {
      let q = supabase
        .from('vendas')
        .select('data_compra, vendedora_id, comissao_venda!inner(valor_comissao)')
        .eq('loja_id', loja_id)
        .gte('criado_em', data30.toISOString())
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
    // Lista de espera — bloco compacto nos dashboards
    (() => {
      let q = supabase
        .from('lista_espera')
        .select('id, valor_potencial, cliente_nome')
        .eq('loja_id', loja_id)
        .eq('status', 'aguardando')
      if (vidFilter) q = q.eq('vendedora_id', vidFilter)
      return q
    })(),
  ])

  // Build vendedora name map
  const vendedoraNomeMap = new Map<string, string>()
  ;(membrosRes.data ?? []).forEach(m => {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(p) ? p[0] : p
    if (perfilObj?.nome) vendedoraNomeMap.set(m.perfil_id as string, perfilObj.nome)
  })

  const nomeVendedora = (perfilRes as { data: { nome: string } | null }).data?.nome ?? '—'

  // Normalize vendas
  const vendas = (vendasRes.data ?? []).map(v => {
    const perfil = v.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    const itensRaw = v.itens_venda as unknown as Array<{
      produto_nome: string; subtotal: number; recorrente: boolean
    }> | null
    return {
      id: v.id as string,
      criado_em: v.criado_em as string,
      valor: v.valor as number,
      vendedora_id: v.vendedora_id as string,
      vendedora_nome: perfilObj?.nome ?? vendedoraNomeMap.get(v.vendedora_id as string) ?? '—',
      itens: (itensRaw ?? []).map(i => ({
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
    const itemVenda = a.itens_venda as unknown as { produto_nome: string } | null
    const vendaRaw = (a as unknown as { vendas: { valor: number } | null }).vendas
    return {
      id: a.id as string,
      data_aviso: a.data_aviso as string,
      venda_id: a.venda_id as string,
      status: a.status as 'pendente' | 'enviado' | 'ignorado',
      texto_renderizado: a.texto_renderizado as string,
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      produto_nome: itemVenda?.produto_nome ?? 'Produto',
      tipo: mensagem?.tipo ?? 'agradecimento',
      atrasado: (a.data_aviso as string) < hoje,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? nomeVendedora,
      previsao_comissao: (a.previsao_comissao as number | null) ?? 0,
      valor_venda: vendaRaw?.valor ?? 0,
    }
  })

  // Normalize recompras (contagem e valor para métricas de funil)
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

  // Comissão canônica: soma venda_manual + recompra via comissao_venda JOIN vendas
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
  const avisosAtrasados = avisos.filter(a => a.atrasado)
  const avisosHojeList = avisos.filter(a => a.data_aviso === hoje && !a.atrasado)
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

  // Product radar
  const produtoFotoMap = new Map<string, string | null>()
  ;(produtosRes.data ?? []).forEach(p => {
    produtoFotoMap.set(p.nome as string, (p.foto_url as string | null) ?? null)
  })
  const avisosPorProduto = new Map<string, number>()
  avisos.forEach(a => {
    avisosPorProduto.set(a.produto_nome, (avisosPorProduto.get(a.produto_nome) ?? 0) + 1)
  })
  const produtoMap = new Map<string, number>()
  vendas.forEach(v => v.itens.forEach(i => {
    if (!produtoFotoMap.has(i.produto_nome)) return  // skip inactive and item livre
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

  // Ranking
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

  // Vendedoras com pendências (para gerente)
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

  // DashboardDono V2 computations
  const amanhaStr = addDias(hoje, 1)
  const em2Str = addDias(hoje, 2)
  const em3Str = addDias(hoje, 3)
  const em4Str = addDias(hoje, 4)
  const em7DiasStr = addDias(hoje, 7)

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

  const seenOport = new Set<string>()
  const oportunidades = avisos
    .filter(a => a.tipo === 'recompra' || a.tipo === 'oferta')
    .filter(a => {
      if (!a.venda_id) return true
      if (seenOport.has(a.venda_id)) return false
      seenOport.add(a.venda_id)
      return true
    })
  const oport7Dias = oportunidades.filter(a => a.data_aviso >= hoje && a.data_aviso <= em7DiasStr)
  const dinheiroMesaInfo: DinheiroMesaInfo = {
    totalPotencial: oportunidades.reduce((s, a) => s + a.valor_venda, 0),
    qtdOportunidades: oportunidades.length,
    potencial7Dias: oport7Dias.reduce((s, a) => s + a.valor_venda, 0),
    qtdClientes7Dias: new Set(oport7Dias.map(a => a.cliente_nome)).size,
  }

  // Ranking das lojas (dono/admin_f5 only — multi-loja query)
  let rankingLojas: RankingLojasItem[] = []
  if (!isVendedora && role !== 'gerente') {
    const { data: todosMembers } = await supabase
      .from('membros_loja')
      .select('loja_id, lojas(id, nome)')
      .eq('perfil_id', user.id)
      .eq('ativo', true)

    if (!todosMembers || todosMembers.length <= 1) {
      rankingLojas = [{
        lojaId: loja_id,
        lojaNome: loja.nome,
        totalPotencial: dinheiroMesaInfo.totalPotencial,
        qtdOportunidades: dinheiroMesaInfo.qtdOportunidades,
      }]
    } else {
      const adminClient = createAdminClient()
      const outrasLojaIds = todosMembers
        .filter(m => m.loja_id !== loja_id)
        .map(m => m.loja_id as string)

      const { data: avisosOutras } = await adminClient
        .from('avisos')
        .select('loja_id, venda_id, tipo, vendas(valor)')
        .in('loja_id', outrasLojaIds)
        .eq('status', 'pendente')
        .in('tipo', ['recompra', 'oferta'])

      const outrasMap = new Map<string, { lojaNome: string; totalPotencial: number; qtdOportunidades: number; seen: Set<string> }>()
      todosMembers.forEach(m => {
        if (m.loja_id === loja_id) return
        const lojaObj = m.lojas as { id: string; nome: string } | Array<{ id: string; nome: string }> | null
        const nomeLoja = Array.isArray(lojaObj) ? lojaObj[0]?.nome : lojaObj?.nome ?? '—'
        outrasMap.set(m.loja_id as string, { lojaNome: nomeLoja, totalPotencial: 0, qtdOportunidades: 0, seen: new Set() })
      })

      ;(avisosOutras ?? []).forEach(a => {
        const entry = outrasMap.get(a.loja_id as string)
        if (!entry) return
        const vendaId = a.venda_id as string | null
        if (vendaId) {
          if (entry.seen.has(vendaId)) return
          entry.seen.add(vendaId)
        }
        const vendaRaw = a.vendas as { valor: number } | Array<{ valor: number }> | null
        const valorVenda = Array.isArray(vendaRaw) ? vendaRaw[0]?.valor ?? 0 : vendaRaw?.valor ?? 0
        entry.totalPotencial += valorVenda
        entry.qtdOportunidades++
      })

      const allLojas: RankingLojasItem[] = [
        { lojaId: loja_id, lojaNome: loja.nome, totalPotencial: dinheiroMesaInfo.totalPotencial, qtdOportunidades: dinheiroMesaInfo.qtdOportunidades },
      ]
      outrasMap.forEach(({ lojaNome, totalPotencial, qtdOportunidades }, lojaId) => {
        allLojas.push({ lojaId, lojaNome, totalPotencial, qtdOportunidades })
      })
      rankingLojas = allLojas.sort((a, b) => b.totalPotencial - a.totalPotencial)
    }
  }

  function mkBucket(list: DashboardAviso[]): AvisosBucket {
    return { qtd: list.length, valor: list.reduce((s, a) => s + a.valor_venda, 0) }
  }
  const avisosPrazo: AvisosPrazoInfo = {
    atrasados: mkBucket(avisos.filter(a => a.data_aviso < hoje)),
    hoje: mkBucket(avisos.filter(a => a.data_aviso === hoje)),
    amanha: mkBucket(avisos.filter(a => a.data_aviso === amanhaStr)),
    em2a3: mkBucket(avisos.filter(a => a.data_aviso >= em2Str && a.data_aviso <= em3Str)),
    em4a7: mkBucket(avisos.filter(a => a.data_aviso >= em4Str && a.data_aviso <= em7DiasStr)),
  }

  const produtoMesMap = new Map<string, { total: number; foto_url: string | null }>()
  vendasMes.forEach(v => v.itens.forEach(i => {
    if (!produtoFotoMap.has(i.produto_nome)) return  // skip inactive and item livre
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

  const listaEsperaItens = (listaEsperaRes.data ?? []) as Array<{ valor_potencial: number | null; cliente_nome: string }>
  const listaEsperaInfo: ListaEsperaInfo = {
    qtdAguardando: listaEsperaItens.length,
    valorPotencial: listaEsperaItens.reduce((s, i) => s + (i.valor_potencial ?? 0), 0),
    qtdClientes: new Set(listaEsperaItens.map(i => i.cliente_nome)).size,
  }

  return (
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
    />
  )
}
