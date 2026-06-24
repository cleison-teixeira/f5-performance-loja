'use client'

import { useState, useMemo } from 'react'
import { TrendingDown, AlertCircle, Package, User } from 'lucide-react'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'
import type { PerdaItem } from './page'

type Periodo = '30' | '90'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function limiteISO(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

export function PerdasLista({ perdas, isVendedora }: { perdas: PerdaItem[]; isVendedora: boolean }) {
  const [periodo, setPeriodo] = useState<Periodo>('90')
  const [motivoFiltro, setMotivoFiltro] = useState<string>('todos')

  const limite = useMemo(() => limiteISO(Number(periodo)), [periodo])

  const todosMotivos = useMemo(() => {
    const set = new Set<string>()
    for (const p of perdas) {
      if (p.motivo_perda) set.add(p.motivo_perda)
    }
    return Array.from(set).sort()
  }, [perdas])

  const filtradas = useMemo(() => {
    return perdas.filter(p => {
      if (!p.encerrado_em || p.encerrado_em < limite) return false
      if (motivoFiltro !== 'todos' && p.motivo_perda !== motivoFiltro) return false
      return true
    })
  }, [perdas, limite, motivoFiltro])

  // Métricas
  const valorTotal = filtradas.reduce((s, p) => s + p.valor_produto, 0)
  const qtdPerdas = filtradas.length

  const principalMotivo = useMemo(() => {
    const counter = new Map<string, number>()
    for (const p of filtradas) {
      if (p.motivo_perda) counter.set(p.motivo_perda, (counter.get(p.motivo_perda) ?? 0) + 1)
    }
    let max = 0; let motivo = '—'
    for (const [m, c] of counter) { if (c > max) { max = c; motivo = m } }
    return motivo
  }, [filtradas])

  const produtoMaisPerdido = useMemo(() => {
    const counter = new Map<string, number>()
    for (const p of filtradas) {
      counter.set(p.produto_nome, (counter.get(p.produto_nome) ?? 0) + 1)
    }
    let max = 0; let produto = '—'
    for (const [prod, c] of counter) { if (c > max) { max = c; produto = prod } }
    return produto
  }, [filtradas])

  const periodos: { value: Periodo; label: string }[] = [
    { value: '30', label: '30 dias' },
    { value: '90', label: '90 dias' },
  ]

  return (
    <div className="space-y-4">

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/30 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600/65 dark:text-red-400/60 flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 flex-none" />
            Valor perdido
          </p>
          <p className="text-xl font-bold tabular-nums text-red-700 dark:text-red-400 leading-none">
            {fmt(valorTotal)}
          </p>
          <p className="text-[11px] text-red-600/55 dark:text-red-400/50 leading-tight">
            potencial não convertido
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 flex-none" />
            Perdas
          </p>
          <p className={`text-xl font-bold tabular-nums leading-none ${qtdPerdas > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {qtdPerdas}
          </p>
          <p className="text-[11px] text-muted-foreground/55 leading-tight">
            {qtdPerdas === 1 ? 'oportunidade perdida' : 'oportunidades perdidas'}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">
            Principal motivo
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {principalMotivo}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
            <Package className="h-3 w-3 flex-none" />
            Produto mais perdido
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {produtoMaisPerdido}
          </p>
        </div>
      </div>

      {/* ── Filtro de período ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          {periodos.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriodo(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                periodo === value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtro de motivo */}
        {todosMotivos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setMotivoFiltro('todos')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                motivoFiltro === 'todos'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-transparent text-foreground hover:bg-accent'
              }`}
            >
              Todos os motivos
            </button>
            {todosMotivos.map(m => (
              <button
                key={m}
                onClick={() => setMotivoFiltro(m)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  motivoFiltro === m
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-input bg-transparent text-foreground hover:bg-accent'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lista ── */}
      {filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Nenhuma perda registrada neste período.
        </p>
      ) : (
        <div className="space-y-3">
          {filtradas.map(p => (
            <div key={p.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-2.5">

              {/* Cliente + produto */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{p.cliente_nome}</p>
                  {p.cliente_whatsapp && (
                    <p className="text-xs text-muted-foreground mt-0.5">{formatarWhatsapp(p.cliente_whatsapp)}</p>
                  )}
                </div>
                {p.encerrado_em && (
                  <p className="text-xs text-muted-foreground tabular-nums flex-none">
                    {formatarData(p.encerrado_em)}
                  </p>
                )}
              </div>

              {/* Produto + valor */}
              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm">
                <span className="text-muted-foreground truncate">{p.produto_nome}</span>
                {p.valor_produto > 0 && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="font-semibold tabular-nums text-foreground">{fmt(p.valor_produto)}</span>
                  </>
                )}
              </div>

              {/* Motivo */}
              {p.motivo_perda && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/60 dark:border-red-800/40 dark:bg-red-950/20 px-2.5 py-1">
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">{p.motivo_perda}</span>
                </div>
              )}

              {/* Observação */}
              {p.observacao_resultado && (
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;{p.observacao_resultado}&rdquo;
                </p>
              )}

              {/* Vendedora — apenas para gerente/dono */}
              {!isVendedora && p.vendedora_nome && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <User className="h-3 w-3 text-muted-foreground/50 flex-none" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{p.vendedora_nome}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
