export type Severidade = 'info' | 'sucesso' | 'atencao' | 'critico'

export interface Notificacao {
  id: string
  tipo: string
  titulo: string
  descricao: string
  url: string
  severidade: Severidade
}

export interface NotificacoesResult {
  notificacoes: Notificacao[]
  badgesMap: Record<string, number>
}
