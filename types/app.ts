export type Role = 'admin_f5' | 'dono' | 'gerente' | 'vendedora'

export type AvisoStatus = 'pendente' | 'enviado' | 'ignorado'

export type MensagemTipo = 'agradecimento' | 'relacionamento' | 'recompra' | 'oferta' | 'follow_up'

export type Plano = 'trial' | 'basico' | 'pro'

export type TipoComissao = 'produto_fixo' | 'campanha' | 'meta_batida' | 'base' | 'padrao'

export interface Empresa {
  id: string
  nome: string
  plano: Plano
  status: 'ativa' | 'inativa' | 'trial'
  criado_em: string
}

export interface Loja {
  id: string
  empresa_id: string
  nome: string
  whatsapp: string | null
  cidade: string | null
  ativa: boolean
}

export interface Perfil {
  id: string
  nome: string
  whatsapp: string | null
  avatar_url: string | null
  criado_em: string
}

export interface MembroLoja {
  id: string
  loja_id: string
  perfil_id: string
  role: Role
  ativo: boolean
}

export interface Cliente {
  id: string
  loja_id: string
  nome: string
  whatsapp: string
  observacao: string | null
  criado_em: string
}

export interface Produto {
  id: string
  loja_id: string
  nome: string
  preco_sugerido: number | null
  ativo: boolean
}

export interface MensagemProduto {
  id: string
  produto_id: string
  tipo: MensagemTipo
  ordem: 1 | 2 | 3 | 4 | 5
  texto: string
  dias_apos_venda: number
}

export interface Venda {
  id: string
  loja_id: string
  cliente_id: string
  produto_id: string
  vendedora_id: string
  valor: number
  criado_em: string
}

export interface Aviso {
  id: string
  venda_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  mensagem_id: string
  texto_renderizado: string
  data_aviso: string
  enviado_em: string | null
  status: AvisoStatus
}

export interface RegraComissao {
  id: string
  loja_id: string
  vendedora_id: string
  percentual: number
  ativo: boolean
}

export interface MetaVendedora {
  id: string
  loja_id: string
  vendedora_id: string
  mes: string
  valor_meta: number
  comissao_base: number
  comissao_meta: number
  multiplicador: number | null
  criado_em: string
}

export interface ComissaoFixaProduto {
  id: string
  loja_id: string
  produto_id: string
  vendedora_id: string
  valor_fixo: number
  ativo: boolean
  criado_em: string
}

export interface ComissaoVenda {
  id: string
  venda_id: string
  vendedora_id: string
  valor_venda: number
  percentual: number
  valor_comissao: number
  tipo_comissao: TipoComissao | null
  campanha_id: string | null
  comissao_fixa_produto_id: string | null
}
