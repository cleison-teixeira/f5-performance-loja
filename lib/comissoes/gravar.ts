// Server-side only — não importar em arquivos com 'use client'
// Usado pelas Server Actions de nova venda e confirmar recompra (Fases 3 e 4).

import { createAdminClient } from '@/lib/supabase/admin'
import { calcularComissaoAvancada } from './calculador'
import type { TipoComissao } from '@/types/app'

// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface ItemComissaoInput {
  produto_id: string | null
  produto_nome: string
  subtotal: number
  comissionavel: boolean
}

export interface GravarComissaoParams {
  loja_id: string
  venda_id: string
  vendedora_id: string
  itens: ItemComissaoInput[]
  data_venda: string  // YYYY-MM-DD — define o mês para cálculo de meta
  recompra_id?: string
}

export type ResultadoGravarComissao =
  | {
      ok: true
      valor_base: number
      percentual: number
      valor_comissao: number
      tipo_comissao: TipoComissao | null
      comissao_id: string | null
      ja_existia: boolean
    }
  | { ok: false; erro: string }

// ── Cálculo puro (sem gravação) ──────────────────────────────────────────────
// Extraído de gravarComissaoVenda para uso por fluxos transacionais (RPC), onde
// o cálculo precisa acontecer ANTES de qualquer escrita — a inserção real fica
// a cargo da transação (ver confirmar_recompra_transacional). Mantém byte-a-byte
// a mesma sequência de prioridades (fixo > campanha > meta > padrão) que
// gravarComissaoVenda sempre usou, só sem o guard-por-venda_id e sem o INSERT.
export interface CalcularComissaoParams {
  loja_id: string
  vendedora_id: string
  itens: ItemComissaoInput[]
  data_venda: string // YYYY-MM-DD — define o mês para cálculo de meta
  // Ajuste explícito somado ao total de vendas do mês antes de comparar com a
  // meta. Necessário quando a venda desta própria operação ainda não existe no
  // banco no momento do cálculo (ex.: confirmarRecompra planeja a comissão
  // ANTES de criar a venda via RPC transacional) — sem este ajuste, o
  // comportamento mudaria em relação ao fluxo histórico, no qual a venda já
  // estava persistida (e portanto já contava no total) no momento do cálculo.
  // Ver decisão registrada na auditoria do Bug 2: preservar
  // totalVendasMesParaCalculo = totalVendasMesPersistido + valor_total_desta_venda.
  ajusteTotalVendasMes?: number
}

export type ResultadoCalculoComissao =
  | {
      ok: true
      valor_base: number
      percentual: number
      valor_comissao: number
      tipo_comissao: TipoComissao | null
      campanha_id: string | null
      comissao_fixa_produto_id: string | null
    }
  | { ok: false; erro: string }

export async function calcularComissaoSemGravar(
  params: CalcularComissaoParams
): Promise<ResultadoCalculoComissao> {
  try {
    const { loja_id, vendedora_id, itens, data_venda, ajusteTotalVendasMes = 0 } = params
    const admin = createAdminClient()

    const zero = {
      ok: true as const,
      valor_base: 0,
      percentual: 0,
      valor_comissao: 0,
      tipo_comissao: null,
      campanha_id: null,
      comissao_fixa_produto_id: null,
    }

    // ── Filtrar itens comissionáveis ────────────────────────────────────────
    const itensComissionaveis = itens.filter(i => i.comissionavel)
    if (itensComissionaveis.length === 0) return zero

    const produtosComissionaveis = [
      ...new Set(
        itensComissionaveis
          .map(i => i.produto_id)
          .filter((id): id is string => !!id)
      ),
    ]

    // ── P1: comissão fixa por produto + vendedora ───────────────────────────
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
        fixasPorProduto[f.produto_id as string] = {
          id: f.id as string,
          valor_fixo: f.valor_fixo as number,
        }
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
        valorBaseSemFixo += item.subtotal
      }
    }

    // ── P2: campanha ativa — verifica produtos sem comissão fixa ───────────
    let campanha: { id: string; comissao_fixa: number } | null = null
    if (valorBaseSemFixo > 0) {
      const hoje = new Date().toISOString().slice(0, 10)
      const produtosSemFixa = itensComissionaveis
        .filter(i => i.produto_id && !fixasPorProduto[i.produto_id])
        .map(i => i.produto_id)
        .filter((id): id is string => !!id)

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
          campanha = {
            id: campanhaData.id as string,
            comissao_fixa: campanhaData.comissao_fixa as number,
          }
          break
        }
      }
    }

    // ── P3: meta mensal — base canônica: vendas.valor do mês ───────────────
    // Usa data_compra (data do negócio) em vez de criado_em (data do sistema).
    // Inclui vendas com origem 'venda_manual' e 'recompra' — faturamento total.
    let meta: {
      valor_meta: number
      comissao_base: number
      comissao_meta: number
      multiplicador: number | null
    } | null = null
    let totalVendasMes = 0

    if (valorBaseSemFixo > 0 && !campanha) {
      const [anoStr, mesStr] = data_venda.split('-')
      const ano = parseInt(anoStr)
      const mes = parseInt(mesStr)
      const inicioMes = `${anoStr}-${mesStr}-01`
      // Primeiro dia do mês seguinte (lida com virada de ano)
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

        // Soma canônica: vendas.valor do mês (venda_manual + recompra)
        const { data: vendasMesData } = await admin
          .from('vendas')
          .select('valor')
          .eq('loja_id', loja_id)
          .eq('vendedora_id', vendedora_id)
          .gte('data_compra', inicioMes)
          .lt('data_compra', inicioProxMes)

        const totalVendasMesPersistido = (vendasMesData ?? []).reduce(
          (sum, v) => sum + ((v.valor as number) ?? 0),
          0
        )
        // totalVendasMesParaCalculo = totalVendasMesPersistido + ajuste explícito
        // (ver documentação do parâmetro ajusteTotalVendasMes acima).
        totalVendasMes = totalVendasMesPersistido + ajusteTotalVendasMes
      }
    }

    // ── P4: regra padrão ────────────────────────────────────────────────────
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

    // ── Calcular ────────────────────────────────────────────────────────────
    const resultado = calcularComissaoAvancada({
      valor_base_sem_fixo: valorBaseSemFixo,
      valor_comissao_fixa: valorComissaoFixa,
      comissao_fixa_produto_id: comissaoFixaProdutoId,
      campanha,
      meta,
      total_vendas_mes: totalVendasMes,
      regra_padrao: regraPadrao,
    })

    const valorBase = itensComissionaveis.reduce((s, i) => s + i.subtotal, 0)

    if (resultado.valor_comissao === 0 && valorBase === 0) return zero

    return {
      ok: true,
      valor_base: valorBase,
      percentual: resultado.percentual,
      valor_comissao: resultado.valor_comissao,
      tipo_comissao: resultado.tipo,
      campanha_id: resultado.campanha_id,
      comissao_fixa_produto_id: resultado.comissao_fixa_produto_id,
    }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

// ── Helper principal (calcula + grava) ───────────────────────────────────────
// Comportamento inalterado para os chamadores existentes (nova venda, edição de
// venda) — agora delega o cálculo a calcularComissaoSemGravar internamente.

export async function gravarComissaoVenda(
  params: GravarComissaoParams
): Promise<ResultadoGravarComissao> {
  try {
    const { loja_id, venda_id, vendedora_id, itens, data_venda, recompra_id } = params
    const admin = createAdminClient()

    // ── Guard: evita comissão duplicada para a mesma venda ──────────────────
    // Usa admin para bypassar RLS — o guard deve enxergar registros de qualquer vendedora.
    const { data: existente, error: guardError } = await admin
      .from('comissao_venda')
      .select('id, percentual, valor_comissao, tipo_comissao, valor_venda')
      .eq('venda_id', venda_id)
      .maybeSingle()

    // PGRST116 = múltiplas linhas (duplicata já no banco): retorna a primeira via .limit(1)
    if (guardError && guardError.code !== 'PGRST116') {
      return { ok: false, erro: 'Erro ao verificar comissão existente: ' + guardError.message }
    }

    if (existente) {
      return {
        ok: true,
        valor_base: existente.valor_venda as number,
        percentual: existente.percentual as number,
        valor_comissao: existente.valor_comissao as number,
        tipo_comissao: (existente.tipo_comissao as TipoComissao) ?? null,
        comissao_id: existente.id as string,
        ja_existia: true,
      }
    }

    // Fallback para PGRST116: busca a primeira comissão existente e retorna sem inserir
    if (guardError?.code === 'PGRST116') {
      const { data: primeira } = await admin
        .from('comissao_venda')
        .select('id, percentual, valor_comissao, tipo_comissao, valor_venda')
        .eq('venda_id', venda_id)
        .order('criado_em', { ascending: true })
        .limit(1)
        .single()
      if (primeira) {
        return {
          ok: true,
          valor_base: primeira.valor_venda as number,
          percentual: primeira.percentual as number,
          valor_comissao: primeira.valor_comissao as number,
          tipo_comissao: (primeira.tipo_comissao as TipoComissao) ?? null,
          comissao_id: primeira.id as string,
          ja_existia: true,
        }
      }
    }

    // ── Calcular (sem ajuste — a venda já está persistida neste ponto do fluxo) ──
    const calculo = await calcularComissaoSemGravar({ loja_id, vendedora_id, itens, data_venda })
    if (!calculo.ok) return calculo

    if (calculo.valor_comissao === 0 && calculo.valor_base === 0) {
      return {
        ok: true,
        valor_base: 0,
        percentual: 0,
        valor_comissao: 0,
        tipo_comissao: null,
        comissao_id: null,
        ja_existia: false,
      }
    }

    // ── INSERT comissao_venda ───────────────────────────────────────────────
    const { data: comissaoData, error: comissaoError } = await admin
      .from('comissao_venda')
      .insert({
        venda_id,
        vendedora_id,
        valor_venda: calculo.valor_base,
        percentual: calculo.percentual,
        valor_comissao: calculo.valor_comissao,
        tipo_comissao: calculo.tipo_comissao,
        campanha_id: calculo.campanha_id,
        comissao_fixa_produto_id: calculo.comissao_fixa_produto_id,
        recompra_id: recompra_id ?? null,
      })
      .select('id')
      .single()

    if (comissaoError) {
      // 23505 = unique_violation: race condition — outra requisição inseriu primeiro
      if (comissaoError.code === '23505') {
        const { data: existenteRace } = await admin
          .from('comissao_venda')
          .select('id, percentual, valor_comissao, tipo_comissao, valor_venda')
          .eq('venda_id', venda_id)
          .order('criado_em', { ascending: true })
          .limit(1)
          .single()
        if (existenteRace) {
          return {
            ok: true,
            valor_base: existenteRace.valor_venda as number,
            percentual: existenteRace.percentual as number,
            valor_comissao: existenteRace.valor_comissao as number,
            tipo_comissao: (existenteRace.tipo_comissao as TipoComissao) ?? null,
            comissao_id: existenteRace.id as string,
            ja_existia: true,
          }
        }
      }
      return {
        ok: false,
        erro: 'Erro ao gravar comissão: ' + comissaoError.message,
      }
    }

    if (!comissaoData) {
      return { ok: false, erro: 'Erro ao gravar comissão: sem retorno do banco' }
    }

    return {
      ok: true,
      valor_base: calculo.valor_base,
      percentual: calculo.percentual,
      valor_comissao: calculo.valor_comissao,
      tipo_comissao: calculo.tipo_comissao,
      comissao_id: comissaoData.id as string,
      ja_existia: false,
    }
  } catch (err) {
    return {
      ok: false,
      erro: err instanceof Error ? err.message : 'Erro inesperado',
    }
  }
}
