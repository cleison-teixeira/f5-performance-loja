import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import type { RankingLojasItem } from './page'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

interface Props {
  lojaIds: string[]
  inicioMes: string
}

export async function DashboardLojasBlock({ lojaIds, inicioMes }: Props) {
  if (lojaIds.length === 0) return null

  const admin = createAdminClient()

  const [lojasRes, recomprasLojaRes, avisosLojaRes] = await Promise.all([
    admin.from('lojas').select('id, nome').in('id', lojaIds),
    admin
      .from('recompras')
      .select('loja_id, valor_total')
      .in('loja_id', lojaIds)
      .gte('criado_em', inicioMes),
    admin
      .from('avisos')
      .select('loja_id, venda_id, produto_id:itens_venda(produto_id)')
      .in('loja_id', lojaIds)
      .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)'),
  ])

  const lojaNomeMap = new Map<string, string>()
  for (const l of lojasRes.data ?? []) lojaNomeMap.set(l.id as string, l.nome as string)

  const lojaMap = new Map<string, {
    valorRecuperadoMes: number
    qtdRecomprasMes: number
    qtdOportunidades: number
    seen: Set<string>
  }>()
  for (const id of lojaIds) {
    lojaMap.set(id, { valorRecuperadoMes: 0, qtdRecomprasMes: 0, qtdOportunidades: 0, seen: new Set() })
  }

  for (const r of recomprasLojaRes.data ?? []) {
    const entry = lojaMap.get(r.loja_id as string)
    if (!entry) continue
    entry.valorRecuperadoMes += r.valor_total as number
    entry.qtdRecomprasMes++
  }

  for (const a of avisosLojaRes.data ?? []) {
    const entry = lojaMap.get(a.loja_id as string)
    if (!entry) continue
    const key = `${a.venda_id}__${(a.produto_id as unknown as { produto_id: string } | null)?.produto_id ?? ''}`
    if (entry.seen.has(key)) continue
    entry.seen.add(key)
    entry.qtdOportunidades++
  }

  const rankingLojas: RankingLojasItem[] = lojaIds
    .map(id => ({
      lojaId: id,
      lojaNome: lojaNomeMap.get(id) ?? '—',
      totalPotencial: 0,
      qtdOportunidades: lojaMap.get(id)?.qtdOportunidades ?? 0,
      valorRecuperadoMes: lojaMap.get(id)?.valorRecuperadoMes ?? 0,
      qtdRecomprasMes: lojaMap.get(id)?.qtdRecomprasMes ?? 0,
    }))
    .sort((a, b) => b.valorRecuperadoMes - a.valorRecuperadoMes)

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-none">Performance das lojas</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Dinheiro recuperado e oportunidades em aberto por unidade</p>
        </div>
      </div>

      <div className="space-y-1">
        {rankingLojas.map((item, i) => {
          const isFirst = i === 0
          const maxVal = rankingLojas[0]?.valorRecuperadoMes ?? 1
          const pct = maxVal > 0 ? Math.round((item.valorRecuperadoMes / maxVal) * 100) : 0
          const barGrad = isFirst
            ? 'from-emerald-500 to-green-500'
            : 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'
          return (
            <div
              key={item.lojaId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isFirst
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-100/80 dark:border-emerald-800/30'
                  : 'hover:bg-muted/40'
              }`}
            >
              <span className={`text-[11px] font-bold tabular-nums flex-none w-4 text-center ${
                isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`text-sm truncate leading-tight ${isFirst ? 'font-bold' : 'font-medium'}`}>
                    {item.lojaNome}
                  </p>
                  <p className={`text-sm tabular-nums flex-none ${
                    isFirst ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-semibold'
                  }`}>
                    {fmt(item.valorRecuperadoMes)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barGrad}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] tabular-nums flex-none w-7 text-right font-semibold ${
                    isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                  }`}>
                    {pct}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {item.qtdOportunidades} oportunidade{item.qtdOportunidades !== 1 ? 's' : ''} na fila · {item.qtdRecomprasMes} recompra{item.qtdRecomprasMes !== 1 ? 's' : ''} este mês
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-px bg-border/50" />
      <div className="rounded-xl bg-muted/30 px-4 py-3 grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Recuperado</p>
          <p className="text-xs font-bold tabular-nums">
            {fmt(rankingLojas.reduce((s, r) => s + r.valorRecuperadoMes, 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Líder</p>
          <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmt(rankingLojas[0]?.valorRecuperadoMes ?? 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Unidades</p>
          <p className="text-xs font-bold tabular-nums">{rankingLojas.length}</p>
        </div>
      </div>

      <div className="h-px bg-border/50" />
      <Link
        href="/avisos"
        className="text-xs text-primary hover:underline text-center"
      >
        Ver fila de recompra →
      </Link>
    </div>
  )
}
