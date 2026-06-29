'use client'

interface ItemResumo {
  produto_nome: string
  quantidade: number
  preco_unitario: number
  recorrente: boolean
  comissionavel_recompra: boolean
}

interface ResumoProps {
  cliente_nome: string
  data_compra: string
  itens: ItemResumo[]
  valor_total: number
  avisos: Array<{ data_aviso: string; texto_renderizado: string; tipo: string }>
  onNovaVenda: () => void
}

function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusTemporal(dataAviso: string): string {
  const hoje = hojeISO()
  if (dataAviso < hoje) return 'atrasado'
  if (dataAviso === hoje) return 'hoje'
  const [ay, am, ad] = dataAviso.split('-').map(Number)
  const [hy, hm, hd] = hoje.split('-').map(Number)
  const diff = Math.round((new Date(ay, am - 1, ad).getTime() - new Date(hy, hm - 1, hd).getTime()) / 86400000)
  if (diff === 1) return 'amanhã'
  return `em ${diff} dias`
}

import { formatarTipoAviso } from '@/lib/avisos/tipos'

const TIPO_CORES: Record<string, string> = {
  agradecimento: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  relacionamento: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  recompra: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  oferta: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  follow_up: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

const STATUS_CORES: Record<string, string> = {
  hoje: 'text-primary font-semibold',
  amanhã: 'text-foreground font-medium',
  atrasado: 'text-destructive font-medium',
}

export function ResumoVenda({
  cliente_nome,
  data_compra,
  itens,
  valor_total,
  avisos,
  onNovaVenda,
}: ResumoProps) {
  const itensRecorrentes = itens.filter(i => i.recorrente)
  const previsao_base = itens
    .filter(i => i.recorrente && i.comissionavel_recompra)
    .reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0)

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 px-4 py-3 flex items-center gap-3">
        <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
        <div>
          <p className="font-semibold text-green-800 dark:text-green-300">Venda registrada!</p>
          <p className="text-xs text-green-700 dark:text-green-400">
            {itensRecorrentes.length > 0
              ? `${avisos.length} aviso${avisos.length !== 1 ? 's' : ''} agendado${avisos.length !== 1 ? 's' : ''} automaticamente.`
              : 'Nenhum aviso gerado (produtos sem recorrência).'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        <InfoRow label="Cliente" value={cliente_nome} />
        <InfoRow label="Data da compra" value={formatarData(data_compra)} />
        {itens.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center px-4 py-3 text-sm">
            <div>
              <span className="text-muted-foreground">{itens.length > 1 ? `Produto ${idx + 1}` : 'Produto'}</span>
              <p className="font-medium">{item.produto_nome}{item.quantidade > 1 ? ` ×${item.quantidade}` : ''}</p>
              {item.recorrente && (
                <p className="text-xs text-primary mt-0.5">Gera avisos de recompra</p>
              )}
            </div>
            <span className="font-medium text-right shrink-0 ml-4">{formatarBRL(item.preco_unitario * item.quantidade)}</span>
          </div>
        ))}
        <InfoRow label="Total da venda original" value={formatarBRL(valor_total)} />
        {previsao_base > 0 && previsao_base < valor_total && (
          <InfoRow label="Base prevista de recompra" value={formatarBRL(previsao_base)} />
        )}
      </div>

      {avisos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Próximos avisos</h2>
          <ul className="space-y-2">
            {avisos.map((aviso, idx) => {
              const status = statusTemporal(aviso.data_aviso)
              const statusCor = STATUS_CORES[status] ?? 'text-muted-foreground'
              return (
                <li
                  key={idx}
                  className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm space-y-1.5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_CORES[aviso.tipo] ?? 'bg-muted text-muted-foreground'}`}>
                      {formatarTipoAviso(aviso.tipo)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatarData(aviso.data_aviso)}</span>
                    <span className={`ml-auto text-xs ${statusCor}`}>{status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {aviso.texto_renderizado}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onNovaVenda}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
      >
        Registrar nova venda
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[65%]">{value}</span>
    </div>
  )
}
