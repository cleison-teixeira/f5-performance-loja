import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, AlertCircle, Bell, Calendar } from 'lucide-react'
import { AvisosLista } from './AvisosLista'
import type { AvisoDetalhado } from './types'

export interface CatalogoProduto {
  id: string
  nome: string
  preco_sugerido: number | null
  comissionavel_recompra: boolean
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function addDias(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default async function AvisosPage() {
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
        <h1 className="text-xl font-semibold">Fila de Recompra</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const hoje = new Date().toISOString().split('T')[0]
  const isVendedora = (membro.role as string) === 'vendedora'

  // Avisos pendentes — vendedora vê apenas os próprios; dono/gerente veem toda a loja
  let avisosQuery = supabase
    .from('avisos')
    .select(`
      id, data_aviso, status, recompra_id, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao,
      clientes(nome, whatsapp),
      mensagens_produto(tipo),
      itens_venda(produto_nome, produto_id, produtos(foto_url)),
      vendas(valor)
    `)
    .eq('loja_id', loja.id)
    .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
    .order('data_aviso', { ascending: true })
  if (isVendedora) avisosQuery = avisosQuery.eq('vendedora_id', user!.id)
  const { data: avisosRaw } = await avisosQuery

  // Catálogo de produtos para o form de recompra
  const { data: catalogoRaw } = await supabase
    .from('produtos')
    .select('id, nome, preco_sugerido, comissionavel_recompra')
    .eq('loja_id', loja.id)
    .eq('ativo', true)
    .order('nome')

  const catalogo: CatalogoProduto[] = (catalogoRaw ?? []).map(p => ({
    id: p.id as string,
    nome: p.nome as string,
    preco_sugerido: p.preco_sugerido as number | null,
    comissionavel_recompra: (p as unknown as { comissionavel_recompra: boolean }).comissionavel_recompra ?? true,
  }))

  // Percentuais de comissão + nomes das vendedoras que aparecem nos avisos
  const vendedoraIds = [...new Set((avisosRaw ?? []).map(a => a.vendedora_id as string).filter(Boolean))]
  const percentuaisPorVendedora: Record<string, number> = {}
  const vendedoraNomeMap = new Map<string, string>()

  if (vendedoraIds.length > 0) {
    const [regrasRes, perfisRes] = await Promise.all([
      supabase
        .from('regras_comissao')
        .select('vendedora_id, percentual')
        .in('vendedora_id', vendedoraIds)
        .eq('loja_id', loja.id)
        .eq('ativo', true),
      supabase
        .from('perfis')
        .select('id, nome')
        .in('id', vendedoraIds),
    ])
    for (const r of regrasRes.data ?? []) {
      percentuaisPorVendedora[r.vendedora_id as string] = r.percentual as number
    }
    for (const p of perfisRes.data ?? []) {
      vendedoraNomeMap.set(p.id as string, p.nome as string)
    }
  }

  // Normaliza os dados
  const avisos: AvisoDetalhado[] = (avisosRaw ?? []).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as {
      produto_nome: string
      produto_id: string | null
      produtos: { foto_url: string | null } | Array<{ foto_url: string | null }> | null
    } | null
    const produtosRaw = itemVenda?.produtos
    const produtoFoto = Array.isArray(produtosRaw) ? produtosRaw[0] : produtosRaw
    const venda = a.vendas as unknown as { valor: number } | null

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
      produto_foto_url: produtoFoto?.foto_url ?? null,
      tipo: (mensagem?.tipo ?? 'agradecimento') as AvisoDetalhado['tipo'],
      valor_venda: venda?.valor ?? 0,
      previsao_comissao: (a.previsao_comissao as number | null) ?? 0,
      venda_id: a.venda_id as string,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? '',
      atrasado: a.data_aviso < hoje,
    }
  })

  const seenVendas = new Set<string>()
  const potencialAberto = avisos
    .filter(a => a.tipo === 'recompra' || a.tipo === 'oferta')
    .filter(a => {
      if (!a.venda_id) return true
      if (seenVendas.has(a.venda_id)) return false
      seenVendas.add(a.venda_id)
      return true
    })
    .reduce((s, a) => s + Number(a.valor_venda || 0), 0)
  const qtdAtrasados = avisos.filter(a => a.data_aviso < hoje).length
  const qtdHoje = avisos.filter(a => a.data_aviso === hoje).length
  const em7Dias = addDias(hoje, 7)
  const qtdProximos7 = avisos.filter(a => a.data_aviso > hoje && a.data_aviso <= em7Dias).length

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {isVendedora ? 'Minha Fila de Recompra' : 'Fila de Recompra'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja.nome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Clientes para retornar no momento certo e recuperar dinheiro na mesa.
        </p>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Potencial em aberto */}
        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/65 dark:text-emerald-400/60 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 flex-none" />
            Vendas em aberto
          </p>
          <p className="text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300 leading-none">
            {fmt(potencialAberto)}
          </p>
          <p className="text-[11px] text-emerald-700/55 dark:text-emerald-400/50 leading-tight">
            vendas a reativar
          </p>
        </div>

        {/* Atrasados */}
        <div className="rounded-xl border bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/30 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600/65 dark:text-red-400/60 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 flex-none" />
            Atrasados
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${qtdAtrasados > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
            {qtdAtrasados}
          </p>
          <p className="text-[11px] text-red-600/55 dark:text-red-400/50 leading-tight">
            precisam de ação agora
          </p>
        </div>

        {/* Para hoje */}
        <div className="rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600/65 dark:text-blue-400/60 flex items-center gap-1.5">
            <Bell className="h-3 w-3 flex-none" />
            Para hoje
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${qtdHoje > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
            {qtdHoje}
          </p>
          <p className="text-[11px] text-blue-600/55 dark:text-blue-400/50 leading-tight">
            clientes para acionar
          </p>
        </div>

        {/* Próximos 7 dias */}
        <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
            <Calendar className="h-3 w-3 flex-none" />
            Próximos 7 dias
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${qtdProximos7 > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {qtdProximos7}
          </p>
          <p className="text-[11px] text-muted-foreground/55 leading-tight">
            oportunidades chegando
          </p>
        </div>

      </div>

      {/* ── Lista de avisos ── */}
      <AvisosLista
        avisos={avisos}
        hoje={hoje}
        catalogo={catalogo}
        percentuaisPorVendedora={percentuaisPorVendedora}
        loja_id={loja.id}
        isVendedora={isVendedora}
      />

    </div>
  )
}
