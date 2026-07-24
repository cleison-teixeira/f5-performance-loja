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
}

interface DadosRecompra {
  aviso_id: string
  venda_original_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  itens: ItemRecompraInput[]
  item_venda_ids_grupo?: string[]
}

type ResultadoRecompra =
  | {
      ok: true
      recompra_id: string
      valor_total: number
      valor_base_comissao: number
      valor_comissao: number
      percentual: number
      jaConfirmada?: boolean
    }
  | { ok: false; erro: string }

export async function confirmarRecompra(dados: DadosRecompra): Promise<ResultadoRecompra> {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    // Idempotency guard: if aviso already converted, return safe success
    const { data: avisoAtual } = await admin
      .from('avisos')
      .select('status, recompra_id, item_venda_id')
      .eq('id', dados.aviso_id)
      .single()

    if (avisoAtual?.status === 'convertida' || avisoAtual?.recompra_id) {
      return {
        ok: true,
        recompra_id: (avisoAtual?.recompra_id as string | null) ?? '',
        valor_total: 0,
        valor_base_comissao: 0,
        valor_comissao: 0,
        percentual: 0,
        jaConfirmada: true,
      }
    }

    // Validar usuário logado e pertencimento à loja antes de gravar com admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const { data: membroLogado } = await admin
      .from('membros_loja')
      .select('loja_id')
      .eq('perfil_id', user.id)
      .eq('loja_id', dados.loja_id)
      .eq('ativo', true)
      .maybeSingle()
    if (!membroLogado) return { ok: false, erro: 'Acesso negado à loja' }

    if (dados.vendedora_id !== user.id) {
      const { data: membroResponsavel } = await admin
        .from('membros_loja')
        .select('loja_id')
        .eq('perfil_id', dados.vendedora_id)
        .eq('loja_id', dados.loja_id)
        .eq('ativo', true)
        .maybeSingle()
      if (!membroResponsavel) return { ok: false, erro: 'Responsável não pertence à loja' }
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
        loja_id: dados.loja_id,
        cliente_id: dados.cliente_id,
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
        loja_id: dados.loja_id,
        cliente_id: dados.cliente_id,
        vendedora_id: dados.vendedora_id,
        aviso_id: dados.aviso_id,
        venda_original_id: dados.venda_original_id,
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
      loja_id: dados.loja_id,
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

    // 7. Marcar aviso como convertida e vincular à recompra (admin para contornar RLS)
    const agora = new Date().toISOString()
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

    // 7b. Fechar todos os demais avisos ativos da mesma oportunidade (venda_id + produto via item_venda_id)
    const itemVendaIdOriginal = avisoAtual?.item_venda_id as string | null
    const fechamentoQuery = admin
      .from('avisos')
      .update({
        status: 'convertida',
        encerrado_em: agora,
        encerrado_por: dados.vendedora_id,
        updated_at: agora,
        recompra_id,
      })
      .is('recompra_id', null)
      .in('status', ['pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada'])

    if (itemVendaIdOriginal) {
      await fechamentoQuery.eq('item_venda_id', itemVendaIdOriginal)
    } else {
      await fechamentoQuery.eq('venda_id', dados.venda_original_id)
    }

    // 7c. Fechar avisos de outros produtos do mesmo grupo de venda (recompra multi-produto)
    if (dados.item_venda_ids_grupo && dados.item_venda_ids_grupo.length > 0) {
      const outrosIds = dados.item_venda_ids_grupo.filter(id => id !== itemVendaIdOriginal)
      if (outrosIds.length > 0) {
        await admin
          .from('avisos')
          .update({
            status: 'convertida',
            encerrado_em: agora,
            encerrado_por: dados.vendedora_id,
            updated_at: agora,
            recompra_id,
          })
          .is('recompra_id', null)
          .in('status', ['pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada'])
          .in('item_venda_id', outrosIds)
      }
    }

    // 8. Gerar novos avisos futuros — sequência agrupada (motor unificado, sem agradecimento)
    const [clienteRes, vendedoraRes, lojaRes] = await Promise.all([
      admin.from('clientes').select('nome').eq('id', dados.cliente_id).single(),
      admin.from('perfis').select('nome').eq('id', dados.vendedora_id).single(),
      admin.from('lojas').select('nome').eq('id', dados.loja_id).single(),
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
      loja_id: dados.loja_id,
      cliente_id: dados.cliente_id,
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

    return {
      ok: true,
      recompra_id,
      valor_total,
      valor_base_comissao,
      valor_comissao: comissaoResult.valor_comissao,
      percentual: comissaoResult.percentual,
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
