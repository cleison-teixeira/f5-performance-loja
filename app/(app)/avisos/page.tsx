import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvisosLista } from './AvisosLista'
import type { AvisoDetalhado } from './types'

export interface CatalogoProduto {
  id: string
  nome: string
  preco_sugerido: number | null
  comissionavel_recompra: boolean
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
  const isVendedora = false

  // Avisos pendentes — vendedora vê apenas os próprios; dono/gerente veem toda a loja
  let avisosQuery = supabase
    .from('avisos')
    .select(`
      id, data_aviso, status, recompra_id, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao, observacao_resultado,
      clientes(nome, whatsapp),
      mensagens_produto(tipo),
      itens_venda(produto_nome, produto_id, subtotal, produtos(foto_url)),
      vendas(valor)
    `)
    .eq('loja_id', loja.id)
    .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
    .order('data_aviso', { ascending: true })
  if (isVendedora) avisosQuery = avisosQuery.eq('vendedora_id', user!.id)
  const { data: avisosRaw } = await avisosQuery

  // Busca data_compra via query direta — o join vendas(data_compra) pode ser ambíguo
  // quando itens_venda também tem FK para vendas no mesmo select, retornando null.
  const vendaIds = [...new Set((avisosRaw ?? []).map(a => a.venda_id as string).filter(Boolean))]
  const dataCompraMap = new Map<string, string>()
  if (vendaIds.length > 0) {
    const { data: vendasDatas } = await supabase
      .from('vendas')
      .select('id, data_compra')
      .in('id', vendaIds)
    for (const v of vendasDatas ?? []) {
      const dc = v.data_compra as string | null
      if (dc) dataCompraMap.set(v.id as string, dc.slice(0, 10))
    }
  }

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

  // Recompras do mês corrente para card "Recuperado"
  const inicioMes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  let recomprasQuery = supabase
    .from('recompras')
    .select('valor_total')
    .eq('loja_id', loja.id)
    .gte('criado_em', inicioMes)
  if (isVendedora) recomprasQuery = recomprasQuery.eq('vendedora_id', user!.id)
  const { data: recomprasData } = await recomprasQuery
  const totalRecomprasValorMes = (recomprasData ?? []).reduce((s, r) => s + ((r.valor_total as number) ?? 0), 0)
  const qtdRecomprasMes = (recomprasData ?? []).length

  // Todos os membros ativos da loja (para seletor de responsável)
  const { data: membrosAtivos } = await supabase
    .from('membros_loja')
    .select('perfil_id, perfis(nome)')
    .eq('loja_id', loja.id)
    .eq('ativo', true)

  const todosMembrosIds = (membrosAtivos ?? []).map(m => m.perfil_id as string)

  // Percentuais de comissão + nomes das vendedoras que aparecem nos avisos
  const vendedoraIds = [...new Set((avisosRaw ?? []).map(a => a.vendedora_id as string).filter(Boolean))]
  const percentuaisPorVendedora: Record<string, number> = {}
  const vendedoraNomeMap = new Map<string, string>()

  // Populate nome map from all active members first
  for (const m of membrosAtivos ?? []) {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfil = Array.isArray(p) ? p[0] : p
    if (perfil?.nome) vendedoraNomeMap.set(m.perfil_id as string, perfil.nome)
  }

  const allIds = [...new Set([...vendedoraIds, ...todosMembrosIds])]
  if (allIds.length > 0) {
    const regrasRes = await supabase
      .from('regras_comissao')
      .select('vendedora_id, percentual')
      .in('vendedora_id', allIds)
      .eq('loja_id', loja.id)
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

  // Normaliza os dados
  const avisos: AvisoDetalhado[] = (avisosRaw ?? []).filter(a => {
    const mp = a.mensagens_produto as unknown as { tipo: string } | null
    const tipo = mp?.tipo ?? ''
    return tipo === 'recompra' || tipo === 'oferta'
  }).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as {
      produto_nome: string
      produto_id: string | null
      subtotal: number | null
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
      valor_produto: itemVenda?.subtotal ?? 0,
      previsao_comissao: (a.previsao_comissao as number | null) ?? 0,
      venda_id: a.venda_id as string,
      item_venda_id: (a.item_venda_id as string | null) ?? null,
      data_compra: dataCompraMap.get(a.venda_id as string) ?? '',
      observacao_resultado: (a as unknown as { observacao_resultado: string | null }).observacao_resultado ?? null,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? '',
      atrasado: a.data_aviso < hoje,
    }
  })

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Fila de Recompra
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja.nome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Clientes para retornar no momento certo e recuperar dinheiro na mesa.
        </p>
      </div>

      {/* ── Lista de avisos (inclui cards de resumo reativos) ── */}
      <AvisosLista
        avisos={avisos}
        hoje={hoje}
        catalogo={catalogo}
        percentuaisPorVendedora={percentuaisPorVendedora}
        vendedorasLoja={vendedorasLoja}
        loja_id={loja.id}
        loja_nome={loja.nome}
        isVendedora={isVendedora}
        mode="recompra"
        totalRecomprasValorMes={totalRecomprasValorMes}
        qtdRecomprasMes={qtdRecomprasMes}
      />

    </div>
  )
}
