'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type {
  CampanhaVenda, CampanhaVendaItem, CampanhaVendaParticipante,
  ResultadoCampanha, ResultadoProduto, ResultadoParticipante,
  CampanhaInput, ItemInput, ParticipanteInput, StatusCampanha,
} from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

async function validarGestor(lojaId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .maybeSingle()
  if (!data) return null
  if (!['dono', 'gerente', 'admin_f5', 'lider'].includes(data.role as string)) return null
  return user.id
}

async function validarMembroLoja(lojaId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .maybeSingle()
  return data ? user.id : null
}

// Retorna hoje em YYYY-MM-DD (sem dependência de timezone do servidor)
function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Criar campanha completa (wizard) ────────────────────────────────────────

export async function criarCampanha(input: {
  lojaId: string
  campanha: CampanhaInput
  itens: ItemInput[]
  participantes: ParticipanteInput[]
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const userId = await validarGestor(input.lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  if (input.itens.length === 0) return { ok: false, error: 'Adicione pelo menos um produto participante.' }

  const admin = createAdminClient()

  const { data: campanha, error: errC } = await admin
    .from('campanhas_venda')
    .insert({
      loja_id: input.lojaId,
      tipo: input.campanha.tipo,
      nome: input.campanha.nome.trim(),
      descricao: input.campanha.descricao?.trim() || null,
      orientacao_equipe: input.campanha.orientacao_equipe?.trim() || null,
      status: 'rascunho',
      data_inicio: input.campanha.data_inicio,
      data_fim: input.campanha.data_fim,
      meta_individual: input.campanha.meta_individual || null,
      meta_loja: input.campanha.meta_loja || null,
      periodicidade: input.campanha.periodicidade,
      unidade_meta: input.campanha.unidade_meta,
      criado_por: userId,
    })
    .select('id')
    .single()

  if (errC || !campanha) return { ok: false, error: errC?.message ?? 'Erro ao criar campanha.' }

  const campanhaId = (campanha as { id: string }).id

  // Itens
  if (input.itens.length > 0) {
    const { error: errI } = await admin
      .from('campanhas_venda_itens')
      .insert(
        input.itens.map((item, idx) => ({
          campanha_id: campanhaId,
          produto_id: item.produto_id,
          quantidade_conteudo: item.quantidade_conteudo,
          unidade_conteudo: item.unidade_conteudo,
          preco_campanha: item.preco_campanha,
          preco_referencia: item.preco_referencia || null,
          ciclo_recompra_dias: item.ciclo_recompra_dias || null,
          ativo: true,
          ordem: item.ordem ?? idx,
        }))
      )
    if (errI) {
      // Limpar campanha criada em caso de erro nos itens
      await admin.from('campanhas_venda').delete().eq('id', campanhaId)
      return { ok: false, error: errI.message }
    }
  }

  // Participantes
  if (input.participantes.length > 0) {
    const { error: errP } = await admin
      .from('campanhas_venda_participantes')
      .insert(
        input.participantes.map(p => ({
          campanha_id: campanhaId,
          perfil_id: p.perfil_id,
          meta_individual: p.meta_individual || null,
          ativo: true,
        }))
      )
    if (errP) return { ok: false, error: errP.message }
  }

  revalidatePath('/campanhas')
  return { ok: true, id: campanhaId }
}

// ─── Atualizar status ─────────────────────────────────────────────────────────

const TRANSICOES_VALIDAS: Record<StatusCampanha, StatusCampanha[]> = {
  rascunho:   ['programada', 'ativa', 'cancelada'],
  programada: ['ativa', 'cancelada'],
  ativa:      ['pausada', 'encerrada', 'cancelada'],
  pausada:    ['ativa', 'encerrada', 'cancelada'],
  encerrada:  [],
  cancelada:  [],
}

export async function atualizarStatusCampanha(
  campanhaId: string,
  lojaId: string,
  novoStatus: StatusCampanha
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarGestor(lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { data: atual } = await admin
    .from('campanhas_venda')
    .select('status, loja_id')
    .eq('id', campanhaId)
    .eq('loja_id', lojaId)
    .maybeSingle()

  if (!atual) return { ok: false, error: 'Campanha não encontrada.' }

  const statusAtual = (atual as { status: StatusCampanha }).status
  if (!TRANSICOES_VALIDAS[statusAtual]?.includes(novoStatus)) {
    return { ok: false, error: `Não é possível mudar de '${statusAtual}' para '${novoStatus}'.` }
  }

  const agora = new Date().toISOString()
  const extra: Record<string, string | null> = { atualizado_em: agora }
  if (novoStatus === 'ativa' && statusAtual !== 'pausada') extra.ativado_em = agora
  if (novoStatus === 'encerrada') extra.encerrado_em = agora

  const { error } = await admin
    .from('campanhas_venda')
    .update({ status: novoStatus, ...extra })
    .eq('id', campanhaId)
    .eq('loja_id', lojaId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/campanhas')
  revalidatePath(`/campanhas/${campanhaId}`)
  return { ok: true }
}

// ─── Atualizar dados da campanha ──────────────────────────────────────────────

export async function atualizarCampanha(
  campanhaId: string,
  lojaId: string,
  input: Partial<CampanhaInput>
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarGestor(lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('campanhas_venda')
    .update({ ...input, atualizado_em: new Date().toISOString() })
    .eq('id', campanhaId)
    .eq('loja_id', lojaId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/campanhas')
  revalidatePath(`/campanhas/${campanhaId}`)
  return { ok: true }
}

// ─── Gerenciar itens ─────────────────────────────────────────────────────────

export async function adicionarItemCampanha(
  campanhaId: string,
  lojaId: string,
  item: ItemInput
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarGestor(lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('campanhas_venda_itens')
    .insert({
      campanha_id: campanhaId,
      produto_id: item.produto_id,
      quantidade_conteudo: item.quantidade_conteudo,
      unidade_conteudo: item.unidade_conteudo,
      preco_campanha: item.preco_campanha,
      preco_referencia: item.preco_referencia || null,
      ciclo_recompra_dias: item.ciclo_recompra_dias || null,
      ativo: true,
      ordem: item.ordem ?? 0,
    })

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/campanhas/${campanhaId}`)
  return { ok: true }
}

export async function inativarItemCampanha(
  itemId: string,
  campanhaId: string,
  lojaId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarGestor(lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('campanhas_venda_itens')
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', itemId)
    .eq('campanha_id', campanhaId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/campanhas/${campanhaId}`)
  return { ok: true }
}

// ─── Gerenciar participantes ──────────────────────────────────────────────────

export async function adicionarParticipante(
  campanhaId: string,
  lojaId: string,
  participante: ParticipanteInput
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarGestor(lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('campanhas_venda_participantes')
    .upsert(
      {
        campanha_id: campanhaId,
        perfil_id: participante.perfil_id,
        meta_individual: participante.meta_individual || null,
        ativo: true,
      },
      { onConflict: 'campanha_id,perfil_id' }
    )

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/campanhas/${campanhaId}`)
  return { ok: true }
}

export async function removerParticipante(
  participanteId: string,
  campanhaId: string,
  lojaId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarGestor(lojaId)
  if (!userId) return { ok: false, error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('campanhas_venda_participantes')
    .update({ ativo: false, data_fim: hoje() })
    .eq('id', participanteId)
    .eq('campanha_id', campanhaId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/campanhas/${campanhaId}`)
  return { ok: true }
}

// ─── Buscar campanhas da loja ─────────────────────────────────────────────────

export async function buscarCampanhasLoja(lojaId: string): Promise<CampanhaVenda[]> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('campanhas_venda')
    .select(`
      *,
      campanhas_venda_itens(*, produtos(nome, foto_url)),
      campanhas_venda_participantes(*, perfis(nome))
    `)
    .eq('loja_id', lojaId)
    .not('status', 'eq', 'cancelada')
    .order('criado_em', { ascending: false })

  if (!data) return []

  return (data as unknown[]).map(rawToModel)
}

// ─── Buscar campanha individual ───────────────────────────────────────────────

export async function buscarCampanha(id: string, lojaId: string): Promise<CampanhaVenda | null> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('campanhas_venda')
    .select(`
      *,
      campanhas_venda_itens(*, produtos(nome, foto_url)),
      campanhas_venda_participantes(*, perfis(nome))
    `)
    .eq('id', id)
    .eq('loja_id', lojaId)
    .maybeSingle()

  if (!data) return null
  return rawToModel(data as unknown)
}

function rawToModel(raw: unknown): CampanhaVenda {
  const r = raw as Record<string, unknown>

  const itens: CampanhaVendaItem[] = ((r.campanhas_venda_itens as unknown[]) ?? []).map(ri => {
    const i = ri as Record<string, unknown>
    const produto = (i.produtos as Record<string, unknown> | null) ?? {}
    return {
      id: i.id as string,
      campanha_id: i.campanha_id as string,
      produto_id: i.produto_id as string,
      produto_nome: (produto.nome as string) ?? '',
      produto_foto_url: (produto.foto_url as string | null) ?? null,
      quantidade_conteudo: Number(i.quantidade_conteudo),
      unidade_conteudo: i.unidade_conteudo as CampanhaVendaItem['unidade_conteudo'],
      preco_campanha: Number(i.preco_campanha),
      preco_referencia: i.preco_referencia != null ? Number(i.preco_referencia) : null,
      ciclo_recompra_dias: i.ciclo_recompra_dias != null ? Number(i.ciclo_recompra_dias) : null,
      ativo: i.ativo as boolean,
      ordem: Number(i.ordem),
    }
  }).sort((a, b) => a.ordem - b.ordem)

  const participantes: CampanhaVendaParticipante[] = ((r.campanhas_venda_participantes as unknown[]) ?? []).map(rp => {
    const p = rp as Record<string, unknown>
    const perfil = (p.perfis as Record<string, unknown> | null) ?? {}
    return {
      id: p.id as string,
      campanha_id: p.campanha_id as string,
      perfil_id: p.perfil_id as string,
      nome: (perfil.nome as string) ?? '',
      meta_individual: p.meta_individual != null ? Number(p.meta_individual) : null,
      ativo: p.ativo as boolean,
      data_inicio: (p.data_inicio as string | null) ?? null,
      data_fim: (p.data_fim as string | null) ?? null,
    }
  })

  return {
    id: r.id as string,
    loja_id: r.loja_id as string,
    tipo: r.tipo as CampanhaVenda['tipo'],
    nome: r.nome as string,
    descricao: (r.descricao as string | null) ?? null,
    orientacao_equipe: (r.orientacao_equipe as string | null) ?? null,
    status: r.status as CampanhaVenda['status'],
    data_inicio: r.data_inicio as string,
    data_fim: r.data_fim as string,
    meta_individual: r.meta_individual != null ? Number(r.meta_individual) : null,
    meta_loja: r.meta_loja != null ? Number(r.meta_loja) : null,
    periodicidade: r.periodicidade as CampanhaVenda['periodicidade'],
    unidade_meta: r.unidade_meta as CampanhaVenda['unidade_meta'],
    criado_por: r.criado_por as string,
    criado_em: r.criado_em as string,
    atualizado_em: r.atualizado_em as string,
    ativado_em: (r.ativado_em as string | null) ?? null,
    encerrado_em: (r.encerrado_em as string | null) ?? null,
    itens,
    participantes,
  }
}

// ─── Resultado da campanha ────────────────────────────────────────────────────

export async function buscarResultadoCampanha(
  campanhaId: string,
  lojaId: string
): Promise<ResultadoCampanha> {
  const admin = createAdminClient()

  const hj = hoje()

  // Buscar todos os itens de venda vinculados à campanha
  const { data: rows } = await admin
    .from('itens_venda')
    .select(`
      id,
      venda_id,
      produto_id,
      quantidade,
      valor_unitario,
      subtotal,
      campanha_venda_item_id,
      vendas!inner(
        id,
        loja_id,
        cliente_id,
        vendedora_id,
        data_compra
      )
    `)
    .eq('campanha_venda_id', campanhaId)
    .eq('vendas.loja_id', lojaId)

  if (!rows || rows.length === 0) {
    return {
      total_unidades: 0, total_transacoes: 0, total_clientes: 0, total_faturamento: 0,
      unidades_hoje: 0, transacoes_hoje: 0, faturamento_hoje: 0,
      por_produto: [], por_participante: [],
    }
  }

  // Buscar participantes para merge do ranking
  const { data: participantesDb } = await admin
    .from('campanhas_venda_participantes')
    .select('perfil_id, meta_individual, ativo, perfis(nome)')
    .eq('campanha_id', campanhaId)

  // Buscar itens da campanha para nome do produto
  const { data: itensDb } = await admin
    .from('campanhas_venda_itens')
    .select('id, produto_id, produtos(nome)')
    .eq('campanha_id', campanhaId)

  const produtoNomeMap = new Map<string, string>()
  for (const item of (itensDb ?? []) as unknown[]) {
    const i = item as Record<string, unknown>
    const produto = i.produtos as Record<string, unknown> | null
    produtoNomeMap.set(i.produto_id as string, (produto?.nome as string) ?? '')
  }

  const participanteNomeMap = new Map<string, string>()
  const participanteMetaMap = new Map<string, number | null>()
  for (const p of (participantesDb ?? []) as unknown[]) {
    const pp = p as Record<string, unknown>
    const perfil = pp.perfis as Record<string, unknown> | null
    participanteNomeMap.set(pp.perfil_id as string, (perfil?.nome as string) ?? '')
    participanteMetaMap.set(pp.perfil_id as string, pp.meta_individual != null ? Number(pp.meta_individual) : null)
  }

  // Agregar resultados
  const vendasUnicas = new Set<string>()
  const clientesUnicos = new Set<string>()
  let totalUnidades = 0
  let totalFaturamento = 0
  let unidadesHoje = 0
  let transacoesHoje = 0
  let faturamentoHoje = 0

  const porProduto = new Map<string, ResultadoProduto>()
  const porParticipante = new Map<string, ResultadoParticipante>()

  for (const row of rows as unknown[]) {
    const r = row as Record<string, unknown>
    const venda = r.vendas as Record<string, unknown>
    const vendaId = venda.id as string
    const clienteId = venda.cliente_id as string
    const vendedoraId = venda.vendedora_id as string
    const dataCompra = venda.data_compra as string
    const produtoId = r.produto_id as string
    const quantidade = Number(r.quantidade)
    const subtotal = Number(r.subtotal)

    vendasUnicas.add(vendaId)
    clientesUnicos.add(clienteId)
    totalUnidades += quantidade
    totalFaturamento += subtotal

    const isHoje = dataCompra === hj
    if (isHoje) {
      unidadesHoje += quantidade
      faturamentoHoje += subtotal
    }

    // Por produto
    const nomeProd = produtoNomeMap.get(produtoId) ?? ''
    const existeProd = porProduto.get(produtoId) ?? { produto_id: produtoId, produto_nome: nomeProd, unidades: 0, transacoes: 0, faturamento: 0 }
    existeProd.unidades += quantidade
    existeProd.faturamento += subtotal
    porProduto.set(produtoId, existeProd)

    // Por participante (vendedora)
    const nomePartic = participanteNomeMap.get(vendedoraId) ?? 'Outros'
    const existePartic = porParticipante.get(vendedoraId) ?? {
      perfil_id: vendedoraId,
      nome: nomePartic,
      unidades: 0,
      transacoes: 0,
      faturamento: 0,
      meta_individual: participanteMetaMap.get(vendedoraId) ?? null,
      pct_meta: null,
    }
    existePartic.unidades += quantidade
    existePartic.faturamento += subtotal
    porParticipante.set(vendedoraId, existePartic)
  }

  // Contar transações por venda (única)
  const transacoesPorVenda = new Set<string>()
  const transacoesPorProdutoVenda = new Map<string, Set<string>>()
  const transacoesPorParticVenda = new Map<string, Set<string>>()

  for (const row of rows as unknown[]) {
    const r = row as Record<string, unknown>
    const venda = r.vendas as Record<string, unknown>
    const vendaId = venda.id as string
    const vendedoraId = venda.vendedora_id as string
    const produtoId = r.produto_id as string
    const dataCompra = venda.data_compra as string

    transacoesPorVenda.add(vendaId)

    const setProd = transacoesPorProdutoVenda.get(produtoId) ?? new Set<string>()
    setProd.add(vendaId)
    transacoesPorProdutoVenda.set(produtoId, setProd)

    const setPartic = transacoesPorParticVenda.get(vendedoraId) ?? new Set<string>()
    setPartic.add(vendaId)
    transacoesPorParticVenda.set(vendedoraId, setPartic)

    if (dataCompra === hj) transacoesHoje++
  }

  // Deduplica transacoes hoje (simplificado: conta itens únicos hoje por venda)
  const vendasHoje = new Set<string>()
  for (const row of rows as unknown[]) {
    const r = row as Record<string, unknown>
    const venda = r.vendas as Record<string, unknown>
    if (venda.data_compra === hj) vendasHoje.add(venda.id as string)
  }
  transacoesHoje = vendasHoje.size

  // Merge transações em por_produto e por_participante
  for (const [id, prod] of porProduto) {
    prod.transacoes = transacoesPorProdutoVenda.get(id)?.size ?? 0
  }
  for (const [id, partic] of porParticipante) {
    partic.transacoes = transacoesPorParticVenda.get(id)?.size ?? 0
    if (partic.meta_individual != null && partic.meta_individual > 0) {
      partic.pct_meta = Math.round((partic.unidades / partic.meta_individual) * 100)
    }
  }

  // Incluir participantes sem vendas
  for (const [perfilId, nome] of participanteNomeMap) {
    if (!porParticipante.has(perfilId)) {
      porParticipante.set(perfilId, {
        perfil_id: perfilId,
        nome,
        unidades: 0,
        transacoes: 0,
        faturamento: 0,
        meta_individual: participanteMetaMap.get(perfilId) ?? null,
        pct_meta: 0,
      })
    }
  }

  return {
    total_unidades: totalUnidades,
    total_transacoes: transacoesPorVenda.size,
    total_clientes: clientesUnicos.size,
    total_faturamento: totalFaturamento,
    unidades_hoje: unidadesHoje,
    transacoes_hoje: transacoesHoje,
    faturamento_hoje: faturamentoHoje,
    por_produto: Array.from(porProduto.values()).sort((a, b) => b.unidades - a.unidades),
    por_participante: Array.from(porParticipante.values()).sort((a, b) => b.unidades - a.unidades),
  }
}

// ─── Detectar campanha ativa para um produto (usado no form de venda) ─────────

export async function detectarCampanhaAtiva(
  lojaId: string,
  produtoId: string
): Promise<{ campanhaId: string; campanhaItemId: string; campanhaNome: string } | null> {
  const admin = createAdminClient()
  const hj = hoje()

  const { data } = await admin
    .from('campanhas_venda_itens')
    .select('id, campanha_id, campanhas_venda!inner(id, nome, loja_id, status, data_inicio, data_fim)')
    .eq('produto_id', produtoId)
    .eq('ativo', true)
    .limit(1)

  if (!data || data.length === 0) return null

  for (const row of data as unknown[]) {
    const r = row as Record<string, unknown>
    const cv = r.campanhas_venda as Record<string, unknown>
    if (
      cv.loja_id === lojaId &&
      cv.status === 'ativa' &&
      (cv.data_inicio as string) <= hj &&
      (cv.data_fim as string) >= hj
    ) {
      return {
        campanhaId: cv.id as string,
        campanhaItemId: r.id as string,
        campanhaNome: cv.nome as string,
      }
    }
  }

  return null
}

// ─── Buscar membros da loja para seleção de participantes ────────────────────

export async function buscarMembrosLoja(lojaId: string): Promise<Array<{ id: string; nome: string; role: string }>> {
  const userId = await validarMembroLoja(lojaId)
  if (!userId) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('perfil_id, role, perfis(nome)')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('criado_em')

  if (!data) return []

  return (data as unknown[]).map(row => {
    const r = row as Record<string, unknown>
    const perfil = r.perfis as Record<string, unknown> | null
    return {
      id: r.perfil_id as string,
      nome: (perfil?.nome as string) ?? '',
      role: r.role as string,
    }
  })
}

// ─── Buscar campanha ativa de um vendedor para o dashboard ───────────────────

export async function buscarCampanhaAtivaDashboard(
  lojaId: string,
  perfilId: string
): Promise<{
  campanha: CampanhaVenda
  metaIndividual: number | null
  unidadesHoje: number
  faturamentoHoje: number
} | null> {
  const admin = createAdminClient()
  const hj = hoje()

  // Buscar campanha ativa onde o perfil participa
  const { data: participacao } = await admin
    .from('campanhas_venda_participantes')
    .select('meta_individual, campanhas_venda!inner(*, campanhas_venda_itens(*, produtos(nome, foto_url)), campanhas_venda_participantes(*, perfis(nome)))')
    .eq('perfil_id', perfilId)
    .eq('ativo', true)
    .eq('campanhas_venda.loja_id', lojaId)
    .eq('campanhas_venda.status', 'ativa')
    .lte('campanhas_venda.data_inicio', hj)
    .gte('campanhas_venda.data_fim', hj)
    .limit(1)

  if (!participacao || participacao.length === 0) return null

  const p = participacao[0] as Record<string, unknown>
  const cvRaw = p.campanhas_venda as unknown
  const campanha = rawToModel(cvRaw)
  const metaIndividual = p.meta_individual != null ? Number(p.meta_individual) : campanha.meta_individual

  // Buscar unidades vendidas hoje por esse vendedor
  const { data: itensHoje } = await admin
    .from('itens_venda')
    .select('quantidade, subtotal, vendas!inner(vendedora_id, data_compra, loja_id)')
    .eq('campanha_venda_id', campanha.id)
    .eq('vendas.vendedora_id', perfilId)
    .eq('vendas.data_compra', hj)
    .eq('vendas.loja_id', lojaId)

  let unidadesHoje = 0
  let faturamentoHoje = 0
  for (const item of (itensHoje ?? []) as unknown[]) {
    const i = item as Record<string, unknown>
    unidadesHoje += Number(i.quantidade)
    faturamentoHoje += Number(i.subtotal)
  }

  return { campanha, metaIndividual, unidadesHoje, faturamentoHoje }
}

// ─── Buscar campanha ativa para o dashboard de gestão ────────────────────────

export async function buscarCampanhaAtivaGestao(lojaId: string): Promise<{
  campanha: CampanhaVenda
  unidadesHoje: number
  metaLojaHoje: number | null
  porParticipante: Array<{ perfilId: string; nome: string; unidades: number }>
} | null> {
  const admin = createAdminClient()
  const hj = hoje()

  const { data: campanhas } = await admin
    .from('campanhas_venda')
    .select('*, campanhas_venda_itens(*, produtos(nome, foto_url)), campanhas_venda_participantes(*, perfis(nome))')
    .eq('loja_id', lojaId)
    .eq('status', 'ativa')
    .lte('data_inicio', hj)
    .gte('data_fim', hj)
    .order('ativado_em', { ascending: false })
    .limit(1)

  if (!campanhas || campanhas.length === 0) return null
  const campanha = rawToModel(campanhas[0] as unknown)

  const { data: itensHoje } = await admin
    .from('itens_venda')
    .select('quantidade, vendas!inner(vendedora_id, data_compra, loja_id)')
    .eq('campanha_venda_id', campanha.id)
    .eq('vendas.data_compra', hj)
    .eq('vendas.loja_id', lojaId)

  let unidadesHoje = 0
  const porVendedora = new Map<string, number>()
  for (const item of (itensHoje ?? []) as unknown[]) {
    const i = item as Record<string, unknown>
    const venda = i.vendas as Record<string, unknown>
    const qty = Number(i.quantidade)
    unidadesHoje += qty
    const vid = venda.vendedora_id as string
    porVendedora.set(vid, (porVendedora.get(vid) ?? 0) + qty)
  }

  const porParticipante = campanha.participantes
    .filter(p => p.ativo)
    .map(p => ({
      perfilId: p.perfil_id,
      nome: p.nome,
      unidades: porVendedora.get(p.perfil_id) ?? 0,
    }))
    .sort((a, b) => b.unidades - a.unidades)

  return {
    campanha,
    unidadesHoje,
    metaLojaHoje: campanha.periodicidade === 'diaria' ? campanha.meta_loja : null,
    porParticipante,
  }
}
