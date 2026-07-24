'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type AvisoParaInserir } from '@/lib/avisos/gerador'
import { gerarAvisosParaVenda, type ItemParaGerarAviso } from '@/lib/avisos/gerarParaVenda'
import { gravarComissaoVenda } from '@/lib/comissoes/gravar'
import { resolverOuCriarProduto } from '@/lib/produtos/resolver'
import { normalizarNomePessoa } from '@/lib/utils/normalizacao-texto'

export async function buscarCliente(
  whatsapp: string,
  loja_id: string
): Promise<{ id: string; nome: string; nao_contatar: boolean } | null> {
  const normalizado = whatsapp.replace(/\D/g, '')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, nao_contatar')
    .eq('loja_id', loja_id)
    .eq('whatsapp', normalizado)
    .maybeSingle()
  if (error || !data) return null
  return { id: data.id as string, nome: data.nome as string, nao_contatar: (data.nao_contatar as boolean) ?? false }
}

export interface ItemVendaDados {
  produto_id: string | null
  produto_nome: string
  recorrente: boolean
  comissionavel_recompra: boolean
  quantidade: number
  preco_unitario: number
  ciclo_recompra_dias?: number | null
  modelo_fluxo?: string | null
}

interface DadosVenda {
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  data_compra: string  // YYYY-MM-DD
  itens: ItemVendaDados[]
  vendedora_id: string
  vendedora_nome: string
  loja_nome: string
}

type ResultadoVenda =
  | {
      ok: true
      venda_id: string
      cliente_nome: string
      itens: Array<{
        produto_nome: string
        quantidade: number
        preco_unitario: number
        recorrente: boolean
        comissionavel_recompra: boolean
      }>
      valor_total: number
      previsao_comissao: number
      percentual_comissao: number
      avisos: Array<{ data_aviso: string; texto_renderizado: string; tipo: string }>
    }
  | { ok: false; erro: string }

interface ItemProcessado {
  produto_id: string | null
  produto_nome: string
  produto_qtd_mensagens: 1 | 2 | 3 | 4 | 5
  recorrente: boolean
  comissionavel_recompra: boolean
  quantidade: number
  preco_unitario: number
  ciclo_recompra_dias?: number | null
  modelo_fluxo?: string | null
  categoria?: string | null
  parceiro?: string | null
}

export async function salvarVenda(dados: DadosVenda): Promise<ResultadoVenda> {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    // 0. Validar que o usuário logado pertence à loja e que o responsável também pertence
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

    // 1. Upsert cliente
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .upsert(
        { loja_id: dados.loja_id, whatsapp: dados.cliente_whatsapp, nome: normalizarNomePessoa(dados.cliente_nome) },
        { onConflict: 'loja_id,whatsapp' }
      )
      .select('id, nome')
      .single()

    if (clienteError || !clienteData) {
      return { ok: false, erro: 'Erro ao salvar cliente: ' + (clienteError?.message ?? 'desconhecido') }
    }

    const cliente_id = clienteData.id as string
    const cliente_nome = clienteData.nome as string

    // 2. Processar cada item
    const itensProcessados: ItemProcessado[] = []

    for (const item of dados.itens) {
      let produto_id: string | null
      let produto_nome: string
      let produto_qtd_mensagens: 1 | 2 | 3 | 4 | 5 = 3
      let categoria: string | null = null
      let parceiro: string | null = null

      if (!item.produto_id) {
        // Produto digitado — resolve por nome normalizado (dedup) ou cria novo
        try {
          const info = await resolverOuCriarProduto(
            item.produto_nome,
            dados.loja_id,
            { recorrente: item.recorrente, comissionavel_recompra: item.comissionavel_recompra }
          )
          produto_id = info.id
          produto_nome = info.nome
          produto_qtd_mensagens = (info.qtd_mensagens || 3) as 1 | 2 | 3 | 4 | 5
          
          if (produto_id) {
            const { data: pData } = await admin
              .from('produtos')
              .select('categoria, parceiro')
              .eq('id', produto_id)
              .single()
            if (pData) {
              categoria = pData.categoria
              parceiro = pData.parceiro
            }
          }
        } catch {
          return { ok: false, erro: 'Não foi possível criar ou vincular o produto. Tente novamente.' }
        }
      } else {
        // Produto existente selecionado do catálogo
        const { data: produtoData, error: produtoError } = await supabase
          .from('produtos')
          .select('id, nome, qtd_mensagens, categoria, parceiro')
          .eq('id', item.produto_id)
          .single()

        if (produtoError || !produtoData) {
          return { ok: false, erro: 'Produto não encontrado: ' + (produtoError?.message ?? 'desconhecido') }
        }

        produto_id = produtoData.id as string
        produto_nome = produtoData.nome as string
        produto_qtd_mensagens = ((produtoData as unknown as { qtd_mensagens: number }).qtd_mensagens ?? 3) as 1 | 2 | 3 | 4 | 5
        categoria = produtoData.categoria
        parceiro = produtoData.parceiro
      }

      itensProcessados.push({
        produto_id,
        produto_nome,
        produto_qtd_mensagens: produto_qtd_mensagens,
        recorrente: item.recorrente,
        comissionavel_recompra: item.comissionavel_recompra,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        ciclo_recompra_dias: item.ciclo_recompra_dias || null,
        modelo_fluxo: item.modelo_fluxo || null,
        categoria,
        parceiro,
      })
    }

    // 3. Calcular previsão de comissão com lógica de prioridade (admin para bypass RLS)
    const itensComissionaveisRecorrentes = itensProcessados.filter(i => i.recorrente && i.comissionavel_recompra)
    const produtosIds = itensComissionaveisRecorrentes
      .map(i => i.produto_id)
      .filter((id): id is string => id !== null)

    const fixasPorProduto: Record<string, number> = {}
    if (produtosIds.length > 0) {
      const { data: fixasData } = await admin
        .from('comissao_fixa_produto')
        .select('produto_id, valor_fixo')
        .eq('loja_id', dados.loja_id)
        .eq('vendedora_id', dados.vendedora_id)
        .eq('ativo', true)
        .in('produto_id', produtosIds)
      for (const f of fixasData ?? []) {
        fixasPorProduto[f.produto_id as string] = f.valor_fixo as number
      }
    }

    let previsaoFixa = 0
    let previsaoBase = 0
    for (const item of itensComissionaveisRecorrentes) {
      const fixo = item.produto_id ? fixasPorProduto[item.produto_id] : undefined
      if (fixo != null) {
        previsaoFixa += fixo
      } else {
        previsaoBase += item.quantidade * item.preco_unitario
      }
    }

    const { data: regraData } = await admin
      .from('regras_comissao')
      .select('percentual')
      .eq('loja_id', dados.loja_id)
      .eq('vendedora_id', dados.vendedora_id)
      .eq('ativo', true)
      .maybeSingle()

    const percentual_comissao = (regraData?.percentual as number | null) ?? 0
    const previsao_comissao = previsaoFixa + (previsaoBase > 0
      ? Math.round(previsaoBase * percentual_comissao / 100 * 100) / 100
      : 0)

    // 4. INSERT venda (admin para contornar RLS: vendedora só pode inserir com próprio id)
    const valor_total = itensProcessados.reduce(
      (acc, item) => acc + item.quantidade * item.preco_unitario, 0
    )

    const { data: vendaData, error: vendaError } = await admin
      .from('vendas')
      .insert({
        loja_id: dados.loja_id,
        cliente_id,
        vendedora_id: dados.vendedora_id,
        valor: valor_total,
        data_compra: dados.data_compra,
        origem: 'venda_manual',
      })
      .select('id')
      .single()

    if (vendaError || !vendaData) {
      return { ok: false, erro: 'Erro ao registrar venda: ' + (vendaError?.message ?? 'desconhecido') }
    }

    const venda_id = vendaData.id as string

    // 4.5. Detectar campanhas ativas para cada produto_id (batch lookup)
    const hoje = dados.data_compra
    const produtoIdsUnicos = [...new Set(itensProcessados.map(i => i.produto_id).filter(Boolean))]
    const campanhaMap = new Map<string, { campanhaId: string; itemId: string }>()

    if (produtoIdsUnicos.length > 0) {
      const { data: cviRows } = await admin
        .from('campanhas_venda_itens')
        .select('id, produto_id, campanha_id, campanhas_venda!inner(id, loja_id, status, data_inicio, data_fim)')
        .in('produto_id', produtoIdsUnicos)
        .eq('ativo', true)

      for (const row of (cviRows ?? []) as unknown[]) {
        const r = row as Record<string, unknown>
        const cv = r.campanhas_venda as Record<string, unknown>
        if (
          cv.loja_id === dados.loja_id &&
          cv.status === 'ativa' &&
          (cv.data_inicio as string) <= hoje &&
          (cv.data_fim as string) >= hoje
        ) {
          const prodId = r.produto_id as string
          if (!campanhaMap.has(prodId)) {
            campanhaMap.set(prodId, { campanhaId: cv.id as string, itemId: r.id as string })
          }
        }
      }
    }

    // 5. INSERT itens_venda (com campanha_venda_id/item_id quando detectado)
    const { data: itensVendaData, error: itensError } = await admin
      .from('itens_venda')
      .insert(
        itensProcessados.map(item => {
          const campInfo = item.produto_id ? campanhaMap.get(item.produto_id) : undefined
          return {
            venda_id,
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            recorrente: item.recorrente,
            comissionavel: item.comissionavel_recompra,
            quantidade: item.quantidade,
            valor_unitario: item.preco_unitario,
            subtotal: item.quantidade * item.preco_unitario,
            ciclo_recompra_dias: item.ciclo_recompra_dias,
            campanha_venda_id: campInfo?.campanhaId ?? null,
            campanha_venda_item_id: campInfo?.itemId ?? null,
          }
        })
      )
      .select('id, recorrente, produto_id, ciclo_recompra_dias')

    if (itensError || !itensVendaData) {
      return { ok: false, erro: 'Erro ao registrar itens: ' + (itensError?.message ?? 'desconhecido') }
    }

    // 5.5. Gravar comissão real via helper canônico
    const comissaoResult = await gravarComissaoVenda({
      loja_id: dados.loja_id,
      venda_id,
      vendedora_id: dados.vendedora_id,
      data_venda: dados.data_compra,
      itens: itensProcessados.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        subtotal: item.quantidade * item.preco_unitario,
        comissionavel: item.comissionavel_recompra,
      })),
    })

    if (!comissaoResult.ok) {
      return { ok: false, erro: 'Erro ao registrar comissão: ' + comissaoResult.erro }
    }

    // 6. Gerar avisos — sequência única agrupada via função central
    const todosAvisos: AvisoParaInserir[] = []
    const mensagemTipo: Record<string, string> = {}

    const pairesRecorrentes = itensVendaData
      .map((row, i) => ({ row, processado: itensProcessados[i] }))
      .filter(({ row }) => (row as unknown as { recorrente: boolean }).recorrente)

    if (pairesRecorrentes.length >= 1) {
      const itensParaGerar: ItemParaGerarAviso[] = pairesRecorrentes.map(({ row, processado }) => ({
        id: row.id as string,
        produto_id: row.produto_id as string | null,
        produto_nome: processado.produto_nome,
        recorrente: true,
        ciclo_recompra_dias: (row as unknown as { ciclo_recompra_dias: number | null }).ciclo_recompra_dias ?? null,
        qtd_mensagens: processado.produto_qtd_mensagens,
        modelo_fluxo: processado.modelo_fluxo ?? null,
        categoria: processado.categoria ?? null,
        parceiro: processado.parceiro ?? null,
      }))

      const { avisos, mensagemTipo: tipoMap } = await gerarAvisosParaVenda({
        venda_id,
        loja_id: dados.loja_id,
        cliente_id,
        vendedora_id: dados.vendedora_id,
        cliente_nome,
        vendedora_nome: dados.vendedora_nome,
        loja_nome: dados.loja_nome,
        data_base: dados.data_compra,
        origem: 'venda_manual',
        itens: itensParaGerar,
        db: supabase,
      })

      Object.assign(mensagemTipo, tipoMap)
      todosAvisos.push(...avisos.map(a => ({ ...a, previsao_comissao })))
    }

    // 7. INSERT avisos
    if (todosAvisos.length > 0) {
      await admin.from('avisos').insert(todosAvisos)
    }

    return {
      ok: true,
      venda_id,
      cliente_nome,
      itens: itensProcessados.map(item => ({
        produto_nome: item.produto_nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        recorrente: item.recorrente,
        comissionavel_recompra: item.comissionavel_recompra,
      })),
      valor_total,
      previsao_comissao,
      percentual_comissao,
      avisos: todosAvisos.map(a => ({
        data_aviso: a.data_aviso,
        texto_renderizado: a.texto_renderizado,
        tipo: mensagemTipo[a.mensagem_id] ?? 'agradecimento',
      })),
    }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro inesperado'
    return { ok: false, erro: mensagem }
  }
}
