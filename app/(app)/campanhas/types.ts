export type TipoCampanha = 'acao_granel' | 'produto_mes' | 'lancamento' | 'desafio_vendas'
export type StatusCampanha = 'rascunho' | 'programada' | 'ativa' | 'pausada' | 'encerrada' | 'cancelada'
export type PeriodicidadeMeta = 'diaria' | 'total'
export type UnidadeMeta = 'pacote' | 'unidade'
export type UnidadeConteudo = 'g' | 'kg' | 'ml' | 'L' | 'unidade'

export const TIPO_LABELS: Record<TipoCampanha, string> = {
  acao_granel: 'Ação do Granel',
  produto_mes: 'Produto do mês',
  lancamento: 'Lançamento',
  desafio_vendas: 'Desafio de vendas',
}

export const STATUS_LABELS: Record<StatusCampanha, string> = {
  rascunho: 'Rascunho',
  programada: 'Programada',
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
}

export const STATUS_CORES: Record<StatusCampanha, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  programada: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  ativa: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  pausada: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  encerrada: 'bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
  cancelada: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
}

export const UNIDADE_LABELS: Record<UnidadeConteudo, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  L: 'L',
  unidade: 'un.',
}

export interface CampanhaVendaItem {
  id: string
  campanha_id: string
  produto_id: string
  produto_nome: string
  produto_foto_url?: string | null
  quantidade_conteudo: number
  unidade_conteudo: UnidadeConteudo
  preco_campanha: number
  preco_referencia: number | null
  ciclo_recompra_dias: number | null
  ativo: boolean
  ordem: number
}

export interface CampanhaVendaParticipante {
  id: string
  campanha_id: string
  perfil_id: string
  nome: string
  meta_individual: number | null
  ativo: boolean
  data_inicio: string | null
  data_fim: string | null
}

export interface CampanhaVenda {
  id: string
  loja_id: string
  tipo: TipoCampanha
  nome: string
  descricao: string | null
  orientacao_equipe: string | null
  status: StatusCampanha
  data_inicio: string
  data_fim: string
  meta_individual: number | null
  meta_loja: number | null
  periodicidade: PeriodicidadeMeta
  unidade_meta: UnidadeMeta
  criado_por: string
  criado_em: string
  atualizado_em: string
  ativado_em: string | null
  encerrado_em: string | null
  itens: CampanhaVendaItem[]
  participantes: CampanhaVendaParticipante[]
}

export interface ResultadoProduto {
  produto_id: string
  produto_nome: string
  unidades: number
  transacoes: number
  faturamento: number
}

export interface ResultadoParticipante {
  perfil_id: string
  nome: string
  unidades: number
  transacoes: number
  faturamento: number
  meta_individual: number | null
  pct_meta: number | null
}

export interface ResultadoCampanha {
  total_unidades: number
  total_transacoes: number
  total_clientes: number
  total_faturamento: number
  unidades_hoje: number
  transacoes_hoje: number
  faturamento_hoje: number
  por_produto: ResultadoProduto[]
  por_participante: ResultadoParticipante[]
}

// Input para criar/editar campanha
export interface CampanhaInput {
  nome: string
  tipo: TipoCampanha
  descricao?: string | null
  orientacao_equipe?: string | null
  data_inicio: string
  data_fim: string
  meta_individual?: number | null
  meta_loja?: number | null
  periodicidade: PeriodicidadeMeta
  unidade_meta: UnidadeMeta
}

export interface ItemInput {
  produto_id: string
  quantidade_conteudo: number
  unidade_conteudo: UnidadeConteudo
  preco_campanha: number
  preco_referencia?: number | null
  ciclo_recompra_dias?: number | null
  ordem?: number
}

export interface ParticipanteInput {
  perfil_id: string
  nome: string
  meta_individual?: number | null
}
