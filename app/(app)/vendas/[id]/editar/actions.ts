'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarAvisos } from '@/lib/avisos/gerador'
import { ORDENS_POR_MODELO } from '@/lib/mensagens/modelos'
import { gravarComissaoVenda } from '@/lib/comissoes/gravar'

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

    // 2. Buscar itens atuais
    const { data: itensAtuaisRaw } = await admin
      .from('itens_venda')
      .select('id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel')
      .eq('venda_id', dados.venda_id)

    const itensAtuaisMap = new Map(
      (itensAtuaisRaw ?? []).map(i => [i.id as string, i])
    )

    const itensExistentes = dados.itens.filter(i => i.item_venda_id !== null)
    const itensNovos = dados.itens.filter(i => i.item_venda_id === null)
    const idsNovosSet = new Set(itensExistentes.map(i => i.item_venda_id!))
    const idsRemovidos = [...itensAtuaisMap.keys()].filter(id => !idsNovosSet.has(id))

    let avisos_removidos = 0
    let avisos_recalculados = 0
    let avisos_criados = 0

    // 3. Itens removidos: cancelar avisos ativos e deletar itens_venda
    for (const idRemovido of idsRemovidos) {
      const { data: removed } = await admin
        .from('avisos')
        .delete()
        .eq('item_venda_id', idRemovido)
        .in('status', [...STATUS_ATIVOS])
        .is('recompra_id', null)
        .select('id')
      avisos_removidos += (removed ?? []).length

      // Tenta deletar itens_venda; ignora FK se houver histórico encerrado
      await admin.from('itens_venda').delete().eq('id', idRemovido)
    }

    // 4. Itens existentes: atualizar quantidade/preço/recorrente
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

      // Tornou-se não-recorrente: cancelar avisos ativos
      if ((atual.recorrente as boolean) && !item.recorrente) {
        const { data: removed } = await admin
          .from('avisos')
          .delete()
          .eq('item_venda_id', item.item_venda_id!)
          .in('status', [...STATUS_ATIVOS])
          .is('recompra_id', null)
          .select('id')
        avisos_removidos += (removed ?? []).length
      }
    }

    // 5. Atualizar cabeçalho da venda
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

    // 6. Recalcular data_aviso se data_compra mudou
    if (dataMudou) {
      const { data: avisosAtivos } = await admin
        .from('avisos')
        .select('id, mensagem_id')
        .eq('venda_id', dados.venda_id)
        .in('status', [...STATUS_ATIVOS])
        .is('recompra_id', null)

      if (avisosAtivos && avisosAtivos.length > 0) {
        const mensagemIds = [...new Set(avisosAtivos.map(a => a.mensagem_id as string))]
        const { data: mensagens } = await admin
          .from('mensagens_produto')
          .select('id, dias_apos_venda')
          .in('id', mensagemIds)

        const diasMap = new Map(
          (mensagens ?? []).map(m => [m.id as string, m.dias_apos_venda as number])
        )

        const [ano, mes, dia] = dados.data_compra.split('-').map(Number)
        const dataBase = new Date(ano, mes - 1, dia)
        const agora = new Date().toISOString()

        await Promise.all(
          avisosAtivos
            .filter(a => diasMap.has(a.mensagem_id as string))
            .map(aviso => {
              const dias = diasMap.get(aviso.mensagem_id as string)!
              const dataAviso = new Date(dataBase)
              dataAviso.setDate(dataBase.getDate() + dias)
              const y = dataAviso.getFullYear()
              const m = String(dataAviso.getMonth() + 1).padStart(2, '0')
              const d = String(dataAviso.getDate()).padStart(2, '0')
              avisos_recalculados++
              return admin
                .from('avisos')
                .update({ data_aviso: `${y}-${m}-${d}`, updated_at: agora })
                .eq('id', aviso.id as string)
            })
        )
      }
    }

    // 7. Atualizar vendedora_id nos avisos ativos se mudou
    if (vendedoraMudou) {
      await admin
        .from('avisos')
        .update({ vendedora_id: dados.vendedora_id, updated_at: new Date().toISOString() })
        .eq('venda_id', dados.venda_id)
        .in('status', [...STATUS_ATIVOS])
        .is('recompra_id', null)
    }

    // 8. Gerar avisos para itens novos e itens que viraram recorrentes
    const { data: clienteData } = await admin
      .from('clientes').select('nome').eq('id', cliente_id).single()
    const cliente_nome = (clienteData?.nome as string) ?? ''

    // Itens existentes que viraram recorrentes
    for (const item of itensExistentes) {
      const atual = itensAtuaisMap.get(item.item_venda_id!)
      if (!atual || (atual.recorrente as boolean) || !item.recorrente || !item.produto_id) continue

      const { data: prodData } = await admin
        .from('produtos').select('qtd_mensagens').eq('id', item.produto_id).single()
      const qtd = ((prodData as unknown as { qtd_mensagens: number } | null)?.qtd_mensagens ?? 3) as 1 | 2 | 3 | 4

      const { data: msgs } = await supabase
        .from('mensagens_produto')
        .select('id, ordem, tipo, texto, dias_apos_venda')
        .eq('produto_id', item.produto_id)
        .order('ordem')

      if (!msgs?.length) continue
      const ordensAtivas = ORDENS_POR_MODELO[qtd]
      const mensagens = msgs
        .filter(m => ordensAtivas.includes(m.ordem as number))
        .map(m => ({
          id: m.id as string,
          tipo: (m as unknown as { tipo: string }).tipo ?? 'recompra',
          texto: m.texto as string,
          dias_apos_venda: m.dias_apos_venda as number,
        }))

      if (!mensagens.length) continue
      const avisos = gerarAvisos(mensagens, {
        venda_id: dados.venda_id,
        item_venda_id: item.item_venda_id!,
        loja_id, cliente_id, vendedora_id: dados.vendedora_id,
        cliente_nome, produto_nome: item.produto_nome,
        vendedora_nome: dados.vendedora_nome, loja_nome: dados.loja_nome,
      }, dados.data_compra)

      if (avisos.length > 0) {
        await supabase.from('avisos').insert(avisos)
        avisos_criados += avisos.length
      }
    }

    // Itens novos
    for (const item of itensNovos) {
      const { data: novoItemData } = await supabase
        .from('itens_venda')
        .insert({
          venda_id: dados.venda_id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          valor_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          recorrente: item.recorrente,
          comissionavel: item.comissionavel,
        })
        .select('id')
        .single()

      if (!novoItemData || !item.recorrente || !item.produto_id) continue

      const item_venda_id = novoItemData.id as string
      const { data: prodData } = await admin
        .from('produtos').select('qtd_mensagens').eq('id', item.produto_id).single()
      const qtd = ((prodData as unknown as { qtd_mensagens: number } | null)?.qtd_mensagens ?? 3) as 1 | 2 | 3 | 4

      const { data: msgs } = await supabase
        .from('mensagens_produto')
        .select('id, ordem, tipo, texto, dias_apos_venda')
        .eq('produto_id', item.produto_id)
        .order('ordem')

      if (!msgs?.length) continue
      const ordensAtivas = ORDENS_POR_MODELO[qtd]
      const mensagens = msgs
        .filter(m => ordensAtivas.includes(m.ordem as number))
        .map(m => ({
          id: m.id as string,
          tipo: (m as unknown as { tipo: string }).tipo ?? 'recompra',
          texto: m.texto as string,
          dias_apos_venda: m.dias_apos_venda as number,
        }))

      if (!mensagens.length) continue
      const avisos = gerarAvisos(mensagens, {
        venda_id: dados.venda_id,
        item_venda_id,
        loja_id, cliente_id, vendedora_id: dados.vendedora_id,
        cliente_nome, produto_nome: item.produto_nome,
        vendedora_nome: dados.vendedora_nome, loja_nome: dados.loja_nome,
      }, dados.data_compra)

      if (avisos.length > 0) {
        await supabase.from('avisos').insert(avisos)
        avisos_criados += avisos.length
      }
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
