'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolverOuCriarProduto } from '@/lib/produtos/resolver'
import { normalizarNomePessoa, normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'
import { gerarAvisos } from '@/lib/avisos/gerador'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP } from '@/lib/mensagens/templates_padrao'

function ordensAtivasPorQtd(qtd: number): number[] {
  switch (qtd) {
    case 1: return [3]
    case 2: return [1, 3]
    case 3: return [1, 2, 3]
    case 4: return [1, 2, 3, 4]
    default: return [1, 2, 3, 4, 5]
  }
}

type ProdutoInfo = {
  id: string
  ciclo_recompra_dias: number | null
  qtd_mensagens: number | null
  categoria: string | null
  parceiro: string | null
}

const ERRO_AVISO = 'Venda criada, mas não foi possível gerar a recompra. Tente novamente ou acione o suporte.'

// Busca config de recorrência do produto para snapshot no cadastro.
async function buscarConfigProduto(produtoId: string): Promise<{ ciclo: number; qtdMsg: number }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('produtos')
    .select('ciclo_recompra_dias, qtd_mensagens')
    .eq('id', produtoId)
    .maybeSingle()
  return {
    ciclo: (data as unknown as { ciclo_recompra_dias: number | null } | null)?.ciclo_recompra_dias ?? 30,
    qtdMsg: (data as unknown as { qtd_mensagens: number | null } | null)?.qtd_mensagens ?? 5,
  }
}

// Gera e insere avisos de recompra para um item de venda.
// - Idempotente: se já existirem avisos para esta venda, não insere novamente.
// - cicloOverride / qtdMsgOverride: snapshot salvo na lista_espera (prioridade sobre config do produto).
// - Lança Error com ERRO_AVISO se a inserção falhar (sem silenciar).
async function gerarAvisosVendaItem(
  vendaId: string,
  itemVendaId: string,
  anchorProdutoId: string,
  clienteId: string,
  lojaId: string,
  vendedoraId: string,
  clienteNome: string,
  produtoNome: string,
  produtoNomeAncora?: string,
  cicloOverride?: number | null,
  qtdMsgOverride?: number | null,
): Promise<void> {
  const admin = createAdminClient()

  // Idempotência: não gerar se já existirem avisos para esta venda
  const { count } = await admin
    .from('avisos')
    .select('*', { count: 'exact', head: true })
    .eq('venda_id', vendaId)
  if (count && count > 0) return

  const { data: produtoInfo } = await admin
    .from('produtos')
    .select('id, ciclo_recompra_dias, qtd_mensagens, categoria, parceiro')
    .eq('id', anchorProdutoId)
    .maybeSingle()
  const pi = produtoInfo as ProdutoInfo | null
  // Snapshot da lista_espera tem prioridade; fallback na config do produto; fallback nos defaults
  const ciclo = cicloOverride ?? pi?.ciclo_recompra_dias ?? 30
  const qtdMsg = qtdMsgOverride ?? pi?.qtd_mensagens ?? 5
  const categoria = pi?.categoria ?? null
  const parceiro = pi?.parceiro ?? null

  const { data: perfilData } = await admin.from('perfis').select('nome').eq('id', vendedoraId).maybeSingle()
  const { data: lojaInfo } = await admin.from('lojas').select('nome').eq('id', lojaId).maybeSingle()
  const vendedora_nome = (perfilData?.nome as string) ?? ''
  const loja_nome = (lojaInfo?.nome as string) ?? ''

  let { data: mensagensData } = await admin
    .from('mensagens_produto')
    .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
    .eq('produto_id', anchorProdutoId)
    .order('ordem')

  if (!mensagensData || mensagensData.length === 0) {
    const todosPadroes = [...TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP]
    await admin.from('mensagens_produto').insert(todosPadroes.map(t => ({ produto_id: anchorProdutoId, ...t })))
    const res = await admin
      .from('mensagens_produto')
      .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
      .eq('produto_id', anchorProdutoId)
      .order('ordem')
    mensagensData = res.data
  }

  const ordens = ordensAtivasPorQtd(qtdMsg)
  const mensagens = (mensagensData ?? [])
    .filter(m => ordens.includes(m.ordem as number))
    .map(m => ({
      id: m.id as string,
      tipo: (m as unknown as { tipo: string }).tipo ?? 'agradecimento',
      texto: m.texto as string,
      dias_apos_venda: m.dias_apos_venda as number,
      estilo: m.estilo as string | null,
      tipo_incentivo: m.tipo_incentivo as string | null,
      cupom_codigo: m.cupom_codigo as string | null,
      desconto_percentual: m.desconto_percentual != null ? Number(m.desconto_percentual) : null,
      desconto_valor: m.desconto_valor != null ? Number(m.desconto_valor) : null,
      beneficio_texto: m.beneficio_texto as string | null,
      validade_oferta: m.validade_oferta as string | null,
    }))

  if (mensagens.length === 0) throw new Error(ERRO_AVISO)

  const avisos = gerarAvisos(mensagens, {
    venda_id: vendaId,
    item_venda_id: itemVendaId,
    loja_id: lojaId,
    cliente_id: clienteId,
    vendedora_id: vendedoraId,
    cliente_nome: clienteNome,
    produto_nome: produtoNome,
    produto_nome_ancora: produtoNomeAncora,
    vendedora_nome,
    loja_nome,
    categoria,
    parceiro,
  }, new Date().toISOString().split('T')[0], ciclo)

  if (avisos.length > 0) {
    const { error } = await admin.from('avisos').insert(avisos)
    if (error) throw new Error(ERRO_AVISO)
  }
}

export type StatusListaEspera =
  | 'aguardando'
  | 'encontrado_outra_loja'
  | 'avisado'
  | 'convertido'
  | 'perdido'

export async function buscarClienteListaEspera(
  whatsapp: string,
  loja_id: string
): Promise<{ id: string; nome: string } | null> {
  const normalizado = whatsapp.replace(/\D/g, '')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('loja_id', loja_id)
    .eq('whatsapp', normalizado)
    .maybeSingle()
  if (error || !data) return null
  return { id: data.id as string, nome: data.nome as string }
}

async function resolverProdutoId(produtoNome: string, lojaId: string): Promise<string> {
  const { id } = await resolverOuCriarProduto(produtoNome, lojaId, {
    recorrente: true,
    comissionavel_recompra: true,
  })
  return id
}

export interface CriarListaEsperaInput {
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  categoria_id?: string
  valor_potencial?: number | null
  quantidade: number
  observacao?: string
  vendedora_id: string
  data_registro: string
  recorrente?: boolean
}

export async function criarListaEspera(
  input: CriarListaEsperaInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  const whatsappDigits = input.cliente_whatsapp.replace(/\D/g, '')

  let clienteId: string | null = null
  const { data: clienteData } = await supabase
    .from('clientes')
    .upsert(
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: normalizarNomePessoa(input.cliente_nome) },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  clienteId = clienteData?.id ?? null

  let produtoId: string
  try {
    produtoId = await resolverProdutoId(input.produto_nome, input.loja_id)
  } catch {
    return { ok: false, error: 'Não foi possível criar ou vincular o produto. Tente novamente.' }
  }

  const itemRecorrente = input.recorrente ?? true
  const { ciclo, qtdMsg } = itemRecorrente ? await buscarConfigProduto(produtoId) : { ciclo: 30, qtdMsg: 5 }

  const { error } = await supabase.from('lista_espera').insert({
    loja_id: input.loja_id,
    cliente_id: clienteId,
    cliente_nome: normalizarNomePessoa(input.cliente_nome),
    cliente_whatsapp: whatsappDigits,
    produto_nome: normalizarNomeProduto(input.produto_nome),
    produto_id: produtoId,
    categoria_id: input.categoria_id || null,
    valor_potencial: input.valor_potencial ?? null,
    quantidade: input.quantidade,
    observacao: input.observacao?.trim() || null,
    vendedora_id: input.vendedora_id,
    data_registro: input.data_registro,
    status: 'aguardando',
    recorrente: itemRecorrente,
    ciclo_recompra_dias: ciclo,
    qtd_mensagens: qtdMsg,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/lista-espera')
  return { ok: true }
}

export interface ItemListaEspera {
  produto_nome: string
  categoria_id?: string
  valor_potencial?: number | null
  quantidade: number
  recorrente?: boolean
}

export interface CriarListaEsperaMultiplosInput {
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  vendedora_id: string
  data_registro: string
  observacao?: string
  itens: ItemListaEspera[]
}

export async function criarListaEsperaMultiplos(
  input: CriarListaEsperaMultiplosInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  const whatsappDigits = input.cliente_whatsapp.replace(/\D/g, '')
  const clienteNomeNorm = normalizarNomePessoa(input.cliente_nome)

  let clienteId: string | null = null
  const { data: clienteData } = await supabase
    .from('clientes')
    .upsert(
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: clienteNomeNorm },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  clienteId = clienteData?.id ?? null

  // UUID compartilhado para agrupar todos os produtos deste pedido na interface
  const grupoPedidoId = input.itens.length > 1 ? crypto.randomUUID() : null

  for (const item of input.itens) {
    const produtoNomeNorm = normalizarNomeProduto(item.produto_nome)
    let produtoId: string
    try {
      produtoId = await resolverProdutoId(produtoNomeNorm, input.loja_id)
    } catch {
      return { ok: false, error: `Não foi possível criar ou vincular o produto "${produtoNomeNorm}". Tente novamente.` }
    }

    const itemRecorrente = item.recorrente ?? true
    const { ciclo, qtdMsg } = itemRecorrente ? await buscarConfigProduto(produtoId) : { ciclo: 30, qtdMsg: 5 }

    const { error } = await supabase.from('lista_espera').insert({
      loja_id: input.loja_id,
      cliente_id: clienteId,
      cliente_nome: clienteNomeNorm,
      cliente_whatsapp: whatsappDigits,
      produto_nome: produtoNomeNorm,
      produto_id: produtoId,
      categoria_id: item.categoria_id || null,
      valor_potencial: item.valor_potencial ?? null,
      quantidade: item.quantidade,
      observacao: input.observacao?.trim() || null,
      vendedora_id: input.vendedora_id,
      data_registro: input.data_registro,
      status: 'aguardando',
      grupo_pedido_id: grupoPedidoId,
      recorrente: itemRecorrente,
      ciclo_recompra_dias: ciclo,
      qtd_mensagens: qtdMsg,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/lista-espera')
  return { ok: true }
}

export interface EditarListaEsperaInput {
  id: string
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  valor_potencial?: number | null
  quantidade: number
  observacao?: string
  vendedora_id: string
  status: StatusListaEspera
  data_registro: string
}

export async function editarListaEspera(
  input: EditarListaEsperaInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  const { data: item } = await supabase
    .from('lista_espera')
    .select('id')
    .eq('id', input.id)
    .eq('loja_id', input.loja_id)
    .maybeSingle()
  if (!item) return { ok: false, error: 'Item não encontrado ou sem permissão.' }

  const { data: vendedoraMembro } = await supabase
    .from('membros_loja')
    .select('id')
    .eq('loja_id', input.loja_id)
    .eq('perfil_id', input.vendedora_id)
    .eq('ativo', true)
    .maybeSingle()
  if (!vendedoraMembro) return { ok: false, error: 'Vendedora não pertence a esta loja.' }

  const whatsappDigits = input.cliente_whatsapp.replace(/\D/g, '')

  let clienteId: string | null = null
  const { data: clienteData } = await supabase
    .from('clientes')
    .upsert(
      { loja_id: input.loja_id, whatsapp: whatsappDigits, nome: normalizarNomePessoa(input.cliente_nome) },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  clienteId = clienteData?.id ?? null

  let produtoId: string
  try {
    produtoId = await resolverProdutoId(input.produto_nome, input.loja_id)
  } catch {
    return { ok: false, error: 'Não foi possível criar ou vincular o produto. Tente novamente.' }
  }

  let vendaId: string | null = null
  if (input.status === 'convertido') {
    try {
      vendaId = await processarConversaoVenda(
        input.id,
        input.status,
        input.vendedora_id,
        input.cliente_nome,
        input.cliente_whatsapp,
        input.produto_nome,
        produtoId,
        input.valor_potencial,
        input.quantidade
      )
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível converter em venda.' }
    }
    if (!vendaId) {
      return { ok: false, error: 'Não foi possível converter em venda.' }
    }
  }

  const updatePayload: any = {
    cliente_id: clienteId,
    cliente_nome: normalizarNomePessoa(input.cliente_nome),
    cliente_whatsapp: whatsappDigits,
    produto_nome: normalizarNomeProduto(input.produto_nome),
    produto_id: produtoId,
    valor_potencial: input.valor_potencial ?? null,
    quantidade: input.quantidade,
    observacao: input.observacao?.trim() || null,
    vendedora_id: input.vendedora_id,
    data_registro: input.data_registro,
    status: input.status,
    atualizado_em: new Date().toISOString(),
  }
  if (vendaId) {
    updatePayload.venda_id = vendaId
  }

  const { error } = await supabase
    .from('lista_espera')
    .update(updatePayload)
    .eq('id', input.id)
    .eq('loja_id', input.loja_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Cria venda + itens + comissão + avisos para um único item da lista de espera.
// Fluxo atômico: venda_id gravada antes de gerar avisos (idempotência no retry).
// Usa snapshot de recorrente/ciclo/qtd_mensagens da lista_espera.
// Lança Error com mensagem ao usuário se a geração de avisos falhar.
async function processarConversaoVenda(
  itemId: string,
  status: StatusListaEspera,
  vendedoraIdInput?: string,
  clienteNomeInput?: string,
  clienteWhatsappInput?: string,
  produtoNomeInput?: string,
  produtoIdInput?: string,
  valorPotencialInput?: number | null,
  quantidadeInput?: number,
  responsavelVendaId?: string
): Promise<string | null> {
  if (status !== 'convertido') return null

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: item } = await supabase
    .from('lista_espera')
    .select('id, loja_id, cliente_id, cliente_nome, cliente_whatsapp, produto_id, produto_nome, valor_potencial, quantidade, vendedora_id, venda_id, recorrente, ciclo_recompra_dias, qtd_mensagens')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) return null

  const loja_id = item.loja_id as string
  // Snapshot de recorrência — fallback true para registros legados sem a coluna
  const itemRecorrente = (item as unknown as { recorrente: boolean | null }).recorrente ?? true
  const itemCiclo = (item as unknown as { ciclo_recompra_dias: number | null }).ciclo_recompra_dias ?? 30
  const itemQtdMsg = (item as unknown as { qtd_mensagens: number | null }).qtd_mensagens ?? 5

  let vendedora_id = (vendedoraIdInput ?? item.vendedora_id) as string
  if (responsavelVendaId) {
    const { data: membroAtivo } = await admin
      .from('membros_loja')
      .select('id')
      .eq('loja_id', loja_id)
      .eq('perfil_id', responsavelVendaId)
      .eq('ativo', true)
      .maybeSingle()
    if (membroAtivo) vendedora_id = responsavelVendaId
  }

  const cliente_nome = (clienteNomeInput ?? item.cliente_nome ?? 'Cliente').trim()
  const cliente_whatsapp = (clienteWhatsappInput ?? item.cliente_whatsapp ?? '').replace(/\D/g, '')
  const produto_nome = (produtoNomeInput ?? item.produto_nome ?? 'Produto').trim()
  const valor_potencial = valorPotencialInput !== undefined ? valorPotencialInput : item.valor_potencial
  const quantidade = quantidadeInput !== undefined ? quantidadeInput : (item.quantidade ?? 1)

  let finalClienteId = item.cliente_id as string | null
  const { data: clienteData } = await admin
    .from('clientes')
    .upsert(
      { loja_id, whatsapp: cliente_whatsapp, nome: cliente_nome },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  if (clienteData) finalClienteId = clienteData.id as string

  let finalProdutoId = (produtoIdInput ?? item.produto_id) as string | null
  if (!finalProdutoId) {
    try {
      const info = await resolverOuCriarProduto(produto_nome, loja_id, {
        recorrente: true,
        comissionavel_recompra: true,
      })
      finalProdutoId = info.id
    } catch { /* ignore */ }
  }

  // Retry: venda já criada — garantir avisos e retornar
  if (item.venda_id) {
    const existingVendaId = item.venda_id as string
    if (itemRecorrente && finalProdutoId && finalClienteId) {
      const { data: ivData } = await admin
        .from('itens_venda')
        .select('id')
        .eq('venda_id', existingVendaId)
        .maybeSingle()
      const itemVendaId = (ivData as unknown as { id: string } | null)?.id ?? null
      if (itemVendaId) {
        await gerarAvisosVendaItem(existingVendaId, itemVendaId, finalProdutoId, finalClienteId, loja_id, vendedora_id, cliente_nome, produto_nome, undefined, itemCiclo, itemQtdMsg)
      }
    }
    return existingVendaId
  }

  const valPot = valor_potencial ? Number(valor_potencial) : 0
  const valorTotal = valPot * quantidade

  const { data: vendaData } = await admin
    .from('vendas')
    .insert({
      loja_id,
      cliente_id: finalClienteId,
      vendedora_id,
      valor: valorTotal,
      data_compra: new Date().toISOString().split('T')[0],
      origem: 'lista_espera',
    })
    .select('id')
    .single()

  if (!vendaData) return null
  const newVendaId = vendaData.id as string

  const { data: itemVendaRes } = await admin.from('itens_venda').insert({
    venda_id: newVendaId,
    produto_id: finalProdutoId,
    produto_nome,
    recorrente: itemRecorrente,
    comissionavel: true,
    quantidade,
    valor_unitario: valPot,
    subtotal: valorTotal,
    ciclo_recompra_dias: itemRecorrente ? itemCiclo : null,
  }).select('id').single()
  const itemVendaId = (itemVendaRes as unknown as { id: string } | null)?.id ?? null

  const { gravarComissaoVenda } = await import('@/lib/comissoes/gravar')
  await gravarComissaoVenda({
    loja_id,
    venda_id: newVendaId,
    vendedora_id,
    data_venda: new Date().toISOString().split('T')[0],
    itens: [{ produto_id: finalProdutoId, produto_nome, subtotal: valorTotal, comissionavel: false }],
  })

  // Gravar venda_id antes dos avisos — impede duplicar a venda em retentativas
  await admin.from('lista_espera').update({ venda_id: newVendaId }).eq('id', itemId).eq('loja_id', loja_id)

  // Gerar avisos apenas para produto recorrente — lança erro se falhar
  if (itemRecorrente && finalProdutoId && finalClienteId && itemVendaId) {
    await gerarAvisosVendaItem(newVendaId, itemVendaId, finalProdutoId, finalClienteId, loja_id, vendedora_id, cliente_nome, produto_nome, undefined, itemCiclo, itemQtdMsg)
  }

  return newVendaId
}

export async function buscarMembrosAtivosLoja(lojaId: string): Promise<Array<{ id: string; nome: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: membroLogado } = await admin
    .from('membros_loja')
    .select('id')
    .eq('loja_id', lojaId)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membroLogado) return []

  const { data: membros } = await admin
    .from('membros_loja')
    .select('perfil_id, perfis(id, nome)')
    .eq('loja_id', lojaId)
    .eq('ativo', true)

  return (membros ?? []).map(m => {
    const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
    const perfil = Array.isArray(p) ? p[0] : p
    return { id: m.perfil_id as string, nome: perfil?.nome ?? 'Sem nome' }
  })
}

// Atualiza status de múltiplos itens do mesmo pedido (grupo) de uma só vez.
// Na conversão: 1 venda + N itens_venda + avisos apenas para itens recorrentes.
// Idempotente: venda_id gravada antes dos avisos; avisos verificados antes de inserir.
export async function atualizarStatusGrupoListaEspera(
  ids: string[],
  status: StatusListaEspera,
  lojaId: string,
  responsavelVendaId?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!ids.length) return { ok: false, error: 'Nenhum item selecionado.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', lojaId)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  if (status !== 'convertido') {
    const { error } = await supabase
      .from('lista_espera')
      .update({ status, atualizado_em: new Date().toISOString() })
      .in('id', ids)
      .eq('loja_id', lojaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/lista-espera')
    return { ok: true }
  }

  // Conversão de grupo: 1 venda + N itens_venda
  const admin = createAdminClient()

  const { data: itens } = await supabase
    .from('lista_espera')
    .select('id, loja_id, cliente_id, cliente_nome, cliente_whatsapp, produto_id, produto_nome, valor_potencial, quantidade, vendedora_id, venda_id, recorrente, ciclo_recompra_dias, qtd_mensagens')
    .in('id', ids)
    .eq('loja_id', lojaId)

  if (!itens || itens.length === 0) return { ok: false, error: 'Items não encontrados.' }

  const cliente_nome = (itens[0].cliente_nome ?? 'Cliente') as string
  const cliente_whatsapp = ((itens[0].cliente_whatsapp ?? '') as string).replace(/\D/g, '')

  let clienteId = itens[0].cliente_id as string | null
  const { data: clienteData } = await admin
    .from('clientes')
    .upsert(
      { loja_id: lojaId, whatsapp: cliente_whatsapp, nome: cliente_nome },
      { onConflict: 'loja_id,whatsapp' }
    )
    .select('id')
    .single()
  if (clienteData) clienteId = clienteData.id as string

  type ItemLE = typeof itens[0] & { recorrente: boolean | null; ciclo_recompra_dias: number | null; qtd_mensagens: number | null }

  // Retry: venda já existe — garantir avisos e atualizar status
  const itemComVenda = itens.find(i => i.venda_id)
  if (itemComVenda) {
    const vendaExistente = itemComVenda.venda_id as string
    const recorrentes = (itens as unknown as ItemLE[]).filter(i => (i.recorrente ?? true) === true)
    const anchorLE = recorrentes.length > 0
      ? recorrentes.reduce((a, b) => ((a.ciclo_recompra_dias ?? 30) <= (b.ciclo_recompra_dias ?? 30) ? a : b))
      : null

    if (anchorLE && anchorLE.produto_id && clienteId) {
      const { data: ivRetry } = await admin.from('itens_venda').select('id').eq('venda_id', vendaExistente).maybeSingle()
      const itemVendaIdRetry = (ivRetry as unknown as { id: string } | null)?.id ?? null

      if (itemVendaIdRetry) {
        const nomesProdutos = itens.map(i => i.produto_nome as string)
        const produto_nome_lista = nomesProdutos.length === 1
          ? nomesProdutos[0]
          : nomesProdutos.length === 2
            ? `${nomesProdutos[0]} e ${nomesProdutos[1]}`
            : `${nomesProdutos.slice(0, -1).join(', ')} e ${nomesProdutos[nomesProdutos.length - 1]}`
        const anchorNome = anchorLE.produto_nome as string | undefined
        try {
          await gerarAvisosVendaItem(
            vendaExistente, itemVendaIdRetry, anchorLE.produto_id as string, clienteId,
            lojaId, (itens[0].vendedora_id ?? '') as string,
            cliente_nome, produto_nome_lista,
            nomesProdutos.length > 1 ? anchorNome : undefined,
            anchorLE.ciclo_recompra_dias ?? 30,
            anchorLE.qtd_mensagens ?? 5,
          )
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : ERRO_AVISO }
        }
      }
    }

    const { error } = await supabase
      .from('lista_espera')
      .update({ status, atualizado_em: new Date().toISOString() })
      .in('id', ids)
      .eq('loja_id', lojaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/lista-espera')
    return { ok: true }
  }

  // Novo: criar venda, itens e avisos
  let vendedora_id = (itens[0].vendedora_id ?? '') as string
  if (responsavelVendaId) {
    const { data: membroAtivo } = await admin
      .from('membros_loja')
      .select('id')
      .eq('loja_id', lojaId)
      .eq('perfil_id', responsavelVendaId)
      .eq('ativo', true)
      .maybeSingle()
    if (membroAtivo) vendedora_id = responsavelVendaId
  }

  const valorTotal = itens.reduce((acc, i) => {
    const val = (i.valor_potencial as number | null) ?? 0
    const qty = (i.quantidade as number) ?? 1
    return acc + val * qty
  }, 0)

  const { data: vendaData } = await admin
    .from('vendas')
    .insert({
      loja_id: lojaId,
      cliente_id: clienteId,
      vendedora_id,
      valor: valorTotal,
      data_compra: new Date().toISOString().split('T')[0],
      origem: 'lista_espera',
    })
    .select('id')
    .single()

  if (!vendaData) return { ok: false, error: 'Não foi possível criar a venda.' }
  const newVendaId = vendaData.id as string

  const itensVendaPayload = (itens as unknown as ItemLE[]).map(item => {
    const isRec = item.recorrente ?? true
    let produtoId = item.produto_id as string | null
    return {
      _resolvedProdutoId: produtoId,
      _itemLE: item,
      venda_id: newVendaId,
      produto_id: produtoId,
      produto_nome: item.produto_nome as string,
      recorrente: isRec,
      comissionavel: true,
      quantidade: (item.quantidade as number) ?? 1,
      valor_unitario: (item.valor_potencial as number | null) ?? 0,
      subtotal: ((item.valor_potencial as number | null) ?? 0) * ((item.quantidade as number) ?? 1),
      ciclo_recompra_dias: isRec ? (item.ciclo_recompra_dias ?? 30) : null,
    }
  })

  // Resolver produtos sem ID antes de inserir
  for (const payload of itensVendaPayload) {
    if (!payload.produto_id) {
      try {
        const info = await resolverOuCriarProduto(payload.produto_nome, lojaId, {
          recorrente: true,
          comissionavel_recompra: true,
        })
        payload.produto_id = info.id
        payload._resolvedProdutoId = info.id
      } catch { /* ignore */ }
    }
  }

  const dbPayload = itensVendaPayload.map(({ _resolvedProdutoId: _r, _itemLE: _i, ...rest }) => rest)
  const { data: itensVendaRes } = await admin.from('itens_venda').insert(dbPayload).select('id, produto_id')

  const { gravarComissaoVenda } = await import('@/lib/comissoes/gravar')
  await gravarComissaoVenda({
    loja_id: lojaId,
    venda_id: newVendaId,
    vendedora_id,
    data_venda: new Date().toISOString().split('T')[0],
    itens: dbPayload.map(i => ({
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      subtotal: i.subtotal,
      comissionavel: false,
    })),
  })

  // Gravar venda_id antes dos avisos — impede duplicar a venda em retentativas
  await supabase
    .from('lista_espera')
    .update({ venda_id: newVendaId })
    .in('id', ids)
    .eq('loja_id', lojaId)

  // Avisos apenas para itens recorrentes — âncora = menor ciclo entre recorrentes
  const recorrentesLE = (itens as unknown as ItemLE[]).filter(i => (i.recorrente ?? true) === true)

  if (recorrentesLE.length > 0 && clienteId) {
    const anchorLE = recorrentesLE.reduce((a, b) =>
      ((a.ciclo_recompra_dias ?? 30) <= (b.ciclo_recompra_dias ?? 30) ? a : b)
    )

    // Encontrar item_venda_id do âncora nos resultados inseridos
    const anchorProdutoId = anchorLE.produto_id as string | null
      ?? itensVendaPayload.find(p => p.produto_nome === anchorLE.produto_nome)?._resolvedProdutoId
      ?? null

    const anchorIV = (itensVendaRes ?? []).find(iv =>
      (iv as unknown as { produto_id: string | null }).produto_id === anchorProdutoId
    )
    const anchorItemVendaId = anchorIV ? (anchorIV as unknown as { id: string }).id : null

    if (anchorItemVendaId && anchorProdutoId) {
      const nomesProdutos = (itens as unknown as ItemLE[]).map(i => i.produto_nome as string)
      const produto_nome_lista = nomesProdutos.length === 1
        ? nomesProdutos[0]
        : nomesProdutos.length === 2
          ? `${nomesProdutos[0]} e ${nomesProdutos[1]}`
          : `${nomesProdutos.slice(0, -1).join(', ')} e ${nomesProdutos[nomesProdutos.length - 1]}`
      const anchorNome = anchorLE.produto_nome as string | undefined

      try {
        await gerarAvisosVendaItem(
          newVendaId, anchorItemVendaId, anchorProdutoId, clienteId,
          lojaId, vendedora_id, cliente_nome, produto_nome_lista,
          nomesProdutos.length > 1 ? anchorNome : undefined,
          anchorLE.ciclo_recompra_dias ?? 30,
          anchorLE.qtd_mensagens ?? 5,
        )
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : ERRO_AVISO }
      }
    }
  }

  // Só marca como convertido após avisos gerados com sucesso
  const { error } = await supabase
    .from('lista_espera')
    .update({ status, atualizado_em: new Date().toISOString() })
    .in('id', ids)
    .eq('loja_id', lojaId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/lista-espera')
  return { ok: true }
}

export async function atualizarStatusListaEspera(
  id: string,
  status: StatusListaEspera,
  responsavelVendaId?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }

  const { data: item } = await supabase
    .from('lista_espera')
    .select('loja_id, vendedora_id')
    .eq('id', id)
    .maybeSingle()
  if (!item) return { ok: false, error: 'Item não encontrado.' }

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', item.loja_id)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!membro) return { ok: false, error: 'Você não pertence a esta loja.' }

  let vendaId: string | null = null
  if (status === 'convertido') {
    try {
      vendaId = await processarConversaoVenda(id, status, undefined, undefined, undefined, undefined, undefined, undefined, undefined, responsavelVendaId)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível converter em venda.' }
    }
    if (!vendaId) {
      return { ok: false, error: 'Não foi possível converter em venda.' }
    }
  }

  const updatePayload: any = {
    status,
    atualizado_em: new Date().toISOString(),
  }
  if (vendaId) {
    updatePayload.venda_id = vendaId
  }

  const { error } = await supabase
    .from('lista_espera')
    .update(updatePayload)
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/lista-espera')
  return { ok: true }
}
