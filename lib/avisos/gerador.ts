import { interpolar } from '@/lib/mensagens/interpolador'

interface ContextoAviso {
  venda_id: string
  item_venda_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  cliente_nome: string
  produto_nome: string
  vendedora_nome: string
  loja_nome: string
}

interface MensagemProduto {
  id: string
  tipo: string
  texto: string
  dias_apos_venda: number
}

export interface AvisoParaInserir {
  venda_id: string
  item_venda_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  mensagem_id: string
  texto_renderizado: string
  data_aviso: string
  status: 'pendente'
  previsao_comissao?: number
}

export function gerarAvisos(
  mensagens: MensagemProduto[],
  ctx: ContextoAviso,
  dataBase: string  // YYYY-MM-DD — usa data_compra como referência
): AvisoParaInserir[] {
  const [ano, mes, dia] = dataBase.split('-').map(Number)
  const base = new Date(ano, mes - 1, dia)

  return mensagens.map(msg => {
    const dataAviso = new Date(base)
    dataAviso.setDate(base.getDate() + msg.dias_apos_venda)
    const y = dataAviso.getFullYear()
    const m = String(dataAviso.getMonth() + 1).padStart(2, '0')
    const d = String(dataAviso.getDate()).padStart(2, '0')

    return {
      venda_id: ctx.venda_id,
      item_venda_id: ctx.item_venda_id,
      loja_id: ctx.loja_id,
      cliente_id: ctx.cliente_id,
      vendedora_id: ctx.vendedora_id,
      mensagem_id: msg.id,
      texto_renderizado: interpolar(msg.texto, {
        cliente_nome: ctx.cliente_nome,
        produto_nome: ctx.produto_nome,
        vendedora_nome: ctx.vendedora_nome,
        loja_nome: ctx.loja_nome,
      }),
      data_aviso: `${y}-${m}-${d}`,
      status: 'pendente' as const,
    }
  })
}
