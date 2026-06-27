'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarAvisos, type AvisoParaInserir } from '@/lib/avisos/gerador'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP } from '@/lib/mensagens/templates_padrao'
import { ORDENS_POR_MODELO } from '@/lib/mensagens/modelos'
import { gravarComissaoVenda } from '@/lib/comissoes/gravar'
import { resolverOuCriarProduto } from '@/lib/produtos/resolver'

export async function buscarCliente(
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

const CONFIG_MODELOS: Record<string, number[]> = {
  'modelo_2_agrad_rec': [1, 3],
  'modelo_3_agrad_rec_oferta': [1, 3, 4],
  'modelo_3_agrad_rel_rec': [1, 2, 3],
  'modelo_4_completo': [1, 2, 3, 4],
  'modelo_5_follow_up': [1, 2, 3, 4, 5],
}

function obterOrdensPorModelo(modelo: string | null | undefined, fallbackQtd: number): number[] {
  if (modelo && CONFIG_MODELOS[modelo]) {
    return CONFIG_MODELOS[modelo]
  }
  switch (fallbackQtd) {
    case 1: return [3]
    case 2: return [1, 3]
    case 3: return [1, 2, 3]
    case 4: return [1, 2, 3, 4]
    case 5: return [1, 2, 3, 4, 5]
    default: return [1, 2, 3]
  }
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
        { loja_id: dados.loja_id, whatsapp: dados.cliente_whatsapp, nome: dados.cliente_nome },
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

    let fixasPorProduto: Record<string, number> = {}
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

    // 5. INSERT itens_venda
    const { data: itensVendaData, error: itensError } = await admin
      .from('itens_venda')
      .insert(
        itensProcessados.map(item => ({
          venda_id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          recorrente: item.recorrente,
          comissionavel: item.comissionavel_recompra,
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          ciclo_recompra_dias: item.ciclo_recompra_dias,
        }))
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

    // 6. Gerar avisos para cada item recorrente (com previsão de comissão)
    const todosAvisos: AvisoParaInserir[] = []
    const mensagemTipo: Record<string, string> = {}

    for (let i = 0; i < itensVendaData.length; i++) {
      const itemVendaRow = itensVendaData[i]
      const itemProcessado = itensProcessados[i]

      if (!(itemVendaRow as unknown as { recorrente: boolean }).recorrente) continue

      const item_venda_id = itemVendaRow.id as string
      const produto_id = itemVendaRow.produto_id as string

      let { data: mensagensData } = await supabase
        .from('mensagens_produto')
        .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
        .eq('produto_id', produto_id)
        .order('ordem')

      if (!mensagensData || mensagensData.length === 0) {
        const todosPadroes = [
          ...TEMPLATES_PADRAO,
          TEMPLATE_OFERTA,
          TEMPLATE_FOLLOW_UP
        ]
        await supabase.from('mensagens_produto').insert(
          todosPadroes.map(t => ({ produto_id, ...t }))
        )
        const res = await supabase
          .from('mensagens_produto')
          .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
          .eq('produto_id', produto_id)
          .order('ordem')
        mensagensData = res.data
      }

      const ordensAtivas = obterOrdensPorModelo(itemProcessado.modelo_fluxo, itemProcessado.produto_qtd_mensagens)
      const ordensExistentes = (mensagensData ?? []).map(m => m.ordem as number)
      const ordensFaltantes = ordensAtivas.filter(o => !ordensExistentes.includes(o))

      if (ordensFaltantes.length > 0) {
        const DEFAULT_TEMPLATES_MAP: Record<number, any> = {
          1: TEMPLATES_PADRAO[0],
          2: TEMPLATES_PADRAO[1],
          3: TEMPLATES_PADRAO[2],
          4: TEMPLATE_OFERTA,
          5: TEMPLATE_FOLLOW_UP,
        }
        const novosTemplates = ordensFaltantes.map(ordem => {
          const padrao = DEFAULT_TEMPLATES_MAP[ordem]
          return {
            produto_id,
            ordem: padrao.ordem,
            tipo: padrao.tipo,
            dias_apos_venda: padrao.dias_apos_venda,
            texto: padrao.texto,
            estilo: 'clean',
            tipo_incentivo: 'nenhum'
          }
        })
        await supabase.from('mensagens_produto').insert(novosTemplates)
        const res = await supabase
          .from('mensagens_produto')
          .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
          .eq('produto_id', produto_id)
          .order('ordem')
        mensagensData = res.data
      }

      const mensagens = (mensagensData ?? [])
        .filter(m => ordensAtivas.includes(m.ordem as number))
        .map(m => ({
          id: m.id as string,
          tipo: (m as unknown as { tipo: string }).tipo ?? 'agradecimento',
          texto: m.texto as string,
          dias_apos_venda: m.dias_apos_venda as number,
          estilo: m.estilo,
          tipo_incentivo: m.tipo_incentivo,
          cupom_codigo: m.cupom_codigo,
          desconto_percentual: m.desconto_percentual != null ? Number(m.desconto_percentual) : null,
          desconto_valor: m.desconto_valor != null ? Number(m.desconto_valor) : null,
          beneficio_texto: m.beneficio_texto,
          validade_oferta: m.validade_oferta
        }))

      for (const m of mensagens) { mensagemTipo[m.id] = m.tipo }

      const avisos = gerarAvisos(mensagens, {
        venda_id,
        item_venda_id,
        loja_id: dados.loja_id,
        cliente_id,
        vendedora_id: dados.vendedora_id,
        cliente_nome,
        produto_nome: itemProcessado.produto_nome,
        vendedora_nome: dados.vendedora_nome,
        loja_nome: dados.loja_nome,
        categoria: itemProcessado.categoria,
        parceiro: itemProcessado.parceiro,
      }, dados.data_compra, itemProcessado.ciclo_recompra_dias).map(a => ({ ...a, previsao_comissao }))

      todosAvisos.push(...avisos)
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
