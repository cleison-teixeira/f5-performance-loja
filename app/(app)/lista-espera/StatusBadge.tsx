export const STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando',
  encontrado_outra_loja: 'Encomendado em esteira',
  avisado: 'Cliente avisado',
  convertido: 'Convertido em venda',
  perdido: 'Perdido',
}

const STATUS_CORES: Record<string, string> = {
  aguardando: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  encontrado_outra_loja: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  avisado: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  convertido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  perdido: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${STATUS_CORES[status] ?? 'bg-muted text-muted-foreground'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
