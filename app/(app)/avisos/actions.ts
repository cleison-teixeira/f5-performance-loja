'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularComissaoSemGravar } from '@/lib/comissoes/gravar'
import { garantirMensagensProduto } from '@/lib/avisos/garantirMensagensProduto'
import { planejarAvisosParaVenda, type ItemParaPlanejamento } from '@/lib/avisos/planejarParaVenda'
import { resolverOuCriarProduto } from '@/lib/produtos/resolver'

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

    // ── Pré-checagem rápida (UX): busca o aviso âncora para respostas de erro
    //    imediatas antes de montar o payload da RPC. NÃO é a fonte de
    //    autoridade — confirmar_recompra_transacional revalida tudo sob
    //    SELECT ... FOR UPDATE e é ela quem decide de fato, inclusive em caso
    //    de corrida com outra requisição simultânea para o mesmo aviso_id
    //    (Bug 2). Em qualquer divergência entre esta pré-checagem e a RPC, a
    //    RPC prevalece. ──
    const { data: avisoAncora } = await admin
      .from('avisos')
      .select('id, venda_id, loja_id, cliente_id, item_venda_id, status, recompra_id, mensagem_id')
      .eq('id', dados.aviso_id)
      .single()

    if (!avisoAncora) {
      return { ok: false, erro: 'Aviso não encontrado.' }
    }

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

    // Autenticação e autorização acontecem aqui, em TS — não são repetidas na
    // RPC (executável só por service_role, inatingível por anon/authenticated).
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

    // ── Resolver produtos digitados sem produto_id — reaproveita o mesmo
    //    find-or-create já usado em Registrar Venda (lib/produtos/resolver.ts),
    //    sem duplicar lógica de cadastro de produto. A partir daqui todo item
    //    tem um produto_id real, criado ou encontrado por dedup nesta loja. ──
    let itensComProdutoId: ItemRecompraInput[]
    try {
      itensComProdutoId = await Promise.all(
        dados.itens.map(async (item) => {
          if (item.produto_id) return item
          const resolvido = await resolverOuCriarProduto(item.produto_nome, lojaId, {
            recorrente: true,
            comissionavel_recompra: item.comissionavel,
          })
          return { ...item, produto_id: resolvido.id, produto_nome: resolvido.nome }
        })
      )
    } catch {
      return { ok: false, erro: 'Não foi possível criar ou vincular o produto. Tente novamente.' }
    }

    // ── Pré-validações de UX (resposta rápida) — a RPC refaz todas estas
    //    checagens sob lock a partir do zero; não duplicamos aqui a validação
    //    estrutural completa, só o suficiente para um erro rápido comum. ──
    const { data: itensVendaOriginais } = await admin
      .from('itens_venda')
      .select('id, produto_id, produto_nome')
      .eq('venda_id', vendaId)
      .eq('recorrente', true)

    const itensVendaMap = new Map(
      (itensVendaOriginais ?? []).map(iv => [iv.id as string, iv as { produto_id: string | null; produto_nome: string }])
    )
    const itemVendaIdsElegiveis = new Set(itensVendaMap.keys())

    const idsRecebidos = itensComProdutoId
      .map(i => i.item_venda_id)
      .filter((id): id is string => !!id)

    if (new Set(idsRecebidos).size !== idsRecebidos.length) {
      return { ok: false, erro: 'Produto duplicado na confirmação.' }
    }

    const produtoIdsSubmetidos = [...new Set(itensComProdutoId.map(i => i.produto_id).filter((id): id is string => !!id))]
    const { data: produtosValidos } = produtoIdsSubmetidos.length > 0
      ? await admin.from('produtos').select('id').eq('loja_id', lojaId).in('id', produtoIdsSubmetidos)
      : { data: [] as { id: string }[] }
    const produtoIdsValidos = new Set((produtosValidos ?? []).map(p => p.id as string))

    for (const item of itensComProdutoId) {
      if (item.produto_id && !produtoIdsValidos.has(item.produto_id)) {
        return { ok: false, erro: 'Um dos produtos não existe nesta loja.' }
      }
      if (!item.item_venda_id) continue
      if (!itemVendaIdsElegiveis.has(item.item_venda_id)) {
        return { ok: false, erro: 'Um dos produtos não pertence a esta oportunidade de recompra.' }
      }
    }

    // ── Planejamento: cálculo de comissão e texto dos avisos futuros
    //    acontecem aqui, em TS, ANTES de qualquer escrita — a venda e a
    //    recompra ainda não existem neste ponto. IDs de itens_venda/venda são
    //    pré-gerados (mesmo padrão de 057_editar_recompra_transacional.sql)
    //    para que os avisos futuros já possam referenciá-los. ──
    const hoje = new Date().toISOString().slice(0, 10)

    const itensComCiclo = await Promise.all(
      itensComProdutoId.map(async (item) => {
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

    const novaVendaId = crypto.randomUUID()
    const itensPlanejados = itensComCiclo.map(item => ({
      item_venda_id_novo: crypto.randomUUID(),
      item_venda_id_original: item.item_venda_id ?? null,
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      comissionavel: item.comissionavel,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      ciclo_recompra_dias: item.ciclo_recompra_dias,
    }))

    const valor_total = itensPlanejados.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0)

    // Comissão: calculada sem gravar nada (a RPC grava). A meta mensal soma
    // explicitamente o valor desta própria recompra ao total já persistido —
    // preserva o comportamento histórico, no qual a venda já estava
    // persistida (e portanto já contava no total) no momento do cálculo, já
    // que agora o cálculo acontece antes de a venda existir. Ver decisão da
    // auditoria do Bug 2 (totalVendasMesParaCalculo = totalVendasMesPersistido
    // + valor_total desta recompra).
    const calculoComissao = await calcularComissaoSemGravar({
      loja_id: lojaId,
      vendedora_id: dados.vendedora_id,
      itens: itensPlanejados.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        subtotal: item.quantidade * item.preco_unitario,
        comissionavel: item.comissionavel,
      })),
      data_venda: hoje,
      ajusteTotalVendasMes: valor_total,
    })

    if (!calculoComissao.ok) {
      return { ok: false, erro: 'Erro ao calcular comissão: ' + calculoComissao.erro }
    }

    const [clienteRes, vendedoraRes, lojaRes] = await Promise.all([
      admin.from('clientes').select('nome').eq('id', clienteId).single(),
      admin.from('perfis').select('nome').eq('id', dados.vendedora_id).single(),
      admin.from('lojas').select('nome').eq('id', lojaId).single(),
    ])

    // Garantir mensagens do(s) produto(s) recorrente(s) ANTES do planejamento —
    // preparação explícita e independente da transação da RPC (mesmo padrão de
    // app/(app)/vendas/[id]/editar/actionsRecompra.ts). garantirMensagensProduto
    // é idempotente de verdade (upsert com ON CONFLICT ... DO NOTHING, apoiado
    // na UNIQUE constraint mensagens_produto_produto_id_ordem_key) — seguro sob
    // chamadas concorrentes, ao contrário do bootstrap embutido que existia no
    // antigo gerarAvisosParaVenda. Só grava mensagens_produto (catálogo do
    // produto), nunca avisos/venda/recompra — não faz parte da atomicidade da
    // RPC, que cobre exclusivamente vendas, itens_venda, recompras,
    // itens_recompra, comissao_venda, fechamento de avisos e avisos futuros.
    const produtoIdsRecorrentes = [
      ...new Set(itensPlanejados.map(item => item.produto_id).filter((id): id is string => !!id)),
    ]
    if (produtoIdsRecorrentes.length > 0) {
      try {
        await Promise.all(produtoIdsRecorrentes.map(pid => garantirMensagensProduto(pid, admin)))
      } catch {
        return { ok: false, erro: 'Não foi possível preparar as mensagens deste produto. Nenhuma alteração foi salva.' }
      }
    }

    const itensParaPlanejar: ItemParaPlanejamento[] = itensPlanejados.map(item => ({
      id: item.item_venda_id_novo,
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      recorrente: true,
      ciclo_recompra_dias: item.ciclo_recompra_dias,
    }))

    // planejarAvisosParaVenda é um planejador puro — só lê, nunca escreve
    // (ver lib/avisos/planejarParaVenda.ts:77-78). Mesma função já usada por
    // actionsRecompra.ts para o mesmo propósito (dry-run antes de uma RPC
    // transacional).
    const { avisos: avisosPlanejados, ancora } = await planejarAvisosParaVenda({
      venda_id: novaVendaId,
      loja_id: lojaId,
      cliente_id: clienteId,
      vendedora_id: dados.vendedora_id,
      cliente_nome: (clienteRes.data?.nome as string) ?? '',
      vendedora_nome: (vendedoraRes.data?.nome as string) ?? '',
      loja_nome: (lojaRes.data?.nome as string) ?? '',
      data_base: hoje,
      origem: 'recompra',
      itens: itensParaPlanejar,
      db: admin,
    })

    // Guard: valida apenas o produto âncora da sequência (mesma regra de
    // actionsRecompra.ts) — produtos não-âncora compõem a venda mas não geram
    // sequência própria de avisos.
    if (ancora && ancora.tipos.length === 0) {
      const erro = ancora.motivo_sem_aviso === 'somente_agradecimento'
        ? `Não foi possível confirmar. O produto '${ancora.produto_nome}' possui apenas mensagem de agradecimento. Configure ao menos uma mensagem de acompanhamento.`
        : `Não foi possível confirmar. Nenhuma mensagem foi encontrada para o produto '${ancora.produto_nome}'.`
      return { ok: false, erro }
    }

    // Não confiar nos IDs de loja/cliente/vendedora planejados aqui: a RPC
    // deriva loja_id/cliente_id do aviso âncora travado e vendedora_id do
    // parâmetro p_vendedora_id — por isso não vão no payload dos avisos
    // futuros (Bug 2, ponto 1). origem_recompra_id também não vai: a
    // recompra ainda não existe nesta fase de planejamento — a RPC preenche
    // com o recompra_id real que ela mesma cria.
    const avisosFuturosPayload = avisosPlanejados.map(a => ({
      item_venda_id: a.item_venda_id,
      mensagem_id: a.mensagem_id,
      texto_renderizado: a.texto_renderizado,
      data_aviso: a.data_aviso,
      previsao_comissao: a.previsao_comissao ?? null,
    }))

    // ── Commit atômico: uma única chamada RPC. Reserva o aviso âncora com
    //    FOR UPDATE, revalida toda a integridade sob lock e escreve tudo em
    //    uma transação — all-or-nothing, sem estado intermediário observável
    //    por nenhuma outra sessão. ──
    const { data: rpcResult, error: rpcError } = await admin.rpc('confirmar_recompra_transacional', {
      p_actor_id: user.id,
      p_aviso_id: dados.aviso_id,
      p_vendedora_id: dados.vendedora_id,
      p_nova_venda_id: novaVendaId,
      p_itens: itensPlanejados,
      p_avisos_futuros: avisosFuturosPayload,
      p_comissao: {
        valor_base: calculoComissao.valor_base,
        percentual: calculoComissao.percentual,
        valor_comissao: calculoComissao.valor_comissao,
        tipo_comissao: calculoComissao.tipo_comissao,
        campanha_id: calculoComissao.campanha_id,
        comissao_fixa_produto_id: calculoComissao.comissao_fixa_produto_id,
      },
    })

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('VALIDATION:')) {
        return { ok: false, erro: msg.replace(/.*VALIDATION:/, '').trim() }
      }
      if (msg.includes('CONFLICT:')) {
        return { ok: false, erro: msg.replace(/.*CONFLICT:/, '').trim() }
      }
      return { ok: false, erro: 'Erro ao confirmar a recompra. Tente novamente.' }
    }

    const resultado = rpcResult as {
      ok: boolean
      ja_confirmada: boolean
      recompra_id: string
      valor_total: number
      valor_base_comissao: number
      valor_comissao: number
      percentual: number
      produto_original_preservado: boolean | null
    } | null

    if (!resultado?.ok) {
      return { ok: false, erro: 'Erro inesperado ao confirmar a recompra.' }
    }

    return {
      ok: true,
      recompra_id: resultado.recompra_id,
      valor_total: resultado.valor_total,
      valor_base_comissao: resultado.valor_base_comissao,
      valor_comissao: resultado.valor_comissao,
      percentual: resultado.percentual,
      jaConfirmada: resultado.ja_confirmada || undefined,
      produto_original_preservado: resultado.produto_original_preservado ?? undefined,
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
