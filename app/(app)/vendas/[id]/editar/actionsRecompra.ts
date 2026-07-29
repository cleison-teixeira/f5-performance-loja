'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { garantirMensagensProduto } from '@/lib/avisos/garantirMensagensProduto'
import { planejarAvisosParaVenda, type ItemParaPlanejamento } from '@/lib/avisos/planejarParaVenda'
import { calcularComissaoAvancada } from '@/lib/comissoes/calculador'
import type { TipoComissao } from '@/types/app'

export interface ItemEditarRecompraInput {
  item_venda_id: string | null  // null = new item
  produto_id: string | null
  produto_nome: string
  quantidade: number
  preco_unitario: number
  recorrente: boolean
  comissionavel: boolean
  ciclo_recompra_dias: number | null
}

export interface ResultadoEdicaoRecompra {
  ok: boolean
  erro?: string
  avisos_removidos: number
  avisos_criados: number
}

export async function contarAvisosSubstituiveis(venda_id: string): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // Verify venda is accessible to this user (RLS on vendas scopes to user's lojas).
  // Returns null if venda doesn't exist or belongs to a different loja.
  const { data: venda } = await supabase
    .from('vendas')
    .select('loja_id')
    .eq('id', venda_id)
    .single()

  if (!venda) return 0

  const { count } = await supabase
    .from('avisos')
    .select('id', { count: 'exact', head: true })
    .eq('venda_id', venda_id)
    .in('status', ['pendente', 'reagendada'])
    .is('enviado_em', null)

  return count ?? 0
}

export async function editarRecompra(dados: {
  venda_id: string
  versao_esperada: number
  vendedora_id: string
  vendedora_nome: string
  loja_nome: string
  itens: ItemEditarRecompraInput[]
}): Promise<ResultadoEdicaoRecompra> {
  const zero: ResultadoEdicaoRecompra = { ok: false, avisos_removidos: 0, avisos_criados: 0 }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...zero, erro: 'Não autenticado' }

    const admin = createAdminClient()

    // 1. Validate venda + origin
    const { data: venda } = await admin
      .from('vendas')
      .select('id, loja_id, origem, versao, cliente_id, vendedora_id, data_compra')
      .eq('id', dados.venda_id)
      .single()

    if (!venda) return { ...zero, erro: 'Venda não encontrada' }
    if ((venda.origem as string) !== 'recompra') {
      return { ...zero, erro: 'Apenas recompras podem ser editadas por este endpoint' }
    }

    const loja_id = venda.loja_id as string
    const cliente_id = venda.cliente_id as string

    // 2. Validate loja membership for the logged-in user
    const { data: membro } = await supabase
      .from('membros_loja')
      .select('loja_id')
      .eq('perfil_id', user.id)
      .eq('loja_id', loja_id)
      .eq('ativo', true)
      .single()

    if (!membro) return { ...zero, erro: 'Sem permissão para editar esta recompra' }

    // 3. Validate that the selected responsible belongs to the loja
    if (dados.vendedora_id !== user.id) {
      const { data: membroResponsavel } = await admin
        .from('membros_loja')
        .select('loja_id')
        .eq('perfil_id', dados.vendedora_id)
        .eq('loja_id', loja_id)
        .eq('ativo', true)
        .maybeSingle()
      if (!membroResponsavel) return { ...zero, erro: 'Responsável não pertence à loja' }
    }

    if (dados.itens.length === 0) {
      return { ...zero, erro: 'A recompra precisa ter pelo menos um produto.' }
    }

    // 4. Pre-generate UUIDs for new items so the planner can reference them
    const itensComIds = dados.itens.map(item => ({
      ...item,
      item_venda_id: item.item_venda_id ?? crypto.randomUUID(),
      is_novo: item.item_venda_id === null,
    }))

    const recorrentesComProduto = itensComIds.filter(i => i.recorrente && i.produto_id)
    const produtoIds = [...new Set(recorrentesComProduto.map(i => i.produto_id as string))]

    // 5. Load context for aviso planning
    const [clienteRes, vendedoraRes, lojaRes, recompraRes] = await Promise.all([
      admin.from('clientes').select('nome').eq('id', cliente_id).single(),
      admin.from('perfis').select('nome').eq('id', dados.vendedora_id).single(),
      admin.from('lojas').select('nome').eq('id', loja_id).single(),
      admin.from('recompras').select('id').eq('venda_id', dados.venda_id).maybeSingle(),
    ])

    const recompra_id = (recompraRes.data?.id as string | null) ?? undefined

    // 5b. Guarantee templates for all recurrent products (idempotent seed)
    if (produtoIds.length > 0) {
      try {
        await Promise.all(produtoIds.map(pid => garantirMensagensProduto(pid, admin)))
      } catch {
        return { ...zero, erro: 'Não foi possível preparar as mensagens deste produto. Nenhuma alteração foi salva.' }
      }
    }

    // 6. Plan new avisos (pure — no DB writes)
    const itensParaPlanejar: ItemParaPlanejamento[] = itensComIds.map(item => ({
      id: item.item_venda_id,
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      recorrente: item.recorrente,
      ciclo_recompra_dias: item.ciclo_recompra_dias,
    }))

    const { avisos: avisosPlaneados, ancora } = await planejarAvisosParaVenda({
      venda_id: dados.venda_id,
      loja_id,
      cliente_id,
      vendedora_id: dados.vendedora_id,
      cliente_nome: (clienteRes.data?.nome as string) ?? '',
      vendedora_nome: (vendedoraRes.data?.nome as string) ?? dados.vendedora_nome,
      loja_nome: (lojaRes.data?.nome as string) ?? dados.loja_nome,
      data_base: venda.data_compra as string,
      origem: 'recompra',
      itens: itensParaPlanejar,
      origem_recompra_id: recompra_id,
      db: admin,
    })

    // Guard: valida apenas o produto principal da sequência (produto âncora).
    // Produtos não-âncora compõem o contexto da venda mas não geram sequência própria.
    if (ancora && ancora.tipos.length === 0) {
      const erro = ancora.motivo_sem_aviso === 'somente_agradecimento'
        ? `Não foi possível salvar. O produto '${ancora.produto_nome}' possui apenas mensagem de agradecimento. Configure ao menos uma mensagem de acompanhamento.`
        : `Não foi possível salvar. Nenhuma mensagem foi encontrada para o produto '${ancora.produto_nome}'.`
      return { ...zero, erro }
    }

    // 7. Calculate commission without inserting (mirrors gravarComissaoVenda logic)
    const comissaoPayload = await calcularComissaoParaRecompra({
      admin,
      loja_id,
      vendedora_id: dados.vendedora_id,
      data_venda: venda.data_compra as string,
      itens: itensComIds,
    })

    // 8. Build RPC payload
    const itensPayload = itensComIds.map(item => ({
      item_venda_id: item.item_venda_id,
      is_novo: item.is_novo,
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      recorrente: item.recorrente,
      comissionavel: item.comissionavel,
      ciclo_recompra_dias: item.ciclo_recompra_dias,
    }))

    // 9. Call the transactional RPC (all-or-nothing)
    const { data: rpcResult, error: rpcError } = await admin.rpc('editar_recompra_transacional', {
      p_actor_id: user.id,
      p_venda_id: dados.venda_id,
      p_vendedora_id: dados.vendedora_id,
      p_versao_esperada: dados.versao_esperada,
      p_itens: itensPayload,
      p_avisos_futuros: avisosPlaneados,
      p_comissao: comissaoPayload,
    })

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('CONFLICT:')) {
        return { ...zero, erro: msg.replace(/.*CONFLICT:/, '').trim() }
      }
      if (msg.includes('VALIDATION:')) {
        return { ...zero, erro: msg.replace(/.*VALIDATION:/, '').trim() }
      }
      return { ...zero, erro: 'Erro ao salvar a recompra. Tente novamente.' }
    }

    const result = rpcResult as {
      ok: boolean
      avisos_removidos: number
      avisos_criados: number
    } | null

    if (!result?.ok) {
      return { ...zero, erro: 'Erro inesperado ao salvar a recompra.' }
    }

    revalidatePath('/vendas')
    revalidatePath('/avisos')
    revalidatePath(`/vendas/${dados.venda_id}/editar`)

    return {
      ok: true,
      avisos_removidos: result.avisos_removidos ?? 0,
      avisos_criados: result.avisos_criados ?? 0,
    }
  } catch (err) {
    return { ...zero, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

// Commission calculation without DB insert — mirrors gravarComissaoVenda internals.
async function calcularComissaoParaRecompra(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
  loja_id: string
  vendedora_id: string
  data_venda: string
  itens: Array<{
    produto_id: string | null
    produto_nome: string
    quantidade: number
    preco_unitario: number
    comissionavel: boolean
  }>
}): Promise<{
  valor_base: number
  percentual: number
  valor_comissao: number
  tipo_comissao: string | null
  campanha_id: string | null
  comissao_fixa_produto_id: string | null
}> {
  const { admin, loja_id, vendedora_id, data_venda, itens } = params
  const zero = { valor_base: 0, percentual: 0, valor_comissao: 0, tipo_comissao: null, campanha_id: null, comissao_fixa_produto_id: null }

  const itensComissionaveis = itens.filter(i => i.comissionavel)
  if (itensComissionaveis.length === 0) return zero

  const produtosComissionaveis = [...new Set(
    itensComissionaveis.map(i => i.produto_id).filter((id): id is string => !!id)
  )]

  // P1: fixed commission per product+vendedora
  const fixasPorProduto: Record<string, { id: string; valor_fixo: number }> = {}
  if (produtosComissionaveis.length > 0) {
    const { data: fixasData } = await admin
      .from('comissao_fixa_produto')
      .select('produto_id, valor_fixo, id')
      .eq('loja_id', loja_id)
      .eq('vendedora_id', vendedora_id)
      .eq('ativo', true)
      .in('produto_id', produtosComissionaveis)
    for (const f of fixasData ?? []) {
      fixasPorProduto[f.produto_id as string] = { id: f.id as string, valor_fixo: f.valor_fixo as number }
    }
  }

  let valorComissaoFixa = 0
  let valorBaseSemFixo = 0
  let comissaoFixaProdutoId: string | null = null

  for (const item of itensComissionaveis) {
    const fixa = item.produto_id ? fixasPorProduto[item.produto_id] : null
    if (fixa) {
      valorComissaoFixa += fixa.valor_fixo
      if (!comissaoFixaProdutoId) comissaoFixaProdutoId = fixa.id
    } else {
      valorBaseSemFixo += item.quantidade * item.preco_unitario
    }
  }

  // P2: active campaign
  let campanha: { id: string; comissao_fixa: number } | null = null
  if (valorBaseSemFixo > 0) {
    const hoje = new Date().toISOString().slice(0, 10)
    const produtosSemFixa = itensComissionaveis
      .filter(i => i.produto_id && !fixasPorProduto[i.produto_id])
      .map(i => i.produto_id!)

    for (const pid of produtosSemFixa) {
      const { data: campanhaData } = await admin
        .from('campanhas_produto')
        .select('id, comissao_fixa')
        .eq('produto_id', pid)
        .eq('ativo', true)
        .lte('data_inicio', hoje)
        .gte('data_fim', hoje)
        .or(`loja_id.eq.${loja_id},loja_id.is.null`)
        .order('loja_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      if (campanhaData) {
        campanha = { id: campanhaData.id as string, comissao_fixa: campanhaData.comissao_fixa as number }
        break
      }
    }
  }

  // P3: monthly goal
  let meta: { valor_meta: number; comissao_base: number; comissao_meta: number; multiplicador: number | null } | null = null
  let totalVendasMes = 0

  if (valorBaseSemFixo > 0 && !campanha) {
    const [anoStr, mesStr] = data_venda.split('-')
    const ano = parseInt(anoStr)
    const mes = parseInt(mesStr)
    const inicioMes = `${anoStr}-${mesStr}-01`
    const proxAno = mes === 12 ? ano + 1 : ano
    const proxMes = mes === 12 ? 1 : mes + 1
    const inicioProxMes = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`

    const { data: metaData } = await admin
      .from('metas_vendedora')
      .select('valor_meta, comissao_base, comissao_meta, multiplicador')
      .eq('loja_id', loja_id)
      .eq('vendedora_id', vendedora_id)
      .eq('mes', inicioMes)
      .maybeSingle()

    if (metaData) {
      meta = {
        valor_meta: metaData.valor_meta as number,
        comissao_base: metaData.comissao_base as number,
        comissao_meta: metaData.comissao_meta as number,
        multiplicador: metaData.multiplicador as number | null,
      }
      const { data: vendasMesData } = await admin
        .from('vendas')
        .select('valor')
        .eq('loja_id', loja_id)
        .eq('vendedora_id', vendedora_id)
        .gte('data_compra', inicioMes)
        .lt('data_compra', inicioProxMes)
      totalVendasMes = (vendasMesData ?? []).reduce((s: number, v: { valor: number }) => s + (v.valor ?? 0), 0)
    }
  }

  // P4: standard rule
  let regraPadrao: { percentual: number } | null = null
  if (valorBaseSemFixo > 0 && !campanha && !meta) {
    const { data: regraData } = await admin
      .from('regras_comissao')
      .select('percentual')
      .eq('loja_id', loja_id)
      .eq('vendedora_id', vendedora_id)
      .eq('ativo', true)
      .maybeSingle()
    if (regraData) {
      regraPadrao = { percentual: regraData.percentual as number }
    }
  }

  const resultado = calcularComissaoAvancada({
    valor_base_sem_fixo: valorBaseSemFixo,
    valor_comissao_fixa: valorComissaoFixa,
    comissao_fixa_produto_id: comissaoFixaProdutoId,
    campanha,
    meta,
    total_vendas_mes: totalVendasMes,
    regra_padrao: regraPadrao,
  })

  const valorBase = itensComissionaveis.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)

  return {
    valor_base: valorBase,
    percentual: resultado.percentual,
    valor_comissao: resultado.valor_comissao,
    tipo_comissao: resultado.tipo as TipoComissao,
    campanha_id: resultado.campanha_id,
    comissao_fixa_produto_id: resultado.comissao_fixa_produto_id,
  }
}
