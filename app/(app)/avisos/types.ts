import type { MensagemTipo } from '@/types/app'

export interface AvisoDetalhado {
  id: string
  data_aviso: string
  status: 'pendente' | 'enviado' | 'ignorado'
  texto_renderizado: string
  cliente_nome: string
  cliente_whatsapp: string
  cliente_id: string
  produto_nome: string
  produto_id: string | null
  produto_foto_url: string | null
  tipo: MensagemTipo
  valor_venda: number
  previsao_comissao: number
  venda_id: string
  vendedora_id: string
  atrasado: boolean
}
