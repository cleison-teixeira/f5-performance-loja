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
  vendedora_id: string
  vendedora_nome: string
  atrasado: boolean
}
