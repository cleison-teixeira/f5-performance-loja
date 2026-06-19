'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularComissao, calcularComissaoAvancada } from '@/lib/comissoes/calculador'

export async function marcarEnviado(aviso_id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('avisos')
      .update({ status: 'enviado', enviado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
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
    }
  | { ok: false; erro: string }

export async function confirmarRecompra(dados: DadosRecompra): Promise<ResultadoRecompra> {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    const valor_total = dados.itens.reduce(
      (acc, item) => acc + item.quantidade * item.preco_unitario, 0
    )
    const valor_base_comissao = dados.itens
      .filter(item => item.comissionavel)
      .reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0)

    // 1. INSERT recompra
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
      })
      .select('id')
      .single()

    if (recompraError || !recompraData) {
      return { ok: false, erro: 'Erro ao registrar recompra: ' + (recompraError?.message ?? 'desconhecido') }
    }

    const recompra_id = recompraData.id as string

    // 2. INSERT itens_recompra
    const { error: itensError } = await supabase.from('itens_recompra').insert(
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

    if (itensError) {
      return { ok: false, erro: 'Erro ao registrar itens: ' + itensError.message }
    }

    // 3. Calcular comissão com lógica de prioridade (admin client para burlar RLS restritivo)
    const itensComissionaveis = dados.itens.filter(i => i.comissionavel)
    const produtosComissionaveis = [
      ...new Set(itensComissionaveis.map(i => i.produto_id).filter((id): id is string => !!id))
    ]

    // Prioridade 1: comissão fixa por produto + vendedora
    let fixasPorProduto: Record<string, { id: string; valor_fixo: number }> = {}
    if (produtosComissionaveis.length > 0) {
      const { data: fixasData } = await admin
        .from('comissao_fixa_produto')
        .select('produto_id, valor_fixo, id')
        .eq('loja_id', dados.loja_id)
        .eq('vendedora_id', dados.vendedora_id)
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

    // Prioridade 2: campanha ativa (usa produto da venda original)
    let campanha: { id: string; comissao_fixa: number } | null = null
    if (valorBaseSemFixo > 0) {
      const { data: vendaData } = await admin
        .from('vendas')
        .select('produto_id')
        .eq('id', dados.venda_original_id)
        .maybeSingle()

      if (vendaData?.produto_id) {
        const hoje = new Date().toISOString().slice(0, 10)
        const { data: campanhaData } = await admin
          .from('campanhas_produto')
          .select('id, comissao_fixa')
          .eq('produto_id', vendaData.produto_id)
          .eq('ativo', true)
          .lte('data_inicio', hoje)
          .gte('data_fim', hoje)
          .or(`loja_id.eq.${dados.loja_id},loja_id.is.null`)
          .order('loja_id', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()

        if (campanhaData) {
          campanha = { id: campanhaData.id as string, comissao_fixa: campanhaData.comissao_fixa as number }
        }
      }
    }

    // Prioridade 3: meta mensal
    let meta: { valor_meta: number; comissao_base: number; comissao_meta: number; multiplicador: number | null } | null = null
    let totalVendasMes = 0
    if (valorBaseSemFixo > 0 && !campanha) {
      const mesAtual = new Date()
      mesAtual.setDate(1)
      const mesFmt = mesAtual.toISOString().slice(0, 10)

      const { data: metaData } = await admin
        .from('metas_vendedora')
        .select('valor_meta, comissao_base, comissao_meta, multiplicador')
        .eq('loja_id', dados.loja_id)
        .eq('vendedora_id', dados.vendedora_id)
        .eq('mes', mesFmt)
        .maybeSingle()

      if (metaData) {
        meta = {
          valor_meta: metaData.valor_meta as number,
          comissao_base: metaData.comissao_base as number,
          comissao_meta: metaData.comissao_meta as number,
          multiplicador: metaData.multiplicador as number | null,
        }

        const inicioMes = mesFmt + 'T00:00:00.000Z'
        const { data: totalData } = await admin
          .from('recompras')
          .select('valor_base_comissao')
          .eq('loja_id', dados.loja_id)
          .eq('vendedora_id', dados.vendedora_id)
          .gte('criado_em', inicioMes)

        totalVendasMes = (totalData ?? []).reduce(
          (sum, r) => sum + ((r.valor_base_comissao as number) ?? 0), 0
        )
      }
    }

    // Prioridade 4: comissão padrão
    let regraPadrao: { percentual: number } | null = null
    if (valorBaseSemFixo > 0 && !campanha && !meta) {
      const { data: regraData } = await admin
        .from('regras_comissao')
        .select('percentual')
        .eq('loja_id', dados.loja_id)
        .eq('vendedora_id', dados.vendedora_id)
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

    // 4. INSERT comissao_venda
    if (resultado.valor_comissao > 0 || valor_base_comissao > 0) {
      await supabase.from('comissao_venda').insert({
        venda_id: dados.venda_original_id,
        vendedora_id: dados.vendedora_id,
        valor_venda: valor_base_comissao,
        percentual: resultado.percentual,
        valor_comissao: resultado.valor_comissao,
        tipo_comissao: resultado.tipo,
        campanha_id: resultado.campanha_id,
        comissao_fixa_produto_id: resultado.comissao_fixa_produto_id,
        recompra_id,
      })
    }

    // 5. Marcar aviso como enviado e vincular à recompra
    await supabase
      .from('avisos')
      .update({
        status: 'enviado',
        enviado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        recompra_id,
      })
      .eq('id', dados.aviso_id)

    return {
      ok: true,
      recompra_id,
      valor_total,
      valor_base_comissao,
      valor_comissao: resultado.valor_comissao,
      percentual: resultado.percentual,
    }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
