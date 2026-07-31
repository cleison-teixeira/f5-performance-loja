'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gravarComissaoVenda } from '@/lib/comissoes/gravar'
import { gerarAvisosParaVenda, type ItemParaGerarAviso } from '@/lib/avisos/gerarParaVenda'

export async function marcarEnviado(aviso_id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('avisos')
      .update({ status: 'contato_feito', enviado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', aviso_id)

    if (error) return { ok: false, erro: error.message }
    revalidatePath('/avisos')
    revalidatePath('/relacionamento')
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function removerPorOptOut(aviso_id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('avisos')
      .update({
        status: 'contato_feito',
        enviado_em: new Date().toISOString(),
        observacao_resultado: 'Removido da fila por opt-out / cliente marcado como Não Contatar',
        updated_at: new Date().toISOString(),
      })
      .eq('id', aviso_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function editarTextoAviso(
  aviso_id: string,
  texto: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const texto_limpo = texto.trim()
    if (!texto_limpo) return { ok: false, erro: 'O texto não pode ser vazio' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('avisos')
      .update({ texto_renderizado: texto_limpo, updated_at: new Date().toISOString() })
      .eq('id', aviso_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export interface ItemRecompraInput {
  produto_id: string | null
  produto_nome: string
  comissionavel: boolean
  quantidade: number
  preco_unitario: number
  ciclo_recompra_dias?: number | null
  // Origem do item (item_venda_id da oportunidade original que ele representa).
  // null para produtos novos adicionados nesta confirmação, sem oportunidade prévia.
  // Tratado como ALEGAÇÃO do cliente — a Server Action valida contra o banco antes de usar.
  item_venda_id?: string | null
}

// venda_original_id, loja_id e cliente_id continuam no payload por compatibilidade
// com o cliente atual, mas NUNCA são usados como fonte de verdade — a Server Action
// deriva esses valores do próprio aviso (dados.aviso_id) buscado no banco.
interface DadosRecompra {
  aviso_id: string
  venda_original_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  itens: ItemRecompraInput[]
}

// Únicos tipos de mensagem que representam uma oportunidade de recompra elegível
// para este fluxo (mesmo conjunto que habilita o botão "Confirmar recompra" na UI —
// ver isValorPotencial em CardAviso.tsx e TIPOS_RECOMPRA em AvisosLista.tsx).
const TIPOS_RECOMPRA_ELEGIVEIS = new Set(['recompra', 'oferta', 'follow_up'])

type ResultadoRecompra =
  | {
      ok: true
      recompra_id: string
      valor_total: number
      valor_base_comissao: number
      valor_comissao: number
      percentual: number
      jaConfirmada?: boolean
      // Traço informativo (não persistido): true somente se o item que originou a
      // oportunidade (item_venda_id do aviso âncora) permaneceu na venda final com
      // o MESMO produto. false cobre tanto remoção quanto substituição do produto
      // de origem — ambas válidas para o negócio, mas úteis de distinguir em logs.
      produto_original_preservado?: boolean
    }
  | { ok: false; erro: string }

export async function confirmarRecompra(dados: DadosRecompra): Promise<ResultadoRecompra> {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    // ── Âncora confiável: busca o aviso diretamente no banco. venda_id, loja_id,
    //    cliente_id e item_venda_id vêm SEMPRE daqui — nunca dos campos equivalentes
    //    que o cliente manda em `dados` (esses são só dado legado do payload, ignorado
    //    como fonte de autoridade). ──
    const { data: avisoAncora } = await admin
      .from('avisos')
      .select('id, venda_id, loja_id, cliente_id, item_venda_id, status, recompra_id, mensagem_id')
      .eq('id', dados.aviso_id)
      .single()

    if (!avisoAncora) {
      return { ok: false, erro: 'Aviso não encontrado.' }
    }

    // Idempotency guard: if aviso already converted, return safe success
    if (avisoAncora.status === 'convertida' || avisoAncora.recompra_id) {
      return {
        ok: true,
        recompra_id: (avisoAncora.recompra_id as string | null) ?? '',
        valor_total: 0,
        valor_base_comissao: 0,
        valor_comissao: 0,
        percentual: 0,
        jaConfirmada: true,
      }
    }

    // Validação de tipo do aviso âncora: só recompra/oferta/follow_up podem originar
    // uma recompra. Impede que um aviso de agradecimento/relacionamento (ou uma
    // chamada direta/adulterada) seja usado para criar uma recompra.
    let tipoAncora: string | null = null
    if (avisoAncora.mensagem_id) {
      const { data: msgAncora } = await admin
        .from('mensagens_produto')
        .select('tipo')
        .eq('id', avisoAncora.mensagem_id as string)
        .maybeSingle()
      tipoAncora = (msgAncora?.tipo as string | undefined) ?? null
    }
    if (!tipoAncora || !TIPOS_RECOMPRA_ELEGIVEIS.has(tipoAncora)) {
      return { ok: false, erro: 'Este aviso não representa uma oportunidade de recompra.' }
    }

    const vendaId = avisoAncora.venda_id as string
    const lojaId = avisoAncora.loja_id as string
    const clienteId = avisoAncora.cliente_id as string
    const itemVendaIdAncora = avisoAncora.item_venda_id as string | null

    // Validar usuário logado e pertencimento à loja antes de gravar com admin
    // (loja derivada do aviso — dados.loja_id nunca é usado aqui)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const { data: membroLogado } = await admin
      .from('membros_loja')
      .select('loja_id')
      .eq('perfil_id', user.id)
      .eq('loja_id', lojaId)
      .eq('ativo', true)
      .maybeSingle()
    if (!membroLogado) return { ok: false, erro: 'Acesso negado à loja' }

    if (dados.vendedora_id !== user.id) {
      const { data: membroResponsavel } = await admin
        .from('membros_loja')
        .select('loja_id')
        .eq('perfil_id', dados.vendedora_id)
        .eq('loja_id', lojaId)
        .eq('ativo', true)
        .maybeSingle()
      if (!membroResponsavel) return { ok: false, erro: 'Responsável não pertence à loja' }
    }

    if (dados.itens.length === 0) {
      return { ok: false, erro: 'A recompra precisa ter pelo menos um produto.' }
    }

    // ── Conjunto autorizado: itens recorrentes da própria venda de origem (vendaId,
    //    derivado do aviso âncora). Numa venda multiproduto, o motor de avisos gera
    //    avisos só para o item âncora (menor ciclo_recompra_dias) — o texto menciona
    //    todos os produtos recorrentes, mas estruturalmente só o âncora tem avisos
    //    próprios. Por isso a elegibilidade é por "pertence à venda + é recorrente",
    //    não por "tem aviso ativo próprio" — do contrário, itens secundários mantidos
    //    na confirmação seriam rejeitados por engano. ──
    const { data: itensVendaOriginais } = await admin
      .from('itens_venda')
      .select('id, produto_id, produto_nome')
      .eq('venda_id', vendaId)
      .eq('recorrente', true)

    const itensVendaMap = new Map(
      (itensVendaOriginais ?? []).map(iv => [iv.id as string, iv as { produto_id: string | null; produto_nome: string }])
    )
    const itemVendaIdsElegiveis = new Set(itensVendaMap.keys())

    // Avisos ativos desta oportunidade (venda/loja/cliente), usados só para fechar
    // residuais de qualquer tipo cujo item_venda_id permaneça na confirmação — mesma
    // regra hoje aplicada pelos antigos passos 7b/7c.
    const { data: avisosAtivosRaw } = await admin
      .from('avisos')
      .select('id, item_venda_id')
      .eq('venda_id', vendaId)
      .eq('loja_id', lojaId)
      .eq('cliente_id', clienteId)
      .is('recompra_id', null)
      .in('status', ['pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada'])
      .not('item_venda_id', 'is', null)

    // ── Validação do payload contra o conjunto autorizado ──
    // O item que originou a oportunidade (âncora) segue determinando escopo
    // (venda/loja/cliente/avisos a encerrar), mas NÃO é mais obrigatório na
    // seleção final: o cliente pode decidir na loja comprar produto diferente
    // do que motivou o aviso, inclusive substituindo o item de origem inteiro.
    const idsRecebidos = dados.itens
      .map(i => i.item_venda_id)
      .filter((id): id is string => !!id)

    if (new Set(idsRecebidos).size !== idsRecebidos.length) {
      return { ok: false, erro: 'Produto duplicado na confirmação.' }
    }

    // Produtos existentes na loja: qualquer produto_id enviado (item original
    // reaproveitado ou produto novo adicionado na confirmação) precisa pertencer
    // ao catálogo desta loja. produto_id nulo é permitido (produto sem vínculo de
    // catálogo, ex.: aviso legado) e não é validado aqui.
    const produtoIdsSubmetidos = [...new Set(dados.itens.map(i => i.produto_id).filter((id): id is string => !!id))]
    const { data: produtosValidos } = produtoIdsSubmetidos.length > 0
      ? await admin.from('produtos').select('id').eq('loja_id', lojaId).in('id', produtoIdsSubmetidos)
      : { data: [] as { id: string }[] }
    const produtoIdsValidos = new Set((produtosValidos ?? []).map(p => p.id as string))

    for (const item of dados.itens) {
      if (item.produto_id && !produtoIdsValidos.has(item.produto_id)) {
        return { ok: false, erro: 'Um dos produtos não existe nesta loja.' }
      }
      if (!item.item_venda_id) continue
      // item_venda_id continua validado contra o conjunto autorizado (impede
      // reaproveitar um item de outra venda/loja) — mas o produto anexado a ele
      // pode ter sido substituído; não exigimos mais que bata com o registro
      // original de itens_venda.
      if (!itemVendaIdsElegiveis.has(item.item_venda_id)) {
        return { ok: false, erro: 'Um dos produtos não pertence a esta oportunidade de recompra.' }
      }
    }

    const hoje = new Date().toISOString().slice(0, 10)
    const valor_total = dados.itens.reduce(
      (acc, item) => acc + item.quantidade * item.preco_unitario, 0
    )
    const valor_base_comissao = dados.itens
      .filter(item => item.comissionavel)
      .reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0)

    // 1. Criar venda canônica com origem='recompra'
    const { data: vendaData, error: vendaError } = await admin
      .from('vendas')
      .insert({
        loja_id: lojaId,
        cliente_id: clienteId,
        vendedora_id: dados.vendedora_id,
        valor: valor_total,
        data_compra: hoje,
        origem: 'recompra',
      })
      .select('id')
      .single()

    if (vendaError || !vendaData) {
      return { ok: false, erro: 'Erro ao criar venda: ' + (vendaError?.message ?? 'desconhecido') }
    }

    const nova_venda_id = vendaData.id as string

    // 2. Resolver ciclo_recompra_dias: usa o valor enviado pelo cliente; para itens sem ciclo,
    //    busca dias_apos_venda da mensagem tipo='recompra' do produto; fallback 30.
    const itensComCiclo = await Promise.all(
      dados.itens.map(async (item) => {
        let ciclo: number | null = item.ciclo_recompra_dias ?? null
        if (ciclo == null && item.produto_id) {
          const { data: msgRec } = await admin
            .from('mensagens_produto')
            .select('dias_apos_venda')
            .eq('produto_id', item.produto_id)
            .eq('tipo', 'recompra')
            .order('ordem')
            .limit(1)
            .maybeSingle()
          ciclo = (msgRec?.dias_apos_venda as number | null) ?? 30
        } else if (ciclo == null) {
          ciclo = 30
        }
        return { ...item, ciclo_recompra_dias: ciclo as number }
      })
    )

    // 3. INSERT itens_venda (com ciclo_recompra_dias propagado)
    const { data: itensVendaData, error: itensVendaError } = await admin
      .from('itens_venda')
      .insert(
        itensComCiclo.map(item => ({
          venda_id: nova_venda_id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          recorrente: true,
          comissionavel: item.comissionavel,
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          ciclo_recompra_dias: item.ciclo_recompra_dias,
        }))
      )
      .select('id, produto_id, produto_nome, ciclo_recompra_dias')

    if (itensVendaError || !itensVendaData) {
      return { ok: false, erro: 'Erro ao registrar itens da venda: ' + (itensVendaError?.message ?? 'desconhecido') }
    }

    // 4. INSERT recompra com venda_id canônico
    const { data: recompraData, error: recompraError } = await admin
      .from('recompras')
      .insert({
        loja_id: lojaId,
        cliente_id: clienteId,
        vendedora_id: dados.vendedora_id,
        aviso_id: dados.aviso_id,
        venda_original_id: vendaId,
        valor_total,
        valor_base_comissao,
        venda_id: nova_venda_id,
      })
      .select('id')
      .single()

    if (recompraError || !recompraData) {
      return { ok: false, erro: 'Erro ao registrar recompra: ' + (recompraError?.message ?? 'desconhecido') }
    }

    const recompra_id = recompraData.id as string

    // 5. INSERT itens_recompra (mantidos)
    const { error: itensRecompraError } = await admin.from('itens_recompra').insert(
      dados.itens.map(item => ({
        recompra_id,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        comissionavel: item.comissionavel,
        quantidade: item.quantidade,
        valor_unitario: item.preco_unitario,
        subtotal: item.quantidade * item.preco_unitario,
      }))
    )

    if (itensRecompraError) {
      return { ok: false, erro: 'Erro ao registrar itens da recompra: ' + itensRecompraError.message }
    }

    // 6. Gerar comissão via helper canônico
    const comissaoResult = await gravarComissaoVenda({
      loja_id: lojaId,
      venda_id: nova_venda_id,
      vendedora_id: dados.vendedora_id,
      data_venda: hoje,
      recompra_id,
      itens: dados.itens.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        subtotal: item.quantidade * item.preco_unitario,
        comissionavel: item.comissionavel,
      })),
    })

    if (!comissaoResult.ok) {
      return { ok: false, erro: 'Erro ao registrar comissão: ' + comissaoResult.erro }
    }

    // 7. Fechar avisos por ID exato, capturado no snapshot autorizado (substitui os
    //    antigos passos 7/7b/7c). Fecha: (a) sempre o próprio dados.aviso_id — garante
    //    o fechamento mesmo no caso legado de item_venda_id nulo, que fica de fora do
    //    snapshot; (b) todo aviso ativo (qualquer tipo) cujo item_venda_id pertença ao
    //    item âncora OU a algum item mantido no payload — preserva a regra atual de
    //    fechar também agradecimento/relacionamento residuais do mesmo item. O item
    //    âncora entra sempre neste conjunto, mesmo quando substituído/removido da
    //    seleção final: a oportunidade original foi resolvida (com ou sem o produto
    //    que a originou), então seus avisos residuais não podem ficar pendentes.
    const agora = new Date().toISOString()

    const itemVendaIdsParaFechar = new Set(idsRecebidos)
    if (itemVendaIdAncora) itemVendaIdsParaFechar.add(itemVendaIdAncora)

    const avisoIdsParaFechar = new Set<string>([dados.aviso_id])
    for (const a of avisosAtivosRaw ?? []) {
      if (itemVendaIdsParaFechar.has(a.item_venda_id as string)) {
        avisoIdsParaFechar.add(a.id as string)
      }
    }

    // O aviso âncora recebe enviado_em (é o aviso efetivamente "acionado"); os demais
    // fechados como efeito colateral da mesma recompra não recebem — igual à regra anterior.
    await admin
      .from('avisos')
      .update({
        status: 'convertida',
        enviado_em: agora,
        encerrado_em: agora,
        encerrado_por: dados.vendedora_id,
        updated_at: agora,
        recompra_id,
      })
      .eq('id', dados.aviso_id)

    const outrosAvisoIds = [...avisoIdsParaFechar].filter(id => id !== dados.aviso_id)
    if (outrosAvisoIds.length > 0) {
      await admin
        .from('avisos')
        .update({
          status: 'convertida',
          encerrado_em: agora,
          encerrado_por: dados.vendedora_id,
          updated_at: agora,
          recompra_id,
        })
        .in('id', outrosAvisoIds)
    }

    // 8. Gerar novos avisos futuros — sequência agrupada (motor unificado, sem agradecimento)
    const [clienteRes, vendedoraRes, lojaRes] = await Promise.all([
      admin.from('clientes').select('nome').eq('id', clienteId).single(),
      admin.from('perfis').select('nome').eq('id', dados.vendedora_id).single(),
      admin.from('lojas').select('nome').eq('id', lojaId).single(),
    ])

    const itensParaGerar: ItemParaGerarAviso[] = itensVendaData.map(iv => ({
      id: iv.id as string,
      produto_id: iv.produto_id as string | null,
      produto_nome: iv.produto_nome as string,
      recorrente: true,
      ciclo_recompra_dias: (iv as unknown as { ciclo_recompra_dias: number | null }).ciclo_recompra_dias ?? null,
    }))

    const { avisos: novosAvisos } = await gerarAvisosParaVenda({
      venda_id: nova_venda_id,
      loja_id: lojaId,
      cliente_id: clienteId,
      vendedora_id: dados.vendedora_id,
      cliente_nome: (clienteRes.data?.nome as string) ?? '',
      vendedora_nome: (vendedoraRes.data?.nome as string) ?? '',
      loja_nome: (lojaRes.data?.nome as string) ?? '',
      data_base: hoje,
      origem: 'recompra',
      itens: itensParaGerar,
      origem_recompra_id: recompra_id,
      db: admin,
    })

    // Idempotência: não inserir se já existem avisos para esta venda
    if (novosAvisos.length > 0) {
      const { count } = await admin
        .from('avisos')
        .select('id', { count: 'exact', head: true })
        .eq('venda_id', nova_venda_id)
      if (!count || count === 0) {
        await admin.from('avisos').insert(novosAvisos)
      }
    }

    // Traço informativo: o produto de origem só é considerado "preservado" se o
    // item âncora permaneceu na seleção final E com o mesmo produto_id gravado
    // originalmente em itens_venda — distingue recompra do produto original de
    // conversão com substituição, sem exigir nenhuma coluna nova.
    const itemAncoraNoPayload = dados.itens.find(item => item.item_venda_id === itemVendaIdAncora)
    const registroOriginalAncora = itemVendaIdAncora ? itensVendaMap.get(itemVendaIdAncora) : undefined
    const produto_original_preservado = !!itemAncoraNoPayload && !!registroOriginalAncora &&
      itemAncoraNoPayload.produto_id === registroOriginalAncora.produto_id

    return {
      ok: true,
      recompra_id,
      valor_total,
      valor_base_comissao,
      valor_comissao: comissaoResult.valor_comissao,
      percentual: comissaoResult.percentual,
      produto_original_preservado,
    }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

const STATUS_ATIVOS = ['pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada'] as const

export async function reagendarOportunidade(dados: {
  aviso_id: string
  venda_id: string
  item_venda_id?: string | null
  nova_data: string
  observacao?: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const admin = createAdminClient()

    // Idempotency: não reagendar oportunidade já encerrada
    const { data: avisoAtual } = await admin
      .from('avisos')
      .select('status')
      .eq('id', dados.aviso_id)
      .single()

    if (avisoAtual?.status === 'convertida' || avisoAtual?.status === 'perdida') {
      return { ok: true }
    }

    // Buscar apenas avisos ativos da mesma oportunidade (venda_id + produto via item_venda_id)
    const baseQuery = admin
      .from('avisos')
      .select('id, data_aviso, data_prevista_original')
      .in('status', [...STATUS_ATIVOS])

    const { data: avisosAtivos, error: fetchErr } = dados.item_venda_id
      ? await baseQuery.eq('item_venda_id', dados.item_venda_id)
      : await baseQuery.eq('venda_id', dados.venda_id)

    if (fetchErr) return { ok: false, erro: fetchErr.message }
    if (!avisosAtivos?.length) return { ok: true }

    const ids = avisosAtivos.map(a => a.id as string)

    // Preservar data original para quem ainda não tem (antes de sobrescrever data_aviso)
    const semOriginal = avisosAtivos.filter(a => !a.data_prevista_original)
    if (semOriginal.length > 0) {
      await Promise.all(
        semOriginal.map(a =>
          admin.from('avisos')
            .update({ data_prevista_original: a.data_aviso })
            .eq('id', a.id as string)
        )
      )
    }

    // Atualizar todos os avisos da oportunidade para a nova data
    const agora = new Date().toISOString()
    const { error } = await admin
      .from('avisos')
      .update({
        status: 'reagendada',
        data_aviso: dados.nova_data,
        observacao_resultado: dados.observacao ?? null,
        updated_at: agora,
      })
      .in('id', ids)

    if (error) return { ok: false, erro: error.message }
    revalidatePath('/avisos')
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function marcarOportunidadePerdida(dados: {
  aviso_id: string
  venda_id: string
  item_venda_id?: string | null
  motivo_perda: string
  observacao?: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const admin = createAdminClient()

    // Idempotency: não encerrar oportunidade já encerrada
    const { data: avisoAtual } = await admin
      .from('avisos')
      .select('status')
      .eq('id', dados.aviso_id)
      .single()

    if (avisoAtual?.status === 'convertida' || avisoAtual?.status === 'perdida') {
      return { ok: true }
    }

    // Buscar apenas avisos ativos da mesma oportunidade (venda_id + produto via item_venda_id)
    const baseQuery = admin
      .from('avisos')
      .select('id')
      .in('status', [...STATUS_ATIVOS])

    const { data: avisosAtivos, error: fetchErr } = dados.item_venda_id
      ? await baseQuery.eq('item_venda_id', dados.item_venda_id)
      : await baseQuery.eq('venda_id', dados.venda_id)

    if (fetchErr) return { ok: false, erro: fetchErr.message }
    if (!avisosAtivos?.length) return { ok: true }

    const ids = avisosAtivos.map(a => a.id as string)
    const agora = new Date().toISOString()

    const { error } = await admin
      .from('avisos')
      .update({
        status: 'perdida',
        motivo_perda: dados.motivo_perda,
        observacao_resultado: dados.observacao ?? null,
        encerrado_em: agora,
        encerrado_por: user.id,
        updated_at: agora,
      })
      .in('id', ids)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
