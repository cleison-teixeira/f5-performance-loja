import type { MensagemTipo } from '@/types/app'

export interface AvisoDetalhado {
  id: string
  data_aviso: string
  status: 'pendente' | 'enviado' | 'ignorado' | 'aberta' | 'contato_feito' | 'reagendada' | 'convertida' | 'perdida'
  recompra_id?: string | null
  texto_renderizado: string
  cliente_nome: string
  cliente_whatsapp: string
  cliente_id: string
  produto_nome: string
  produto_id: string | null
  produto_foto_url: string | null
  tipo: MensagemTipo
  valor_venda: number
  valor_produto: number
  previsao_comissao: number
  venda_id: string
  item_venda_id: string | null
  data_compra: string
  vendedora_id: string
  vendedora_nome: string
  atrasado: boolean
  observacao_resultado: string | null
  loja_id?: string
  loja_nome?: string
}

export interface GrupoRecompra {
  venda_id: string
  avisos: AvisoDetalhado[]
  cliente_nome: string
  cliente_whatsapp: string
  cliente_id: string
  vendedora_id: string
  vendedora_nome: string
  data_aviso: string
  data_compra: string
  atrasado: boolean
  valor_total: number
}
