'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gravarComissaoVenda } from '@/lib/comissoes/gravar'
import { gerarAvisos, type AvisoParaInserir } from '@/lib/avisos/gerador'
import { ORDENS_POR_MODELO } from '@/lib/mensagens/modelos'

export async function marcarEnviado(aviso_id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('avisos')
      .update({ status: 'contato_feito', enviado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
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
}

interface DadosRecompra {
  aviso_id: string
  venda_original_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  itens: ItemRecompraInput[]
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
      .select('status, recompra_id')
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

    const hoje = new Date().toISOString().slice(0, 10)
    const valor_total = dados.itens.reduce(
      (acc, item) => acc + item.quantidade * item.preco_unitario, 0
    )
    const valor_base_comissao = dados.itens
      .filter(item => item.comissionavel)
      .reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0)

    // 1. Criar venda canônica com origem='recompra'
    const { data: vendaData, error: vendaError } = await supabase
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

    // 2. INSERT itens_venda
    const { data: itensVendaData, error: itensVendaError } = await supabase
      .from('itens_venda')
      .insert(
        dados.itens.map(item => ({
          venda_id: nova_venda_id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          recorrente: true,
          comissionavel: item.comissionavel,
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
        }))
      )
      .select('id, produto_id, produto_nome')

    if (itensVendaError || !itensVendaData) {
      return { ok: false, erro: 'Erro ao registrar itens da venda: ' + (itensVendaError?.message ?? 'desconhecido') }
    }

    // 3. INSERT recompra com venda_id canônico
    const { data: recompraData, error: recompraError } = await supabase
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

    // 4. INSERT itens_recompra (mantidos)
    const { error: itensRecompraError } = await supabase.from('itens_recompra').insert(
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

    // 5. Gerar comissão via helper canônico
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

    // 6. Marcar aviso como convertida e vincular à recompra (admin para contornar RLS)
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

    // 6b. Fechar todos os demais avisos ativos da mesma oportunidade (mesmo venda_id)
    await admin
      .from('avisos')
      .update({
        status: 'convertida',
        encerrado_em: agora,
        encerrado_por: dados.vendedora_id,
        updated_at: agora,
        recompra_id,
      })
      .eq('venda_id', dados.venda_original_id)
      .is('recompra_id', null)
      .in('status', ['pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada'])

    // 7. Gerar novos avisos futuros para produtos com mensagens configuradas
    const produtoIds = [...new Set(
      itensVendaData
        .map(i => i.produto_id)
        .filter((id): id is string => !!id)
    )]

    if (produtoIds.length > 0) {
      const [clienteRes, vendedoraRes, lojaRes] = await Promise.all([
        admin.from('clientes').select('nome').eq('id', dados.cliente_id).single(),
        admin.from('perfis').select('nome').eq('id', dados.vendedora_id).single(),
        admin.from('lojas').select('nome').eq('id', dados.loja_id).single(),
      ])

      const cliente_nome = (clienteRes.data?.nome as string) ?? ''
      const vendedora_nome = (vendedoraRes.data?.nome as string) ?? ''
      const loja_nome = (lojaRes.data?.nome as string) ?? ''

      const todosAvisosNovos: AvisoParaInserir[] = []

      for (const itemVenda of itensVendaData) {
        if (!itemVenda.produto_id) continue

        const { data: produtoData } = await supabase
          .from('produtos')
          .select('qtd_mensagens')
          .eq('id', itemVenda.produto_id)
          .single()

        const qtd_mensagens = (
          (produtoData as unknown as { qtd_mensagens: number } | null)?.qtd_mensagens ?? 3
        ) as 1 | 2 | 3 | 4

        const { data: mensagensData } = await supabase
          .from('mensagens_produto')
          .select('id, ordem, tipo, texto, dias_apos_venda')
          .eq('produto_id', itemVenda.produto_id)
          .order('ordem')

        if (!mensagensData || mensagensData.length === 0) continue

        const ordensAtivas = ORDENS_POR_MODELO[qtd_mensagens]
        const mensagens = mensagensData
          .filter(m => ordensAtivas.includes(m.ordem as number))
          .map(m => ({
            id: m.id as string,
            tipo: (m as unknown as { tipo: string }).tipo ?? 'recompra',
            texto: m.texto as string,
            dias_apos_venda: m.dias_apos_venda as number,
          }))

        if (mensagens.length === 0) continue

        const avisos = gerarAvisos(
          mensagens,
          {
            venda_id: nova_venda_id,
            item_venda_id: itemVenda.id as string,
            loja_id: dados.loja_id,
            cliente_id: dados.cliente_id,
            vendedora_id: dados.vendedora_id,
            cliente_nome,
            produto_nome: itemVenda.produto_nome as string,
            vendedora_nome,
            loja_nome,
            origem_recompra_id: recompra_id,
          },
          hoje
        )

        todosAvisosNovos.push(...avisos)
      }

      if (todosAvisosNovos.length > 0) {
        await supabase.from('avisos').insert(todosAvisosNovos)
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

    // Buscar todos os avisos ativos da mesma oportunidade
    const { data: avisosAtivos, error: fetchErr } = await admin
      .from('avisos')
      .select('id, data_aviso, data_prevista_original')
      .eq('venda_id', dados.venda_id)
      .in('status', [...STATUS_ATIVOS])

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
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function marcarOportunidadePerdida(dados: {
  aviso_id: string
  venda_id: string
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

    // Buscar todos os avisos ativos da mesma oportunidade
    const { data: avisosAtivos, error: fetchErr } = await admin
      .from('avisos')
      .select('id')
      .eq('venda_id', dados.venda_id)
      .in('status', [...STATUS_ATIVOS])

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
