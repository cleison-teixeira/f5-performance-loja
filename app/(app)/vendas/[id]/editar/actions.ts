'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { planejarAvisosParaVenda, type ItemParaPlanejamento } from '@/lib/avisos/planejarParaVenda'
import { gravarComissaoVenda } from '@/lib/comissoes/gravar'
import {
  planejarReconciliacaoAvisos,
  resolverCicloRecompraPorProduto,
  type AvisoExistenteParaReconciliacao,
} from './reconciliacaoAvisos'

const STATUS_ATIVOS = ['pendente', 'enviado', 'aberta', 'contato_feito', 'reagendada'] as const

export interface ItemEditarInput {
  item_venda_id: string | null  // null = novo item
  produto_id: string | null
  produto_nome: string
  quantidade: number
  preco_unitario: number
  recorrente: boolean
  comissionavel: boolean
}

export interface ResultadoEdicao {
  ok: boolean
  erro?: string
  avisos_recalculados: number
  avisos_criados: number
  avisos_removidos: number
}

export async function editarVenda(dados: {
  venda_id: string
  data_compra: string
  vendedora_id: string
  vendedora_nome: string
  loja_nome: string
  itens: ItemEditarInput[]
}): Promise<ResultadoEdicao> {
  const zero: ResultadoEdicao = { ok: false, avisos_recalculados: 0, avisos_criados: 0, avisos_removidos: 0 }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...zero, erro: 'Não autenticado' }

    const admin = createAdminClient()

    // 1. Validar propriedade da venda e origem
    const { data: venda } = await admin
      .from('vendas')
      .select('id, loja_id, origem, data_compra, cliente_id, vendedora_id')
      .eq('id', dados.venda_id)
      .single()

    if (!venda) return { ...zero, erro: 'Venda não encontrada' }
    if ((venda.origem as string) !== 'venda_manual') {
      return { ...zero, erro: 'Apenas vendas manuais podem ser editadas' }
    }

    const { data: membro } = await supabase
      .from('membros_loja')
      .select('loja_id')
      .eq('perfil_id', user.id)
      .eq('loja_id', venda.loja_id as string)
      .eq('ativo', true)
      .single()

    if (!membro) return { ...zero, erro: 'Sem permissão para editar esta venda' }

    const loja_id = venda.loja_id as string
    const cliente_id = venda.cliente_id as string
    const dataAnterior = venda.data_compra as string
    const vendedoraAnterior = venda.vendedora_id as string
    const dataMudou = dados.data_compra !== dataAnterior
    const vendedoraMudou = dados.vendedora_id !== vendedoraAnterior

    // 2. Buscar itens atuais (inclui campos usados na eleição de âncora)
    const { data: itensAtuaisRaw } = await admin
      .from('itens_venda')
      .select('id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel, ciclo_recompra_dias, categoria, parceiro')
      .eq('venda_id', dados.venda_id)

    const itensAtuaisMap = new Map(
      (itensAtuaisRaw ?? []).map(i => [i.id as string, i])
    )

    const itensExistentes = dados.itens.filter(i => i.item_venda_id !== null)
    const itensNovos = dados.itens.filter(i => i.item_venda_id === null)
    const idsNovosSet = new Set(itensExistentes.map(i => i.item_venda_id!))
    const idsRemovidos = [...itensAtuaisMap.keys()].filter(id => !idsNovosSet.has(id))

    let avisos_removidos = 0
    const avisos_recalculados = 0
    let avisos_criados = 0

    // 3. Itens existentes: atualizar quantidade/preço/recorrente
    // (avisos não são tocados aqui — a reconciliação de âncora única, no
    // passo 8, decide o que preservar/desancorar/remover para a venda inteira)
    for (const item of itensExistentes) {
      const atual = itensAtuaisMap.get(item.item_venda_id!)
      if (!atual) continue

      await admin
        .from('itens_venda')
        .update({
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          recorrente: item.recorrente,
        })
        .eq('id', item.item_venda_id!)
    }

    // 4. Atualizar cabeçalho da venda
    const novoValorTotal = dados.itens.reduce(
      (acc, i) => acc + i.quantidade * i.preco_unitario, 0
    )

    await admin
      .from('vendas')
      .update({
        valor: novoValorTotal,
        data_compra: dados.data_compra,
        vendedora_id: dados.vendedora_id,
      })
      .eq('id', dados.venda_id)

    // Contexto para o planejamento de avisos (passo 8)
    const { data: clienteData } = await admin
      .from('clientes').select('nome').eq('id', cliente_id).single()
    const cliente_nome = (clienteData?.nome as string) ?? ''

    // 5. Atualizar vendedora_id nos avisos existentes se mudou (inclui
    // histórico/enviado — só corrige responsável, não apaga nada)
    if (vendedoraMudou) {
      await admin
        .from('avisos')
        .update({ vendedora_id: dados.vendedora_id, updated_at: new Date().toISOString() })
        .eq('venda_id', dados.venda_id)
        .in('status', [...STATUS_ATIVOS])
    }

    // 6. Reconciliar avisos existentes da venda inteira: desancorar os
    // protegidos (enviados / com recompra_id / histórico) de itens removidos
    // antes de apagar o item (evita perda por ON DELETE CASCADE) e remover
    // os substituíveis (pendente/reagendada, nunca enviados, sem recompra_id)
    // — independentemente de qual item_venda_id eles apontam hoje, pois serão
    // superados pelo plano de âncora única do passo 8.
    const { data: avisosExistentesRaw } = await admin
      .from('avisos')
      .select('id, item_venda_id, status, enviado_em, recompra_id')
      .eq('venda_id', dados.venda_id)

    const avisosExistentes: AvisoExistenteParaReconciliacao[] = (avisosExistentesRaw ?? []).map(a => ({
      id: a.id as string,
      item_venda_id: (a.item_venda_id as string | null) ?? null,
      status: a.status as string,
      enviado_em: (a.enviado_em as string | null) ?? null,
      recompra_id: (a.recompra_id as string | null) ?? null,
    }))

    const { idsParaRemover, idsParaDesancorar } = planejarReconciliacaoAvisos({
      avisos: avisosExistentes,
      itensRemovidosIds: idsRemovidos,
    })

    if (idsParaDesancorar.length > 0) {
      await admin
        .from('avisos')
        .update({ item_venda_id: null, updated_at: new Date().toISOString() })
        .in('id', idsParaDesancorar)
    }

    if (idsParaRemover.length > 0) {
      await admin.from('avisos').delete().in('id', idsParaRemover)
      avisos_removidos = idsParaRemover.length
    }

    // 7. Agora é seguro deletar itens_venda removidos: avisos protegidos já
    // foram desancorados e os substituíveis já foram removidos acima.
    for (const idRemovido of idsRemovidos) {
      await admin.from('itens_venda').delete().eq('id', idRemovido)
    }

    // Itens novos: inserir com item_venda_id pré-gerado, para que o plano de
    // avisos (passo 8) já possa referenciá-los antes da própria inserção.
    const itensNovosComId = itensNovos.map(item => ({
      ...item,
      item_venda_id: crypto.randomUUID(),
    }))

    for (const item of itensNovosComId) {
      await admin
        .from('itens_venda')
        .insert({
          id: item.item_venda_id,
          venda_id: dados.venda_id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          recorrente: item.recorrente,
          comissionavel: item.comissionavel,
        })
    }

    // Ciclo real dos itens novos: itens existentes já têm ciclo_recompra_dias
    // persistido em itens_venda, mas itens novos não passam por esse campo em
    // ItemEditarInput. Sem resolver o ciclo real aqui, todo item novo cairia
    // no fallback 30 do planner, podendo eleger a âncora errada quando o
    // ciclo real do produto novo difere de 30. Mesma fonte já usada em
    // vendas/nova/page.tsx (cicloMap) e como fallback interno de gerarAvisos:
    // mensagens_produto.dias_apos_venda onde tipo='recompra'.
    const produtoIdsNovosRecorrentes = [...new Set(
      itensNovosComId.filter(i => i.recorrente && i.produto_id).map(i => i.produto_id as string)
    )]

    let cicloRealPorProduto = new Map<string, number>()
    if (produtoIdsNovosRecorrentes.length > 0) {
      const { data: mensagensRecompra } = await admin
        .from('mensagens_produto')
        .select('produto_id, dias_apos_venda')
        .eq('tipo', 'recompra')
        .in('produto_id', produtoIdsNovosRecorrentes)

      cicloRealPorProduto = resolverCicloRecompraPorProduto(
        (mensagensRecompra ?? []).map(m => ({
          produto_id: m.produto_id as string,
          dias_apos_venda: m.dias_apos_venda as number,
        }))
      )
    }
    // Produto sem mensagem de recompra: preserva o fallback 30 já usado em
    // todo o sistema (aplicado abaixo, na montagem de itensFinal) — não
    // bloqueia a edição, não gera erro.

    // 8. Eleger a âncora única sobre o estado FINAL da venda (existentes
    // atualizados + novos) e planejar os avisos — reutiliza
    // planejarAvisosParaVenda (lib/avisos/planejarParaVenda.ts) sem
    // modificá-la, garantindo a mesma regra de menor ciclo_recompra_dias já
    // usada na criação e na edição de recompra.
    const itensFinal: ItemParaPlanejamento[] = [
      ...itensExistentes.map(item => {
        const atual = itensAtuaisMap.get(item.item_venda_id!)
        return {
          id: item.item_venda_id!,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          recorrente: item.recorrente,
          ciclo_recompra_dias: (atual?.ciclo_recompra_dias as number | null | undefined) ?? null,
          categoria: (atual?.categoria as string | null | undefined) ?? null,
          parceiro: (atual?.parceiro as string | null | undefined) ?? null,
        }
      }),
      ...itensNovosComId.map(item => ({
        id: item.item_venda_id,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        recorrente: item.recorrente,
        ciclo_recompra_dias: item.produto_id ? (cicloRealPorProduto.get(item.produto_id) ?? 30) : null,
        categoria: null,
        parceiro: null,
      })),
    ]

    const { avisos: avisosPlaneados } = await planejarAvisosParaVenda({
      venda_id: dados.venda_id,
      loja_id,
      cliente_id,
      vendedora_id: dados.vendedora_id,
      cliente_nome,
      vendedora_nome: dados.vendedora_nome,
      loja_nome: dados.loja_nome,
      data_base: dados.data_compra,
      origem: 'venda_manual',
      itens: itensFinal,
      db: admin,
    })

    if (avisosPlaneados.length > 0) {
      await admin.from('avisos').insert(avisosPlaneados)
      avisos_criados = avisosPlaneados.length
    }

    // 9. Recalcular comissão se houve mudança substantiva
    const precisaRecalcular =
      idsRemovidos.length > 0 ||
      itensNovos.length > 0 ||
      vendedoraMudou ||
      dataMudou ||
      itensExistentes.some(item => {
        const atual = itensAtuaisMap.get(item.item_venda_id!)
        return atual && (
          (atual.quantidade as number) !== item.quantidade ||
          (atual.valor_unitario as number) !== item.preco_unitario
        )
      })

    if (precisaRecalcular) {
      await admin.from('comissao_venda').delete().eq('venda_id', dados.venda_id)

      await gravarComissaoVenda({
        loja_id,
        venda_id: dados.venda_id,
        vendedora_id: dados.vendedora_id,
        data_venda: dados.data_compra,
        itens: dados.itens.map(i => ({
          produto_id: i.produto_id,
          produto_nome: i.produto_nome,
          subtotal: i.quantidade * i.preco_unitario,
          comissionavel: i.comissionavel,
        })),
      })
    }

    return { ok: true, avisos_recalculados, avisos_criados, avisos_removidos }
  } catch (err) {
    return { ...zero, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
