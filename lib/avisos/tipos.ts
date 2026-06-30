export const TIPO_AVISO_LABEL: Record<string, string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
  follow_up: 'Confirmação',
}

export function formatarTipoAviso(tipo: string): string {
  return TIPO_AVISO_LABEL[tipo] ?? tipo
}
